import type { Context } from 'hono';
import { getEnhancedConfigManager } from '../services/enhanced-config-manager.js';
import { generateRequestId, logger } from '../utils/logger.js';
import { createStandardResponse } from '../utils/response.js';
import { fetchJson } from '../utils/helpers.js';

interface ConfigUpdateRequest {
  keyName: string;
  newValue: string;
  adminToken?: string;
}

interface ConfigStatusResponse {
  success: boolean;
  status?: Record<string, {
    configured: boolean;
    lastUpdated: string;
    updatedBy: string;
  }>;
  error?: string;
}

// Admin authentication middleware
function verifyAdminAccess(c: Context): boolean {
  const authHeader = c.req.header('Authorization');
  const adminToken = c.env.ADMIN_TOKEN;
  
  if (!adminToken) {
    logger('error', 'ADMIN_TOKEN not configured in environment');
    return false;
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  return token === adminToken;
}

export async function handleUpdateApiKey(c: Context): Promise<Response> {
  const requestId = generateRequestId();

    const sensitiveKeys = ['OPENAI_API_KEY', 'CLAUDE_API_KEY', 'APIFY_API_TOKEN', 'STRIPE_SECRET_KEY'];
  
  if (sensitiveKeys.includes(keyName)) {
    // Store in AWS Secrets Manager
    const awsSecrets = new AWSSecretsManager(c.env);
    await awsSecrets.putSecret(keyName, newValue);
    
    // Also update Supabase as backup
    const configManager = getConfigManager(c.env);
    await configManager.updateConfig(keyName, newValue, userEmail);
  } else {
    // Non-sensitive keys only go to Supabase
    const configManager = getConfigManager(c.env);
    await configManager.updateConfig(keyName, newValue, userEmail);
  }
  
  try {
    // Verify admin access
    if (!verifyAdminAccess(c)) {
      logger('warn', 'Unauthorized admin access attempt', { requestId });
      return c.json(createStandardResponse(false, undefined, 'Unauthorized access', requestId), 401);
    }
    
    const body = await c.req.json() as ConfigUpdateRequest;
    const { keyName, newValue } = body;
    
    // Validate input
    if (!keyName || !newValue) {
      return c.json(createStandardResponse(false, undefined, 'keyName and newValue are required', requestId), 400);
    }
    
    // Validate keyName against allowed keys
    const allowedKeys = [
      'OPENAI_API_KEY', 
      'CLAUDE_API_KEY', 
      'APIFY_API_TOKEN', 
      'STRIPE_SECRET_KEY', 
      'STRIPE_WEBHOOK_SECRET'
    ];
    
    if (!allowedKeys.includes(keyName)) {
      return c.json(createStandardResponse(false, undefined, 'Invalid key name', requestId), 400);
    }
    
    // Validate key format
    const keyValidation = validateApiKeyFormat(keyName, newValue);
    if (!keyValidation.valid) {
      return c.json(createStandardResponse(false, undefined, keyValidation.error, requestId), 400);
    }
    
    // Get user info from session if available
    const userEmail = c.req.header('X-User-Email') || 'admin-panel';
    
    // Update configuration
    const configManager = getEnhancedConfigManager(c.env);
    await configManager.updateConfig(keyName, newValue, userEmail);
    
    // Trigger auto-sync to other services
    await triggerAutoSync(keyName, userEmail, c.env);
    
    // Test the key to ensure it's working (optional)
    const testResult = await testApiKey(keyName, newValue, c.env);
    
    logger('info', 'API key updated via admin panel', { 
      keyName, 
      updatedBy: userEmail,
      testResult: testResult.success,
      requestId 
    });
    
    return c.json(createStandardResponse(true, {
      message: `${keyName} updated successfully`,
      testResult: testResult
    }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Admin key update failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
}

// Auto-sync function to trigger updates across all services
async function triggerAutoSync(keyName: string, updatedBy: string, env: any): Promise<void> {
  const promises: Promise<any>[] = [];

  // 1. Trigger Netlify rebuild
  if (env.NETLIFY_BUILD_HOOK_URL) {
    promises.push(
      fetch(env.NETLIFY_BUILD_HOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: 'config_update',
          keyName,
          updatedBy,
          timestamp: new Date().toISOString()
        })
      }).then(response => {
        if (response.ok) {
          logger('info', 'Netlify rebuild triggered', { keyName });
        } else {
          logger('error', 'Netlify rebuild failed', { keyName, status: response.status });
        }
      }).catch(error => {
        logger('error', 'Netlify rebuild request failed', { keyName, error: error.message });
      })
    );
  }

  // 2. Clear Cloudflare Worker cache (if using KV storage)
  if (env.CONFIG_KV_NAMESPACE) {
    promises.push(
      env.CONFIG_KV_NAMESPACE.delete(`config:${keyName}`)
        .then(() => logger('info', 'Cloudflare KV cache cleared', { keyName }))
        .catch((error: any) => logger('warn', 'Failed to clear KV cache', { keyName, error: error.message }))
    );
  }

  // 3. Purge CDN cache for config endpoints
  if (env.CLOUDFLARE_ZONE_ID && env.CLOUDFLARE_API_TOKEN) {
    promises.push(
      fetch(`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/purge_cache`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: [
            `${env.WORKER_URL}/config`,
            `${env.WORKER_URL}/v1/config`
          ]
        })
      }).then(() => logger('info', 'CDN cache purged', { keyName }))
        .catch(error => logger('warn', 'CDN cache purge failed', { keyName, error: error.message }))
    );
  }

  // 4. Send notifications
  if (env.SLACK_WEBHOOK_URL) {
    promises.push(
      fetch(env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🔑 Config Updated: \`${keyName}\` was updated by ${updatedBy}`,
          channel: '#alerts'
        })
      }).catch(error => logger('warn', 'Slack notification failed', { error: error.message }))
    );
  }

  // Execute all sync operations in parallel
  await Promise.allSettled(promises);
  
  logger('info', 'Auto-sync completed', { 
    keyName, 
    updatedBy,
    syncOperations: promises.length
  });
}

export async function handleGetConfigStatus(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    // Verify admin access
    if (!verifyAdminAccess(c)) {
      return c.json(createStandardResponse(false, undefined, 'Unauthorized access', requestId), 401);
    }
    
    const headers = {
      apikey: c.env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json'
    };
    
    // Get all configuration keys
    const configKeys = await fetchJson<any[]>(
      `${c.env.SUPABASE_URL}/rest/v1/app_config?environment=eq.production&select=key_name,updated_at,updated_by,key_value`,
      { headers }
    );
    
    const allowedKeys = [
      'OPENAI_API_KEY', 
      'CLAUDE_API_KEY', 
      'APIFY_API_TOKEN', 
      'STRIPE_SECRET_KEY', 
      'STRIPE_WEBHOOK_SECRET'
    ];
    
    const status: Record<string, any> = {};
    
    for (const keyName of allowedKeys) {
      const configItem = configKeys.find(item => item.key_name === keyName);
      
      if (configItem) {
        // Don't expose the actual key value, just check if it exists and has content
        const hasValue = configItem.key_value && configItem.key_value.length > 0;
        
        status[keyName] = {
          configured: hasValue,
          lastUpdated: configItem.updated_at,
          updatedBy: configItem.updated_by || 'system',
          status: hasValue ? 'CONFIGURED' : 'EMPTY'
        };
      } else {
        // Check if key exists in environment variables as fallback
        const envValue = c.env[keyName as keyof typeof c.env];
        status[keyName] = {
          configured: !!envValue,
          lastUpdated: 'N/A',
          updatedBy: 'environment',
          status: envValue ? 'ENV_FALLBACK' : 'MISSING'
        };
      }
    }
    
    logger('info', 'Config status retrieved', { requestId });
    
    return c.json(createStandardResponse(true, { status }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to get config status', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
}

export async function handleTestApiKey(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    // Verify admin access
    if (!verifyAdminAccess(c)) {
      return c.json(createStandardResponse(false, undefined, 'Unauthorized access', requestId), 401);
    }
    
    const { keyName, keyValue } = await c.req.json();
    
    if (!keyName) {
      return c.json(createStandardResponse(false, undefined, 'keyName is required', requestId), 400);
    }
    
    // If keyValue is provided, test that value, otherwise get from config
    let valueToTest = keyValue;
    if (!valueToTest) {
      const configManager = getConfigManager(c.env);
      valueToTest = await configManager.getConfig(keyName);
    }
    
    if (!valueToTest) {
      return c.json(createStandardResponse(false, undefined, 'No key value to test', requestId), 400);
    }
    
    const testResult = await testApiKey(keyName, valueToTest, c.env);
    
    logger('info', 'API key tested', { keyName, success: testResult.success, requestId });
    
    return c.json(createStandardResponse(true, testResult, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'API key test failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
}

export async function handleGetAuditLog(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    // Verify admin access
    if (!verifyAdminAccess(c)) {
      return c.json(createStandardResponse(false, undefined, 'Unauthorized access', requestId), 401);
    }
    
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    
    const headers = {
      apikey: c.env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json'
    };
    
    // Get audit log from app_config table
    const auditLog = await fetchJson<any[]>(
      `${c.env.SUPABASE_URL}/rest/v1/app_config?environment=eq.production&select=key_name,updated_at,updated_by&order=updated_at.desc&limit=${limit}&offset=${offset}`,
      { headers }
    );
    
    const formattedLog = auditLog.map(entry => ({
      keyName: entry.key_name,
      action: 'UPDATE',
      timestamp: entry.updated_at,
      user: entry.updated_by || 'system',
      id: `${entry.key_name}-${entry.updated_at}`
    }));
    
    return c.json(createStandardResponse(true, { 
      log: formattedLog,
      total: formattedLog.length,
      limit,
      offset
    }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to get audit log', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
}

// Helper function to validate API key formats
function validateApiKeyFormat(keyName: string, keyValue: string): { valid: boolean; error?: string } {
  const validations: Record<string, (key: string) => boolean> = {
    'OPENAI_API_KEY': (key) => key.startsWith('sk-') && key.length > 20,
    'CLAUDE_API_KEY': (key) => key.startsWith('sk-ant-') && key.length > 30,
    'APIFY_API_TOKEN': (key) => key.startsWith('apify_api_') && key.length > 20,
    'STRIPE_SECRET_KEY': (key) => (key.startsWith('sk_live_') || key.startsWith('sk_test_')) && key.length > 20,
    'STRIPE_WEBHOOK_SECRET': (key) => key.startsWith('whsec_') && key.length > 20
  };
  
  const validator = validations[keyName];
  if (!validator) {
    return { valid: false, error: 'Unknown key type' };
  }
  
  if (!validator(keyValue)) {
    return { valid: false, error: `Invalid format for ${keyName}` };
  }
  
  return { valid: true };
}

// Helper function to test API keys
async function testApiKey(keyName: string, keyValue: string, env: any): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    switch (keyName) {
      case 'OPENAI_API_KEY':
        const openaiResponse = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${keyValue}` }
        });
        return {
          success: openaiResponse.ok,
          message: openaiResponse.ok ? 'OpenAI API key is valid' : 'OpenAI API key is invalid',
          details: { status: openaiResponse.status }
        };
        
      case 'CLAUDE_API_KEY':
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': keyValue,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1
          })
        });
        return {
          success: claudeResponse.status !== 401 && claudeResponse.status !== 403,
          message: claudeResponse.status !== 401 && claudeResponse.status !== 403 ? 'Claude API key is valid' : 'Claude API key is invalid',
          details: { status: claudeResponse.status }
        };
        
      case 'APIFY_API_TOKEN':
        const apifyResponse = await fetch(`https://api.apify.com/v2/key-value-stores?token=${keyValue}&limit=1`);
        return {
          success: apifyResponse.ok,
          message: apifyResponse.ok ? 'Apify API token is valid' : 'Apify API token is invalid',
          details: { status: apifyResponse.status }
        };
        
      case 'STRIPE_SECRET_KEY':
        const stripeResponse = await fetch('https://api.stripe.com/v1/charges?limit=1', {
          headers: { 'Authorization': `Bearer ${keyValue}` }
        });
        return {
          success: stripeResponse.ok,
          message: stripeResponse.ok ? 'Stripe secret key is valid' : 'Stripe secret key is invalid',
          details: { status: stripeResponse.status }
        };
        
      case 'STRIPE_WEBHOOK_SECRET':
        // Webhook secrets can't be easily tested, just check format
        return {
          success: keyValue.startsWith('whsec_'),
          message: keyValue.startsWith('whsec_') ? 'Webhook secret format is valid' : 'Invalid webhook secret format'
        };
        
      default:
        return {
          success: false,
          message: 'Testing not implemented for this key type'
        };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Test failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}
