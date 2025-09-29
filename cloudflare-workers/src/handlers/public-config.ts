import type { Context } from 'hono';
import { getEnhancedConfigManager } from '../services/enhanced-config-manager.js';
import { generateRequestId, logger } from '../utils/logger.js';
import { createStandardResponse } from '../utils/response.js';

export async function handlePublicConfig(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    const configManager = getEnhancedConfigManager(c.env);
    
// Determine environment from Worker env
const environment = c.env.ENV || 'production';
const isProduction = environment === 'production';

const publicConfig = {
  supabaseUrl: await configManager.getConfig('SUPABASE_URL') || c.env.SUPABASE_URL,
  supabaseAnonKey: await configManager.getConfig('SUPABASE_ANON_KEY') || c.env.SUPABASE_ANON_KEY,
  stripePublishableKey: isProduction 
    ? (c.env.STRIPE_LIVE_PUBLISHABLE_KEY || c.env.STRIPE_PUBLISHABLE_KEY)
    : (c.env.STRIPE_TEST_PUBLISHABLE_KEY || c.env.STRIPE_PUBLISHABLE_KEY),
  workerUrl: c.env.WORKER_URL,
  environment: environment,
  stripeMode: isProduction ? 'live' : 'test'
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
    
    // Return basic fallback
    const fallback = {
      supabaseUrl: c.env.SUPABASE_URL || 'https://jswzzihuqtjqvobfosks.supabase.co',
      supabaseAnonKey: c.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzd3p6aWh1cXRqcXZvYmZvc2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ3NjcsImV4cCI6MjA1MDU1MDc2N30.Z7EQBfC8N4QQjl8uIi-cGLM4-MJb4LrUa1Dz6kqBWPU',
      stripePublishableKey: c.env.STRIPE_PUBLISHABLE_KEY,
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
