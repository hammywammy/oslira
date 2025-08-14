// ============================================================================
// WORKING ENHANCED CONFIG MANAGER - NO SUPABASE DEPENDENCY
// ============================================================================

import type { Env } from '../types/interfaces.js';
import { logger } from '../utils/logger.js';
import { getAWSSecretsManager } from './aws-secrets-manager.js';

class EnhancedConfigManager {
  private cache: Map<string, { value: string; expires: number; source: string }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private awsSecrets: any = null;
  
  // Keys that should be stored in AWS Secrets Manager
  private readonly AWS_MANAGED_KEYS = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY', 
    'APIFY_API_TOKEN',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ];

  constructor(private env: Env) {
    this.initializeAWS();
  }

  private async initializeAWS(): Promise<void> {
    try {
      if (!this.env.AWS_ACCESS_KEY_ID || !this.env.AWS_SECRET_ACCESS_KEY) {
        logger('warn', 'AWS credentials not found, using environment-only mode');
        return;
      }

      this.awsSecrets = getAWSSecretsManager(this.env);
      logger('info', 'AWS Secrets Manager initialized successfully');
    } catch (error: any) {
      logger('error', 'Failed to initialize AWS Secrets Manager', { error: error.message });
      this.awsSecrets = null;
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

      // For AWS managed keys, try AWS first
      if (this.AWS_MANAGED_KEYS.includes(keyName) && this.awsSecrets) {
        try {
          value = await this.awsSecrets.getSecret(keyName);
          source = 'aws';
          logger('info', `Retrieved ${keyName} from AWS Secrets Manager`);
        } catch (awsError: any) {
          logger('warn', `AWS retrieval failed for ${keyName}, trying environment fallback`, { 
            error: awsError.message 
          });
          
          // Fallback to environment
          value = this.getFromEnvironment(keyName);
          source = 'env';
        }
      } else {
        // Non-AWS keys or AWS not available - use environment
        value = this.getFromEnvironment(keyName);
        source = 'env';
      }

      if (!value) {
        logger('error', `No value found for config key: ${keyName}`);
        throw new Error(`Configuration key not found: ${keyName}`);
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

  private getFromEnvironment(keyName: string): string {
    // Direct environment variable access
    const envValue = this.env[keyName as keyof Env] as string;
    
    if (envValue) {
      logger('info', `Retrieved ${keyName} from environment variables`);
      return envValue;
    }
    
    logger('warn', `${keyName} not found in environment variables`);
    return '';
  }

  clearCache(): void {
    this.cache.clear();
    logger('info', 'Config cache cleared');
  }

  getCacheStats(): any {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      awsAvailable: this.awsSecrets !== null
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
