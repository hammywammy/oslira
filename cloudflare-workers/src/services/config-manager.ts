import type { Env } from '../types/interfaces.js';
import { fetchJson } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

interface ConfigItem {
  key_name: string;
  key_value: string;
  environment: string;
  updated_at: string;
}

class ConfigManager {
  private cache: Map<string, { value: string; expires: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  constructor(private env: Env) {}

  async getConfigWithAWS(keyName: string): Promise<string> {
  // For sensitive keys, check AWS first
  const sensitiveKeys = ['OPENAI_API_KEY', 'CLAUDE_API_KEY', 'APIFY_API_TOKEN', 'STRIPE_SECRET_KEY'];
  
  if (sensitiveKeys.includes(keyName)) {
    try {
      return await this.getFromAWS(keyName);
    } catch (error) {
      logger('warn', `AWS fallback failed for ${keyName}, using Supabase`);
      return await this.getConfig(keyName); // Your existing method
    }
  }
  
  // Non-sensitive keys still use Supabase
  return await this.getConfig(keyName);
}
  
  async getConfig(keyName: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(keyName);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }

    try {
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
        logger('warn', `Config key not found: ${keyName}`);
        // Fallback to environment variable
        return this.env[keyName as keyof Env] || '';
      }

      const value = this.decryptValue(response[0].key_value);
      
      // Cache the result
      this.cache.set(keyName, {
        value,
        expires: Date.now() + this.CACHE_TTL
      });

      return value;
    } catch (error: any) {
      logger('error', `Failed to fetch config for ${keyName}`, { error: error.message });
      // Fallback to environment variable
      return this.env[keyName as keyof Env] || '';
    }
  }

  private decryptValue(encryptedValue: string): string {
    // Simple base64 decoding for now
    // In production, use proper encryption with your secret key
    try {
      return atob(encryptedValue);
    } catch {
      // If not base64, return as-is (for migration period)
      return encryptedValue;
    }
  }

  async updateConfig(keyName: string, newValue: string, updatedBy: string = 'system'): Promise<void> {
    try {
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

      // Clear cache
      this.cache.delete(keyName);
      
      logger('info', `Config updated: ${keyName}`, { updatedBy });
    } catch (error: any) {
      logger('error', `Failed to update config: ${keyName}`, { error: error.message });
      throw error;
    }
  }

  private encryptValue(value: string): string {
    // Simple base64 encoding for now
    // In production, use proper encryption
    return btoa(value);
  }

  // Batch update for initial migration
  async migrateFromEnv(): Promise<void> {
    const configMap = {
      'OPENAI_API_KEY': this.env.OPENAI_KEY,
      'CLAUDE_API_KEY': this.env.CLAUDE_KEY,
      'APIFY_API_TOKEN': this.env.APIFY_API_TOKEN,
      'STRIPE_SECRET_KEY': this.env.STRIPE_SECRET_KEY,
      'STRIPE_WEBHOOK_SECRET': this.env.STRIPE_WEBHOOK_SECRET
    };

    for (const [key, value] of Object.entries(configMap)) {
      if (value) {
        await this.updateConfig(key, value, 'migration');
      }
    }
  }
}

// Singleton instance
let configManager: ConfigManager | null = null;

export function getConfigManager(env: Env): ConfigManager {
  if (!configManager) {
    configManager = new ConfigManager(env);
  }
  return configManager;
}

export async function getApiKey(keyName: string, env: Env): Promise<string> {
  const manager = getConfigManager(env);
  return await manager.getConfig(keyName);
}
