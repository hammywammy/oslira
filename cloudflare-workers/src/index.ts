import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types/interfaces.js';
import { generateRequestId, logger } from './utils/logger.js';
import { createStandardResponse } from './utils/response.js';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: ['https://oslira.netlify.app', 'http://localhost:8000', 'https://oslira.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ===============================================================================
// BASIC ENDPOINTS
// ===============================================================================

app.get('/', (c) => {
  return c.json({
    status: 'healthy',
    service: 'OSLIRA Enterprise Analysis API - MODULAR VERSION',
    version: 'v3.1.0-modular',
    timestamp: new Date().toISOString(),
    features: [
      'modular_architecture',
      'lazy_loading',
      'real_engagement_calculation',
      'enterprise_analytics'
    ]
  });
});

app.get('/health', (c) => c.json({ status: 'healthy', timestamp: new Date().toISOString() }));

app.get('/config', (c) => {
  const baseUrl = new URL(c.req.url).origin.replace(/\/$/, '');
  return c.json({
    supabaseUrl: c.env.SUPABASE_URL,
    supabaseAnonKey: c.env.SUPABASE_ANON_KEY,
    workerUrl: baseUrl
  });
});

// ===============================================================================
// LAZY LOADED ENDPOINTS
// ===============================================================================

// Main analysis endpoints
app.post('/v1/analyze', async (c) => {
  const { handleAnalyze } = await import('./handlers/analyze.js');
  return handleAnalyze(c);
});

app.post('/v1/bulk-analyze', async (c) => {
  const { handleBulkAnalyze } = await import('./handlers/bulk-analyze.js');
  return handleBulkAnalyze(c);
});

// Legacy redirects
app.post('/analyze', async (c) => {
  const { handleLegacyAnalyze } = await import('./handlers/legacy.js');
  return handleLegacyAnalyze(c);
});

app.post('/bulk-analyze', async (c) => {
  const { handleLegacyBulkAnalyze } = await import('./handlers/legacy.js');
  return handleLegacyBulkAnalyze(c);
});

// Billing endpoints
app.post('/stripe-webhook', async (c) => {
  const { handleStripeWebhook } = await import('./handlers/billing.js');
  return handleStripeWebhook(c);
});

app.post('/billing/create-checkout-session', async (c) => {
  const { handleCreateCheckoutSession } = await import('./handlers/billing.js');
  return handleCreateCheckoutSession(c);
});

app.post('/billing/create-portal-session', async (c) => {
  const { handleCreatePortalSession } = await import('./handlers/billing.js');
  return handleCreatePortalSession(c);
});

// Analytics endpoints
app.get('/analytics/summary', async (c) => {
  const { handleAnalyticsSummary } = await import('./handlers/analytics.js');
  return handleAnalyticsSummary(c);
});

app.post('/ai/generate-insights', async (c) => {
  const { handleGenerateInsights } = await import('./handlers/analytics.js');
  return handleGenerateInsights(c);
});

// Debug endpoints
app.get('/debug-engagement/:username', async (c) => {
  const { handleDebugEngagement } = await import('./handlers/debug.js');
  return handleDebugEngagement(c);
});

app.get('/debug-scrape/:username', async (c) => {
  const { handleDebugScrape } = await import('./handlers/debug.js');
  return handleDebugScrape(c);
});

app.get('/debug-parsing/:username', async (c) => {
  const { handleDebugParsing } = await import('./handlers/debug.js');
  return handleDebugParsing(c);
});

app.get('/debug-env', async (c) => {
  const { handleDebugEnv } = await import('./handlers/test.js');
  return handleDebugEnv(c);
});

// Test endpoints
app.get('/test-supabase', async (c) => {
  const { handleTestSupabase } = await import('./handlers/test.js');
  return handleTestSupabase(c);
});

app.get('/test-apify', async (c) => {
  const { handleTestApify } = await import('./handlers/test.js');
  return handleTestApify(c);
});

app.get('/test-openai', async (c) => {
  const { handleTestOpenAI } = await import('./handlers/test.js');
  return handleTestOpenAI(c);
});

app.post('/test-post', async (c) => {
  const { handleTestPost } = await import('./handlers/test.js');
  return handleTestPost(c);
});

// ===============================================================================
// ERROR HANDLING
// ===============================================================================

app.onError((err, c) => {
  const requestId = generateRequestId();
  logger('error', 'Unhandled enterprise worker error', { 
    error: err.message, 
    stack: err.stack, 
    requestId 
  });
  
  return c.json(createStandardResponse(false, undefined, 'Internal server error', requestId), 500);
});

app.notFound(c => {
  const requestId = generateRequestId();
  
  return c.json({
    success: false,
    error: 'Endpoint not found',
    requestId,
    timestamp: new Date().toISOString(),
    version: 'v3.1.0-modular',
    architecture: 'modular_with_lazy_loading',
    available_endpoints: [
      'GET / - Health check',
      'GET /health - Simple health status',
      'GET /config - Configuration',
      'POST /v1/analyze - Main analysis endpoint',
      'POST /v1/bulk-analyze - Bulk analysis',
      'POST /billing/* - Stripe endpoints',
      'GET /analytics/* - Analytics endpoints',
      'GET /debug-* - Debug endpoints',
      'GET /test-* - Test endpoints'
    ]
  }, 404);
});

export default app;
