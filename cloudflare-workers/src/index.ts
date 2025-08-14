import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { compress } from 'hono/compress';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import { getEnvironment, isProduction, isStaging } from './utils/env';
import { validateAuth } from './middleware/auth';
import { rateLimiter } from './middleware/rate-limit';
import { errorHandler } from './middleware/error-handler';

// Import handlers
import { handleLeadAnalysis } from './handlers/lead-analysis';
import { handleLeadResearch } from './handlers/lead-research';
import { handleEmailGeneration } from './handlers/email-generation';
import { handleLinkedInGeneration } from './handlers/linkedin-generation';
import { handleConfigChange } from './handlers/admin';
import { handleNetlifySync } from './handlers/netlify-sync';
import { handleHealthCheck } from './handlers/health';

// Type definitions
export interface Env {
  // Environment variables
  APP_ENV: 'production' | 'staging';
  
  // API Keys
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  PERPLEXITY_API_KEY: string;
  TAVILY_API_KEY: string;
  
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  
  // Cloudflare
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ZONE_ID?: string;
  
  // Netlify
  NETLIFY_BUILD_HOOK_URL?: string;
  
  // Internal
  INTERNAL_API_TOKEN?: string;
  WORKER_URL: string;
  
  // KV Namespaces
  RATE_LIMIT?: KVNamespace;
  CONFIG_CACHE?: KVNamespace;
  
  // Durable Objects
  rateLimiter?: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', async (c, next) => {
  const environment = getEnvironment(c.env);
  
  // Add environment headers
  c.header('X-Environment', environment);
  c.header('X-Worker-Version', '1.0.0');
  
  // Environment-specific logging
  if (isStaging(c.env)) {
    console.log(`[${environment.toUpperCase()}] ${c.req.method} ${c.req.url}`);
    console.log('Headers:', Object.fromEntries(c.req.headers.entries()));
  }
  
  await next();
});

// CORS configuration
app.use('*', cors({
  origin: (origin) => {
    const env = getEnvironment(c.env);
    
    // Allowed origins based on environment
    const allowedOrigins = isProduction(c.env) 
      ? [
          'https://oslira.com',
          'https://www.oslira.com',
          'https://app.oslira.com'
        ]
      : [
          'https://osliratest.netlify.app',
          'https://staging.oslira.com',
          'http://localhost:3000',
          'http://localhost:8000',
          'http://127.0.0.1:8000'
        ];
    
    if (!origin) return '*';
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['X-Environment', 'X-Worker-Version', 'X-Rate-Limit-Remaining'],
  maxAge: 86400,
}));

// Compression
app.use('*', compress());

// Security headers
app.use('*', secureHeaders());

// Conditional middleware based on environment
app.use('*', async (c, next) => {
  const env = getEnvironment(c.env);
  
  // Staging-specific middleware
  if (isStaging(c.env)) {
    // Add debug headers
    c.header('X-Debug-Mode', 'true');
    c.header('X-Request-ID', crypto.randomUUID());
    
    // Log request body for debugging
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      try {
        const body = await c.req.text();
        console.log('[STAGING] Request body:', body);
        // Restore body for actual handler
        c.req = new Request(c.req.url, {
          method: c.req.method,
          headers: c.req.headers,
          body: body
        });
      } catch (e) {
        console.log('[STAGING] Could not log body:', e);
      }
    }
  }
  
  // Production-specific middleware
  if (isProduction(c.env)) {
    // Stricter rate limiting
    const identifier = c.req.header('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = `rate:${identifier}:${Date.now() / 60000 | 0}`;
    
    if (c.env.RATE_LIMIT) {
      const count = await c.env.RATE_LIMIT.get(rateLimitKey);
      const currentCount = parseInt(count || '0') + 1;
      
      if (currentCount > 100) { // 100 requests per minute in production
        return c.json({ error: 'Rate limit exceeded' }, 429);
      }
      
      await c.env.RATE_LIMIT.put(rateLimitKey, currentCount.toString(), {
        expirationTtl: 60
      });
      
      c.header('X-Rate-Limit-Remaining', String(100 - currentCount));
    }
  }
  
  await next();
});

// Error handling
app.onError((err, c) => {
  const environment = getEnvironment(c.env);
  
  console.error(`[${environment}] Error:`, err);
  
  // Different error responses based on environment
  if (isStaging(c.env)) {
    return c.json({
      error: err.message,
      stack: err.stack,
      environment,
      timestamp: new Date().toISOString(),
      path: c.req.url,
      method: c.req.method
    }, 500);
  } else {
    // Production: Hide internal details
    return c.json({
      error: 'Internal server error',
      reference: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Health check endpoint
app.get('/health', async (c) => {
  const environment = getEnvironment(c.env);
  
  return c.json({
    status: 'healthy',
    environment,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: {
      staging: isStaging(c.env),
      production: isProduction(c.env),
      debug: isStaging(c.env)
    }
  });
});

// Test endpoint (staging only)
app.get('/test', async (c) => {
  if (!isStaging(c.env)) {
    return c.json({ error: 'Not found' }, 404);
  }
  
  return c.json({
    message: 'Test endpoint - staging only',
    environment: getEnvironment(c.env),
    timestamp: new Date().toISOString(),
    headers: Object.fromEntries(c.req.headers.entries()),
    env_vars: {
      hasOpenAI: !!c.env.OPENAI_API_KEY,
      hasAnthropic: !!c.env.ANTHROPIC_API_KEY,
      hasSupabase: !!c.env.SUPABASE_URL,
      hasRateLimit: !!c.env.RATE_LIMIT,
      hasConfigCache: !!c.env.CONFIG_CACHE
    }
  });
});

// API Routes - Protected endpoints
app.post('/api/lead/analyze', validateAuth, rateLimiter, handleLeadAnalysis);
app.post('/api/lead/research', validateAuth, rateLimiter, handleLeadResearch);
app.post('/api/email/generate', validateAuth, rateLimiter, handleEmailGeneration);
app.post('/api/linkedin/generate', validateAuth, rateLimiter, handleLinkedInGeneration);

// Admin endpoints (internal only)
app.post('/internal/config-changed', async (c) => {
  const authHeader = c.req.header('Authorization');
  const internalToken = c.env.INTERNAL_API_TOKEN;
  
  if (!internalToken || authHeader !== `Bearer ${internalToken}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  return handleConfigChange(c);
});

// Netlify sync endpoint
app.post('/internal/netlify-sync', async (c) => {
  const authHeader = c.req.header('Authorization');
  const internalToken = c.env.INTERNAL_API_TOKEN;
  
  if (!internalToken || authHeader !== `Bearer ${internalToken}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  return handleNetlifySync(c);
});

// Environment-specific info endpoint
app.get('/info', async (c) => {
  const environment = getEnvironment(c.env);
  
  const baseInfo = {
    environment,
    api_version: '1.0.0',
    timestamp: new Date().toISOString()
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
        '/api/lead/analyze',
        '/api/lead/research',
        '/api/email/generate',
        '/api/linkedin/generate'
      ],
      cors_origins: [
        'https://osliratest.netlify.app',
        'http://localhost:3000',
        'http://localhost:8000'
      ]
    });
  }
  
  return c.json(baseInfo);
});

// 404 handler
app.notFound((c) => {
  const environment = getEnvironment(c.env);
  
  return c.json({
    error: 'Not found',
    path: c.req.url,
    environment,
    suggestion: isStaging(c.env) ? 'Check /info for available endpoints' : undefined
  }, 404);
});

// Export the app
export default app;
