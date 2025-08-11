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

interface RotationRequest {
  keyName: string;
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

export async function handleTriggerRotation(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    // Verify admin access
    if (!verifyAdminAccess(c)) {
      return c.json(createStandardResponse(false, undefined, 'Unauthorized access', requestId), 401);
    }
    
    const body = await c.req.json() as RotationRequest;
    const { keyName } = body;
    
    if (!keyName || !isAWSManagedKey(keyName)) {
      return c.json(createStandardResponse(false, undefined, 'Invalid key name for rotation', requestId), 400);
    }
    
    // Get Lambda function ARN for this key
    const lambdaArn = getLambdaArnForKey(keyName, c.env);
    
    if (!lambdaArn) {
      return c.json(createStandardResponse(false, undefined, 'Lambda function not configured for this key', requestId), 400);
    }
    
    // Trigger Lambda function manually
    const lambdaResult = await triggerLambdaRotation(lambdaArn, keyName, c.env);
    
    logger('info', 'Manual rotation triggered', { 
      keyName, 
      lambdaArn,
      success: lambdaResult.success,
      requestId 
    });
    
    return c.json(createStandardResponse(true, {
      message: `Rotation triggered for ${keyName}`,
      lambdaResult,
      note: 'Rotation will complete asynchronously. Check logs for status.'
    }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to trigger rotation', { error: error.message, requestId });
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
          details: { status: openaiResponse.status, source: 'enhanced_admin' }
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
          details: { status: claudeResponse.status, source: 'enhanced_admin' }
        };
        
      case 'APIFY_API_TOKEN':
        const apifyResponse = await fetch(`https://api.apify.com/v2/key-value-stores?token=${keyValue}&limit=1`);
        return {
          success: apifyResponse.ok,
          message: apifyResponse.ok ? 'Apify API token is valid' : 'Apify API token is invalid',
          details: { status: apifyResponse.status, source: 'enhanced_admin' }
        };
        
      case 'STRIPE_SECRET_KEY':
        const stripeResponse = await fetch('https://api.stripe.com/v1/charges?limit=1', {
          headers: { 'Authorization': `Bearer ${keyValue}` }
        });
        return {
          success: stripeResponse.ok,
          message: stripeResponse.ok ? 'Stripe secret key is valid' : 'Stripe secret key is invalid',
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

function getLambdaArnForKey(keyName: string, env: any): string | null {
  const lambdaArns: Record<string, string> = {
    // 'OPENAI_API_KEY': env.OPENAI_ROTATOR_LAMBDA_ARN,  // Removed - Lambda deleted
    'CLAUDE_API_KEY': env.CLAUDE_ROTATOR_LAMBDA_ARN,
    'APIFY_API_TOKEN': env.APIFY_ROTATOR_LAMBDA_ARN,
    'STRIPE_SECRET_KEY': env.STRIPE_ROTATOR_LAMBDA_ARN,
    'STRIPE_WEBHOOK_SECRET': env.STRIPE_ROTATOR_LAMBDA_ARN
  };
  
  return lambdaArns[keyName] || null;
}

async function triggerLambdaRotation(lambdaArn: string, keyName: string, env: any): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    // This would typically use AWS SDK to invoke Lambda
    // For now, we'll simulate the call
    
    const payload = {
      SecretId: `Oslira/${keyName}`,
      trigger: 'manual_rotation',
      timestamp: new Date().toISOString()
    };
    
    // In a real implementation, you would use AWS SDK:
    // const lambda = new AWS.Lambda();
    // const result = await lambda.invoke({
    //   FunctionName: lambdaArn,
    //   Payload: JSON.stringify(payload)
    // }).promise();
    
    logger('info', 'Lambda rotation would be triggered', { 
      lambdaArn, 
      keyName, 
      payload 
    });
    
    return {
      success: true,
      message: `Rotation triggered for ${keyName}`,
      details: { 
        lambdaArn, 
        payload,
        note: 'This is a simulation - implement AWS SDK for actual Lambda invocation'
      }
    };
    
  } catch (error: any) {
    logger('error', 'Failed to trigger Lambda rotation', { 
      lambdaArn, 
      keyName, 
      error: error.message 
    });
    
    return {
      success: false,
      message: `Failed to trigger rotation: ${error.message}`,
      details: { error: error.message }
    };
  }
}
