import type { Env } from '../types/interfaces.js';
import { logger } from '../utils/logger.js';

interface SecretValue {
  apiKey: string;
  createdAt: string;
  version: string;
  rotatedBy?: string;
}

export class AWSSecretsManager {
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;

constructor(env: Env) {
  console.log('AWSSecretsManager constructor called with env type:', typeof env);
  console.log('Env keys available:', Object.keys(env));
  
  // Try to access each property individually
  try {
    this.accessKeyId = env.AWS_ACCESS_KEY_ID;
    console.log('Access Key ID retrieved:', !!this.accessKeyId);
  } catch (e) {
    console.error('Failed to get AWS_ACCESS_KEY_ID:', e);
    throw new Error(`Cannot access AWS_ACCESS_KEY_ID: ${e}`);
  }
  
  try {
    this.secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
    console.log('Secret Access Key retrieved:', !!this.secretAccessKey);
  } catch (e) {
    console.error('Failed to get AWS_SECRET_ACCESS_KEY:', e);
    throw new Error(`Cannot access AWS_SECRET_ACCESS_KEY: ${e}`);
  }
  
  this.region = env.AWS_REGION || 'us-east-1';
  console.log('Region set to:', this.region);

  if (!this.accessKeyId || !this.secretAccessKey) {
    throw new Error(`AWS credentials not configured - Access Key: ${!!this.accessKeyId}, Secret Key: ${!!this.secretAccessKey}`);
  }
  
  console.log('AWS credentials successfully configured');
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

      const secretValue: SecretValue = JSON.parse(data.SecretString);
      
      logger('info', 'Retrieved secret from AWS Secrets Manager', { 
        secretName,
        version: secretValue.version,
        rotatedBy: secretValue.rotatedBy
      });

      return secretValue.apiKey;

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
        } as SecretValue)
      };

      const response = await this.makeAWSRequest('PutSecretValue', payload);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AWS API error: ${response.status} - ${errorText}`);
      }

      logger('info', 'Successfully updated secret in AWS', { 
        secretName, 
        rotatedBy 
      });

    } catch (error: any) {
      logger('error', 'Failed to store secret in AWS', { 
        secretName, 
        error: error.message 
      });
      throw new Error(`AWS Secrets storage failed: ${error.message}`);
    }
  }

  async createSecret(secretName: string, secretValue: string, description: string): Promise<void> {
    try {
      const payload = {
        Name: `Oslira/${secretName}`,
        Description: description,
        SecretString: JSON.stringify({
          apiKey: secretValue,
          createdAt: new Date().toISOString(),
          version: 'v1',
          rotatedBy: 'initial_setup'
        } as SecretValue)
      };

      const response = await this.makeAWSRequest('CreateSecret', payload);

      if (!response.ok) {
        const errorText = await response.text();
        
        // If secret already exists, update it instead
        if (errorText.includes('already exists')) {
          logger('info', 'Secret exists, updating instead', { secretName });
          await this.putSecret(secretName, secretValue, 'migration');
          return;
        }
        
        throw new Error(`AWS API error: ${response.status} - ${errorText}`);
      }

      logger('info', 'Successfully created secret in AWS', { secretName });

    } catch (error: any) {
      logger('error', 'Failed to create secret in AWS', { 
        secretName, 
        error: error.message 
      });
      throw new Error(`AWS Secrets creation failed: ${error.message}`);
    }
  }

  async listSecrets(): Promise<string[]> {
    try {
      const response = await this.makeAWSRequest('ListSecrets', {
        Filters: [
          {
            Key: 'name',
            Values: ['Oslira/']
          }
        ],
        MaxResults: 20
      });

      if (!response.ok) {
        throw new Error(`AWS API error: ${response.status}`);
      }

      const data = await response.json();
      const secretNames = data.SecretList?.map((secret: any) => 
        secret.Name.replace('Oslira/', '')
      ) || [];

      logger('info', 'Listed AWS secrets', { count: secretNames.length });
      return secretNames;

    } catch (error: any) {
      logger('error', 'Failed to list AWS secrets', { error: error.message });
      return [];
    }
  }

  async enableRotation(secretName: string, lambdaArn: string): Promise<void> {
    try {
      const payload = {
        SecretId: `Oslira/${secretName}`,
        RotationLambdaARN: lambdaArn,
        RotationRules: {
          ScheduleExpression: 'rate(7 days)', // Weekly rotation
          Duration: 'PT30M' // 30 minutes rotation window
        }
      };

      const response = await this.makeAWSRequest('RotateSecret', payload);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AWS API error: ${response.status} - ${errorText}`);
      }

      logger('info', 'Enabled rotation for secret', { secretName, lambdaArn });

    } catch (error: any) {
      logger('error', 'Failed to enable rotation', { 
        secretName, 
        error: error.message 
      });
      throw error;
    }
  }

  private async makeAWSRequest(action: string, payload: any): Promise<Response> {
    const endpoint = `https://secretsmanager.${this.region}.amazonaws.com/`;
    const headers = await this.createAuthHeaders(action, JSON.stringify(payload));

    return fetch(endpoint, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': `secretsmanager.${action}`
      },
      body: JSON.stringify(payload)
    });
  }

  private async createAuthHeaders(action: string, payload: string): Promise<Record<string, string>> {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substr(0, 8);

    // Create canonical request
    const canonicalHeaders = [
      `host:secretsmanager.${this.region}.amazonaws.com`,
      `x-amz-date:${amzDate}`,
      `x-amz-target:secretsmanager.${action}`
    ].join('\n');

    const signedHeaders = 'host;x-amz-date;x-amz-target';
    const payloadHash = await this.sha256(payload);

    const canonicalRequest = [
      'POST',
      '/',
      '',
      canonicalHeaders,
      '',
      signedHeaders,
      payloadHash
    ].join('\n');

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${this.region}/secretsmanager/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      await this.sha256(canonicalRequest)
    ].join('\n');

    // Calculate signature
    const signature = await this.calculateSignature(stringToSign, dateStamp);

    // Create authorization header
    const authorization = [
      `${algorithm} Credential=${this.accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`
    ].join(', ');

    return {
      'Authorization': authorization,
      'X-Amz-Date': amzDate,
      'X-Amz-Target': `secretsmanager.${action}`
    };
  }

  private async calculateSignature(stringToSign: string, dateStamp: string): Promise<string> {
    const kDate = await this.hmac(`AWS4${this.secretAccessKey}`, dateStamp);
    const kRegion = await this.hmac(kDate, this.region);
    const kService = await this.hmac(kRegion, 'secretsmanager');
    const kSigning = await this.hmac(kService, 'aws4_request');
    
    const signature = await this.hmac(kSigning, stringToSign);
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async hmac(key: string | ArrayBuffer, data: string): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      typeof key === 'string' ? new TextEncoder().encode(key) : key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  }

  private async sha256(data: string): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
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
