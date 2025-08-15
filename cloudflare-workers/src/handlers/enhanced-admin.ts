// ============================================================================
// ENHANCED ADMIN HANDLER - CLEANED VERSION
// File: cloudflare-workers/src/handlers/enhanced-admin.ts
// ============================================================================

import type { Context } from 'hono';
import { getEnhancedConfigManager } from '../services/enhanced-config-manager.js';
import { getAWSSecretsManager } from '../services/aws-secrets-manager.js';
import { generateRequestId, logger } from '../utils/logger.js';
import { createStandardResponse } from '../utils/response.js';
import { fetchJson } from '../utils/helpers.js';
import type { Env } from '../types/interfaces.js';

interface ConfigUpdateRequest {
  keyName: string;
  newValue: string;
  adminToken?: string;
}

interface MigrationRequest {
  keyNames?: string[];
  migrateAll?: boolean;
  adminToken?: string;
}

interface RotationRequest {
  keyName: string;
  adminToken?: string;
}

// List of keys that are managed in AWS Secrets Manager
const AWS_MANAGED_KEYS = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY', 
  'APIFY_API_TOKEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SUPABASE_SERVICE_ROLE'
];

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

function isAWSManagedKey(keyName: string): boolean {
  return AWS_MANAGED_KEYS.includes(keyName);
}

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

export async function handleUpdateApiKey(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
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
      'ANTHROPIC_API_KEY', 
      'APIFY_API_TOKEN', 
      'STRIPE_SECRET_KEY', 
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_PUBLISHABLE_KEY',
      'SUPABASE_SERVICE_ROLE',
      'WORKER_URL',
      'NETLIFY_BUILD_HOOK_URL'
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
    
    // Update configuration using enhanced config manager
    const configManager = getEnhancedConfigManager(c.env);
    await configManager.updateConfig(keyName, newValue, userEmail);
    
    // Test the key to ensure it's working
    const testResult = await testApiKey(keyName, newValue, c.env);
    
    logger('info', 'API key updated via enhanced admin panel', { 
      keyName, 
      updatedBy: userEmail,
      testResult: testResult.success,
      usedAWS: isAWSManagedKey(keyName),
      requestId 
    });
    
    return c.json(createStandardResponse(true, {
      message: `${keyName} updated successfully`,
      testResult: testResult,
      storage: isAWSManagedKey(keyName) ? 'AWS Secrets Manager' : 'Environment Variables',
      autoSyncTriggered: true
    }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Enhanced admin key update failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
}

export async function handleGetConfigStatus(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    // Verify admin access
    if (!verifyAdminAccess(c)) {
      return c.json(createStandardResponse(false, undefined, 'Unauthorized access', requestId), 401);
    }
    
    const configManager = getEnhancedConfigManager(c.env);
    const status = await configManager.getConfigStatus();
    
    // Add AWS connectivity status
    let awsStatus = 'not_configured';
    try {
      const awsSecrets = getAWSSecretsManager(c.env);
      // Test AWS connectivity by attempting to list secrets
      await awsSecrets.listSecrets();
      awsStatus = 'connected';
      
      // Add migration recommendations
      Object.keys(status).forEach(keyName => {
        if (isAWSManagedKey(keyName)) {
          status[keyName].migration_recommended = status[keyName].aws?.status !== 'configured';
          status[keyName].aws_managed = true;
        }
      });
      
    } catch (awsError: any) {
      awsStatus = `error: ${awsError.message}`;
    }
    
    logger('info', 'Enhanced config status retrieved', { requestId, awsStatus });
    
    return c.json(createStandardResponse(true, { 
      status,
      aws_connectivity: awsStatus,
      migration_summary: {
        total_keys: Object.keys(status).length,
        aws_managed_keys: Object.keys(status).filter(k => isAWSManagedKey(k)).length,
        migration_needed: Object.values(status).filter((s: any) => s.migration_recommended).length
      }
    }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to get enhanced config status', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
}

export async function handleMigrateToAWS(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    // Verify admin access
    if (!verifyAdminAccess(c)) {
      return c.json(createStandardResponse(false, undefined, 'Unauthorized access', requestId), 401);
    }
    
    const body = await c.req.json() as MigrationRequest;
    const { keyNames, migrateAll } = body;
    
    const configManager = getEnhancedConfigManager(c.env);
    
    // Determine which keys to migrate
    const keysToMigrate = migrateAll ? AWS_MANAGED_KEYS : (keyNames || []);
    
    if (keysToMigrate.length === 0) {
      return c.json(createStandardResponse(false, undefined, 'No keys specified for migration', requestId), 400);
    }
    
    const migrationResults = [];
    
    for (const keyName of keysToMigrate) {
      try {
        // Get current value from environment/Supabase
        const currentValue = await configManager.getConfig(keyName);
        
        if (!currentValue) {
          migrationResults.push({
            keyName,
            success: false,
            error: 'Key not found in current configuration'
          });
          continue;
        }
        
        // Store in AWS Secrets Manager
        const awsSecrets = getAWSSecretsManager(c.env);
        await awsSecrets.createOrUpdateSecret(keyName, currentValue);
        
        migrationResults.push({
          keyName,
          success: true,
          message: 'Successfully migrated to AWS Secrets Manager'
        });
        
        logger('info', 'Key migrated to AWS', { keyName, requestId });
        
      } catch (keyError: any) {
        migrationResults.push({
          keyName,
          success: false,
          error: keyError.message
        });
        
        logger('error', 'Failed to migrate key', { keyName, error: keyError.message, requestId });
      }
    }
    
    const successCount = migrationResults.filter(r => r.success).length;
    
    return c.json(createStandardResponse(true, {
      message: `Migration completed: ${successCount}/${keysToMigrate.length} keys migrated successfully`,
      results: migrationResults,
      summary: {
        total: keysToMigrate.length,
        successful: successCount,
        failed: keysToMigrate.length - successCount
      }
    }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Migration to AWS failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
}

export async function handleGetConfig(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    // Verify admin access
    if (!verifyAdminAccess(c)) {
      return c.json(createStandardResponse(false, undefined, 'Unauthorized access', requestId), 401);
    }
    
    const { keyName } = await c.req.json();
    
    if (!keyName) {
      return c.json(createStandardResponse(false, undefined, 'keyName is required', requestId), 400);
    }
    
    const configManager = getEnhancedConfigManager(c.env);
    const value = await configManager.getConfig(keyName);
    
    if (!value) {
      return c.json(createStandardResponse(false, undefined, `Configuration key not found: ${keyName}`, requestId), 404);
    }
    
    logger('info', 'Config retrieved via admin API', { keyName, requestId });
    
    return c.json(createStandardResponse(true, {
      keyName,
      value,
      source: isAWSManagedKey(keyName) ? 'aws' : 'env',
      timestamp: new Date().toISOString()
    }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to get config', { error: error.message, requestId });
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
    
   // If keyValue is provided, test that value, otherwise get from enhanced config
    let valueToTest = keyValue;
    if (!valueToTest) {
      const configManager = getEnhancedConfigManager(c.env);
      valueToTest = await configManager.getConfig(keyName);
    }
    
    if (!valueToTest) {
      return c.json(createStandardResponse(false, undefined, 'No key value to test', requestId), 400);
    }
    
    const testResult = await testApiKey(keyName, valueToTest, c.env);
    
    logger('info', 'API key tested via enhanced admin', { 
      keyName, 
      success: testResult.success, 
      requestId 
    });
    
    return c.json(createStandardResponse(true, testResult, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Enhanced API key test failed', { error: error.message, requestId });
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
      id: `${entry.key_name}-${entry.updated_at}`,
      storage: isAWSManagedKey(entry.key_name) ? 'AWS Secrets Manager' : 'Environment Variables'
    }));
    
    logger('info', 'Audit log retrieved', { count: formattedLog.length, requestId });
    
    return c.json(createStandardResponse(true, {
      logs: formattedLog,
      pagination: {
        limit,
        offset,
        total: formattedLog.length
      }
    }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to get audit log', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
}

// ============================================================================
// VALIDATION AND TESTING FUNCTIONS
// ============================================================================

function validateApiKeyFormat(keyName: string, keyValue: string): { valid: boolean; error?: string } {
  switch (keyName) {
    case 'OPENAI_API_KEY':
      return {
        valid: keyValue.startsWith('sk-proj-') || keyValue.startsWith('sk-'),
        error: keyValue.startsWith('sk-proj-') || keyValue.startsWith('sk-') ? undefined : 'OpenAI API key must start with "sk-proj-" or "sk-"'
      };
      
    case 'ANTHROPIC_API_KEY':
      return {
        valid: keyValue.startsWith('sk-ant-'),
        error: keyValue.startsWith('sk-ant-') ? undefined : 'Anthropic API key must start with "sk-ant-"'
      };
      
    case 'APIFY_API_TOKEN':
      return {
        valid: keyValue.startsWith('apify_api_'),
        error: keyValue.startsWith('apify_api_') ? undefined : 'Apify API token must start with "apify_api_"'
      };
      
    case 'STRIPE_SECRET_KEY':
      return {
        valid: keyValue.startsWith('sk_live_') || keyValue.startsWith('sk_test_'),
        error: (keyValue.startsWith('sk_live_') || keyValue.startsWith('sk_test_')) ? undefined : 'Stripe secret key must start with "sk_live_" or "sk_test_"'
      };
      
    case 'STRIPE_WEBHOOK_SECRET':
      return {
        valid: keyValue.startsWith('whsec_'),
        error: keyValue.startsWith('whsec_') ? undefined : 'Stripe webhook secret must start with "whsec_"'
      };
      
    case 'STRIPE_PUBLISHABLE_KEY':
      return {
        valid: keyValue.startsWith('pk_live_') || keyValue.startsWith('pk_test_'),
        error: (keyValue.startsWith('pk_live_') || keyValue.startsWith('pk_test_')) ? undefined : 'Stripe publishable key must start with "pk_live_" or "pk_test_"'
      };
      
    case 'SUPABASE_SERVICE_ROLE':
      return {
        valid: keyValue.length > 100 && !keyValue.includes(' '),
        error: (keyValue.length > 100 && !keyValue.includes(' ')) ? undefined : 'Supabase service role key appears invalid'
      };
      
    case 'WORKER_URL':
      return {
        valid: keyValue.startsWith('https://') && keyValue.includes('.workers.dev'),
        error: (keyValue.startsWith('https://') && keyValue.includes('.workers.dev')) ? undefined : 'Worker URL must be a valid Cloudflare Workers URL'
      };
      
    case 'NETLIFY_BUILD_HOOK_URL':
      return {
        valid: keyValue.includes('api.netlify.com/build_hooks/'),
        error: keyValue.includes('api.netlify.com/build_hooks/') ? undefined : 'Invalid Netlify build hook URL format'
      };
      
    default:
      return {
        valid: keyValue.length > 0,
        error: keyValue.length > 0 ? undefined : 'Value cannot be empty'
      };
  }
}

async function testApiKey(keyName: string, keyValue: string, env: Env): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    switch (keyName) {
      case 'OPENAI_API_KEY':
        const openaiResponse = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${keyValue}`,
            'Content-Type': 'application/json'
          }
        });
        return {
          success: openaiResponse.ok,
          message: openaiResponse.ok ? 'OpenAI API key is valid' : 'OpenAI API key test failed',
          details: { status: openaiResponse.status, source: 'enhanced_admin' }
        };
        
      case 'ANTHROPIC_API_KEY':
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': keyValue,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'test' }]
          })
        });
        return {
          success: anthropicResponse.ok,
          message: anthropicResponse.ok ? 'Anthropic API key is valid' : 'Anthropic API key test failed',
          details: { status: anthropicResponse.status, source: 'enhanced_admin' }
        };
        
      case 'APIFY_API_TOKEN':
        const apifyResponse = await fetch(`https://api.apify.com/v2/users/me?token=${keyValue}`);
        return {
          success: apifyResponse.ok,
          message: apifyResponse.ok ? 'Apify API token is valid' : 'Apify API token test failed',
          details: { status: apifyResponse.status, source: 'enhanced_admin' }
        };
        
      case 'STRIPE_SECRET_KEY':
        const stripeResponse = await fetch('https://api.stripe.com/v1/balance', {
          headers: {
            'Authorization': `Bearer ${keyValue}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        return {
          success: stripeResponse.ok,
          message: stripeResponse.ok ? 'Stripe secret key is valid' : 'Stripe secret key test failed',
          details: { status: stripeResponse.status, source: 'enhanced_admin' }
        };
        
      case 'STRIPE_WEBHOOK_SECRET':
        return {
          success: keyValue.startsWith('whsec_'),
          message: keyValue.startsWith('whsec_') ? 'Webhook secret format is valid' : 'Invalid webhook secret format',
          details: { source: 'enhanced_admin' }
        };
        
      case 'STRIPE_PUBLISHABLE_KEY':
        return {
          success: keyValue.startsWith('pk_live_') || keyValue.startsWith('pk_test_'),
          message: (keyValue.startsWith('pk_live_') || keyValue.startsWith('pk_test_')) ? 'Stripe publishable key format is valid' : 'Invalid publishable key format',
          details: { source: 'enhanced_admin' }
        };
        
      case 'SUPABASE_SERVICE_ROLE':
        const supabaseResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
          headers: {
            'Authorization': `Bearer ${keyValue}`,
            'apikey': keyValue,
            'Content-Type': 'application/json'
          }
        });
        return {
          success: supabaseResponse.ok,
          message: supabaseResponse.ok ? 'Supabase service role is valid' : 'Supabase service role test failed',
          details: { status: supabaseResponse.status, source: 'enhanced_admin' }
        };
        
      case 'WORKER_URL':
        const workerResponse = await fetch(`${keyValue}/health`);
        return {
          success: workerResponse.ok,
          message: workerResponse.ok ? 'Worker URL is accessible' : 'Worker URL is not accessible',
          details: { status: workerResponse.status, source: 'enhanced_admin' }
        };
        
      case 'NETLIFY_BUILD_HOOK_URL':
        return {
          success: keyValue.includes('api.netlify.com/build_hooks/'),
          message: keyValue.includes('api.netlify.com/build_hooks/') ? 'Netlify build hook URL format is valid' : 'Invalid Netlify build hook URL',
          details: { source: 'enhanced_admin' }
        };
        
      default:
        return {
          success: false,
          message: 'Testing not implemented for this key type',
          details: { source: 'enhanced_admin' }
        };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Test failed: ${error.message}`,
      details: { error: error.message, source: 'enhanced_admin' }
    };
  }
}

// ============================================================================
// MANUAL ROTATION HANDLER (Replaces Lambda-based rotation)
// ============================================================================

export async function handleManualRotation(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    // Verify admin access
    if (!verifyAdminAccess(c)) {
      return c.json(createStandardResponse(false, undefined, 'Unauthorized access', requestId), 401);
    }
    
    const body = await c.req.json() as RotationRequest;
    const { keyName } = body;
    
    if (!keyName || !isAWSManagedKey(keyName)) {
      return c.json(createStandardResponse(false, undefined, 'Invalid or non-AWS managed key specified', requestId), 400);
    }
    
    logger('info', 'Manual rotation initiated', { keyName, requestId });
    
    // Manual rotation process:
    // 1. Generate rotation instructions for the user
    // 2. Provide API testing capabilities
    // 3. Log the rotation request
    
    const rotationInstructions = generateRotationInstructions(keyName);
    
    return c.json(createStandardResponse(true, {
      message: `Manual rotation process initiated for ${keyName}`,
      instructions: rotationInstructions,
      nextSteps: [
        '1. Follow the provider-specific instructions to generate a new key',
        '2. Use the test endpoint to verify the new key works',
        '3. Update the key using the admin panel',
        '4. Verify all services are working with the new key'
      ],
      keyName,
      timestamp: new Date().toISOString()
    }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Manual rotation failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
}

function generateRotationInstructions(keyName: string): string {
  const instructions: Record<string, string> = {
    'OPENAI_API_KEY': 'Go to OpenAI Dashboard → API Keys → Create new secret key. Copy the new key and test it before updating.',
    'ANTHROPIC_API_KEY': 'Go to Anthropic Console → API Keys → Create Key. Generate a new key and test it before updating.',
    'APIFY_API_TOKEN': 'Go to Apify Console → Settings → Integrations → API tokens → Create new token.',
    'STRIPE_SECRET_KEY': 'Go to Stripe Dashboard → Developers → API keys → Create restricted key or regenerate existing key.',
    'STRIPE_WEBHOOK_SECRET': 'Go to Stripe Dashboard → Developers → Webhooks → Select endpoint → Reveal signing secret.',
    'SUPABASE_SERVICE_ROLE': 'Go to Supabase Dashboard → Settings → API → Service Role key. This key typically doesn\'t need rotation unless compromised.'
  };
  
  return instructions[keyName] || 'Manual rotation instructions not available for this key type.';
}
