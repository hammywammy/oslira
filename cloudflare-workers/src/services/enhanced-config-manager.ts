// ============================================================================
// ENHANCED CONFIG MANAGER - Fixed AWS Integration
// File: src/services/enhanced-config-manager.ts
// ============================================================================

import type { Env } from '../types/interfaces.js';
import { fetchJson } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';
import { AWSSecretsManager, getAWSSecretsManager } from './aws-secrets-manager.js';

interface ConfigItem {
  key_name: string;
  key_value: string;
  environment: string;
  updated_at: string;
  source: 'supabase' | 'aws' | 'env';
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

      this.awsSecrets = getAWSSecretsManager(this.env);
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
        hasValue: !!value
      });

      return value;

    } catch (error: any) {
      logger('error', `Failed to retrieve config for ${keyName}`, { 
        error: error.message 
      });
      throw error;
    }
  }

  private async getFromSupabase(keyName: string): Promise<string> {
    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_SERVICE_ROLE) {
      throw new Error('Supabase not configured');
    }

    const response = await fetchJson(`${this.env.SUPABASE_URL}/rest/v1/app_config`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.env.SUPABASE_SERVICE_ROLE}`,
        'apikey': this.env.SUPABASE_SERVICE_ROLE,
        'Content-Type': 'application/json'
      },
      params: {
        'key_name': `eq.${keyName}`,
        'environment': 'eq.production'
      }
    });

    if (!response || !Array.isArray(response) || response.length === 0) {
      throw new Error(`Config key not found in Supabase: ${keyName}`);
    }

    return response[0].key_value;
  }

  private validateSecretFormat(keyName: string, value: string): boolean {
    const validations: Record<string, (key: string) => boolean> = {
      'OPENAI_API_KEY': (key) => key.startsWith('sk-') && key.length > 20,
      'CLAUDE_API_KEY': (key) => key.startsWith('sk-ant-') && key.length > 30,
      'APIFY_API_TOKEN': (key) => key.startsWith('apify_api_') && key.length > 20,
      'STRIPE_SECRET_KEY': (key) => (key.startsWith('sk_live_') || key.startsWith('sk_test_')) && key.length > 20,
      'STRIPE_WEBHOOK_SECRET': (key) => key.startsWith('whsec_') && key.length > 20
    };

    const validator = validations[keyName];
    return !validator || validator(value);
  }

  async updateConfig(keyName: string, newValue: string, source: 'aws' | 'supabase' = 'aws'): Promise<void> {
    try {
      if (source === 'aws' && this.AWS_MANAGED_KEYS.includes(keyName)) {
        if (!this.awsSecrets) {
          throw new Error('AWS Secrets Manager not available');
        }
        
        await this.awsSecrets.putSecret(keyName, newValue, 'admin_update');
        logger('info', `Updated ${keyName} in AWS Secrets Manager`);
      } else {
        await this.updateInSupabase(keyName, newValue);
        logger('info', `Updated ${keyName} in Supabase`);
      }

      // Clear cache for this key
      this.cache.delete(keyName);

    } catch (error: any) {
      logger('error', `Failed to update config for ${keyName}`, { 
        error: error.message,
        source 
      });
      throw error;
    }
  }

  private async updateInSupabase(keyName: string, newValue: string): Promise<void> {
    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_SERVICE_ROLE) {
      throw new Error('Supabase not configured');
    }

    const response = await fetch(`${this.env.SUPABASE_URL}/rest/v1/app_config`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.SUPABASE_SERVICE_ROLE}`,
        'apikey': this.env.SUPABASE_SERVICE_ROLE,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key_name: keyName,
        key_value: newValue,
        environment: 'production',
        updated_at: new Date().toISOString(),
        updated_by: 'admin_api'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase update failed: ${response.status} - ${errorText}`);
    }
  }

  async getConfigStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};

    for (const keyName of this.AWS_MANAGED_KEYS) {
      try {
        const value = await this.getConfig(keyName);
        const cached = this.cache.get(keyName);
        
        status[keyName] = {
          configured: !!value,
          source: cached?.source || 'unknown',
          lastUpdated: new Date().toISOString(),
          hasValidFormat: this.validateSecretFormat(keyName, value)
        };
      } catch (error: any) {
        status[keyName] = {
          configured: false,
          error: error.message,
          source: 'none'
        };
      }
    }

    return status;
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
