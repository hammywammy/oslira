import type { Context } from 'hono';
import { getEnhancedConfigManager } from '../services/enhanced-config-manager.js';
import { generateRequestId, logger } from '../utils/logger.js';
import { createStandardResponse } from '../utils/response.js';

export async function handlePublicConfig(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    // Direct access to environment variables - no config manager needed for public config
    const publicConfig = {
      supabaseUrl: c.env.SUPABASE_URL,
      supabaseAnonKey: c.env.SUPABASE_ANON_KEY,
      stripePublishableKey: c.env.STRIPE_PUBLISHABLE_KEY,
      workerUrl: c.env.WORKER_URL,
      environment: c.env.ENV || 'production'
    };
    
    logger('info', 'Public config served', { requestId });
    
    return new Response(JSON.stringify(publicConfig), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300'
      }
    });
    
  } catch (error: any) {
    logger('error', 'Failed to serve public config', { error: error.message, requestId });
    
    return new Response(JSON.stringify({
      error: 'Failed to load configuration',
      requestId
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
