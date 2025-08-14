// ============================================================================
// FINAL INDEX.TS - ALL CRITICAL FIXES APPLIED
// File: cloudflare-workers/src/index.ts
// ============================================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { compress } from 'hono/compress';
import { secureHeaders } from 'hono/secure-headers';
import { logger as honoLogger } from 'hono/logger';
import { getEnvironment, isProduction, isStaging } from './utils/env.js';
import { logger } from './utils/logger.js';
import { createClient } from '@supabase/supabase-js';

// Fixed imports - use the actual exported function names
import { handleUpdateApiKey } from './handlers/admin.js';
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

// Type definitions
export interface Env {
  // Environment
  APP_ENV: 'production' | 'staging';
  
  // API Keys
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  APIFY_API_TOKEN?: string;
  
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE?: string;
  
  // Internal Tokens
  INTERNAL_API_TOKEN?: string;
  ADMIN_TOKEN?: string;
  
  // URLs
  WORKER_URL?: string;
  FRONTEND_URL?: string;
  
  // KV Namespaces  
  RATE_LIMIT?: KVNamespace;
  CONFIG_CACHE?: KVNamespace;
}

// ============================================================================
// ERROR MONITORING SYSTEM
// ============================================================================

interface ErrorReport {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'critical';
  message: string;
  context: Record<string, any>;
  stack?: string;
  requestId?: string;
  userId?: string;
}

class ProductionErrorMonitor {
  private errors: Map<string, ErrorReport> = new Map();
  private readonly maxErrors = 1000;
  private readonly env: Env;
  
  constructor(env: Env) {
    this.env = env;
  }
  
  async reportError(
    level: 'info' | 'warn' | 'error' | 'critical',
    message: string,
    context: Record<string, any> = {},
    error?: Error,
    requestId?: string
  ): Promise<void> {
    const errorId = crypto.randomUUID();
    const timestamp = Date.now();
    
    const report: ErrorReport = {
      id: errorId,
      timestamp,
      level,
      message,
      context: {
        ...context,
        environment: this.env.APP_ENV,
        workerUrl: this.env.WORKER_URL
      },
      stack: error?.stack,
      requestId: requestId || crypto.randomUUID(),
      userId: context.userId
    };
    
    // Store error (with size management)
    this.errors.set(errorId, report);
    this.maintainErrorBuffer();
    
    // Log to console with appropriate level
    this.logToConsole(report);
    
    // Store in database for persistence (async, don't block)
    this.persistError(report).catch(persistError => {
      console.error('Failed to persist error to database:', persistError);
    });
  }
  
  private maintainErrorBuffer(): void {
    if (this.errors.size > this.maxErrors) {
      const sortedEntries = Array.from(this.errors.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = sortedEntries.slice(0, this.errors.size - this.maxErrors);
      toRemove.forEach(([id]) => this.errors.delete(id));
    }
  }
  
  private logToConsole(report: ErrorReport): void {
    const logData = {
      id: report.id,
      message: report.message,
      context: report.context,
      requestId: report.requestId
    };
    
    switch (report.level) {
      case 'critical':
        console.error('🚨 CRITICAL:', logData);
        break;
      case 'error':
        console.error('❌ ERROR:', logData);
        break;
      case 'warn':
        console.warn('⚠️ WARNING:', logData);
        break;
      case 'info':
        console.log('ℹ️ INFO:', logData);
        break;
    }
  }
  
  private async persistError(report: ErrorReport): Promise<void> {
    try {
      if (!this.env.SUPABASE_URL || !this.env.SUPABASE_SERVICE_KEY) {
        return;
      }
      
      const supabase = createClient(this.env.SUPABASE_URL, this.env.SUPABASE_SERVICE_KEY);
      
      await supabase.from('error_logs').insert({
        id: report.id,
        level: report.level,
        message: report.message,
        context: report.context,
        stack: report.stack,
        request_id: report.requestId,
        user_id: report.userId,
        created_at: new Date(report.timestamp).toISOString()
      });
      
    } catch (persistError) {
      // Don't log this error to avoid infinite loops
      console.error('Error persistence failed:', persistError instanceof Error ? persistError.message : persistError);
    }
  }
  
  getRecentErrors(limit: number = 50): ErrorReport[] {
    return Array.from(this.errors.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  
  getErrorStats(): {
    total: number;
    byLevel: Record<string, number>;
    recentCount: number;
  } {
    const errors = Array.from(this.errors.values());
    const recent = errors.filter(e => Date.now() - e.timestamp < 3600000); // Last hour
    
    return {
      total: errors.length,
      byLevel: errors.reduce((acc, e) => {
        acc[e.level] = (acc[e.level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentCount: recent.length
    };
  }
}

// ============================================================================
// RATE LIMITING SYSTEM
// ============================================================================

interface RateLimitInfo {
  provider: string;
  requests_remaining?: number;
  tokens_remaining?: number;
  reset_time?: string;
  lastUpdated: number;
}

class EnhancedRateLimitMonitor {
  private limits: Map<string, RateLimitInfo> = new Map();
  private throttleState: Map<string, number> = new Map();
  private readonly enabled: boolean;
  private readonly thresholds: { requests: number; tokens: number };
  private readonly delays: { warning: number; critical: number };
  
  constructor(env: Env) {
    this.enabled = env.RATE_LIMIT_ENABLED === 'true';
    this.thresholds = {
      requests: parseInt(env.THROTTLE_THRESHOLD_REQUESTS || '10'),
      tokens: parseInt(env.THROTTLE_THRESHOLD_TOKENS || '1000')
    };
    this.delays = {
      warning: 2000,
      critical: 60000
    };
  }
  
  shouldThrottle(provider: 'openai' | 'anthropic'): { 
    throttle: boolean; 
    delay: number; 
    reason?: string;
    severity: 'none' | 'warning' | 'critical';
  } {
    if (!this.enabled) {
      return { throttle: false, delay: 0, severity: 'none' };
    }
    
    // Check manual throttle state
    const nextAllowedTime = this.throttleState.get(provider) || 0;
    if (Date.now() < nextAllowedTime) {
      return {
        throttle: true,
        delay: nextAllowedTime - Date.now(),
        reason: 'Throttled due to previous rate limit',
        severity: 'warning'
      };
    }
    
    const limits = this.limits.get(provider);
    if (!limits) {
      return { throttle: false, delay: 0, severity: 'none' };
    }
    
    // CRITICAL: Emergency throttling
    if (limits.requests_remaining !== undefined && limits.requests_remaining <= 2) {
      const delay = this.delays.critical * 2;
      this.setThrottleState(provider, delay);
      return { 
        throttle: true, 
        delay,
        reason: `Emergency: Only ${limits.requests_remaining} requests remaining`,
        severity: 'critical'
      };
    }
    
    if (limits.tokens_remaining !== undefined && limits.tokens_remaining <= this.thresholds.tokens / 20) {
      const delay = this.delays.critical * 1.5;
      this.setThrottleState(provider, delay);
      return { 
        throttle: true, 
        delay,
        reason: `Emergency: Only ${limits.tokens_remaining} tokens remaining`,
        severity: 'critical'
      };
    }
    
    // WARNING: Standard throttling
    if (limits.requests_remaining !== undefined && limits.requests_remaining <= this.thresholds.requests) {
      const delay = this.delays.warning;
      this.setThrottleState(provider, delay);
      return { 
        throttle: true, 
        delay,
        reason: `Warning: ${limits.requests_remaining} requests remaining`,
        severity: 'warning'
      };
    }
    
    if (limits.tokens_remaining !== undefined && limits.tokens_remaining <= this.thresholds.tokens) {
      const delay = this.delays.warning;
      this.setThrottleState(provider, delay);
      return { 
        throttle: true, 
        delay,
        reason: `Warning: ${limits.tokens_remaining} tokens remaining`,
        severity: 'warning'
      };
    }
    
    return { throttle: false, delay: 0, severity: 'none' };
  }
  
  private setThrottleState(provider: string, delayMs: number): void {
    this.throttleState.set(provider, Date.now() + delayMs);
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
// HONO APP INITIALIZATION
// ============================================================================

const app = new Hono<{ Bindings: Env }>();

// Initialize global systems
let errorMonitor: ProductionErrorMonitor;
let rateLimitMonitor: EnhancedRateLimitMonitor;

// ============================================================================
// CRITICAL FIX #1: SAFE HEADER LOGGING MIDDLEWARE
// ============================================================================
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
  
  // CRITICAL FIX: Safe header logging for staging
  if (isStaging(c.env)) {
    console.log(`[${environment.toUpperCase()}] ${c.req.method} ${c.req.url}`);
    
    // FIXED: Safe header access with comprehensive error handling
    try {
      const headers = c.req.header();
      if (headers && typeof headers === 'object') {
        // Safe object iteration
        const safeHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(headers)) {
          if (typeof key === 'string' && typeof value === 'string') {
            // Filter sensitive headers
            if (!key.toLowerCase().includes('authorization') && 
                !key.toLowerCase().includes('token') &&
                !key.toLowerCase().includes('key')) {
              safeHeaders[key] = value;
            } else {
              safeHeaders[key] = '[REDACTED]';
            }
          }
        }
        console.log('Headers:', safeHeaders);
      } else {
        console.log('Headers: [object not iterable]');
      }
    } catch (headerError) {
      // Fallback: log essential info without headers
      console.log('Headers: [access error - logged safely]');
      if (headerError instanceof Error) {
        console.log('Header access error:', {
          error: headerError.message,
          type: typeof c.req.header,
          hasEntries: typeof c.req.header === 'function'
        });
      }
    }
  }
  
  await next();
});

// ============================================================================
// CORS CONFIGURATION
// ============================================================================
app.use('*', cors({
  origin: (origin) => {
    const environment = getEnvironment(c.env);
    
    // Base allowed origins
    const allowedOrigins = [
      'https://oslira.com',
      'https://www.oslira.com',
      'https://app.oslira.com'
    ];

    if (environment === 'staging') {
      allowedOrigins.push(
        'https://osliratest.netlify.app',
        'https://oslira-staging.netlify.app',
        'http://localhost:3000',
        'http://localhost:8000',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8000',
        'http://127.0.0.1:8080'
      );
    }

    // Allow if no origin (for non-browser requests)
    if (!origin) return environment === 'staging' ? '*' : false;

    // Exact match
    if (allowedOrigins.includes(origin)) {
      return origin;
    }

    // Pattern matching for staging
    if (environment === 'staging') {
      const stagingPatterns = [
        /^https:\/\/.*\.netlify\.app$/,
        /^https:\/\/.*\.vercel\.app$/,
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/
      ];

      if (stagingPatterns.some(pattern => pattern.test(origin))) {
        return origin;
      }
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
if (process.env.APP_ENV === 'staging') {
  app.use('*', honoLogger());
}

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

// Test endpoint with environment validation
app.get('/test', (c) => {
  const environment = getEnvironment(c.env);
  
  return c.json({
    message: `Worker is running in ${environment} mode`,
    timestamp: new Date().toISOString(),
    hasOpenAI: !!c.env.OPENAI_API_KEY,
    hasAnthropic: !!c.env.ANTHROPIC_API_KEY,
    hasSupabase: !!c.env.SUPABASE_URL,
    hasRateLimit: !!c.env.RATE_LIMIT,
    hasConfigCache: !!c.env.CONFIG_CACHE,
    rateLimitEnabled: c.env.RATE_LIMIT_ENABLED === 'true',
    cacheConfig: {
      ttl: c.env.CACHE_TTL,
      maxSizePerUser: c.env.MAX_CACHE_SIZE_PER_USER,
      maxGlobalSize: c.env.MAX_GLOBAL_CACHE_SIZE
    }
  });
});

// ============================================================================
// CRITICAL FIX #2: ADMIN ROUTES WITH ENHANCED AUTHENTICATION
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
// CRITICAL FIX #3: INTERNAL ENDPOINTS WITH TOKEN VALIDATION
// ============================================================================

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

// Netlify sync endpoint
app.post('/internal/netlify-sync', async (c) => {
  const authHeader = c.req.header('Authorization');
  const internalToken = c.env.INTERNAL_API_TOKEN;
  
  if (!internalToken) {
    await errorMonitor?.reportError('error', 'INTERNAL_API_TOKEN not configured', {
      endpoint: '/internal/netlify-sync'
    });
    return c.json({ error: 'Internal API not configured' }, 500);
  }
  
  if (authHeader !== `Bearer ${internalToken}`) {
    await errorMonitor?.reportError('warn', 'Unauthorized internal API access attempt', {
      endpoint: '/internal/netlify-sync',
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
// CRITICAL FIX #4: GLOBAL ERROR HANDLER
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
  const isProduction = c.env.APP_ENV === 'production';
  
  return c.json({
    success: false,
    error: isProduction ? 'Internal server error' : err.message,
    requestId,
    timestamp: new Date().toISOString()
  }, 500);
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
