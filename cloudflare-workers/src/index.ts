// ============================================================================
// COMPLETE WORKING INDEX.TS
// File: cloudflare-workers/src/index.ts
// ============================================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { compress } from 'hono/compress';
import { secureHeaders } from 'hono/secure-headers';
import { logger as honoLogger } from 'hono/logger';
import type { Env } from './types/interfaces.js';
import { logger } from './utils/logger.js';
import { handleAnalyze } from './handlers/analyze.js';
import { handleBulkAnalyze } from './handlers/bulk-analyze.js';
import { getApiKey } from './services/enhanced-config-manager.js';
import { ProductionErrorMonitor, type ErrorReport } from './services/error-monitor.js';
import { handleDebugEngagement, handleDebugProfile, handleDebugParsing } from './handlers/debug.js';

// Import handlers
import { 
  handleUpdateApiKey, 
  handleGetConfigStatus, 
  handleMigrateToAWS,
  handleGetConfig,
  handleTestApiKey,
  handleGetAuditLog,
  handleManualRotation
} from './handlers/enhanced-admin.js';
import { handleConfigChanged } from './handlers/netlify-sync.js';
import { adminAuthMiddleware } from './middleware/admin-auth.js';
import { 
  handleUsageStats, 
  handleCostBreakdown, 
  handleSystemHealth, 
  handleTopUsers, 
  handleCacheOptimize,
  handleClearUserCache,
  handlePerformanceStats,
  handleCacheCleanup
} from './handlers/admin-monitoring.js';

// ============================================================================
// RATE LIMIT MONITORING
// ============================================================================

interface RateLimitInfo {
  requests_remaining?: number;
  tokens_remaining?: number;
  reset_time?: string;
  provider: 'openai' | 'anthropic';
  lastUpdated: number;
}

class EnhancedRateLimitMonitor {
  private limits: Map<string, RateLimitInfo> = new Map();
  private readonly env: Env;
  
  constructor(env: Env) {
    this.env = env;
  }
  
  updateLimits(provider: 'openai' | 'anthropic', headers: Headers): RateLimitInfo {
    const limits: RateLimitInfo = {
      provider,
      lastUpdated: Date.now()
    };
    
    if (provider === 'openai') {
      limits.requests_remaining = this.parseIntHeader(headers, 'x-ratelimit-remaining-requests');
      limits.tokens_remaining = this.parseIntHeader(headers, 'x-ratelimit-remaining-tokens');
      limits.reset_time = headers.get('x-ratelimit-reset-requests') || undefined;
    } else if (provider === 'anthropic') {
      limits.requests_remaining = this.parseIntHeader(headers, 'anthropic-ratelimit-requests-remaining');
      limits.tokens_remaining = this.parseIntHeader(headers, 'anthropic-ratelimit-tokens-remaining');
      limits.reset_time = headers.get('anthropic-ratelimit-requests-reset') || undefined;
    }
    
    this.limits.set(provider, limits);
    
    // Log critical thresholds
    if (limits.requests_remaining !== undefined && limits.requests_remaining <= 10) {
      logger('warn', `${provider} approaching rate limits`, {
        requests_remaining: limits.requests_remaining,
        tokens_remaining: limits.tokens_remaining,
        reset_time: limits.reset_time
      });
    }
    
    return limits;
  }
  
  private parseIntHeader(headers: Headers, key: string): number | undefined {
    const value = headers.get(key);
    if (!value) return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
  
  getLimits(provider: 'openai' | 'anthropic'): RateLimitInfo | null {
    return this.limits.get(provider) || null;
  }
  
  getAllLimits(): Record<string, RateLimitInfo> {
    return Object.fromEntries(this.limits);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getEnvironment(env: Env): string {
  return env?.APP_ENV || 'development';
}

function isProduction(env: Env): boolean {
  return getEnvironment(env) === 'production';
}

function isStaging(env: Env): boolean {
  return getEnvironment(env) === 'staging';
}

// ============================================================================
// HONO APP INITIALIZATION
// ============================================================================

const app = new Hono<{ Bindings: Env }>();

// Initialize global systems
let errorMonitor: ProductionErrorMonitor;
let rateLimitMonitor: EnhancedRateLimitMonitor;

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Safe header logging middleware
app.use('*', async (c, next) => {
  const environment = getEnvironment(c.env);
  
  // Initialize systems on first request
  if (!errorMonitor) {
    errorMonitor = new ProductionErrorMonitor(c.env);
    rateLimitMonitor = new EnhancedRateLimitMonitor(c.env);
  }
  
  // Add environment headers
  c.header('X-Environment', environment);
  c.header('X-Worker-Version', '1.0.0');
  
  // Safe header logging for debugging
  if (environment === 'staging') {
    try {
      const headers = c.req.raw.headers;
      if (headers && typeof headers.entries === 'function') {
        const headerEntries = Array.from(headers.entries());
        logger('debug', 'Request headers', { 
          headers: headerEntries.map(([key, value]) => ({ key, value })),
          path: c.req.url,
          method: c.req.method
        });
      }
    } catch (headerError) {
      logger('warn', 'Header logging failed', { error: headerError });
    }
  }
  
  await next();
});

// CORS configuration
app.use('*', cors({
  origin: (origin) => {
    const environment = getEnvironment({ APP_ENV: 'staging' } as Env); // Fallback for middleware
    
    const allowedOrigins = [
      'https://oslira.com',
      'https://osliratest.netlify.app'
    ];
    
    // Always allow if no origin (same-origin requests)
    if (!origin) return true;
    
    // Production restrictions
    if (environment === 'production') {
      return allowedOrigins.includes(origin) ? origin : false;
    }
    
    // Staging allows more origins
    const stagingPatterns = [
      /^https:\/\/.*\.netlify\.app$/,
      /^https:\/\/.*\.vercel\.app$/,
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/
    ];
    
    // Exact match
    if (allowedOrigins.includes(origin)) {
      return origin;
    }
    
    // Pattern matching for staging
    if (stagingPatterns.some(pattern => pattern.test(origin))) {
      return origin;
    }
    
    return false;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: [
    'Content-Type',
    'Authorization', 
    'X-Requested-With',
    'X-User-Email',
    'X-Request-ID',
    'X-Client-Version'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Security and compression middleware
app.use('*', compress());
app.use('*', secureHeaders());

// Logging middleware for staging only
app.use('*', async (c, next) => {
  if (getEnvironment(c.env) === 'staging') {
    return honoLogger()(c, next);
  }
  await next();
});

// ============================================================================
// BASIC ENDPOINTS
// ============================================================================

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: getEnvironment(c.env),
    version: '1.0.0'
  });
});

app.get('/test', async (c) => {
  const environment = getEnvironment(c.env);
  
  // Test AWS integration
  let awsStatus = 'not_configured';
  let hasOpenAI = false;
  let hasClaude = false;    // Changed from hasAnthropic
  let hasApify = false;
  
  try {
    // Test AWS connectivity by attempting to get a key
    const openaiKey = await getApiKey('OPENAI_API_KEY', c.env);
    const claudeKey = await getApiKey('CLAUDE_API_KEY', c.env);    // Changed from ANTHROPIC_API_KEY
    const apifyKey = await getApiKey('APIFY_API_TOKEN', c.env);
    
    hasOpenAI = !!openaiKey;
    hasClaude = !!claudeKey;    // Changed from hasAnthropic
    hasApify = !!apifyKey;
    awsStatus = 'working';
    
    logger('info', 'Test endpoint - AWS key retrieval successful', { 
      hasOpenAI, 
      hasClaude,     // Changed from hasAnthropic
      hasApify 
    });
    
  } catch (error: any) {
    logger('warn', 'Test endpoint - AWS key retrieval failed, checking environment', { error: error.message });
    awsStatus = 'error';
    
    // Fallback to direct environment check
    hasOpenAI = !!c.env.OPENAI_API_KEY;
    hasClaude = !!c.env.CLAUDE_API_KEY;    // Changed from ANTHROPIC_API_KEY
    hasApify = !!c.env.APIFY_API_TOKEN;
  }
  
  return c.json({
    message: `Worker is running in ${environment} mode`,
    timestamp: new Date().toISOString(),
    hasOpenAI,
    hasClaude,        // Changed from hasAnthropic
    hasApify,
    hasSupabase: !!c.env.SUPABASE_URL,
    awsIntegration: awsStatus,
    hasRateLimit: !!c.env.RATE_LIMIT,
    hasConfigCache: !!c.env.CONFIG_CACHE,
    rateLimitEnabled: c.env.RATE_LIMIT_ENABLED === 'true',
    cacheConfig: {
      ttl: c.env.CACHE_TTL,  // Fixed from ACHE_TTL
      maxSizePerUser: c.env.MAX_CACHE_SIZE_PER_USER,
      maxGlobalSize: c.env.MAX_GLOBAL_CACHE_SIZE
    }
  });
});

// ============================================================================
// ADMIN ROUTES WITH AUTHENTICATION
// ============================================================================

// All admin routes require authentication
app.use('/admin/*', adminAuthMiddleware);

// Admin monitoring endpoints
app.get('/admin/usage-stats', handleUsageStats);
app.get('/admin/cost-breakdown', handleCostBreakdown);
app.get('/admin/system-health', handleSystemHealth);
app.get('/admin/top-users', handleTopUsers);
app.post('/admin/cache-optimize', handleCacheOptimize);
app.post('/admin/clear-user-cache', handleClearUserCache);
app.get('/admin/performance-stats', handlePerformanceStats);
app.post('/admin/cache-cleanup', handleCacheCleanup);

// Error monitoring endpoints
app.get('/admin/errors', async (c) => {
  if (!errorMonitor) {
    return c.json({ error: 'Error monitor not initialized' }, 500);
  }
  
  const limit = parseInt(c.req.query('limit') || '50');
  const errors = errorMonitor.getRecentErrors(limit);
  const stats = errorMonitor.getErrorStats();
  
  return c.json({
    success: true,
    data: {
      errors,
      stats
    }
  });
});

// Rate limiting status endpoint
app.get('/admin/rate-limits', async (c) => {
  if (!rateLimitMonitor) {
    return c.json({ error: 'Rate limit monitor not initialized' }, 500);
  }
  
  return c.json({
    success: true,
    data: {
      limits: rateLimitMonitor.getAllLimits(),
      enabled: c.env.RATE_LIMIT_ENABLED === 'true',
      thresholds: {
        requests: parseInt(c.env.THROTTLE_THRESHOLD_REQUESTS || '10'),
        tokens: parseInt(c.env.THROTTLE_THRESHOLD_TOKENS || '1000')
      }
    }
  });
});

// ============================================================================
// INTERNAL ENDPOINTS WITH TOKEN VALIDATION
// ============================================================================
// Debug endpoints for development (staging only)
app.get('/debug/engagement/:username', async (c) => {
  if (getEnvironment(c.env) === 'staging') {
    return handleDebugEngagement(c);
  }
  return c.json({ error: 'Debug endpoints only available in staging' }, 404);
});

app.get('/debug/profile/:username', async (c) => {
  if (getEnvironment(c.env) === 'staging') {
    return handleDebugProfile(c);
  }
  return c.json({ error: 'Debug endpoints only available in staging' }, 404);
});

app.get('/debug/parsing/:username', async (c) => {
  if (getEnvironment(c.env) === 'staging') {
    return handleDebugParsing(c);
  }
  return c.json({ error: 'Debug endpoints only available in staging' }, 404);
});

app.post('/analyze', handleAnalyze);
app.post('/v1/analyze', handleAnalyze);

// Batch analysis
app.post('/analyze-batch', handleBulkAnalyze);
app.post('/bulk-analyze', handleBulkAnalyze);
app.post('/v1/bulk-analyze', handleBulkAnalyze);
// Internal config change endpoint
app.post('/internal/config-changed', async (c) => {
  const authHeader = c.req.header('Authorization');
  const internalToken = c.env.INTERNAL_API_TOKEN;
  
  if (!internalToken) {
    await errorMonitor?.reportError('error', 'INTERNAL_API_TOKEN not configured', {
      endpoint: '/internal/config-changed'
    });
    return c.json({ error: 'Internal API not configured' }, 500);
  }
  
  if (authHeader !== `Bearer ${internalToken}`) {
    await errorMonitor?.reportError('warn', 'Unauthorized internal API access attempt', {
      endpoint: '/internal/config-changed',
      authHeader: authHeader ? authHeader.substring(0, 20) + '...' : 'missing'
    });
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  return handleConfigChanged(c);
});

// Admin API key update endpoint
app.post('/admin/update-key', async (c) => {
  // This uses admin middleware, so additional token check not needed
  return handleUpdateApiKey(c);
});

// ============================================================================
// ENVIRONMENT-SPECIFIC ENDPOINTS
// ============================================================================

// Info endpoint with staging details
app.get('/info', async (c) => {
  const environment = getEnvironment(c.env);
  
  const baseInfo = {
    environment,
    api_version: '1.0.0',
    timestamp: new Date().toISOString(),
    fixes_applied: [
      'safe-header-logging',
      'admin-token-validation', 
      'rate-limiting-system',
      'error-monitoring'
    ]
  };
  
  // Add more details in staging
  if (isStaging(c.env)) {
    return c.json({
      ...baseInfo,
      debug: true,
      endpoints: [
        '/health',
        '/test',
        '/info',
        '/admin/usage-stats',
        '/admin/cost-breakdown',
        '/admin/system-health',
        '/admin/errors',
        '/admin/rate-limits'
      ],
      cors_origins: [
        'https://osliratest.netlify.app',
        'http://localhost:3000',
        'http://localhost:8000'
      ],
      monitoring: {
        errorCount: errorMonitor?.getErrorStats().total || 0,
        rateLimitEnabled: c.env.RATE_LIMIT_ENABLED === 'true'
      }
    });
  }
  
  return c.json(baseInfo);
});

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================

// Global error handler with automatic reporting
app.onError(async (err, c) => {
  const requestId = c.get('requestId') || crypto.randomUUID();
  
  // Report error to monitoring system
  if (errorMonitor) {
    await errorMonitor.reportError(
      'error',
      err.message,
      {
        path: c.req.url,
        method: c.req.method,
        userAgent: c.req.header('User-Agent'),
        clientIP: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
        environment: getEnvironment(c.env)
      },
      err,
      requestId
    );
  } else {
    // Fallback logging if error monitor not initialized
    console.error('🚨 Unhandled error (no monitor):', {
      message: err.message,
      stack: err.stack,
      path: c.req.url,
      method: c.req.method,
      requestId
    });
  }
  
  // Return user-friendly error
  const isProductionEnv = c.env.APP_ENV === 'production';
  
  return c.json({
    success: false,
    error: isProductionEnv ? 'Internal server error' : err.message,
    requestId,
    timestamp: new Date().toISOString()
  }, 500);
});

// Temporary AWS test endpoint
app.get('/test-aws', async (c) => {
  try {
    const { getApiKey } = await import('./services/enhanced-config-manager.js');
    
    const openaiKey = await getApiKey('OPENAI_API_KEY', c.env);
    
    return c.json({
      success: true,
      awsWorking: true,
      hasOpenAIKey: !!openaiKey,
      keyPrefix: openaiKey ? openaiKey.substring(0, 8) + '...' : 'none'
    });
  } catch (error) {
    return c.json({
      success: false,
      awsWorking: false,
      error: error.message
    });
  }
});

// ============================================================================
// 404 HANDLER
// ============================================================================

app.notFound((c) => {
  const environment = getEnvironment(c.env);
  
  return c.json({
    error: 'Not found',
    path: c.req.url,
    environment,
    suggestion: isStaging(c.env) ? 'Check /info for available endpoints' : undefined,
    timestamp: new Date().toISOString()
  }, 404);
});

// ============================================================================
// EXPORT
// ============================================================================

export default app;
