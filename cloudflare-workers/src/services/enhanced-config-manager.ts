import type { Env } from '../types/interfaces.js';
import { fetchJson } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';
import { getAWSSecretsManager } from './aws-secrets-manager.js';

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
  private awsSecrets: any;
  
  // Keys that should be stored in AWS Secrets Manager
  private readonly AWS_MANAGED_KEYS = [
    'OPENAI_API_KEY',
    'CLAUDE_API_KEY', 
    'APIFY_API_TOKEN',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ];

  constructor(private env: Env) {
    try {
      this.awsSecrets = getAWSSecretsManager(env);
    } catch (error) {
      logger('warn', 'AWS Secrets Manager not available, falling back to Supabase only');
      this.awsSecrets = null;
    }
  }

  async getConfig(keyName: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(keyName);
    if (cached && cached.expires > Date.now()) {
      logger('info', `Config cache hit for ${keyName}`, { source: cached.source });
      return cached.value;
    }

    try {
      let value: string = '';
      let source: string = 'env';

      // For sensitive keys, try AWS first
      if (this.AWS_MANAGED_KEYS.includes(keyName) && this.awsSecrets) {
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
        // Non-sensitive keys use Supabase
        try {
          value = await this.getFromSupabase(keyName);
          source = 'supabase';
        } catch (supabaseError: any) {
          logger('warn', `Supabase retrieval failed for ${keyName}, trying environment`, {
            error: supabaseError.message
          });
          
          // Final fallback to environment variable
          value = this.env[keyName as keyof Env] || '';
          source = 'env';
        }
      }

      if (!value) {
        logger('error', `No value found for config key: ${keyName}`);
        return '';
      }

      // Cache the result
      this.cache.set(keyName, {
        value,
        expires: Date.now() + this.CACHE_TTL,
        source
      });

      logger('info', `Config retrieved successfully`, { keyName, source });
      return value;

    } catch (error: any) {
      logger('error', `Failed to retrieve config for ${keyName}`, { error: error.message });
      
      // Last resort: environment variable
      const envValue = this.env[keyName as keyof Env] || '';
      if (envValue) {
        logger('info', `Using environment fallback for ${keyName}`);
        return envValue;
      }
      
      return '';
    }
  }

  async updateConfig(keyName: string, newValue: string, updatedBy: string = 'system'): Promise<void> {
    try {
      // For sensitive keys, update AWS first, then Supabase as backup
      if (this.AWS_MANAGED_KEYS.includes(keyName) && this.awsSecrets) {
        try {
          await this.awsSecrets.putSecret(keyName, newValue, updatedBy);
          logger('info', `Updated ${keyName} in AWS Secrets Manager`);
          
          // Also update Supabase as backup
          await this.updateSupabase(keyName, newValue, updatedBy);
          logger('info', `Updated ${keyName} in Supabase as backup`);
          
        } catch (awsError: any) {
          logger('error', `Failed to update ${keyName} in AWS, using Supabase only`, {
            error: awsError.message
          });
          
          // If AWS fails, at least update Supabase
          await this.updateSupabase(keyName, newValue, updatedBy);
        }
      } else {
        // Non-sensitive keys only go to Supabase
        await this.updateSupabase(keyName, newValue, updatedBy);
        logger('info', `Updated ${keyName} in Supabase`);
      }

      // Clear cache for this key
      this.cache.delete(keyName);
      
      // Trigger auto-sync notifications
      await this.notifyConfigChange(keyName, updatedBy);

    } catch (error: any) {
      logger('error', `Failed to update config: ${keyName}`, { error: error.message });
      throw error;
    }
  }

  async migrateToAWS(keyName: string): Promise<void> {
    if (!this.AWS_MANAGED_KEYS.includes(keyName)) {
      throw new Error(`${keyName} is not configured for AWS migration`);
    }

    if (!this.awsSecrets) {
      throw new Error('AWS Secrets Manager not available');
    }

    try {
      // Get current value from Supabase
      const currentValue = await this.getFromSupabase(keyName);
      
      if (!currentValue) {
        throw new Error(`No value found in Supabase for ${keyName}`);
      }

      // Create/update in AWS
      await this.awsSecrets.createSecret(keyName, currentValue, `Oslira ${keyName} - migrated from Supabase`);
      
      logger('info', `Successfully migrated ${keyName} to AWS Secrets Manager`);

      // Clear cache to force re-fetch from AWS
      this.cache.delete(keyName);

    } catch (error: any) {
      logger('error', `Failed to migrate ${keyName} to AWS`, { error: error.message });
      throw error;
    }
  }

  async getConfigStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};

    for (const keyName of this.AWS_MANAGED_KEYS) {
      try {
        // Check AWS
        let awsStatus = 'not_configured';
        let awsLastUpdated = 'N/A';
        
        if (this.awsSecrets) {
          try {
            const awsValue = await this.awsSecrets.getSecret(keyName);
            awsStatus = awsValue ? 'configured' : 'empty';
          } catch {
            awsStatus = 'error';
          }
        }

        // Check Supabase
        let supabaseStatus = 'not_configured';
        let supabaseLastUpdated = 'N/A';
        
        try {
          const supabaseValue = await this.getFromSupabase(keyName);
          supabaseStatus = supabaseValue ? 'configured' : 'empty';
          
          // Get last updated timestamp
          const configItem = await this.getSupabaseMetadata(keyName);
          supabaseLastUpdated = configItem?.updated_at || 'N/A';
        } catch {
          supabaseStatus = 'error';
        }

        // Check environment variable
        const envValue = this.env[keyName as keyof Env];
        const envStatus = envValue ? 'configured' : 'not_configured';

        status[keyName] = {
          aws: {
            status: awsStatus,
            lastUpdated: awsLastUpdated
          },
          supabase: {
            status: supabaseStatus,
            lastUpdated: supabaseLastUpdated
          },
          environment: {
            status: envStatus
          },
          recommended_source: this.AWS_MANAGED_KEYS.includes(keyName) ? 'aws' : 'supabase',
          migration_needed: awsStatus !== 'configured' && this.AWS_MANAGED_KEYS.includes(keyName)
        };

      } catch (error: any) {
        status[keyName] = {
          error: error.message,
          aws: { status: 'error' },
          supabase: { status: 'error' },
          environment: { status: 'unknown' }
        };
      }
    }

    return status;
  }

  private async getFromSupabase(keyName: string): Promise<string> {
    const headers = {
      apikey: this.env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json'
    };

    const response = await fetchJson<ConfigItem[]>(
      `${this.env.SUPABASE_URL}/rest/v1/app_config?key_name=eq.${keyName}&environment=eq.production&select=key_value`,
      { headers }
    );

    if (!response.length) {
      return '';
    }

    return this.decryptValue(response[0].key_value);
  }

  private async updateSupabase(keyName: string, newValue: string, updatedBy: string): Promise<void> {
    const headers = {
      apikey: this.env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json'
    };

    const encryptedValue = this.encryptValue(newValue);

    await fetchJson(
      `${this.env.SUPABASE_URL}/rest/v1/app_config?key_name=eq.${keyName}&environment=eq.production`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          key_value: encryptedValue,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy
        })
      }
    );
  }

  private async getSupabaseMetadata(keyName: string): Promise<ConfigItem | null> {
    const headers = {
      apikey: this.env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json'
    };

    const response = await fetchJson<ConfigItem[]>(
      `${this.env.SUPABASE_URL}/rest/v1/app_config?key_name=eq.${keyName}&environment=eq.production&select=*`,
      { headers }
    );

    return response.length > 0 ? response[0] : null;
  }

  private async notifyConfigChange(keyName: string, updatedBy: string): Promise<void> {
    try {
      // Trigger your existing auto-sync system
      const notificationPromises = [];

      // Trigger Netlify rebuild
      if (this.env.NETLIFY_BUILD_HOOK_URL) {
        notificationPromises.push(
          fetch(this.env.NETLIFY_BUILD_HOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              trigger: 'aws_config_update',
              keyName,
              updatedBy,
              timestamp: new Date().toISOString()
            })
          })
        );
      }

      // Clear CDN cache
      if (this.env.CLOUDFLARE_ZONE_ID && this.env.CLOUDFLARE_API_TOKEN) {
        notificationPromises.push(
          fetch(`https://api.cloudflare.com/client/v4/zones/${this.env.CLOUDFLARE_ZONE_ID}/purge_cache`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              files: [
                `${this.env.WORKER_URL || ''}/config`,
                `${this.env.WORKER_URL || ''}/v1/config`
              ]
            })
          })
        );
      }

      await Promise.allSettled(notificationPromises);
      
      logger('info', 'Config change notifications sent', { keyName, updatedBy });

    } catch (error: any) {
      logger('warn', 'Failed to send config change notifications', { 
        keyName, 
        error: error.message 
      });
    }
  }

  private decryptValue(encryptedValue: string): string {
    try {
      return atob(encryptedValue);
    } catch {
      return encryptedValue;
    }
  }

  private encryptValue(value: string): string {
    return btoa(value);
  }
}

// Singleton instance
let enhancedConfigManager: EnhancedConfigManager | null = null;

export function getEnhancedConfigManager(env: Env): EnhancedConfigManager {
  if (!enhancedConfigManager) {
    enhancedConfigManager = new EnhancedConfigManager(env);
  }
  return enhancedConfigManager;
}

// Backward compatibility - replace your existing exports
export const getConfigManager = getEnhancedConfigManager;
export async function getApiKey(keyName: string, env: Env): Promise<string> {
  const manager = getEnhancedConfigManager(env);
  return await manager.getConfig(keyName);
}
