import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types/interfaces.js';
import { generateRequestId, logger } from './utils/logger.js';
import { createStandardResponse } from './utils/response.js';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: '*',  // Allow all origins temporarily for debugging
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false  // Set to false when using wildcard origin
}));

app.get('/debug/raw-env', async (c) => {
  return c.json({
    allEnvKeys: Object.keys(c.env),
    awsKeys: {
      AWS_ACCESS_KEY_ID: typeof c.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: typeof c.env.AWS_SECRET_ACCESS_KEY,
    },
    rawAccess: {
      directAccessKeyId: c.env['AWS_ACCESS_KEY_ID'],
      directSecretKey: c.env['AWS_SECRET_ACCESS_KEY']
    }
  });
});


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

// Add these enhanced admin endpoints to your existing routes
app.post('/admin/migrate-to-aws', async (c) => {
  const { handleMigrateToAWS } = await import('./handlers/enhanced-admin.js');
  return handleMigrateToAWS(c);
});

// Replace existing admin routes with enhanced versions
app.post('/admin/update-key', async (c) => {
  const { handleUpdateApiKey } = await import('./handlers/enhanced-admin.js');
  return handleUpdateApiKey(c);
});

app.get('/admin/config-status', async (c) => {
  const { handleGetConfigStatus } = await import('./handlers/enhanced-admin.js');
  return handleGetConfigStatus(c);
});

app.get('/admin/audit-log', async (c) => {
  const { handleGetAuditLog } = await import('./handlers/enhanced-admin.js');
  return handleGetAuditLog(c);
});

app.post('/admin/test-key', async (c) => {
  const { handleTestApiKey } = await import('./handlers/enhanced-admin.js');
  return handleTestApiKey(c);
});

// Business context generation endpoint
app.post('/v1/generate-business-context', async (c) => {
  const { handleGenerateBusinessContext } = await import('./handlers/generate-business-context.js');
  return handleGenerateBusinessContext(c);
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
