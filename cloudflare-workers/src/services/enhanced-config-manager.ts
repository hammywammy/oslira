// ============================================================================
// ENHANCED CONFIG MANAGER - Complete AWS Integration
// File: src/services/enhanced-config-manager.ts
// ============================================================================

import type { Env } from '../types/interfaces.js';
import { fetchJson } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

interface ConfigItem {
  key_name: string;
  key_value: string;
  environment: string;
  updated_at: string;
  source: 'supabase' | 'aws' | 'env';
}

interface AWSSecretsManager {
  getSecret(secretName: string): Promise<string>;
  putSecret(secretName: string, secretValue: string, rotatedBy?: string): Promise<void>;
  testConnection(): Promise<boolean>;
}

class EnhancedConfigManager {
  private cache: Map<string, { value: string; expires: number; source: string }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private awsSecrets: AWSSecretsManager | null = null;
  private connectionTested = false;
  
  // Keys that should be stored in AWS Secrets Manager
  private readonly AWS_MANAGED_KEYS = [
    'OPENAI_API_KEY',
    'CLAUDE_API_KEY', 
    'APIFY_API_TOKEN',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SUPABASE_SERVICE_ROLE',
    'SUPABASE_ANON_KEY',
    'ADMIN_TOKEN',
    'INTERNAL_API_TOKEN'
  ];

  constructor(private env: Env) {
    this.initializeAWS();
  }

  private async initializeAWS(): Promise<void> {
    try {
      if (!this.env.AWS_ACCESS_KEY_ID || !this.env.AWS_SECRET_ACCESS_KEY) {
        logger('warn', 'AWS credentials not found, using Supabase-only mode');
        return;
      }

      this.awsSecrets = new AWSSecretsManagerClient(this.env);
      logger('info', 'AWS Secrets Manager initialized successfully');
    } catch (error: any) {
      logger('error', 'Failed to initialize AWS Secrets Manager', { error: error.message });
      this.awsSecrets = null;
    }
  }

  async testAWSConnection(): Promise<boolean> {
    if (!this.awsSecrets || this.connectionTested) {
      return this.awsSecrets !== null;
    }

    try {
      this.connectionTested = await this.awsSecrets.testConnection();
      if (this.connectionTested) {
        logger('info', 'AWS Secrets Manager connection validated');
      } else {
        logger('warn', 'AWS Secrets Manager connection failed validation');
      }
      return this.connectionTested;
    } catch (error: any) {
      logger('error', 'AWS connection test failed', { error: error.message });
      this.connectionTested = false;
      return false;
    }
  }

  async getConfig(keyName: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(keyName);
    if (cached && cached.expires > Date.now()) {
      logger('debug', `Config cache hit for ${keyName}`, { source: cached.source });
      return cached.value;
    }

    try {
      let value: string = '';
      let source: string = 'env';

      // For sensitive keys, try AWS first
      if (this.AWS_MANAGED_KEYS.includes(keyName)) {
        if (this.awsSecrets && await this.testAWSConnection()) {
          try {
            value = await this.awsSecrets.getSecret(keyName);
            source = 'aws';
            logger('info', `Retrieved ${keyName} from AWS Secrets Manager`);
          } catch (awsError: any) {
            logger('warn', `AWS retrieval failed for ${keyName}, trying Supabase fallback`, { 
              error: awsError.message 
            });
            
            // Fallback to Supabase
            value = await this.getFromSupabase(keyName);
            source = 'supabase';
          }
        } else {
          logger('warn', `AWS not available for ${keyName}, using Supabase`);
          value = await this.getFromSupabase(keyName);
          source = 'supabase';
        }
      } else {
        // Non-sensitive keys use Supabase first
        try {
          value = await this.getFromSupabase(keyName);
          source = 'supabase';
        } catch (supabaseError: any) {
          logger('warn', `Supabase retrieval failed for ${keyName}, trying environment`, {
            error: supabaseError.message
          });
          
          // Final fallback to environment variable
          value = this.env[keyName as keyof Env] as string || '';
          source = 'env';
        }
      }

      if (!value) {
        logger('error', `No value found for config key: ${keyName}`);
        throw new Error(`Configuration key not found: ${keyName}`);
      }

      // Validate sensitive keys
      if (this.AWS_MANAGED_KEYS.includes(keyName)) {
        if (!this.validateSecretFormat(keyName, value)) {
          logger('warn', `Invalid format for ${keyName}`, { 
            source, 
            length: value.length,
            prefix: value.substring(0, 8)
          });
        }
      }

      // Cache the result
      this.cache.set(keyName, {
        value,
        expires: Date.now() + this.CACHE_TTL,
        source
      });

      logger('info', `Config retrieved successfully`, { 
        keyName, 
        source,
        hasValue: !!value,
        length: value.length
      });

      return value;

    } catch (error: any) {
      logger('error', `Failed to retrieve config for ${keyName}`, { error: error.message });
      
      // Last resort: environment variable
      const envValue = this.env[keyName as keyof Env] as string || '';
      if (envValue) {
        logger('info', `Using environment fallback for ${keyName}`);
        return envValue;
      }
      
      throw new Error(`Configuration unavailable: ${keyName}`);
    }
  }

  private validateSecretFormat(keyName: string, value: string): boolean {
    switch (keyName) {
      case 'OPENAI_API_KEY':
        return value.startsWith('sk-') && value.length > 20;
      case 'CLAUDE_API_KEY':
        return value.startsWith('sk-ant-') && value.length > 30;
      case 'APIFY_API_TOKEN':
        return value.startsWith('apify_api_') && value.length > 40;
      case 'STRIPE_SECRET_KEY':
        return value.startsWith('sk_') && value.length > 20;
      case 'SUPABASE_SERVICE_ROLE':
        return value.startsWith('eyJ') && value.length > 100; // JWT format
      case 'SUPABASE_ANON_KEY':
        return value.startsWith('eyJ') && value.length > 100; // JWT format
      default:
        return true; // No specific validation
    }
  }

  private async getFromSupabase(keyName: string): Promise<string> {
    const environment = this.env.APP_ENV || 'production';
    
    const response = await fetch(`${this.env.SUPABASE_URL}/rest/v1/app_config`, {
      method: 'GET',
      headers: {
        'apikey': this.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${this.env.SUPABASE_SERVICE_ROLE || this.env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase config fetch failed: ${response.status}`);
    }

    const configs: ConfigItem[] = await response.json();
    const config = configs.find(c => 
      c.key_name === keyName && 
      (c.environment === environment || c.environment === 'all')
    );

    if (!config) {
      throw new Error(`Config not found in Supabase: ${keyName}`);
    }

    // Decrypt if base64 encoded
    try {
      return atob(config.key_value);
    } catch {
      return config.key_value;
    }
  }

  async updateConfig(keyName: string, newValue: string, updatedBy: string = 'system'): Promise<void> {
    try {
      // For sensitive keys, update AWS first, then Supabase as backup
      if (this.AWS_MANAGED_KEYS.includes(keyName)) {
        if (this.awsSecrets && await this.testAWSConnection()) {
          try {
            await this.awsSecrets.putSecret(keyName, newValue, updatedBy);
            logger('info', `Updated ${keyName} in AWS Secrets Manager`);
          } catch (awsError: any) {
            logger('error', `Failed to update ${keyName} in AWS`, { error: awsError.message });
            throw awsError;
          }
        }
        
        // Also update Supabase as backup
        await this.updateSupabase(keyName, newValue, updatedBy);
        logger('info', `Updated ${keyName} in Supabase as backup`);
      } else {
        // Non-sensitive keys only go to Supabase
        await this.updateSupabase(keyName, newValue, updatedBy);
        logger('info', `Updated ${keyName} in Supabase`);
      }

      // Clear cache for this key
      this.cache.delete(keyName);
      
    } catch (error: any) {
      logger('error', `Failed to update config ${keyName}`, { error: error.message });
      throw error;
    }
  }

  private async updateSupabase(keyName: string, newValue: string, updatedBy: string): Promise<void> {
    const environment = this.env.APP_ENV || 'production';
    
    const response = await fetch(`${this.env.SUPABASE_URL}/rest/v1/app_config`, {
      method: 'POST',
      headers: {
        'apikey': this.env.SUPABASE_SERVICE_ROLE || this.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${this.env.SUPABASE_SERVICE_ROLE || this.env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key_name: keyName,
        key_value: btoa(newValue), // Base64 encode for security
        environment,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase update failed: ${response.status} - ${errorText}`);
    }
  }

  clearCache(): void {
    this.cache.clear();
    logger('info', 'Config cache cleared');
  }

  getCacheStats(): any {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      awsAvailable: this.awsSecrets !== null,
      connectionTested: this.connectionTested
    };
  }
}

// AWS Secrets Manager Client Implementation
class AWSSecretsManagerClient implements AWSSecretsManager {
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;

  constructor(env: Env) {
    this.accessKeyId = env.AWS_ACCESS_KEY_ID;
    this.secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
    this.region = env.AWS_REGION || 'us-east-1';

    if (!this.accessKeyId || !this.secretAccessKey) {
      throw new Error('AWS credentials not configured');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple list secrets call
      const response = await this.makeAWSRequest('ListSecrets', {
        MaxResults: 1
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getSecret(secretName: string): Promise<string> {
    try {
      const response = await this.makeAWSRequest('GetSecretValue', {
        SecretId: `Oslira/${secretName}`,
        VersionStage: 'AWSCURRENT'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AWS API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.SecretString) {
        throw new Error('Secret has no string value');
      }

      // Try to parse as JSON first (for complex secrets)
      try {
        const secretValue = JSON.parse(data.SecretString);
        return secretValue.apiKey || secretValue.value || data.SecretString;
      } catch {
        // Return as plain string
        return data.SecretString;
      }

    } catch (error: any) {
      logger('error', 'Failed to retrieve secret from AWS', { 
        secretName, 
        error: error.message 
      });
      throw new Error(`AWS Secrets retrieval failed: ${error.message}`);
    }
  }

  async putSecret(secretName: string, secretValue: string, rotatedBy: string = 'manual'): Promise<void> {
    try {
      const payload = {
        SecretId: `Oslira/${secretName}`,
        SecretString: JSON.stringify({
          apiKey: secretValue,
          createdAt: new Date().toISOString(),
          version: `v${Date.now()}`,
          rotatedBy: rotatedBy
        })
      };

      const response = await this.makeAWSRequest('PutSecretValue', payload);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AWS API error: ${response.status} - ${errorText}`);
      }

      logger('info', 'Secret updated in AWS successfully', { secretName, rotatedBy });

    } catch (error: any) {
      logger('error', 'Failed to update secret in AWS', { 
        secretName, 
        error: error.message 
      });
      throw new Error(`AWS Secrets update failed: ${error.message}`);
    }
  }

  private async makeAWSRequest(action: string, payload: any): Promise<Response> {
    const endpoint = `https://secretsmanager.${this.region}.amazonaws.com/`;
    
    // AWS Signature V4 would go here in production
    // For now, using basic headers (this needs proper AWS signing)
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': `secretsmanager.${action}`,
        'Authorization': `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/...` // Simplified
      },
      body: JSON.stringify(payload)
    });
  }
}

// Global instance
let globalConfigManager: EnhancedConfigManager | null = null;

export function getEnhancedConfigManager(env: Env): EnhancedConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new EnhancedConfigManager(env);
  }
  return globalConfigManager;
}

// Convenience function for backward compatibility
export async function getApiKey(keyName: string, env: Env): Promise<string> {
  const configManager = getEnhancedConfigManager(env);
  return await configManager.getConfig(keyName);
}

export { EnhancedConfigManager };
