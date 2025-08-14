import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { compress } from 'hono/compress';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import { getEnvironment, isProduction, isStaging } from './utils/env';

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
  handlePerformanceStats 
} from './handlers/admin-monitoring.js';

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

async function validateAdminAuth(c: Context<{ Bindings: Env }>, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization');
  const adminToken = c.env.INTERNAL_API_TOKEN;
  
  if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
    return c.json({ error: 'Admin access required' }, 401);
  }
  
  await next();
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
    
    // Safe header logging
    try {
      if (c.req.headers && typeof c.req.headers.entries === 'function') {
        console.log('Headers:', Object.fromEntries(c.req.headers.entries()));
      }
    } catch (error) {
      console.log('Headers: [unavailable]');
    }
  }
  
  await next();
});

// CORS configuration
app.use('*', cors({
  origin: (origin) => {
    // Allow all origins in staging, specific origins in production
    if (isStaging(c.env)) {
      return '*';
    }
    
    const allowedOrigins = [
      'https://oslira.com',
      'https://www.oslira.com',
      'https://app.oslira.com'
    ];
    
    if (!origin) return '*';
    return allowedOrigins.includes(origin) ? origin : false;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-Email'],
  credentials: true
}));

// Security and compression middleware
app.use('*', compress());
app.use('*', secureHeaders());

// Logging middleware for staging
if (process.env.APP_ENV === 'staging') {
  app.use('*', logger());
}

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: getEnvironment(c.env),
    version: '1.0.0'
  });
});

// Test endpoint
app.get('/test', (c) => {
  const environment = getEnvironment(c.env);
  
  return c.json({
    message: `Worker is running in ${environment} mode`,
    timestamp: new Date().toISOString(),
    hasOpenAI: !c.env.OPENAI_API_KEY,
    hasAnthropic: !!c.env.ANTHROPIC_API_KEY,
    hasSupabase: !!c.env.SUPABASE_URL,
    hasRateLimit: !!c.env.RATE_LIMIT,
    hasConfigCache: !!c.env.CONFIG_CACHE
  });
});

// Admin routes with authentication
app.use('/admin/*', adminAuthMiddleware);
app.get('/admin/usage-stats', handleUsageStats);
app.get('/admin/cost-breakdown', handleCostBreakdown);
app.get('/admin/system-health', handleSystemHealth);
app.get('/admin/top-users', handleTopUsers);
app.post('/admin/cache-optimize', handleCacheOptimize);
app.post('/admin/clear-user-cache', handleClearUserCache);
app.get('/admin/performance-stats', handlePerformanceStats);

// Admin endpoints (internal only)
app.post('/internal/config-changed', async (c) => {
  const authHeader = c.req.header('Authorization');
  const internalToken = c.env.INTERNAL_API_TOKEN;
  
  if (!internalToken || authHeader !== `Bearer ${internalToken}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  return handleConfigChanged(c);
});

// Netlify sync endpoint
app.post('/internal/netlify-sync', async (c) => {
  const authHeader = c.req.header('Authorization');
  const internalToken = c.env.INTERNAL_API_TOKEN;
  
  if (!internalToken || authHeader !== `Bearer ${internalToken}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  return handleConfigChanged(c);
});

// Admin API key update endpoint
app.post('/admin/update-key', async (c) => {
  const authHeader = c.req.header('Authorization');
  const internalToken = c.env.INTERNAL_API_TOKEN;
  
  if (!internalToken || authHeader !== `Bearer ${internalToken}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  return handleUpdateApiKey(c);
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
