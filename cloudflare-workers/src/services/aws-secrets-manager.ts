// ============================================================================
// FIXED AWS SECRETS MANAGER - CLOUDFLARE WORKERS COMPATIBLE
// File: cloudflare-workers/src/services/aws-secrets-manager.ts
// ============================================================================

import type { Env } from '../types/interfaces.js';
import { logger } from '../utils/logger.js';

interface AWSCredentials {
  accessKeyId: string; 
  secretAccessKey: string;
  region: string;
}

interface SecretValue {
  apiKey: string;
  createdAt: string;
  version: string;
}

export class AWSSecretsManager {
  private credentials: AWSCredentials;

  constructor(env: Env) {
    this.credentials = {
      accessKeyId: env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
      region: env.AWS_REGION || 'us-east-1'
    };

    if (!this.credentials.accessKeyId || !this.credentials.secretAccessKey) {
      throw new Error('AWS credentials not configured properly');
    }
  }

  async getSecret(secretName: string): Promise<string> {
    try {
      const secretId = secretName.startsWith('Oslira/') ? secretName : `Oslira/${secretName}`;
      
      logger('info', `Attempting to retrieve secret: ${secretId}`);
      
      const response = await this.makeAWSRequest('POST', 'secretsmanager', {
        SecretId: secretId
      }, 'GetSecretValue');

      if (!response.ok) {
        const errorText = await response.text();
        logger('error', `AWS Secrets Manager request failed`, { 
          status: response.status,
          error: errorText,
          secretId 
        });
        throw new Error(`AWS API call failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.SecretString) {
        throw new Error('Secret value not found in response');
      }

      // Parse the JSON secret value
      const secretValue: SecretValue = JSON.parse(data.SecretString);
      
      if (!secretValue.apiKey) {
        throw new Error('apiKey not found in secret JSON');
      }

      logger('info', `Successfully retrieved secret: ${secretId}`);
      return secretValue.apiKey;

    } catch (error: any) {
      logger('error', 'Failed to retrieve secret from AWS', { 
        secretName, 
        error: error.message 
      });
      throw new Error(`AWS Secrets retrieval failed: ${error.message}`);
    }
  }

  async createOrUpdateSecret(secretName: string, secretValue: string): Promise<void> {
    try {
      const secretId = secretName.startsWith('Oslira/') ? secretName : `Oslira/${secretName}`;
      
      const secretData: SecretValue = {
        apiKey: secretValue,
        createdAt: new Date().toISOString(),
        version: `v${Date.now()}`
      };

      // Try to update existing secret first
      let response = await this.makeAWSRequest('POST', 'secretsmanager', {
        SecretId: secretId,
        SecretString: JSON.stringify(secretData)
      }, 'PutSecretValue');

      if (!response.ok) {
        // If update fails, try to create new secret
        response = await this.makeAWSRequest('POST', 'secretsmanager', {
          Name: secretId,
          SecretString: JSON.stringify(secretData),
          Description: `Oslira ${secretName} - Managed by Cloudflare Worker`
        }, 'CreateSecret');
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AWS API call failed: ${response.status} - ${errorText}`);
      }

      logger('info', `Successfully stored secret: ${secretId}`);

    } catch (error: any) {
      logger('error', 'Failed to store secret in AWS', { 
        secretName, 
        error: error.message 
      });
      throw new Error(`AWS Secrets storage failed: ${error.message}`);
    }
  }

  async listSecrets(): Promise<string[]> {
    try {
      const response = await this.makeAWSRequest('POST', 'secretsmanager', {
        Filters: [
          {
            Key: 'name',
            Values: ['Oslira/']
          }
        ]
      }, 'ListSecrets');

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AWS API call failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      return (data.SecretList || []).map((secret: any) => secret.Name);

    } catch (error: any) {
      logger('error', 'Failed to list secrets from AWS', { error: error.message });
      throw new Error(`AWS Secrets listing failed: ${error.message}`);
    }
  }

  private async makeAWSRequest(
    method: string, 
    service: string, 
    payload: any, 
    action: string
  ): Promise<Response> {
    const host = `${service}.${this.credentials.region}.amazonaws.com`;
    const url = `https://${host}/`;
    
    const headers = {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `secretsmanager.${action}`,
      'Host': host
    };

    const body = JSON.stringify(payload);
    
    // Generate AWS Signature Version 4
    const signedHeaders = await this.signRequest(
      method,
      url,
      headers,
      body,
      service
    );

    return fetch(url, {
      method,
      headers: signedHeaders,
      body
    });
  }

  private async signRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body: string,
    service: string
  ): Promise<Record<string, string>> {
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const date = timestamp.substr(0, 8);

    // Step 1: Create canonical request
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map(key => `${key.toLowerCase()}:${headers[key]}`)
      .join('\n');

    const signedHeaders = Object.keys(headers)
      .map(key => key.toLowerCase())
      .sort()
      .join(';');

    const payloadHash = await this.sha256(body);

    const canonicalRequest = [
      method,
      '/',
      '',
      canonicalHeaders,
      '',
      signedHeaders,
      payloadHash
    ].join('\n');

    // Step 2: Create string to sign
    const credentialScope = `${date}/${this.credentials.region}/${service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      timestamp,
      credentialScope,
      await this.sha256(canonicalRequest)
    ].join('\n');

    // Step 3: Generate signing key
    const signingKey = await this.getSigningKey(date, service);

    // Step 4: Generate signature
    const signature = await this.hmacSha256(signingKey, stringToSign);

    // Step 5: Add authorization header
    const authHeader = `AWS4-HMAC-SHA256 Credential=${this.credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      ...headers,
      'X-Amz-Date': timestamp,
      'Authorization': authHeader
    };
  }

  private async getSigningKey(date: string, service: string): Promise<CryptoKey> {
    const kDate = await this.hmacSha256Key(`AWS4${this.credentials.secretAccessKey}`, date);
    const kRegion = await this.hmacSha256Key(kDate, this.credentials.region);
    const kService = await this.hmacSha256Key(kRegion, service);
    const kSigning = await this.hmacSha256Key(kService, 'aws4_request');
    
    return kSigning;
  }

  private async sha256(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async hmacSha256Key(key: string | CryptoKey, message: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    
    let cryptoKey: CryptoKey;
    
    if (typeof key === 'string') {
      const keyData = encoder.encode(key);
      cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
    } else {
      cryptoKey = key;
    }

    const messageData = encoder.encode(message);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    
    return crypto.subtle.importKey(
      'raw',
      signature,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
  }

  private async hmacSha256(key: CryptoKey, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const messageData = encoder.encode(message);
    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

// Helper function to get singleton instance
let awsSecretsInstance: AWSSecretsManager | null = null;

export function getAWSSecretsManager(env: Env): AWSSecretsManager {
  // Create new instance each time in Workers environment
  // (Workers don't maintain global state between requests)
  return new AWSSecretsManager(env);
}
