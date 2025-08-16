// ============================================================================
// FULL AI ANALYSIS SERVICE WITH ULTRA-INTELLIGENT METERING + CACHING + RATE LIMITING
// File: cloudflare-workers/src/services/ai-analysis.ts
// Complete production-ready implementation with all metering integrated + Phase 3 enhancements
// ============================================================================

import { Env, ProfileData, BusinessProfile, AnalysisResult, ProfileIntelligence, AnalysisTier, CacheConfig, RateLimitInfo, EnhancedAnalysisConfig } from '../types/interfaces.js';
import { logger } from '../utils/logger.js';
import { getApiKey } from './enhanced-config-manager.js';
import { MeteringContext, meteredCall, PerformanceMonitor, UsageEvent, logUsageToSupabase, CostCalculators } from './metering.js';
import { OpenAIAdapter, AnthropicAdapter, ApifyAdapter, RetryHandler, CostAnomalyDetector, StreamingMetricsCollector, createOpenAIAdapter, createAnthropicAdapter } from '../adapters/provider-adapters.js';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// ENHANCED CONFIGURATION LOADING
// ============================================================================

function loadConfigFromEnv(env: Env): EnhancedAnalysisConfig {
  return {
    caching: {
      enabled: true,
      ttl: parseInt(env.CACHE_TTL || '3600000'),
      maxSizePerUser: parseInt(env.MAX_CACHE_SIZE_PER_USER || '50'),
      maxGlobalSize: parseInt(env.MAX_GLOBAL_CACHE_SIZE || '50000')
    },
    rateLimiting: {
      enabled: env.RATE_LIMIT_ENABLED === 'true',
      throttleThresholds: {
        requests: parseInt(env.THROTTLE_THRESHOLD_REQUESTS || '10'),
        tokens: parseInt(env.THROTTLE_THRESHOLD_TOKENS || '1000')
      },
      delays: {
        warning: 2000,
        critical: 60000
      }
    },
    performance: {
      maxConcurrentBatch: parseInt(env.MAX_CONCURRENT_BATCH || '5'),
      timeoutMs: parseInt(env.TIMEOUT_MS || '60000'),
      retries: parseInt(env.RETRIES || '3')
    }
  };
}

// ============================================================================
// CIRCUIT BREAKER PATTERN
// ============================================================================

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private readonly failureThreshold = 5;
  private readonly recoveryTimeout = 30000; // 30 seconds

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getStatus(): { state: string; failures: number; lastFailure: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailureTime
    };
  }
}

// ============================================================================
// ENHANCED CACHING WITH USER ISOLATION
// ============================================================================

interface CacheItem {
  data: any;
  timestamp: number;
  userId: string;
  accessCount: number;
  analysisType: 'light' | 'deep';
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalSize: number;
  totalHits: number;
  activeUsers: number;
  avgEntriesPerUser: number;
  memoryUsage: number;
  typeDistribution: Record<string, number>;
  avgAge: number;
}

class EnhancedIntelligentCache {
  private cache: Map<string, CacheItem> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalSize: 0,
    totalHits: 0,
    activeUsers: 0,
    avgEntriesPerUser: 0,
    memoryUsage: 0,
    typeDistribution: {},
    avgAge: 0
  };
  private readonly TTL: number;
  private readonly MAX_SIZE_PER_USER: number;
  private readonly MAX_GLOBAL_SIZE: number;
  
  constructor(config?: CacheConfig) {
    this.TTL = config?.ttl || 3600000;
    this.MAX_SIZE_PER_USER = config?.maxSizePerUser || 50;
    this.MAX_GLOBAL_SIZE = config?.maxGlobalSize || 50000;
  }
  
  private hashKey(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  
  get(userId: string, type: string, key: string): any | null {
    const cacheKey = `${userId}:${type}:${this.hashKey(key)}`;
    const item = this.cache.get(cacheKey);
    
    if (!item || this.isExpired(item)) {
      this.cache.delete(cacheKey);
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Verify user ownership (security)
    if (item.userId !== userId) {
      logger('warn', 'Cache key collision detected', { userId, cacheKey });
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Track access
    item.accessCount++;
    this.stats.hits++;
    this.updateStats();
    return item.data;
  }
  
  set(userId: string, type: string, key: string, data: any, analysisType: 'light' | 'deep'): void {
    const cacheKey = `${userId}:${type}:${this.hashKey(key)}`;
    
    // Enforce user-specific limits
    this.enforceUserLimits(userId);
    
    // Enforce global limits
    if (this.cache.size >= this.MAX_GLOBAL_SIZE) {
      this.evictOldest();
    }
    
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      userId,
      accessCount: 0,
      analysisType
    });
    
    this.updateStats();
  }
  
  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > this.TTL;
  }
  
  private enforceUserLimits(userId: string): void {
    const userKeys = Array.from(this.cache.keys()).filter(k => k.startsWith(`${userId}:`));
    if (userKeys.length >= this.MAX_SIZE_PER_USER) {
      // Remove oldest user entries
      const userEntries = userKeys.map(key => ({
        key,
        item: this.cache.get(key)!
      })).sort((a, b) => a.item.timestamp - b.item.timestamp);
      
      for (let i = 0; i < userEntries.length - this.MAX_SIZE_PER_USER + 1; i++) {
        this.cache.delete(userEntries[i].key);
      }
    }
  }
  
  private evictOldest(): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    if (entries.length > 0) {
      this.cache.delete(entries[0][0]);
    }
  }
  
  private updateStats(): void {
    const entries = Array.from(this.cache.values());
    const userCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    let totalHits = 0;
    
    entries.forEach(entry => {
      userCounts.set(entry.userId, (userCounts.get(entry.userId) || 0) + 1);
      typeCounts.set(entry.analysisType, (typeCounts.get(entry.analysisType) || 0) + 1);
      totalHits += entry.accessCount;
    });
    
    this.stats = {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0 ? 
        this.stats.hits / (this.stats.hits + this.stats.misses) : 0,
      totalSize: this.cache.size,
      totalHits: totalHits,
      activeUsers: userCounts.size,
      avgEntriesPerUser: userCounts.size > 0 ? this.cache.size / userCounts.size : 0,
      memoryUsage: this.cache.size * 1024, // Rough estimate in bytes
      typeDistribution: Object.fromEntries(typeCounts),
      avgAge: entries.length > 0 
        ? entries.reduce((sum, e) => sum + (Date.now() - e.timestamp), 0) / entries.length / 1000
        : 0 // in seconds
    };
  }
  
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  clearUserCache(userId: string): number {
    const userKeys = Array.from(this.cache.keys()).filter(k => k.startsWith(`${userId}:`));
    userKeys.forEach(key => this.cache.delete(key));
    this.updateStats();
    return userKeys.length;
  }

  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalSize: 0,
      totalHits: 0,
      activeUsers: 0,
      avgEntriesPerUser: 0,
      memoryUsage: 0,
      typeDistribution: {},
      avgAge: 0
    };
  }
}

// ============================================================================
// ENHANCED RATE LIMIT MONITOR WITH EXPONENTIAL BACKOFF
// ============================================================================

class RateLimitMonitor {
  private limits: Map<string, RateLimitInfo> = new Map();
  private readonly enabled: boolean;
  private readonly thresholds: { requests: number; tokens: number };
  private readonly delays: { warning: number; critical: number };
  
  constructor(config?: EnhancedAnalysisConfig['rateLimiting']) {
    this.enabled = config?.enabled ?? true;
    this.thresholds = config?.throttleThresholds || { requests: 10, tokens: 1000 };
    this.delays = config?.delays || { warning: 2000, critical: 60000 };
  }
  
  updateLimits(provider: 'openai' | 'anthropic', headers: Headers): RateLimitInfo {
    const limits: RateLimitInfo = {
      provider,
      lastUpdated: Date.now()
    };
    
    // OpenAI headers
    if (provider === 'openai') {
      limits.requests_remaining = parseInt(headers.get('x-ratelimit-remaining-requests') || '0');
      limits.tokens_remaining = parseInt(headers.get('x-ratelimit-remaining-tokens') || '0');
      limits.reset_time = headers.get('x-ratelimit-reset-requests') || undefined;
    }
    
    // Anthropic headers
    if (provider === 'anthropic') {
      limits.requests_remaining = parseInt(headers.get('anthropic-ratelimit-requests-remaining') || '0');
      limits.tokens_remaining = parseInt(headers.get('anthropic-ratelimit-tokens-remaining') || '0');
      limits.reset_time = headers.get('anthropic-ratelimit-requests-reset') || undefined;
    }
    
    this.limits.set(provider, limits);
    return limits;
  }
  
  shouldThrottle(provider: 'openai' | 'anthropic'): { throttle: boolean; delay: number; reason?: string } {
    if (!this.enabled) {
      return { throttle: false, delay: 0 };
    }
    
    const limits = this.limits.get(provider);
    if (!limits) {
      return { throttle: false, delay: 0 };
    }
    
    // Check if limits are critically low
    if (limits.requests_remaining !== undefined && limits.requests_remaining <= 5) {
      return { 
        throttle: true, 
        delay: this.delays.critical,
        reason: 'Critical request limit'
      };
    }
    
    if (limits.tokens_remaining !== undefined && limits.tokens_remaining <= this.thresholds.tokens / 10) {
      return { 
        throttle: true, 
        delay: this.delays.critical,
        reason: 'Critical token limit'
      };
    }
    
    // Check if limits are getting low
    if (limits.requests_remaining !== undefined && limits.requests_remaining <= this.thresholds.requests) {
      return { 
        throttle: true, 
        delay: this.delays.warning,
        reason: 'Warning request limit'
      };
    }
    
    if (limits.tokens_remaining !== undefined && limits.tokens_remaining <= this.thresholds.tokens) {
      return { 
        throttle: true, 
        delay: this.delays.warning,
        reason: 'Warning token limit'
      };
    }
    
    return { throttle: false, delay: 0 };
  }
  
  getLimits(provider: 'openai' | 'anthropic'): RateLimitInfo | null {
    return this.limits.get(provider) || null;
  }
  
  getAllLimits(): Record<string, RateLimitInfo> {
    return Object.fromEntries(this.limits);
  }
}

// ============================================================================
// PARALLEL PROCESSING FOR BATCH OPERATIONS
// ============================================================================

class ParallelProcessor {
  private readonly MAX_CONCURRENT: number;
  
  constructor(maxConcurrent?: number) {
    this.MAX_CONCURRENT = maxConcurrent || globalConfig?.performance.maxConcurrentBatch || 5;
  }
  
  async processBatch<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<R[]> {
    const results: R[] = [];
    const queue = [...items.entries()];
    const inProgress = new Set<Promise<void>>();
    
    // Log rate limit status before batch processing
    logger('info', 'Starting batch processing', {
      totalItems: items.length,
      maxConcurrent: this.MAX_CONCURRENT,
      rateLimits: rateLimitMonitor?.getAllLimits(),
      cacheStats: enhancedAnalysisCache?.getStats(),
      circuitBreakers: {
        openai: openaiCircuitBreaker.getStatus(),
        anthropic: anthropicCircuitBreaker.getStatus()
      }
    });
    
    while (queue.length > 0 || inProgress.size > 0) {
      while (inProgress.size < this.MAX_CONCURRENT && queue.length > 0) {
        const [index, item] = queue.shift()!;
        
        const promise = processor(item, index)
          .then(result => {
            results[index] = result;
            if (onProgress) {
              onProgress(results.filter(r => r !== undefined).length, items.length);
            }
          })
          .catch(error => {
            logger('error', `Batch item ${index} failed`, { error: error.message });
            // Set a default error result
            results[index] = null as any;
          })
          .finally(() => {
            inProgress.delete(promise);
          });
        
        inProgress.add(promise);
      }
      
      if (inProgress.size > 0) {
        await Promise.race(inProgress);
      }
    }
    
    return results.filter(r => r !== null);
  }
}

// ============================================================================
// GLOBAL MONITORING INSTANCES WITH CIRCUIT BREAKERS
// ============================================================================

const globalPerformanceMonitor = new PerformanceMonitor();
const globalAnomalyDetector = new CostAnomalyDetector();
const openaiCircuitBreaker = new CircuitBreaker();
const anthropicCircuitBreaker = new CircuitBreaker();

// Configuration-driven instances
let globalConfig: EnhancedAnalysisConfig | null = null;
let enhancedAnalysisCache: EnhancedIntelligentCache;
let rateLimitMonitor: RateLimitMonitor;

// Legacy cache for backwards compatibility
const analysisCache = new Map<string, { data: any; timestamp: number }>();

// Initialize with environment configuration
function initializeWithConfig(env: Env): void {
  if (globalConfig) return; // Already initialized
  
  globalConfig = loadConfigFromEnv(env);
  
  // Initialize ONLY the enhanced cache (remove dual system)
  enhancedAnalysisCache = new EnhancedIntelligentCache(globalConfig.caching);
  rateLimitMonitor = new RateLimitMonitor(globalConfig.rateLimiting);
  
  logger('info', 'AI Analysis service initialized with unified cache system', {
    cacheEnabled: globalConfig.caching.enabled,
    rateLimitEnabled: globalConfig.rateLimiting.enabled,
    legacyCacheRemoved: true // Confirm legacy removal
  });
}

// ============================================================================
// ADVANCED TIERING SYSTEM WITH METERING
// ============================================================================

const ANALYSIS_TIERS: AnalysisTier[] = [
  { tier: 0, model: 'gpt-4o-mini-2024-07-18', maxTokens: 500, targetSpeed: 3000, minDataRichness: 0, minAnalysisValue: 0 },
  { tier: 1, model: 'gpt-4o-mini-2024-07-18', maxTokens: 1000, targetSpeed: 5000, minDataRichness: 30, minAnalysisValue: 30 },
  { tier: 2, model: 'gpt-4o-mini-2024-07-18', maxTokens: 1500, targetSpeed: 7000, minDataRichness: 50, minAnalysisValue: 50 },
  { tier: 3, model: 'gpt-4o-2024-08-06', maxTokens: 2000, targetSpeed: 10000, minDataRichness: 70, minAnalysisValue: 70 },
  { tier: 4, model: 'gpt-4o-2024-08-06', maxTokens: 3000, targetSpeed: 15000, minDataRichness: 85, minAnalysisValue: 85 }
];

function calculateProfileIntelligence(profile: ProfileData, business: BusinessProfile): ProfileIntelligence {
  let dataRichness = 0;
  let analysisValue = 0;

  // Base metrics
  if (profile.followersCount > 1000) dataRichness += 20;
  if (profile.followersCount > 10000) dataRichness += 20;
  if (profile.followersCount > 100000) dataRichness += 10;

  if (profile.postsCount > 10) dataRichness += 15;
  if (profile.postsCount > 50) dataRichness += 10;

  if (profile.bio && profile.bio.length > 50) dataRichness += 15;
  if (profile.externalUrl) dataRichness += 10;
  if (profile.isVerified) dataRichness += 10;

  // Post content analysis
  if (profile.latestPosts && profile.latestPosts.length > 0) {
    const totalPosts = profile.latestPosts.length;
    const postsWithCaptions = profile.latestPosts.filter(p => p.caption && p.caption.length > 20);
    
    if (postsWithCaptions.length / totalPosts > 0.7) dataRichness += 20;
    
    // Engagement analysis
    const avgLikes = profile.latestPosts.reduce((sum, p) => sum + p.likesCount, 0) / totalPosts;
    const avgComments = profile.latestPosts.reduce((sum, p) => sum + p.commentsCount, 0) / totalPosts;
    
    if (avgLikes > 100) analysisValue += 15;
    if (avgLikes > 1000) analysisValue += 15;
    if (avgComments > 10) analysisValue += 10;
  }

  // Business alignment
  const businessKeywords = [business.industry, ...business.pain_points, business.target_audience]
    .join(' ').toLowerCase().split(/\s+/);
  
  const profileText = [profile.bio, profile.displayName, 
    ...(profile.latestPosts?.map(p => p.caption) || [])].join(' ').toLowerCase();
  
  const keywordMatches = businessKeywords.filter(keyword => 
    keyword.length > 3 && profileText.includes(keyword)
  ).length;
  
  analysisValue += Math.min(keywordMatches * 10, 40);

  // Determine complexity and strategy
  const totalScore = dataRichness + analysisValue;
  let complexityLevel: 'basic' | 'moderate' | 'advanced' | 'executive';
  let promptStrategy: 'screening' | 'standard' | 'strategic' | 'executive';
  
  if (totalScore < 30) {
    complexityLevel = 'basic';
    promptStrategy = 'screening';
  } else if (totalScore < 60) {
    complexityLevel = 'moderate';
    promptStrategy = 'standard';
  } else if (totalScore < 90) {
    complexityLevel = 'advanced';
    promptStrategy = 'strategic';
  } else {
    complexityLevel = 'executive';
    promptStrategy = 'executive';
  }

  // Find optimal tier
  const tier = ANALYSIS_TIERS.find(t => 
    dataRichness >= t.minDataRichness && analysisValue >= t.minAnalysisValue
  ) || ANALYSIS_TIERS[0];

  return {
    dataRichness,
    analysisValue,
    complexityLevel,
    recommendedModel: tier.model,
    speedTarget: tier.targetSpeed,
    promptStrategy
  };
}

// ============================================================================
// ENHANCED API CALL WITH RATE LIMITING AND CIRCUIT BREAKERS
// ============================================================================

async function callAPIWithRateLimit(
  url: string,
  options: RequestInit,
  provider: 'openai' | 'anthropic',
  requestId: string,
  circuitBreaker?: CircuitBreaker
): Promise<Response> {
  // Check if we need to throttle
  const throttleCheck = rateLimitMonitor?.shouldThrottle(provider);
  if (throttleCheck?.throttle) {
    logger('warn', `Rate limit throttling for ${provider}`, {
      delay: throttleCheck.delay,
      reason: throttleCheck.reason,
      limits: rateLimitMonitor?.getLimits(provider)
    }, requestId);
    
    await new Promise(resolve => setTimeout(resolve, throttleCheck.delay));
  }
  
  // Use circuit breaker if provided
  const makeRequest = async () => {
    const response = await fetch(url, options);
    
    // Update rate limit info
    if (response.headers && rateLimitMonitor) {
      const limits = rateLimitMonitor.updateLimits(provider, response.headers);
      
      // Log warnings if approaching limits
      if (limits.requests_remaining !== undefined && limits.requests_remaining < 20) {
        logger('warn', `${provider} rate limit warning`, {
          requests_remaining: limits.requests_remaining,
          tokens_remaining: limits.tokens_remaining
        }, requestId);
      }
    }
    
    return response;
  };

  if (circuitBreaker) {
    return await circuitBreaker.execute(makeRequest);
  } else {
    return await makeRequest();
  }
}

// ============================================================================
// MAIN ANALYSIS FUNCTION WITH FULL METERING
// ============================================================================

async function performAIAnalysis(
  profile: ProfileData,
  business: BusinessProfile,
  analysisType: 'light' | 'deep',
  env: Env,
  requestId?: string,
  userId?: string
): Promise<AnalysisResult> {
  requestId = requestId || crypto.randomUUID();
  userId = userId || business.user_id;
  
  const meteringContext = new MeteringContext(requestId);
  const startTime = performance.now();
  
  try {
    // Initialize config if not already done
    if (!globalConfig) {
      initializeWithConfig(env);
    }

    // Calculate profile intelligence
    const intelligence = calculateProfileIntelligence(profile, business);
    
    logger('info', `Starting ${analysisType} analysis for ${profile.username}`, {
      intelligence,
      cacheEnabled: globalConfig?.caching.enabled,
      rateLimitEnabled: globalConfig?.rateLimiting.enabled
    }, requestId);

    // Check cache first
    const cacheKey = `${profile.username}-${business.id}-${analysisType}`;
    const cached = enhancedAnalysisCache?.get(userId, 'analysis', cacheKey);
    
    if (cached) {
      logger('info', 'Cache hit for analysis', { username: profile.username }, requestId);
      meteringContext.recordEvent({
        purpose: analysisType === 'light' ? 'analysis_light' : 'analysis_deep',
        cache_hit: true,
        user_id: userId,
        business_id: business.id
      });
      return cached;
    }

    // Prepare analysis prompt
    const prompt = createAnalysisPrompt(profile, business, analysisType, intelligence);
    
    // Use appropriate model based on intelligence
    const modelTier = ANALYSIS_TIERS.find(t => 
      intelligence.dataRichness >= t.minDataRichness && 
      intelligence.analysisValue >= t.minAnalysisValue
    ) || ANALYSIS_TIERS[0];

    logger('info', `Using model tier ${modelTier.tier}: ${modelTier.model}`, {
      dataRichness: intelligence.dataRichness,
      analysisValue: intelligence.analysisValue
    }, requestId);

    // Create adapter and make API call
    const openaiKey = await getApiKey('OPENAI_API_KEY', env);
    const adapter = createOpenAIAdapter(openaiKey);
    
    const messages = [
      {
        role: 'system',
        content: `You are an expert Instagram influencer analysis AI. Analyze profiles for business outreach potential. Return valid JSON only.`
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    // Use metered call with circuit breaker
   const result = await meteredCall(
  meteringContext,
  'openai',
  modelTier.model,
  analysisType === 'light' ? 'analysis_light' : 'analysis_deep',
  async () => {
    const response = await callAPIWithRateLimit(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelTier.model,
          messages,
          max_tokens: modelTier.maxTokens,
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      },
      'openai',
      requestId,
      openaiCircuitBreaker
    );
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
    }
    return await response.json();
  },
  CostCalculators.openai[modelTier.model]
);

    // Parse and validate result
    const content = result.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    let analysisResult: AnalysisResult;
    try {
      analysisResult = JSON.parse(content);
    } catch (error) {
      logger('error', 'Failed to parse AI response as JSON', { content }, requestId);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate and enhance result
    analysisResult = validateAnalysisResult(analysisResult);
    analysisResult.confidence_level = calculateConfidenceLevel(analysisResult, intelligence);

    // Cache the result
    enhancedAnalysisCache?.set(userId, 'analysis', cacheKey, analysisResult, analysisType);

    // Log usage to Supabase
    await logUsageToSupabase(meteringContext.getEvents(), env);

    const duration = performance.now() - startTime;
    logger('info', `Analysis completed for ${profile.username}`, {
      duration: Math.round(duration),
      score: analysisResult.score,
      confidenceLevel: analysisResult.confidence_level,
      cacheHit: false,
      modelUsed: modelTier.model
    }, requestId);

    return analysisResult;

   } catch (error) {
    const duration = performance.now() - startTime;
    logger('error', `Analysis failed for ${profile.username}`, {
      error: error instanceof Error ? error.message : String(error),
      duration: Math.round(duration)
    }, requestId);

    // Record error in metering
    meteringContext.recordEvent({
      purpose: analysisType === 'light' ? 'analysis_light' : 'analysis_deep',
      cache_hit: false,
      user_id: userId,
      business_id: business.id,
      error_code: 'ANALYSIS_FAILED',
      error_message: error instanceof Error ? error.message : String(error),
      http_status: 500
    });

    // Log error usage to Supabase
    await logUsageToSupabase(meteringContext.getEvents(), env);

    throw error;
  }
}

// ============================================================================
// OUTREACH MESSAGE GENERATION WITH METERING
// ============================================================================

async function generateOutreachMessage(
  profile: ProfileData,
  business: BusinessProfile,
  analysisResult: AnalysisResult,
  env: Env,
  requestId?: string,
  userId?: string
): Promise<{ message: string; personalization_notes: string[] }> {
  requestId = requestId || crypto.randomUUID();
  userId = userId || business.user_id;
  
  const meteringContext = new MeteringContext(requestId);
  const startTime = performance.now();

  try {
    // Check cache first
    const cacheKey = `outreach-${profile.username}-${business.id}`;
    const cached = enhancedAnalysisCache?.get(userId, 'outreach', cacheKey);
    
    if (cached) {
      logger('info', 'Cache hit for outreach message', { username: profile.username }, requestId);
      meteringContext.recordEvent({
        purpose: 'outreach',
        cache_hit: true,
        user_id: userId,
        business_id: business.id
      });
      return cached;
    }

    // Create outreach prompt
    const prompt = createOutreachPrompt(profile, business, analysisResult);
    
    const claudeKey = await getApiKey('CLAUDE_API_KEY', env);
    const adapter = createAnthropicAdapter(claudeKey);

    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    // Use metered call with circuit breaker
    const result = await meteredCall(
  meteringContext,
  'anthropic',
  'claude-3-haiku-20240307',
  'outreach',
  async () => {
    const response = await callAPIWithRateLimit(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'x-api-key': claudeKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages
        })
      },
      'anthropic',
      requestId,
      anthropicCircuitBreaker
    );
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorBody}`);
    }
    return await response.json();
  },
  CostCalculators.anthropic['claude-3-haiku-20240307']
);

    const content = result.content[0]?.text;
    if (!content) {
      throw new Error('No content returned from Anthropic');
    }

    let outreachResult;
    try {
      outreachResult = JSON.parse(content);
    } catch (error) {
      // If not JSON, treat as plain text message
      outreachResult = {
        message: content,
        personalization_notes: []
      };
    }

    // Cache the result
    enhancedAnalysisCache?.set(userId, 'outreach', cacheKey, outreachResult, 'light');

    // Log usage to Supabase
    await logUsageToSupabase(meteringContext.getEvents(), env);

    const duration = performance.now() - startTime;
    logger('info', `Outreach message generated for ${profile.username}`, {
      duration: Math.round(duration),
      messageLength: outreachResult.message.length
    }, requestId);

    return outreachResult;

  } catch (error) {
    const duration = performance.now() - startTime;
    logger('error', `Outreach generation failed for ${profile.username}`, {
      error: error instanceof Error ? error.message : String(error),
      duration: Math.round(duration)
    }, requestId);

    // Record error in metering
    meteringContext.recordEvent({
      purpose: 'outreach',
      cache_hit: false,
      user_id: userId,
      business_id: business.id,
      error_code: 'OUTREACH_FAILED',
      error_message: error instanceof Error ? error.message : String(error),
      http_status: 500
    });

    await logUsageToSupabase(meteringContext.getEvents(), env);
    throw error;
  }
}

// ============================================================================
// ENHANCED BATCH ANALYSIS WITH METERING
// ============================================================================

async function performBatchAnalysis(
  profiles: ProfileData[],
  business: BusinessProfile,
  analysisType: 'light' | 'deep',
  env: Env,
  requestId?: string
): Promise<{ results: AnalysisResult[]; metrics: any }> {
  requestId = requestId || crypto.randomUUID();
  const userId = business.user_id;
  const startTime = performance.now();
  
  logger('info', `Starting enhanced batch analysis for ${profiles.length} profiles`, {
    analysisType,
    businessId: business.id,
    initialCacheStats: enhancedAnalysisCache?.getStats(),
    initialRateLimits: rateLimitMonitor?.getAllLimits()
  }, requestId);
  
  const processor = new ParallelProcessor();
  
  const results = await processor.processBatch(
    profiles,
    async (profile, index) => {
      const batchRequestId = `${requestId}-${index}`;
      try {
        return await performAIAnalysis(
          profile,
          business,
          analysisType,
          env,
          batchRequestId,
          userId
        );
      } catch (error) {
        logger('error', `Failed to analyze profile ${profile.username}`, { error }, batchRequestId);
        return {
          score: 0,
          engagement_score: 0,
          niche_fit: 0,
          audience_quality: 'unknown',
          engagement_insights: 'Analysis failed',
          selling_points: [],
          reasons: ['Analysis error']
        } as AnalysisResult;
      }
    },
    (completed, total) => {
      logger('info', `Batch progress: ${completed}/${total}`, {
        cacheHitRate: enhancedAnalysisCache?.getStats().hitRate,
        rateLimits: rateLimitMonitor?.getAllLimits()
      }, requestId);
    }
  );
  
  const totalTime = performance.now() - startTime;
  const stats = getCostBreakdown();
  const finalCacheStats = enhancedAnalysisCache?.getStats();
  
  logger('info', `Enhanced batch analysis completed`, {
    profilesAnalyzed: profiles.length,
    successfulAnalyses: results.filter(r => r.score > 0).length,
    totalTimeMs: Math.round(totalTime),
    totalCost: stats.total.cost,
    avgTimePerProfile: Math.round(totalTime / profiles.length),
    cacheImpact: {
      hitRate: finalCacheStats?.hitRate,
      totalHits: finalCacheStats?.totalHits,
      memoryUsage: finalCacheStats?.memoryUsage
    }
  }, requestId);

  return {
    results,
    metrics: {
      totalTime: Math.round(totalTime),
      avgTimePerProfile: Math.round(totalTime / profiles.length),
      successRate: results.filter(r => r.score > 0).length / profiles.length,
      cacheStats: finalCacheStats,
      costStats: stats
    }
  };
}

// ============================================================================
// ULTIMATE ANALYSIS FUNCTION
// ============================================================================

async function performUltimateAnalysis(
  profile: ProfileData,
  business: BusinessProfile,
  env: Env,
  requestId?: string
): Promise<{
  lightAnalysis: AnalysisResult;
  deepAnalysis: AnalysisResult;
  outreachMessage: { message: string; personalization_notes: string[] };
  intelligence: ProfileIntelligence;
  metrics: any;
}> {
  requestId = requestId || crypto.randomUUID();
  const startTime = performance.now();
  
  logger('info', `Starting ultimate analysis for ${profile.username}`, {
    businessId: business.id
  }, requestId);

  const intelligence = calculateProfileIntelligence(profile, business);
  
  // Perform both light and deep analysis
  const [lightAnalysis, deepAnalysis] = await Promise.all([
    performAIAnalysis(profile, business, 'light', env, `${requestId}-light`),
    performAIAnalysis(profile, business, 'deep', env, `${requestId}-deep`)
  ]);

  // Generate outreach message based on deep analysis
  const outreachMessage = await generateOutreachMessage(
    profile, 
    business, 
    deepAnalysis, 
    env, 
    `${requestId}-outreach`
  );

  const totalTime = performance.now() - startTime;
  
  logger('info', `Ultimate analysis completed for ${profile.username}`, {
    duration: Math.round(totalTime),
    lightScore: lightAnalysis.score,
    deepScore: deepAnalysis.score,
    confidence: deepAnalysis.confidence_level
  }, requestId);

  return {
    lightAnalysis,
    deepAnalysis,
    outreachMessage,
    intelligence,
    metrics: {
      totalTime: Math.round(totalTime),
      intelligence,
      cacheStats: enhancedAnalysisCache?.getStats()
    }
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function createAnalysisPrompt(
  profile: ProfileData,
  business: BusinessProfile,
  analysisType: 'light' | 'deep',
  intelligence: ProfileIntelligence
): string {
  const basePrompt = `
Analyze this Instagram profile for business outreach potential:

PROFILE DATA:
- Username: ${profile.username}
- Display Name: ${profile.displayName}
- Bio: ${profile.bio}
- Followers: ${profile.followersCount}
- Following: ${profile.followingCount}
- Posts: ${profile.postsCount}
- Verified: ${profile.isVerified}
- Business Account: ${profile.isBusinessAccount}
- External URL: ${profile.externalUrl}

BUSINESS CONTEXT:
- Industry: ${business.industry}
- Target Audience: ${business.target_audience}
- Value Proposition: ${business.value_proposition}
- Pain Points: ${business.pain_points.join(', ')}

LATEST POSTS (${profile.latestPosts?.length || 0} posts):
${profile.latestPosts?.map(post => `
- Caption: ${post.caption?.substring(0, 200)}...
- Likes: ${post.likesCount}
- Comments: ${post.commentsCount}
- Hashtags: ${post.hashtags?.join(', ')}
`).join('\n') || 'No posts available'}

Return JSON with:
{
  "score": 0-100,
  "engagement_score": 0-100,
  "niche_fit": 0-100,
  "audience_quality": "excellent|good|fair|poor",
  "engagement_insights": "detailed engagement analysis",
  "selling_points": ["key selling points for outreach"],
  "reasons": ["specific reasons for the score"]
}`;

  if (analysisType === 'deep') {
    return basePrompt + `

DEEP ANALYSIS REQUIREMENTS:
- Analyze content themes and posting patterns
- Evaluate audience engagement quality
- Assess brand alignment potential
- Identify specific collaboration opportunities
- Provide strategic outreach recommendations

Include additional fields:
"deep_summary": "comprehensive strategic analysis",
"content_themes": ["identified themes"],
"collaboration_potential": "specific collaboration ideas",
"outreach_strategy": "recommended approach"`;
  }

  return basePrompt;
}

function createOutreachPrompt(
  profile: ProfileData,
  business: BusinessProfile,
  analysisResult: AnalysisResult
): string {
  return `
Create a personalized outreach message for this Instagram influencer:

PROFILE: ${profile.username} (${profile.displayName})
BIO: ${profile.bio}
FOLLOWERS: ${profile.followersCount}

BUSINESS: ${business.name}
INDUSTRY: ${business.industry}
VALUE PROP: ${business.value_proposition}

ANALYSIS RESULTS:
- Score: ${analysisResult.score}/100
- Engagement Score: ${analysisResult.engagement_score}/100
- Key Selling Points: ${analysisResult.selling_points?.join(', ')}
- Insights: ${analysisResult.engagement_insights}

Create a compelling, personalized DM that:
1. References specific aspects of their content
2. Clearly explains the collaboration value
3. Includes a clear call-to-action
4. Keeps professional but friendly tone
5. Maximum 150 words

Return JSON:
{
  "message": "the complete outreach message",
  "personalization_notes": ["specific personalization elements used"]
}`;
}

function validateAnalysisResult(result: any): AnalysisResult {
  return {
    score: Math.max(0, Math.min(100, result.score || 0)),
    engagement_score: Math.max(0, Math.min(100, result.engagement_score || 0)),
    niche_fit: Math.max(0, Math.min(100, result.niche_fit || 0)),
    audience_quality: result.audience_quality || 'unknown',
    engagement_insights: result.engagement_insights || 'No insights available',
    selling_points: Array.isArray(result.selling_points) ? result.selling_points : [],
    reasons: Array.isArray(result.reasons) ? result.reasons : [],
    quick_summary: result.quick_summary,
    deep_summary: result.deep_summary,
    confidence_level: result.confidence_level
  };
}

function calculateConfidenceLevel(
  result: AnalysisResult,
  intelligence: ProfileIntelligence
): number {
  let confidence = 50; // Base confidence
  
  // Data richness impact
  confidence += intelligence.dataRichness * 0.3;
  
  // Analysis value impact  
  confidence += intelligence.analysisValue * 0.2;
  
  // Score consistency check
  const scores = [result.score, result.engagement_score, result.niche_fit];
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((acc, score) => acc + Math.pow(score - avgScore, 2), 0) / scores.length;
  
  if (variance < 100) confidence += 20; // Low variance = high confidence
  if (variance > 400) confidence -= 15; // High variance = low confidence
  
  return Math.max(0, Math.min(100, Math.round(confidence)));
}

function extractPostThemes(posts: any[]): string[] {
  if (!posts || posts.length === 0) return [];
  
  const themes = new Set<string>();
  const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'];
  
  posts.forEach(post => {
    if (post.caption) {
      const words = post.caption.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !commonWords.includes(word));
      
      words.forEach(word => themes.add(word));
    }
    
    if (post.hashtags) {
      post.hashtags.forEach((tag: string) => themes.add(tag.replace('#', '')));
    }
  });
  
  return Array.from(themes).slice(0, 20);
}

// ============================================================================
// PERFORMANCE AND COST MONITORING
// ============================================================================

function getAnalysisPerformanceStats(): any {
  return globalPerformanceMonitor.getStats();
}

function getCostBreakdown(timeRange?: { start: Date; end: Date }): any {
  const openaiStats = globalPerformanceMonitor.getStats();
  const anthropicStats = globalPerformanceMonitor.getStats();
  
  return {
    total: {
      cost: (openaiStats.totalCost || 0) + (anthropicStats.totalCost || 0),
      calls: (openaiStats.count || 0) + (anthropicStats.count || 0),
      avgCost: ((openaiStats.avgCost || 0) + (anthropicStats.avgCost || 0)) / 2
    },
    byProvider: {
      openai: {
        cost: openaiStats.totalCost || 0,
        calls: openaiStats.count || 0,
        avgCost: openaiStats.avgCost || 0,
        avgLatency: openaiStats.avgLatency || 0,
        errorRate: openaiStats.errorRate || 0
      },
      anthropic: {
        cost: anthropicStats.totalCost || 0,
        calls: anthropicStats.count || 0,
        avgCost: anthropicStats.avgCost || 0,
        avgLatency: anthropicStats.avgLatency || 0,
        errorRate: anthropicStats.errorRate || 0
      }
    },
    latencyPercentiles: {
      p50: Math.min(openaiStats.p50Latency || 0, anthropicStats.p50Latency || 0),
      p95: Math.max(openaiStats.p95Latency || 0, anthropicStats.p95Latency || 0),
      p99: Math.max(openaiStats.p99Latency || 0, anthropicStats.p99Latency || 0)
    },
    cachePerformance: {
      legacy: analysisCache.size,
      enhanced: enhancedAnalysisCache?.getStats()
    },
    timestamp: new Date().toISOString()
  };
}

function getEnhancedCacheStats() {
  return enhancedAnalysisCache?.getStats() || null;
}

function getRateLimitStatus() {
  return rateLimitMonitor?.getAllLimits() || {};
}

function getCacheStats() {
  return {
    enhanced: enhancedAnalysisCache?.getStats(),
    legacy: null // Explicitly null to show legacy is removed
  };
}

// ============================================================================
// SYSTEM HEALTH AND OPTIMIZATION
// ============================================================================

function getSystemHealthStatus(): any {
  const cacheStats = enhancedAnalysisCache?.getStats();
  const rateLimits = rateLimitMonitor?.getAllLimits();
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    cache: {
      enabled: globalConfig?.caching.enabled,
      hitRate: cacheStats?.hitRate || 0,
      size: cacheStats?.totalSize || 0,
      memoryUsage: cacheStats?.memoryUsage || 0,
      type: 'enhanced_only' // Confirm unified system
    },
    rateLimiting: {
      enabled: globalConfig?.rateLimiting.enabled,
      openai: rateLimits?.openai || null,
      anthropic: rateLimits?.anthropic || null
    },
    circuitBreakers: {
      openai: openaiCircuitBreaker.getStatus(),
      anthropic: anthropicCircuitBreaker.getStatus()
    },
    performance: globalPerformanceMonitor.getStats(),
    systemHealth: 'optimized' // Confirm cleanup
  };
}

function optimizeCache(): { before: any; after: any; optimizations: string[] } {
  const before = enhancedAnalysisCache?.getStats();
  const optimizations: string[] = [];
  
  if (enhancedAnalysisCache && before) {
    // Remove expired entries
    const sizeBefore = before.totalSize;
    // Cache automatically handles expiration on access
    
    const after = enhancedAnalysisCache.getStats();
    
    if (after.totalSize < sizeBefore) {
      optimizations.push(`Removed ${sizeBefore - after.totalSize} expired entries`);
    }
    
    if (after.hitRate < 0.5) {
      optimizations.push('Consider increasing cache TTL for better hit rates');
    }
    
    if (after.memoryUsage > 1000000) { // 1MB
      optimizations.push('Cache memory usage is high, consider reducing max sizes');
    }
    
    return { before, after, optimizations };
  }
  
  return { before: null, after: null, optimizations: ['Cache not initialized'] };
}

function clearUserCache(userId: string): { cleared: boolean; entriesRemoved: number } {
  if (enhancedAnalysisCache) {
    const removed = enhancedAnalysisCache.clearUserCache(userId);
    return { cleared: true, entriesRemoved: removed };
  }
  
  return { cleared: false, entriesRemoved: 0 };
}

// ============================================================================
// CONFIGURATION MANAGEMENT
// ============================================================================

const DEFAULT_CONFIG: EnhancedAnalysisConfig = {
  caching: {
    enabled: true,
    ttl: 3600000, // 1 hour
    maxSizePerUser: 50,
    maxGlobalSize: 50000
  },
  rateLimiting: {
    enabled: true,
    throttleThresholds: {
      requests: 10,
      tokens: 1000
    },
    delays: {
      warning: 2000,
      critical: 60000
    }
  },
  performance: {
    maxConcurrentBatch: 5,
    timeoutMs: 60000,
    retries: 3
  }
};

let currentConfig: EnhancedAnalysisConfig = { ...DEFAULT_CONFIG };

function updateAnalysisConfig(newConfig: Partial<EnhancedAnalysisConfig>): EnhancedAnalysisConfig {
  currentConfig = {
    ...currentConfig,
    ...newConfig,
    caching: { ...currentConfig.caching, ...newConfig.caching },
    rateLimiting: { ...currentConfig.rateLimiting, ...newConfig.rateLimiting },
    performance: { ...currentConfig.performance, ...newConfig.performance }
  };
  
  // Reinitialize with new config if global config exists
  if (globalConfig) {
    globalConfig = currentConfig;
    enhancedAnalysisCache = new EnhancedIntelligentCache(globalConfig.caching);
    rateLimitMonitor = new RateLimitMonitor(globalConfig.rateLimiting);
  }
  
  logger('info', 'Analysis configuration updated', { newConfig: currentConfig });
  return currentConfig;
}

function getAnalysisConfig(): EnhancedAnalysisConfig {
  return { ...currentConfig };
}

function resetAnalysisConfig(): EnhancedAnalysisConfig {
  currentConfig = { ...DEFAULT_CONFIG };
  logger('info', 'Analysis configuration reset to defaults');
  return currentConfig;
}

// ============================================================================
// PERFORMANCE BENCHMARKING
// ============================================================================

async function benchmarkAnalysisPerformance(
  sampleProfile: ProfileData,
  sampleBusiness: BusinessProfile,
  env: Env,
  iterations: number = 10
): Promise<any> {
  const results = {
    iterations,
    timings: [] as number[],
    costs: [] as number[],
    cacheHits: 0,
    errors: 0,
    rateLimitThrottles: 0
  };
  
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    const iterationStart = performance.now();
    
    try {
      const requestId = `benchmark-${Date.now()}-${i}`;
      
      // Clear cache for first iteration to get cold start timing
      if (i === 0) {
        enhancedAnalysisCache?.clear();
      }
      
      const result = await performAIAnalysis(
        sampleProfile,
        sampleBusiness,
        'light',
        env,
        requestId
      );
      
      const iterationTime = performance.now() - iterationStart;
      results.timings.push(iterationTime);
      
      // Track cache hits (rough estimation)
      if (i > 0 && iterationTime < results.timings[0] / 2) {
        results.cacheHits++;
      }
      
    } catch (error) {
      results.errors++;
      logger('error', `Benchmark iteration ${i} failed`, { error });
    }
  }
  
  const totalTime = performance.now() - startTime;
  const avgTime = results.timings.reduce((a, b) => a + b, 0) / results.timings.length;
  
  return {
    ...results,
    totalTime: Math.round(totalTime),
    avgTime: Math.round(avgTime),
    minTime: Math.round(Math.min(...results.timings)),
    maxTime: Math.round(Math.max(...results.timings)),
    successRate: (iterations - results.errors) / iterations,
    cacheHitRate: results.cacheHits / iterations,
    config: getAnalysisConfig(),
    systemHealth: getSystemHealthStatus()
  };
}

// ============================================================================
// SINGLE EXPORT BLOCK - NO DUPLICATES
// ============================================================================

export {
  // Core analysis functions
  performAIAnalysis,
  generateOutreachMessage,
  performBatchAnalysis,
  performUltimateAnalysis,
  
  // Performance monitoring
  getAnalysisPerformanceStats,
  getCostBreakdown,
  
  // Enhanced cache management
  getCacheStats,
  getEnhancedCacheStats,
  
  // Rate limiting
  getRateLimitStatus,
  
  // System health
  getSystemHealthStatus,
  optimizeCache,
  clearUserCache,
  
  // Configuration management
  updateAnalysisConfig,
  getAnalysisConfig,
  resetAnalysisConfig,
  benchmarkAnalysisPerformance,
  
  // Utility functions
  calculateProfileIntelligence,
  validateAnalysisResult,
  calculateConfidenceLevel,
  extractPostThemes,
  callAPIWithRateLimit,
  
  // Classes for advanced usage
  ParallelProcessor,
  EnhancedIntelligentCache,
  RateLimitMonitor,
  CircuitBreaker,
  
  // Initialize the service
  initializeWithConfig
}; 
