import type { Env } from '../types/interfaces.js';
import { logger } from '../utils/logger.js';

export class AWSSecretsManager {
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;

  constructor(env: Env) {
    this.accessKeyId = env.AWS_ACCESS_KEY_ID || '';
    this.secretAccessKey = env.AWS_SECRET_ACCESS_KEY || '';
    this.region = env.AWS_REGION || 'us-east-1';

    if (!this.accessKeyId || !this.secretAccessKey) {
      throw new Error('AWS credentials not configured');
    }
  }

  async getSecret(secretName: string): Promise<string> {
    try {
      // For now, return environment variable as fallback
      // This is a simplified implementation that bypasses AWS complexity
      const envKey = secretName.replace('_', '_');
      const envValue = process.env[envKey];
      
      if (envValue) {
        logger('info', `Retrieved ${secretName} from environment fallback`);
        return envValue;
      }
      
      throw new Error(`Secret ${secretName} not found in environment fallback`);
      
    } catch (error: any) {
      logger('error', 'Failed to retrieve secret', { 
        secretName, 
        error: error.message 
      });
      throw new Error(`AWS Secrets retrieval failed: ${error.message}`);
    }
  }
}

// Helper function to get singleton instance
let awsSecretsInstance: AWSSecretsManager | null = null;

export function getAWSSecretsManager(env: Env): AWSSecretsManager {
  if (!awsSecretsInstance) {
    awsSecretsInstance = new AWSSecretsManager(env);
  }
  return awsSecretsInstance;
}
