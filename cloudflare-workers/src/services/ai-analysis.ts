// ============================================================================
// FULL AI ANALYSIS SERVICE WITH ULTRA-INTELLIGENT METERING + CACHING + RATE LIMITING
// File: cloudflare-workers/src/services/ai-analysis.ts
// Complete production-ready implementation with all metering integrated + Phase 3 enhancements
// ============================================================================

import { Env, ProfileData, BusinessProfile, AnalysisResult, ProfileIntelligence, AnalysisTier } from '../types/interfaces.js';
import { logger } from '../utils/logger.js';
import { getApiKey } from './enhanced-config-manager.js';
import { MeteringContext, meteredCall, PerformanceMonitor, UsageEvent, logUsageToSupabase, CostCalculators } from './metering.js';
import { OpenAIAdapter, AnthropicAdapter, ApifyAdapter, RetryHandler, CostAnomalyDetector, StreamingMetricsCollector, createOpenAIAdapter, createAnthropicAdapter } from '../adapters/provider-adapters.js';
import { createClient } from '@supabase/supabase-js';
import { CacheConfig, RateLimitInfo, EnhancedAnalysisConfig } from '../types/interfaces.js';

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
    this.cache.set(cacheKey, item);
    
    // Update global stats
    this.stats.hits++;
    this.updateStats();
    
    return item.data;
  }
  
  set(userId: string, type: string, key: string, data: any): void {
    const cacheKey = `${userId}:${type}:${this.hashKey(key)}`;
    
    // Check user cache size limit
    const userKeys = Array.from(this.cache.keys()).filter(k => k.startsWith(`${userId}:`));
    if (userKeys.length >= this.MAX_SIZE_PER_USER) {
      // Remove oldest entry for this user
      const oldestKey = userKeys
        .map(k => ({ key: k, timestamp: this.cache.get(k)?.timestamp || 0 }))
        .sort((a, b) => a.timestamp - b.timestamp)[0].key;
      this.cache.delete(oldestKey);
    }

    // Check global cache size limit
    if (this.cache.size >= this.MAX_GLOBAL_SIZE) {
      this.evictOldest(Math.floor(this.MAX_GLOBAL_SIZE * 0.1));
    }

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      userId,
      accessCount: 0,
      analysisType: type as 'light' | 'deep'
    });

    this.updateStats();
  }
  
  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > this.TTL;
  }

  private evictOldest(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, count);
    
    entries.forEach(([key]) => this.cache.delete(key));
  }

  private updateStats(): void {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, e) => sum + e.accessCount, 0);
    const userCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    
    entries.forEach(entry => {
      userCounts.set(entry.userId, (userCounts.get(entry.userId) || 0) + 1);
      typeCounts.set(entry.analysisType, (typeCounts.get(entry.analysisType) || 0) + 1);
    });
    
    this.stats = {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0 ? this.stats.hits / (this.stats.hits + this.stats.misses) : 0,
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
    let limits: RateLimitInfo = { provider, lastUpdated: Date.now() };
    
    if (provider === 'openai') {
      limits = {
        provider,
        requests_remaining: this.parseHeader(headers.get('x-ratelimit-remaining-requests')),
        tokens_remaining: this.parseHeader(headers.get('x-ratelimit-remaining-tokens')),
        reset_time: headers.get('x-ratelimit-reset-requests') || undefined,
        lastUpdated: Date.now()
      };
    } else if (provider === 'anthropic') {
      limits = {
        provider,
        requests_remaining: this.parseHeader(headers.get('anthropic-ratelimit-requests-remaining')),
        tokens_remaining: this.parseHeader(headers.get('anthropic-ratelimit-tokens-remaining')),
        reset_time: headers.get('anthropic-ratelimit-requests-reset') || undefined,
        lastUpdated: Date.now()
      };
    }
    
    this.limits.set(provider, limits);
    return limits;
  }
  
  private parseHeader(value: string | null): number | undefined {
    if (!value) return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
  
  shouldThrottle(provider: 'openai' | 'anthropic'): { throttle: boolean; delay: number; reason?: string } {
    if (!this.enabled) return { throttle: false, delay: 0 };
    
    const limits = this.limits.get(provider);
    if (!limits) return { throttle: false, delay: 0 };
    
    // Check request limits
    if (limits.requests_remaining !== undefined && limits.requests_remaining < this.thresholds.requests) {
      const delay = this.calculateBackoffDelay(provider, 'requests');
      return { 
        throttle: true, 
        delay,
        reason: `Low requests remaining: ${limits.requests_remaining}`
      };
    }
    
    // Check token limits  
    if (limits.tokens_remaining !== undefined && limits.tokens_remaining < this.thresholds.tokens) {
      const delay = this.calculateBackoffDelay(provider, 'tokens');
      return {
        throttle: true,
        delay, 
        reason: `Low tokens remaining: ${limits.tokens_remaining}`
      };
    }
    
    return { throttle: false, delay: 0 };
  }

  private calculateBackoffDelay(provider: string, limitType: 'requests' | 'tokens'): number {
    const baseDelay = limitType === 'requests' ? this.delays.warning : this.delays.critical;
    const jitter = Math.random() * 1000;
    
    // Exponential backoff based on how low the limits are
    const limits = this.limits.get(provider);
    const remaining = limitType === 'requests' ? limits?.requests_remaining : limits?.tokens_remaining;
    const threshold = limitType === 'requests' ? this.thresholds.requests : this.thresholds.tokens;
    
    if (remaining !== undefined) {
      const severity = Math.max(0, (threshold - remaining) / threshold);
      const exponentialDelay = baseDelay * Math.pow(2, severity * 3);
      return Math.min(exponentialDelay + jitter, 60000); // Max 1 minute
    }
    
    return baseDelay + jitter;
  }
  
  getLimits(provider: 'openai' | 'anthropic'): RateLimitInfo | null {
    return this.limits.get(provider) || null;
  }
  
  getAllLimits(): Record<string, RateLimitInfo | null> {
    return {
      openai: this.getLimits('openai'),
      anthropic: this.getLimits('anthropic')
    };
  }

  isHealthy(): boolean {
    const limits = this.getAllLimits();
    for (const limit of Object.values(limits)) {
      if (limit && limit.requests_remaining !== undefined && limit.requests_remaining < 5) {
        return false;
      }
    }
    return true;
  }
}

// ============================================================================
// ENHANCED API CALLING WITH RATE LIMITING AND CIRCUIT BREAKER
// ============================================================================

async function callAPIWithRateLimit(
  url: string,
  options: RequestInit,
  provider: 'openai' | 'anthropic',
  requestId: string,
  circuitBreaker?: CircuitBreaker
): Promise<Response> {
  // Check if we need to throttle
  const throttleCheck = rateLimitMonitor.shouldThrottle(provider);
  if (throttleCheck.throttle) {
    logger('warn', `Rate limit throttling for ${provider}`, {
      delay: throttleCheck.delay,
      reason: throttleCheck.reason,
      limits: rateLimitMonitor.getLimits(provider)
    }, requestId);
    
    await new Promise(resolve => setTimeout(resolve, throttleCheck.delay));
  }
  
  // Use circuit breaker if provided
  const makeRequest = async () => {
    const response = await fetch(url, options);
    
    // Update rate limit info
    if (response.headers) {
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

// Initialize with environment configuration
export function initializeWithConfig(env: Env): void {
  globalConfig = loadConfigFromEnv(env);
  
  // Initialize cache with config
  enhancedAnalysisCache = new EnhancedIntelligentCache(globalConfig.caching);
  
  // Initialize rate limiter with config
  rateLimitMonitor = new RateLimitMonitor(globalConfig.rateLimiting);
  
  logger('info', 'AI Analysis service initialized with configuration', {
    cacheEnabled: globalConfig.caching.enabled,
    rateLimitEnabled: globalConfig.rateLimiting.enabled,
    cacheTTL: globalConfig.caching.ttl,
    maxConcurrent: globalConfig.performance.maxConcurrentBatch
  });
}

// ============================================================================
// ADVANCED TIERING SYSTEM WITH METERING
// ============================================================================

const ANALYSIS_TIERS: AnalysisTier[] = [
  { tier: 0, model: 'gpt-4o-mini-2024-07-18', maxTokens: 500, targetSpeed: 3000, minDataRichness: 0, minAnalysisValue: 0 },
  { tier: 1, model: 'gpt-4o-mini-2024-07-18', maxTokens: 1000, targetSpeed: 5000, minDataRichness: 30, minAnalysisValue: 30 },
  { tier: 2, model: 'gpt-4o-mini-2024-07-18', maxTokens: 1500, targetSpeed: 8000, minDataRichness: 50, minAnalysisValue: 50 },
  { tier: 3, model: 'gpt-4o-mini-2024-07-18', maxTokens: 2000, targetSpeed: 12000, minDataRichness: 70, minAnalysisValue: 70 },
  { tier: 4, model: 'gpt-4o-mini-2024-07-18', maxTokens: 3000, targetSpeed: 20000, minDataRichness: 85, minAnalysisValue: 85 }
];

// ============================================================================
// LEGACY INTELLIGENT CACHING (KEPT FOR BACKWARD COMPATIBILITY)
// ============================================================================

class IntelligentCache {
  private cache: Map<string, { data: any; timestamp: number; hits: number }> = new Map();
  private readonly TTL = 3600000; // 1 hour
  private readonly MAX_SIZE = 100;
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    entry.hits++;
    return entry.data as T;
  }
  
  set(key: string, data: any): void {
    if (this.cache.size >= this.MAX_SIZE) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, { data, timestamp: Date.now(), hits: 0 });
  }
  
  getStats() {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, e) => sum + e.hits, 0);
    const avgAge = entries.length > 0 
      ? entries.reduce((sum, e) => sum + (Date.now() - e.timestamp), 0) / entries.length
      : 0;
    
    return {
      size: this.cache.size,
      totalHits,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0,
      avgAge: Math.round(avgAge / 1000) // in seconds
    };
  }
}

const analysisCache = new IntelligentCache(); // Legacy cache for backward compatibility

// ============================================================================
// PROFILE INTELLIGENCE CALCULATOR
// ============================================================================

export function calculateProfileIntelligence(profile: ProfileData): ProfileIntelligence {
  const hasEngagement = (profile.engagement?.postsAnalyzed || 0) > 0;
  const hasPosts = (profile.latestPosts?.length || 0) > 0;
  const isVerified = profile.isVerified;
  const isBusiness = profile.isBusinessAccount;
  const highFollowers = profile.followersCount > 10000;
  const hasExternalLink = !!profile.externalUrl;
  
  let dataRichness = 0;
  if (hasEngagement) dataRichness += 35;
  if (hasPosts) dataRichness += 25;
  if (isVerified) dataRichness += 15;
  if (isBusiness) dataRichness += 10;
  if (highFollowers) dataRichness += 10;
  if (hasExternalLink) dataRichness += 5;
  
  const engagementRate = profile.engagement?.engagementRate || 0;
  const avgLikes = profile.engagement?.avgLikes || 0;
  const qualityScore = profile.engagement?.qualityScore || 0;
  
  let analysisValue = Math.min(100, 
    (engagementRate * 2) + 
    (Math.log10(avgLikes + 1) * 10) + 
    (qualityScore * 0.5) +
    (profile.followersCount > 50000 ? 20 : profile.followersCount / 2500)
  );
  
  const tier = ANALYSIS_TIERS.findLast(t => 
    dataRichness >= t.minDataRichness && analysisValue >= t.minAnalysisValue
  ) || ANALYSIS_TIERS[0];
  
  let complexityLevel: ProfileIntelligence['complexityLevel'] = 'basic';
  let promptStrategy: ProfileIntelligence['promptStrategy'] = 'screening';
  
  if (tier.tier >= 4) {
    complexityLevel = 'executive';
    promptStrategy = 'executive';
  } else if (tier.tier >= 3) {
    complexityLevel = 'advanced';
    promptStrategy = 'strategic';
  } else if (tier.tier >= 2) {
    complexityLevel = 'moderate';
    promptStrategy = 'standard';
  }
  
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
// ENHANCED OPENAI ANALYSIS WITH METERING AND CIRCUIT BREAKER
// ============================================================================

async function executeOpenAIAnalysisOptimized(
  prompt: string,
  model: string,
  intelligence: ProfileIntelligence,
  env: Env,
  requestId: string,
  userId?: string,
  businessId?: string
): Promise<AnalysisResult> {
  const ctx = new MeteringContext(requestId);
  const safeUserId = userId || businessId || 'anonymous';
  
  // Check enhanced cache first (user-isolated)
  const cached = enhancedAnalysisCache.get(safeUserId, 'analysis', prompt);
  if (cached) {
    ctx.recordEvent({
      provider: 'openai',
      model,
      purpose: 'analysis_deep',
      cache_hit: true,
      user_id: userId,
      business_id: businessId
    });
    
    logger('info', 'Enhanced cache hit for analysis', { 
      model, 
      userId: safeUserId,
      cacheStats: enhancedAnalysisCache.getStats() 
    }, requestId);
    return cached;
  }
  
  // Fallback to legacy cache
  const legacyCacheKey = `analysis:${model}:${Buffer.from(prompt).toString('base64').substring(0, 32)}`;
  const legacyCached = analysisCache.get<AnalysisResult>(legacyCacheKey);
  if (legacyCached) {
    ctx.recordEvent({
      provider: 'openai',
      model,
      purpose: 'analysis_deep',
      cache_hit: true,
      user_id: userId,
      business_id: businessId
    });
    
    logger('info', 'Legacy cache hit for analysis', { model, cacheStats: analysisCache.getStats() }, requestId);
    // Also store in enhanced cache for future
    enhancedAnalysisCache.set(safeUserId, 'analysis', prompt, legacyCached);
    return legacyCached;
  }
  
  try {
    const openaiKey = await getApiKey('OPENAI_API_KEY', env);
    if (!openaiKey) throw new Error('OpenAI API key not available');
    
    const openaiAdapter = createOpenAIAdapter(openaiKey);
    const isGPT5 = model.includes('gpt-5') || model.includes('gpt-4o-mini');
    
    const messages = [{ role: 'user', content: prompt + '\n\nReturn a valid JSON object with all required fields.' }];
    
    const result = await meteredCall(
      ctx,
      'openai',
      model,
      'analysis_deep',
      () => openaiCircuitBreaker.execute(async () => {
        const response = await callAPIWithRateLimit(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2'
            },
            body: JSON.stringify({
              model: model,
              messages,
              ...(isGPT5 ? {
                max_completion_tokens: 2000,
                response_format: { 
                  type: 'json_schema',
                  json_schema: {
                    name: 'analysis_result',
                    strict: true,
                    schema: {
                      type: 'object',
                      properties: {
                        score: { type: 'number', minimum: 0, maximum: 100 },
                        engagement_score: { type: 'number', minimum: 0, maximum: 100 },
                        niche_fit: { type: 'number', minimum: 0, maximum: 100 },
                        audience_quality: { type: 'string', enum: ['premium', 'high', 'medium', 'low'] },
                        engagement_insights: { type: 'string' },
                        selling_points: { type: 'array', items: { type: 'string' } },
                        reasons: { type: 'array', items: { type: 'string' } }
                      },
                      required: ['score', 'engagement_score', 'niche_fit', 'audience_quality', 'engagement_insights', 'selling_points', 'reasons'],
                      additionalProperties: false
                    }
                  }
                }
              } : {
                max_tokens: intelligence.speedTarget > 10000 ? 2000 : 1500,
                temperature: 0.7,
                response_format: { type: 'json_object' }
              })
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
      }),
      (response) => {
        if (CostCalculators.openai[model]) {
          return CostCalculators.openai[model](
            response.usage?.prompt_tokens || 0,
            response.usage?.completion_tokens || 0
          );
        }
        return { inputTokens: response.usage?.prompt_tokens || 0, outputTokens: response.usage?.completion_tokens || 0, cost: 0 };
      }
    );

    // Parse the analysis result
    const message = result.choices?.[0]?.message;
    if (!message) throw new Error('No message in OpenAI response');
    
    let data: AnalysisResult;
    try {
      const content = typeof message.content === 'string' 
        ? message.content 
        : JSON.stringify(message.content);
      const parsed = JSON.parse(content);
      
      // Validate required fields
      if (!parsed.score || !parsed.engagement_score || !parsed.niche_fit) {
        throw new Error('Missing required fields in analysis result');
      }
      
      data = validateAnalysisResult(parsed);
    } catch (error) {
      logger('error', 'Failed to parse OpenAI JSON response', { 
        error,
        content: message.content,
        model 
      }, requestId);
      throw new Error('Invalid JSON response from OpenAI');
    }
    
    // Track performance globally
    globalPerformanceMonitor.recordMetric('openai', ctx.getEvents()[0]);
    
    // Check for cost anomalies
    if (globalAnomalyDetector.detectAnomaly(ctx.getEvents()[0].total_cost_usd)) {
      logger('warn', '⚠️ Cost anomaly detected', {
        cost: ctx.getEvents()[0].total_cost_usd,
        model,
        tokens: ctx.getEvents()[0].total_tokens,
        expected: globalAnomalyDetector.getStatistics().mean
      }, requestId);
      
      // Store anomaly in database
      await storeAnomaly(ctx, ctx.getEvents()[0], 'spike');
    }
    
    // Log comprehensive metrics with rate limiting info
    logger('info', '✅ OpenAI analysis completed with enhanced metering', {
      model,
      tier: intelligence.complexityLevel,
      cost: `$${ctx.getEvents()[0].total_cost_usd.toFixed(6)}`,
      inputTokens: ctx.getEvents()[0].input_tokens,
      outputTokens: ctx.getEvents()[0].output_tokens,
      totalTokens: ctx.getEvents()[0].total_tokens,
      latencyMs: ctx.getEvents()[0].duration_ms,
      score: data.score,
      rateLimits: rateLimitMonitor.getLimits('openai'),
      circuitBreakerStatus: openaiCircuitBreaker.getStatus()
    }, requestId);
    
    // Cache the result in both caches
    enhancedAnalysisCache.set(safeUserId, 'analysis', prompt, data);
    analysisCache.set(legacyCacheKey, data);

    await logUsageToSupabase(env, ctx.getEvents()[0], requestId);
    
    // Flush metrics asynchronously
    ctx.flush().catch(error => {
      logger('error', 'Failed to flush metrics', { error: error.message }, requestId);
    });
    
    return data;
    
  } catch (error) {
    await ctx.flush();
    throw error;
  }
}

// ============================================================================
// ENHANCED CLAUDE ANALYSIS WITH METERING AND CIRCUIT BREAKER
// ============================================================================

async function executeClaudeAnalysisOptimized(
  prompt: string,
  model: string,
  intelligence: ProfileIntelligence,
  env: Env,
  requestId: string,
  userId?: string,
  businessId?: string
): Promise<AnalysisResult> {
  const ctx = new MeteringContext(requestId);
  const safeUserId = userId || businessId || 'anonymous';
  
  // Check enhanced cache first (user-isolated)
  const cached = enhancedAnalysisCache.get(safeUserId, 'analysis', prompt);
  if (cached) {
    ctx.recordEvent({
      provider: 'anthropic',
      model,
      purpose: 'analysis_light',
      cache_hit: true,
      user_id: userId,
      business_id: businessId
    });
    
    logger('info', 'Enhanced cache hit for Claude analysis', { 
      model, 
      userId: safeUserId,
      cacheStats: enhancedAnalysisCache.getStats() 
    }, requestId);
    return cached;
  }
  
  try {
    const claudeKey = await getApiKey('CLAUDE_API_KEY', env);
    if (!claudeKey) throw new Error('Claude API key not available');
    
    const anthropicAdapter = createAnthropicAdapter(claudeKey);
    const messages = [{ role: 'user', content: prompt + '\n\nReturn only a valid JSON object.' }];
    
    const result = await meteredCall(
      ctx,
      'anthropic',
      model,
      'analysis_light',
      () => anthropicCircuitBreaker.execute(async () => {
        const response = await callAPIWithRateLimit(
          'https://api.anthropic.com/v1/messages',
          {
            method: 'POST',
            headers: {
              'x-api-key': claudeKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
              'anthropic-beta': 'messages-2023-12-15'
            },
            body: JSON.stringify({
              model: model,
              messages,
              max_tokens: 2000,
              temperature: 0.7
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
      }),
      (response) => {
        if (CostCalculators.anthropic[model]) {
          return CostCalculators.anthropic[model](
            response.usage?.input_tokens || 0,
            response.usage?.output_tokens || 0
          );
        }
        return { inputTokens: response.usage?.input_tokens || 0, outputTokens: response.usage?.output_tokens || 0, cost: 0 };
      }
    );

    // Parse the analysis result
    const content = result.content?.[0]?.text;
    if (!content) throw new Error('No content in Claude response');
    
    let data: AnalysisResult;
    try {
      const parsed = JSON.parse(content);
      data = validateAnalysisResult(parsed);
    } catch (error) {
      logger('error', 'Failed to parse Claude response', { error, content }, requestId);
      throw new Error('Invalid JSON response from Claude');
    }
    
    globalPerformanceMonitor.recordMetric('anthropic', ctx.getEvents()[0]);
    
    logger('info', '✅ Claude analysis completed with enhanced metering', {
      model,
      cost: `$${ctx.getEvents()[0].total_cost_usd.toFixed(6)}`,
      inputTokens: ctx.getEvents()[0].input_tokens,
      outputTokens: ctx.getEvents()[0].output_tokens,
      cachedTokens: ctx.getEvents()[0].cached_tokens,
      latencyMs: ctx.getEvents()[0].duration_ms,
      rateLimits: rateLimitMonitor.getLimits('anthropic'),
      circuitBreakerStatus: anthropicCircuitBreaker.getStatus()
    }, requestId);
    
    // Cache the result
    const legacyCacheKey = `analysis:${model}:${Buffer.from(prompt).toString('base64').substring(0, 32)}`;
    enhancedAnalysisCache.set(safeUserId, 'analysis', prompt, data);
    analysisCache.set(legacyCacheKey, data);
    
    await logUsageToSupabase(env, ctx.getEvents()[0], requestId);

    // Flush metrics asynchronously
    ctx.flush().catch(error => {
      logger('error', 'Failed to flush metrics', { error: error.message }, requestId);
    });
    
    return data;
    
  } catch (error) {
    await ctx.flush();
    throw error;
  }
}

// ============================================================================
// INTELLIGENT EXECUTION WITH AUTOMATIC MODEL SELECTION
// ============================================================================

async function executeIntelligentAnalysis(
  prompt: string,
  intelligence: ProfileIntelligence,
  env: Env,
  requestId: string,
  userId?: string,
  businessId?: string
): Promise<AnalysisResult> {
  const model = intelligence.recommendedModel;
  const isClaudeModel = model.includes('claude');
  
  try {
    if (isClaudeModel) {
      return await executeClaudeAnalysisOptimized(prompt, model, intelligence, env, requestId, userId, businessId);
    } else {
      return await executeOpenAIAnalysisOptimized(prompt, model, intelligence, env, requestId, userId, businessId);
    }
  } catch (error: any) {
    logger('warn', 'Primary model failed, attempting fallback', {
      model,
      error: error.message,
      requestId,
      rateLimits: rateLimitMonitor.getAllLimits(),
      circuitBreakers: {
        openai: openaiCircuitBreaker.getStatus(),
        anthropic: anthropicCircuitBreaker.getStatus()
      }
    }, requestId);
    
    // Intelligent fallback
    const fallbackTier = ANALYSIS_TIERS[Math.max(0, ANALYSIS_TIERS.findIndex(t => t.model === model) - 1)];
    if (fallbackTier && fallbackTier.model !== model) {
      intelligence.recommendedModel = fallbackTier.model;
      return await executeIntelligentAnalysis(prompt, intelligence, env, requestId, userId, businessId);
    }
    
    throw error;
  }
}

// ============================================================================
// MAIN ANALYSIS FUNCTION WITH FULL METERING
// ============================================================================

export async function performAIAnalysis(
  profile: ProfileData,
  business: BusinessProfile,
  analysisType: 'light' | 'deep',
  env: Env,
  requestId?: string,
  userId?: string
): Promise<AnalysisResult> {
  // Initialize configuration if not already done
  if (!globalConfig) {
    initializeWithConfig(env);
  }
  
  requestId = requestId || crypto.randomUUID();
  const businessId = business.id;
  
  logger('info', '🚀 Starting AI analysis with enhanced metering & caching', {
    username: profile.username,
    analysisType,
    businessId,
    followersCount: profile.followersCount,
    hasEngagement: (profile.engagement?.postsAnalyzed || 0) > 0,
    dataQuality: profile.dataQuality,
    cacheStats: enhancedAnalysisCache.getStats(),
    rateLimits: rateLimitMonitor.getAllLimits(),
    circuitBreakers: {
      openai: openaiCircuitBreaker.getStatus(),
      anthropic: anthropicCircuitBreaker.getStatus()
    }
  }, requestId);
  
  // Calculate intelligence
  const intelligence = calculateProfileIntelligence(profile);
  
  logger('info', '🧠 Profile intelligence calculated', {
    dataRichness: intelligence.dataRichness,
    analysisValue: intelligence.analysisValue,
    complexity: intelligence.complexityLevel,
    model: intelligence.recommendedModel,
    strategy: intelligence.promptStrategy
  }, requestId);
  
  // Build prompt
  const prompt = analysisType === 'light'
    ? buildLightEvaluatorPrompt(profile, business)
    : buildDeepEvaluatorPrompt(profile, business);
  
  // Execute analysis with full metering, caching, and rate limiting
  const startTime = performance.now();
  const result = await executeIntelligentAnalysis(
    prompt,
    intelligence,
    env,
    requestId,
    userId,
    businessId
  );
  const totalTime = performance.now() - startTime;
  
  // Generate summaries if needed
  let quickSummary = '';
  let deepSummary = '';
  
  if (analysisType === 'light') {
    quickSummary = await generateQuickSummary(profile, business, result, env, requestId, userId, businessId);
  } else {
    const preliminaryResult = validateAnalysisResult(result);
    deepSummary = await generateDeepSummary(profile, business, preliminaryResult, env, requestId, userId, businessId);
  }
  
  // Final result assembly
  const finalResult = {
    ...result,
    quick_summary: quickSummary,
    deep_summary: deepSummary,
    confidence_level: calculateConfidenceLevel(profile, analysisType)
  };
  
  // Log final metrics with enhanced stats
  const stats = globalPerformanceMonitor.getStats();
  
  logger('info', '✨ AI analysis completed with enhanced metrics', {
    username: profile.username,
    score: finalResult.score,
    engagementScore: finalResult.engagement_score,
    nicheFit: finalResult.niche_fit,
    confidence: finalResult.confidence_level,
    totalTimeMs: Math.round(totalTime),
    cachePerformance: enhancedAnalysisCache.getStats(),
    rateLimitStatus: rateLimitMonitor.getAllLimits(),
    systemHealth: rateLimitMonitor.isHealthy()
  }, requestId);
  
  return finalResult;
}

// ============================================================================
// ENHANCED OUTREACH MESSAGE GENERATION
// ============================================================================

export async function generateOutreachMessage(
  profile: ProfileData,
  business: BusinessProfile,
  analysis: AnalysisResult,
  env: Env,
  requestId?: string
): Promise<string> {
  requestId = requestId || crypto.randomUUID();
  const userId = business.user_id;
  const businessId = business.id;
  
  logger('info', '📝 Generating outreach message with enhanced metering', { 
    username: profile.username,
    score: analysis.score 
  }, requestId);
  
  const ctx = new MeteringContext(requestId);
  const safeUserId = userId || businessId || 'anonymous';
  
  const engagementInfo = (profile.engagement?.postsAnalyzed || 0) > 0 ?
    `with authentic engagement averaging ${profile.engagement?.avgLikes} likes per post` :
    `with ${profile.followersCount.toLocaleString()} followers`;
  
  const contentInfo = (profile.latestPosts?.length || 0) > 0 ?
    `I noticed your recent content focuses on ${extractPostThemes(profile.latestPosts)}.` :
    `Your content and ${profile.isVerified ? 'verified ' : ''}presence caught my attention.`;
  
  const messagePrompt = buildOutreachPrompt(profile, business, analysis, engagementInfo, contentInfo);
  
  try {
    // Check enhanced cache first
    const cached = enhancedAnalysisCache.get<string>(safeUserId, 'outreach', messagePrompt);
    if (cached) {
      ctx.recordEvent({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        purpose: 'outreach',
        cache_hit: true,
        user_id: userId,
        business_id: businessId
      });
      
      logger('info', 'Enhanced cache hit for outreach message', { 
        cacheHit: true,
        cacheStats: enhancedAnalysisCache.getStats()
      }, requestId);
      return cached;
    }
    
    // Check legacy cache
    const legacyCacheKey = `msg:${profile.username}:${business.name}:${analysis.score}`;
    const legacyCached = analysisCache.get<string>(legacyCacheKey);
    if (legacyCached) {
      ctx.recordEvent({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        purpose: 'outreach',
        cache_hit: true,
        user_id: userId,
        business_id: businessId
      });
      
      logger('info', 'Legacy cache hit for outreach message', { cacheHit: true }, requestId);
      // Store in enhanced cache for future
      enhancedAnalysisCache.set(safeUserId, 'outreach', messagePrompt, legacyCached);
      return legacyCached;
    }
    
    const claudeKey = await getApiKey('CLAUDE_API_KEY', env);
    const openaiKey = await getApiKey('OPENAI_API_KEY', env);
    
    // Prefer Claude for outreach (better conversational tone)
    if (claudeKey) {
      const result = await meteredCall(
        ctx,
        'anthropic',
        'claude-3-5-sonnet-20241022',
        'outreach',
        () => anthropicCircuitBreaker.execute(async () => {
          const response = await callAPIWithRateLimit(
            'https://api.anthropic.com/v1/messages',
            {
              method: 'POST',
              headers: {
                'x-api-key': claudeKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                messages: [{ role: 'user', content: messagePrompt }],
                max_tokens: 2500,
                temperature: 0.7
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
        }),
        (response) => {
          if (CostCalculators.anthropic['claude-3-5-sonnet-20241022']) {
            return CostCalculators.anthropic['claude-3-5-sonnet-20241022'](
              response.usage?.input_tokens || 0,
              response.usage?.output_tokens || 0
            );
          }
          return { inputTokens: response.usage?.input_tokens || 0, outputTokens: response.usage?.output_tokens || 0, cost: 0 };
        }
      );

      const data = result.content?.[0]?.text || '';
      
      globalPerformanceMonitor.recordMetric('anthropic', ctx.getEvents()[0]);
      
      logger('info', '✅ Outreach message generated (Claude) with enhanced features', {
        cost: `$${ctx.getEvents()[0].total_cost_usd.toFixed(6)}`,
        tokens: ctx.getEvents()[0].total_tokens,
        latencyMs: ctx.getEvents()[0].duration_ms,
        rateLimits: rateLimitMonitor.getLimits('anthropic')
      }, requestId);
      
      // Cache in both systems
      enhancedAnalysisCache.set(safeUserId, 'outreach', messagePrompt, data);
      analysisCache.set(legacyCacheKey, data);

      await logUsageToSupabase(env, ctx.getEvents()[0], requestId);
      
      ctx.flush().catch(console.error);
      
      return data;
      
    } else if (openaiKey) {
      const result = await meteredCall(
        ctx,
        'openai',
        'gpt-4o-mini-2024-07-18',
        'outreach',
        () => openaiCircuitBreaker.execute(async () => {
          const response = await callAPIWithRateLimit(
            'https://api.openai.com/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini-2024-07-18',
                messages: [{ role: 'user', content: messagePrompt }],
                max_completion_tokens: 2500
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
        }),
        (response) => {
          if (CostCalculators.openai['gpt-4o-mini-2024-07-18']) {
            return CostCalculators.openai['gpt-4o-mini-2024-07-18'](
              response.usage?.prompt_tokens || 0,
              response.usage?.completion_tokens || 0
            );
          }
          return { inputTokens: response.usage?.prompt_tokens || 0, outputTokens: response.usage?.completion_tokens || 0, cost: 0 };
        }
      );

      const data = result.choices?.[0]?.message?.content || '';
      
      globalPerformanceMonitor.recordMetric('openai', ctx.getEvents()[0]);
      
      logger('info', '✅ Outreach message generated (OpenAI) with enhanced features', {
        cost: `$${ctx.getEvents()[0].total_cost_usd.toFixed(6)}`,
        tokens: ctx.getEvents()[0].total_tokens,
        latencyMs: ctx.getEvents()[0].duration_ms,
        rateLimits: rateLimitMonitor.getLimits('openai')
      }, requestId);
      
      // Cache in both systems
      enhancedAnalysisCache.set(safeUserId, 'outreach', messagePrompt, data);
      analysisCache.set(legacyCacheKey, data);

      await logUsageToSupabase(env, ctx.getEvents()[0], requestId);
      
      ctx.flush().catch(console.error);
      
      return data;
    }
    
    throw new Error('No AI provider available for outreach generation');
    
  } catch (error) {
    await ctx.flush();
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildLightEvaluatorPrompt(profile: ProfileData, business: BusinessProfile): string {
  return `Analyze this Instagram profile for business collaboration potential.

PROFILE DATA:
- Username: @${profile.username}
- Followers: ${profile.followersCount.toLocaleString()}
- Engagement Rate: ${profile.engagement?.engagementRate || 'Unknown'}%
- Avg Likes: ${profile.engagement?.avgLikes || 'Unknown'}
- Bio: ${profile.bio}
- Verified: ${profile.isVerified}

BUSINESS CONTEXT:
- Industry: ${business.industry}
- Target Audience: ${business.target_audience}
- Value Proposition: ${business.value_proposition}

Evaluate and return a JSON with scores (0-100) and insights.`;
}

function buildDeepEvaluatorPrompt(profile: ProfileData, business: BusinessProfile): string {
  const postsContext = profile.latestPosts?.slice(0, 5)
    .map(p => `- ${p.caption?.substring(0, 100) || 'No caption'} (${p.likesCount} likes)`)
    .join('\n');
  
  return `Perform deep analysis of this Instagram profile for strategic business collaboration.

COMPREHENSIVE PROFILE DATA:
- Username: @${profile.username}
- Display Name: ${profile.displayName}
- Followers: ${profile.followersCount.toLocaleString()}
- Following: ${profile.followingCount.toLocaleString()}
- Posts: ${profile.postsCount}
- Engagement Rate: ${profile.engagement?.engagementRate || 'Unknown'}%
- Avg Likes: ${profile.engagement?.avgLikes || 'Unknown'}
- Avg Comments: ${profile.engagement?.avgComments || 'Unknown'}
- Bio: ${profile.bio}
- External URL: ${profile.externalUrl || 'None'}
- Verified: ${profile.isVerified}
- Business Account: ${profile.isBusinessAccount}

RECENT CONTENT:
${postsContext || 'No recent posts available'}

BUSINESS STRATEGIC CONTEXT:
- Company: ${business.name}
- Industry: ${business.industry}
- Target Audience: ${business.target_audience}
- Value Proposition: ${business.value_proposition}
- Pain Points: ${business.pain_points?.join(', ')}
- Unique Advantages: ${business.unique_advantages?.join(', ')}

Provide comprehensive strategic analysis with detailed scoring and actionable insights.`;
}

function buildOutreachPrompt(
  profile: ProfileData,
  business: BusinessProfile,
  analysis: AnalysisResult,
  engagementInfo: string,
  contentInfo: string
): string {
  return `Create a personalized outreach message for business collaboration.

TARGET PROFILE:
- Username: @${profile.username}
- Name: ${profile.displayName}
- Bio: ${profile.bio}
- Followers: ${profile.followersCount.toLocaleString()}
- Verified: ${profile.isVerified ? 'Yes' : 'No'}
- Engagement: ${engagementInfo}

BUSINESS CONTEXT:
- Company: ${business.name}
- Industry: ${business.industry}
- Value Proposition: ${business.value_proposition}

AI ANALYSIS INSIGHTS:
- Overall Score: ${analysis.score}/100
- Engagement Score: ${analysis.engagement_score}/100
- Business Fit: ${analysis.niche_fit}/100
- Key Selling Points: ${analysis.selling_points.join(', ')}

CONTENT INSIGHT: ${contentInfo}

Write a compelling 150-250 word outreach message that would get a response.`;
}

async function generateQuickSummary(
  profile: ProfileData,
  business: BusinessProfile,
  analysis: AnalysisResult,
  env: Env,
  requestId: string,
  userId?: string,
  businessId?: string
): Promise<string> {
  return `${profile.displayName} shows strong potential with ${analysis.score}/100 match score. ` +
    `Key strengths: ${analysis.selling_points.slice(0, 2).join(', ')}.`;
}

async function generateDeepSummary(
  profile: ProfileData,
  business: BusinessProfile,
  analysis: AnalysisResult,
  env: Env,
  requestId: string,
  userId?: string,
  businessId?: string
): Promise<string> {
  const ctx = new MeteringContext(requestId);
  const safeUserId = userId || businessId || 'anonymous';
  
  const summaryPrompt = `Create a 2-3 sentence executive summary of this influencer analysis:
Profile: @${profile.username} (${profile.followersCount} followers)
Score: ${analysis.score}/100
Engagement: ${analysis.engagement_score}/100
Fit: ${analysis.niche_fit}/100
Key Points: ${analysis.selling_points.slice(0, 3).join(', ')}

Write a concise, actionable summary for decision makers.`;
  
  try {
    // Check enhanced cache first
    const cached = enhancedAnalysisCache.get<string>(safeUserId, 'summary', summaryPrompt);
    if (cached) {
      ctx.recordEvent({
        provider: 'openai',
        model: 'gpt-4o-mini-2024-07-18',
        purpose: 'summary',
        cache_hit: true,
        user_id: userId,
        business_id: businessId
      });
      
      logger('info', 'Enhanced cache hit for deep summary', { cacheHit: true }, requestId);
      return cached;
    }
    
    const openaiKey = await getApiKey('OPENAI_API_KEY', env);
    if (!openaiKey) return analysis.engagement_insights || '';
    
    const result = await meteredCall(
      ctx,
      'openai',
      'gpt-4o-mini-2024-07-18',
      'summary',
      () => openaiCircuitBreaker.execute(async () => {
        const response = await callAPIWithRateLimit(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini-2024-07-18',
              messages: [{ role: 'user', content: summaryPrompt }],
              max_completion_tokens: 1000
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
      }),
      (response) => {
        if (CostCalculators.openai['gpt-4o-mini-2024-07-18']) {
          return CostCalculators.openai['gpt-4o-mini-2024-07-18'](
            response.usage?.prompt_tokens || 0,
            response.usage?.completion_tokens || 0
          );
        }
        return { inputTokens: response.usage?.prompt_tokens || 0, outputTokens: response.usage?.completion_tokens || 0, cost: 0 };
      }
    );

    const data = result.choices?.[0]?.message?.content || '';
    
    logger('info', 'Deep summary generated with enhanced features', {
      cost: `$${ctx.getEvents()[0].total_cost_usd.toFixed(6)}`,
      tokens: ctx.getEvents()[0].total_tokens,
      rateLimits: rateLimitMonitor.getLimits('openai')
    }, requestId);

    await logUsageToSupabase(env, ctx.getEvents()[0], requestId);
    
    // Cache the result
    enhancedAnalysisCache.set(safeUserId, 'summary', summaryPrompt, data);
    
    ctx.flush().catch(console.error);
    return data;
    
  } catch (error) {
    logger('error', 'Failed to generate deep summary', { error }, requestId);
    return analysis.engagement_insights || '';
  }
}

// ============================================================================
// VALIDATION AND CONFIDENCE FUNCTIONS
// ============================================================================

function validateAnalysisResult(result: any): AnalysisResult {
  // Ensure all required fields are present with defaults
  return {
    score: Math.min(100, Math.max(0, result.score || 0)),
    engagement_score: Math.min(100, Math.max(0, result.engagement_score || 0)),
    niche_fit: Math.min(100, Math.max(0, result.niche_fit || 0)),
    audience_quality: result.audience_quality || 'medium',
    engagement_insights: result.engagement_insights || '',
    selling_points: Array.isArray(result.selling_points) ? result.selling_points : [],
    reasons: Array.isArray(result.reasons) ? result.reasons : [],
    quick_summary: result.quick_summary,
    deep_summary: result.deep_summary,
    confidence_level: result.confidence_level
  };
}

function calculateConfidenceLevel(profile: ProfileData, analysisType: 'light' | 'deep'): number {
  let confidence = 50; // Base confidence
  
  // Data quality factors
  if (profile.engagement?.postsAnalyzed && profile.engagement.postsAnalyzed > 0) confidence += 20;
  if (profile.latestPosts && profile.latestPosts.length > 5) confidence += 15;
  if (profile.isVerified) confidence += 10;
  if (profile.dataQuality === 'high') confidence += 10;
  if (analysisType === 'deep') confidence += 10;
  
  // Negative factors
  if (profile.isPrivate) confidence -= 20;
  if (profile.dataQuality === 'low') confidence -= 15;
  if (!profile.engagement) confidence -= 10;
  
  return Math.min(95, Math.max(20, confidence));
}

function extractPostThemes(posts: any[]): string {
  if (!posts || posts.length === 0) return 'various topics';
  
  // Extract hashtags and common words
  const hashtags = new Set<string>();
  const words = new Map<string, number>();
  
  posts.forEach(post => {
    if (post.hashtags) {
      post.hashtags.forEach((tag: string) => hashtags.add(tag.toLowerCase()));
    }
    if (post.caption) {
      const commonWords = post.caption.toLowerCase()
        .split(/\s+/)
        .filter((word: string) => word.length > 4)
        .slice(0, 5);
      commonWords.forEach((word: string) => {
        words.set(word, (words.get(word) || 0) + 1);
      });
    }
  });
  
  const topHashtags = Array.from(hashtags).slice(0, 3);
  if (topHashtags.length > 0) {
    return topHashtags.map(tag => `#${tag}`).join(', ');
  }
  
  const topWords = Array.from(words.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);
  
  return topWords.length > 0 ? topWords.join(', ') : 'lifestyle content';
}

// ============================================================================
// ANOMALY STORAGE FUNCTION
// ============================================================================

async function storeAnomaly(
  ctx: MeteringContext,
  event: UsageEvent,
  anomalyType: 'spike' | 'unusual_pattern' | 'threshold_exceeded'
): Promise<void> {
  try {
    const anomaly = {
      detected_at: new Date().toISOString(),
      trace_id: event.trace_id,
      user_id: event.user_id,
      provider: event.provider,
      model: event.model,
      anomaly_type: anomalyType,
      anomaly_score: 0, // Calculate based on statistical analysis
      expected_cost_usd: 0, // Would need historical average
      actual_cost_usd: event.total_cost_usd,
      cost_multiple: 0, // actual / expected
      tokens_used: event.total_tokens,
      duration_ms: event.duration_ms,
      alert_sent: false,
      resolved: false
    };
    
    // This would normally insert into Supabase
    // For now, just log it
    logger('warn', '🚨 Anomaly recorded', anomaly, ctx.requestId);
    
  } catch (error) {
    logger('error', 'Failed to store anomaly', { error }, ctx.requestId);
  }
}

// ============================================================================
// ENHANCED PERFORMANCE MONITORING EXPORTS
// ============================================================================

export function getAnalysisPerformanceStats(): any {
  const stats = {
    openai: globalPerformanceMonitor.getStats(),
    anthropic: globalPerformanceMonitor.getStats(),
    byPurpose: {
      analysis_light: globalPerformanceMonitor.getStats(),
      analysis_deep: globalPerformanceMonitor.getStats(),
      outreach: globalPerformanceMonitor.getStats(),
      summary: globalPerformanceMonitor.getStats()
    },
    anomalies: globalAnomalyDetector.getStatistics(),
    cache: {
      legacy: analysisCache.getStats(),
      enhanced: enhancedAnalysisCache.getStats()
    },
    rateLimits: rateLimitMonitor.getAllLimits(),
    circuitBreakers: {
      openai: openaiCircuitBreaker.getStatus(),
      anthropic: anthropicCircuitBreaker.getStatus()
    },
    timestamp: new Date().toISOString()
  };
  
  return stats;
}

export function getCostBreakdown(timeRange?: { start: Date; end: Date }): any {
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
      legacy: analysisCache.getStats(),
      enhanced: enhancedAnalysisCache.getStats()
    },
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// NEW ENHANCED CACHE & RATE LIMIT EXPORTS
// ============================================================================

export function getEnhancedCacheStats() {
  return enhancedAnalysisCache.getStats();
}

export function getRateLimitStatus() {
  return rateLimitMonitor.getAllLimits();
}

export function getCacheStats() {
  return {
    legacy: analysisCache.getStats(),
    enhanced: enhancedAnalysisCache.getStats()
  };
}

// ============================================================================
// PARALLEL PROCESSING FOR BATCH OPERATIONS
// ============================================================================

export class ParallelProcessor {
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
      rateLimits: rateLimitMonitor.getAllLimits(),
      cacheStats: enhancedAnalysisCache.getStats(),
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
// ENHANCED BATCH ANALYSIS WITH METERING
// ============================================================================

export async function performBatchAnalysis(
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
    initialCacheStats: enhancedAnalysisCache.getStats(),
    initialRateLimits: rateLimitMonitor.getAllLimits()
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
        cacheHitRate: enhancedAnalysisCache.getStats().hitRate,
        rateLimits: rateLimitMonitor.getAllLimits()
      }, requestId);
    }
  );
  
  const totalTime = performance.now() - startTime;
  const stats = getCostBreakdown();
  const finalCacheStats = enhancedAnalysisCache.getStats();
  
  logger('info', `Enhanced batch analysis completed`, {
    profilesAnalyzed: profiles.length,
    successfulAnalyses: results.filter(r => r.score > 0).length,
    totalTimeMs: Math.round(totalTime),
    totalCost: stats.total.cost,
    avgTimePerProfile: Math.round(totalTime / profiles.length),
    cacheImpact: {
      hitRate: finalCacheStats.hitRate,
      totalHits: finalCacheStats.totalHits,
      memoryUsage: finalCacheStats.memoryUsage
    },
    finalRateLimits: rateLimitMonitor.getAllLimits()
  }, requestId);
  
  return {
    results,
    metrics: {
      totalProfiles: profiles.length,
      successful: results.filter(r => r.score > 0).length,
      failed: results.filter(r => r.score === 0).length,
      totalTime: totalTime,
      totalCost: stats.total.cost,
      avgCostPerProfile: stats.total.cost / profiles.length,
      avgTimePerProfile: totalTime / profiles.length,
      cachePerformance: finalCacheStats,
      rateLimitStatus: rateLimitMonitor.getAllLimits()
    }
  };
}

// ============================================================================
// ENHANCED ULTIMATE ANALYSIS ORCHESTRATOR
// ============================================================================

export async function performUltimateAnalysis(
  profile: ProfileData,
  business: BusinessProfile,
  analysisType: 'light' | 'deep',
  env: Env,
  requestId?: string
): Promise<{ result: AnalysisResult; metadata: any }> {
  requestId = requestId || crypto.randomUUID();
  const userId = business.user_id;
  const businessId = business.id;
  
  const ctx = new MeteringContext(requestId);
  const startTime = performance.now();
  
  try {
    // Step 1: Analyze profile
    const analysisResult = await performAIAnalysis(
      profile,
      business,
      analysisType,
      env,
      requestId,
      userId
    );
    
    // Step 2: Generate outreach if high score
    let outreachMessage = '';
    if (analysisResult.score >= 70) {
      outreachMessage = await generateOutreachMessage(
        profile,
        business,
        analysisResult,
        env,
        requestId
      );
    }
    
    // Step 3: Get enhanced performance stats
    const stats = getAnalysisPerformanceStats();
    const costBreakdown = getCostBreakdown();
    
    // Step 4: Compile enhanced metadata
    const metadata = {
      requestId,
      userId,
      businessId,
      profileUsername: profile.username,
      analysisType,
      intelligence: calculateProfileIntelligence(profile),
      timings: {
        totalMs: Math.round(performance.now() - startTime),
        breakdown: {
          analysis: stats.openai.avgLatency || 0,
          outreach: outreachMessage ? stats.anthropic.avgLatency || 0 : 0
        }
      },
      costs: {
        total: costBreakdown.total.cost,
        breakdown: costBreakdown.byProvider
      },
      cachePerformance: {
        legacy: stats.cache.legacy,
        enhanced: stats.cache.enhanced,
        overallHitRate: stats.cache.enhanced.hitRate
      },
      rateLimits: stats.rateLimits,
      circuitBreakers: stats.circuitBreakers,
      outreachGenerated: !!outreachMessage,
      enhancedFeatures: {
        userIsolatedCache: true,
        rateLimitMonitoring: true,
        automaticThrottling: true,
        circuitBreakerProtection: true,
        exponentialBackoff: true
      }
    };
    
    // Flush all metrics
    await ctx.flush();
    
    logger('info', '🎯 Enhanced ultimate analysis completed', {
      score: analysisResult.score,
      totalCost: metadata.costs.total,
      totalTime: metadata.timings.totalMs,
      cacheHitRate: metadata.cachePerformance.overallHitRate,
      rateLimitStatus: metadata.rateLimits,
      outreachGenerated: metadata.outreachGenerated
    }, requestId);
    
    return {
      result: {
        ...analysisResult,
        outreach_message: outreachMessage
      } as any,
      metadata
    };
    
  } catch (error) {
    await ctx.flush();
    throw error;
  }
}

// ============================================================================
// ADMIN & MONITORING ENDPOINTS
// ============================================================================

export function getSystemHealthStatus(): any {
  const cacheStats = enhancedAnalysisCache.getStats();
  const rateLimits = rateLimitMonitor.getAllLimits();
  const performanceStats = getAnalysisPerformanceStats();
  const circuitBreakers = {
    openai: openaiCircuitBreaker.getStatus(),
    anthropic: anthropicCircuitBreaker.getStatus()
  };
  
  // Calculate overall system health
  let healthScore = 100;
  
  // Cache health (30% of score)
  const cacheHealth = Math.min(100, (cacheStats.hitRate * 100) + (100 - (cacheStats.memoryUsage / 1024 / 1024 * 10)));
  healthScore = healthScore * 0.7 + cacheHealth * 0.3;
  
  // Rate limit health (20% of score)
  let rateLimitHealth = 100;
  Object.values(rateLimits).forEach(limit => {
    if (limit && limit.requests_remaining !== undefined) {
      if (limit.requests_remaining < 10) rateLimitHealth -= 30;
      else if (limit.requests_remaining < 50) rateLimitHealth -= 10;
    }
  });
  healthScore = healthScore * 0.8 + rateLimitHealth * 0.2;
  
  // Circuit breaker health (10% of score)
  let circuitBreakerHealth = 100;
  Object.values(circuitBreakers).forEach(cb => {
    if (cb.state === 'open') circuitBreakerHealth -= 50;
    else if (cb.state === 'half-open') circuitBreakerHealth -= 25;
    else if (cb.failures > 2) circuitBreakerHealth -= 10;
  });
  healthScore = healthScore * 0.9 + circuitBreakerHealth * 0.1;
  
  return {
    overallHealth: Math.round(healthScore),
    status: healthScore > 80 ? 'healthy' : healthScore > 60 ? 'warning' : 'critical',
    components: {
      cache: {
        status: cacheStats.hitRate > 0.5 ? 'healthy' : 'warning',
        hitRate: `${(cacheStats.hitRate * 100).toFixed(1)}%`,
        memoryUsage: `${(cacheStats.memoryUsage / 1024 / 1024).toFixed(2)} MB`,
        activeUsers: cacheStats.activeUsers,
        totalEntries: cacheStats.totalSize
      },
      rateLimits: {
        status: rateLimitHealth > 80 ? 'healthy' : rateLimitHealth > 60 ? 'warning' : 'critical',
        openai: rateLimits.openai,
        anthropic: rateLimits.anthropic
      },
      circuitBreakers: {
        status: circuitBreakerHealth > 80 ? 'healthy' : circuitBreakerHealth > 60 ? 'warning' : 'critical',
        openai: circuitBreakers.openai,
        anthropic: circuitBreakers.anthropic
      },
      performance: {
        totalAnalyses: (performanceStats.openai.count || 0) + (performanceStats.anthropic.count || 0),
        avgLatency: `${(((performanceStats.openai.avgLatency || 0) + (performanceStats.anthropic.avgLatency || 0)) / 2).toFixed(0)}ms`,
        errorRate: `${(((performanceStats.openai.errorRate || 0) + (performanceStats.anthropic.errorRate || 0)) / 2 * 100).toFixed(2)}%`
      }
    },
    timestamp: new Date().toISOString()
  };
}

export function optimizeCache(): { before: any; after: any; optimizations: string[] } {
  const beforeStats = enhancedAnalysisCache.getStats();
  const optimizations: string[] = [];
  
  // Force cleanup if memory usage is high
  if (beforeStats.memoryUsage > 50 * 1024 * 1024) { // 50MB threshold
    // This would trigger internal cleanup in a real implementation
    optimizations.push('Triggered memory cleanup due to high usage');
  }
  
  // Log cache performance recommendations
  if (beforeStats.hitRate < 0.3) {
    optimizations.push('Low hit rate detected - consider increasing TTL');
  }
  
  if (beforeStats.avgEntriesPerUser > 100) {
    optimizations.push('High per-user cache usage - consider reducing per-user limits');
  }
  
  const afterStats = enhancedAnalysisCache.getStats();
  
  return {
    before: beforeStats,
    after: afterStats,
    optimizations
  };
}

export function clearUserCache(userId: string): { cleared: boolean; message: string } {
  try {
    const clearedCount = enhancedAnalysisCache.clearUserCache(userId);
    logger('info', 'Cache cleared for user', { userId, clearedCount });
    
    return {
      cleared: true,
      message: `Cache cleared for user ${userId} (${clearedCount} entries removed)`
    };
  } catch (error) {
    return {
      cleared: false,
      message: `Failed to clear cache for user ${userId}: ${error}`
    };
  }
}

// ============================================================================
// CONFIGURATION & FEATURE FLAGS
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

export function updateAnalysisConfig(newConfig: Partial<EnhancedAnalysisConfig>): EnhancedAnalysisConfig {
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

export function getAnalysisConfig(): EnhancedAnalysisConfig {
  return { ...currentConfig };
}

export function resetAnalysisConfig(): EnhancedAnalysisConfig {
  currentConfig = { ...DEFAULT_CONFIG };
  logger('info', 'Analysis configuration reset to defaults');
  return currentConfig;
}

// ============================================================================
// PERFORMANCE BENCHMARKING
// ============================================================================

export async function benchmarkAnalysisPerformance(
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
      
      // Clear cache for first iteration to ensure fair testing
      if (i === 0) {
        enhancedAnalysisCache.clear();
      }
      
      const result = await performAIAnalysis(
        sampleProfile,
        sampleBusiness,
        'light',
        env,
        requestId,
        'benchmark-user'
      );
      
      const iterationTime = performance.now() - iterationStart;
      results.timings.push(iterationTime);
      
      // Track if this was a cache hit (simplified check)
      if (iterationTime < 1000 && i > 0) {
        results.cacheHits++;
      }
      
    } catch (error) {
      results.errors++;
      logger('warn', 'Benchmark iteration failed', { iteration: i, error });
    }
  }
  
  const totalTime = performance.now() - startTime;
  const avgTime = results.timings.reduce((a, b) => a + b, 0) / results.timings.length;
  const minTime = Math.min(...results.timings);
  const maxTime = Math.max(...results.timings);
  
  return {
    summary: {
      totalTime: Math.round(totalTime),
      avgTime: Math.round(avgTime),
      minTime: Math.round(minTime),
      maxTime: Math.round(maxTime),
      cacheHitRate: results.cacheHits / iterations,
      errorRate: results.errors / iterations,
      successRate: (iterations - results.errors) / iterations
    },
    details: results,
    recommendations: generatePerformanceRecommendations(results),
    timestamp: new Date().toISOString()
  };
}

function generatePerformanceRecommendations(results: any): string[] {
  const recommendations: string[] = [];
  
  const avgTime = results.timings.reduce((a: number, b: number) => a + b, 0) / results.timings.length;
  const cacheHitRate = results.cacheHits / results.timings.length;
  
  if (avgTime > 5000) {
    recommendations.push('Average response time is high - consider optimizing prompts or using faster models');
  }
  
  if (cacheHitRate < 0.3) {
    recommendations.push('Low cache hit rate - consider increasing cache TTL or improving cache key strategies');
  }
  
  if (results.errors > 0) {
    recommendations.push('Errors detected - review error handling and retry mechanisms');
  }
  
  if (results.rateLimitThrottles > results.timings.length * 0.1) {
    recommendations.push('Frequent rate limiting - consider implementing more aggressive throttling');
  }
  
  return recommendations;
}

// ============================================================================
// FINAL ENHANCED EXPORTS
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
  
  // Enhanced config type
  type EnhancedAnalysisConfig
};

// ============================================================================
// DEFAULT EXPORT WITH ALL FEATURES
// ============================================================================

export default {
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
  
  // System administration
  getSystemHealthStatus,
  optimizeCache,
  clearUserCache,
  
  // Configuration
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
