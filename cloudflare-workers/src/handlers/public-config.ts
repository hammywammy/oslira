import type { Context } from 'hono';
import { getEnhancedConfigManager } from '../services/enhanced-config-manager.js';
import { generateRequestId, logger } from '../utils/logger.js';
import { createStandardResponse } from '../utils/response.js';

export async function handlePublicConfig(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    const configManager = getEnhancedConfigManager(c.env);
    
    // Get only public configuration (never sensitive keys)
const publicConfig = {
  supabaseUrl: await configManager.getConfig('SUPABASE_URL') || c.env.SUPABASE_URL,
  supabaseAnonKey: await configManager.getConfig('SUPABASE_ANON_KEY') || c.env.SUPABASE_ANON_KEY,
  stripePublicKey: await configManager.getConfig('STRIPE_PUBLISHABLE_KEY') || c.env.STRIPE_PUBLISHABLE_KEY,
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
    
const fallback = {
  supabaseUrl: c.env.SUPABASE_URL || 'https://jswzzihuqtjqvobfosks.supabase.co',
  supabaseAnonKey: c.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  stripePublicKey: c.env.STRIPE_PUBLISHABLE_KEY,
  workerUrl: c.env.WORKER_URL,
  fallback: true
};
    
    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
