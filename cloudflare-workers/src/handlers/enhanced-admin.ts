import type { Context } from 'hono';
import { getEnhancedConfigManager } from '../services/enhanced-config-manager.js';
import { getAWSSecretsManager } from '../services/aws-secrets-manager.js';
import { generateRequestId, logger } from '../utils/logger.js';
import { createStandardResponse } from '../utils/response.js';
import { fetchJson } from '../utils/helpers.js';

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
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_PUBLISHABLE_KEY',
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
      storage: isAWSManagedKey(keyName) ? 'AWS Secrets Manager + Supabase backup' : 'Supabase only',
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
      const awsSecretsList = await awsSecrets.listSecrets();
      awsStatus = 'connected';
      
      // Add migration recommendations
      Object.keys(status).forEach(keyName => {
        if (isAWSManagedKey(keyName)) {
          status[keyName].migration_recommended = status[keyName].aws.status !== 'configured';
          status[keyName].in_aws = awsSecretsList.includes(keyName);
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
    const awsManagedKeys = ['OPENAI_API_KEY', 'CLAUDE_API_KEY', 'APIFY_API_TOKEN', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
    const keysToMigrate = migrateAll ? awsManagedKeys : (keyNames || []);
    
    if (keysToMigrate.length === 0) {
      return c.json(createStandardResponse(false, undefined, 'No keys specified for migration', requestId), 400);
    }
    
    const results = [];
    
    for (const keyName of keysToMigrate) {
      try {
        await configManager.migrateToAWS(keyName);
        results.push({
          keyName,
          success: true,
          message: 'Successfully migrated to AWS Secrets Manager'
        });
        
        logger('info', 'Key migrated to AWS', { keyName, requestId });
        
      } catch (migrationError: any) {
        results.push({
          keyName,
          success: false,
          error: migrationError.message
        });
        
        logger('error', 'Key migration failed', { 
          keyName, 
          error: migrationError.message, 
          requestId 
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    return c.json(createStandardResponse(true, {
      message: `Migration completed: ${successCount} successful, ${failureCount} failed`,
      results,
      summary: {
        total: keysToMigrate.length,
        successful: successCount,
        failed: failureCount
      }
    }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Migration process failed', { error: error.message, requestId });
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
      storage: isAWSManagedKey(entry.key_name) ? 'AWS + Supabase' : 'Supabase'
    }));
    
    return c.json(createStandardResponse(true, { 
      log: formattedLog,
      total: formattedLog.length,
      limit,
      offset,
      hasAWSIntegration: true
    }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to get enhanced audit log', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
}

// =======================================================================================
// HELPER FUNCTIONS - PASTE THESE AT THE END OF THE FILE
// =======================================================================================

function isAWSManagedKey(keyName: string): boolean {
  const awsManagedKeys = [
    'OPENAI_API_KEY',
    'CLAUDE_API_KEY',
    'APIFY_API_TOKEN',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ];
  
  return awsManagedKeys.includes(keyName);
}

function validateApiKeyFormat(keyName: string, keyValue: string): { valid: boolean; error?: string } {
  const validations: Record<string, (key: string) => boolean> = {
    'OPENAI_API_KEY': (key) => key.startsWith('sk-') && key.length > 20,
    'CLAUDE_API_KEY': (key) => key.startsWith('sk-ant-') && key.length > 30,
    'APIFY_API_TOKEN': (key) => key.startsWith('apify_api_') && key.length > 20,
    'STRIPE_SECRET_KEY': (key) => (key.startsWith('sk_live_') || key.startsWith('sk_test_')) && key.length > 20,
    'STRIPE_WEBHOOK_SECRET': (key) => key.startsWith('whsec_') && key.length > 20,
    'STRIPE_PUBLISHABLE_KEY': (key) => (key.startsWith('pk_live_') || key.startsWith('pk_test_')) && key.length > 20,
    'WORKER_URL': (key) => key.startsWith('https://') && key.includes('.workers.dev'),
    'NETLIFY_BUILD_HOOK_URL': (key) => key.startsWith('https://api.netlify.com/build_hooks/')
  };
  
  const validator = validations[keyName];
  if (!validator) {
    return { valid: true }; // Allow unknown key types
  }
  
  if (!validator(keyValue)) {
    return { valid: false, error: `Invalid format for ${keyName}` };
  }
  
  return { valid: true };
}

