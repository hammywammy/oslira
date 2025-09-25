// ===============================================================================
// AUTHENTICATION UTILITIES
// File: cloudflare-workers/src/utils/auth.ts
// ===============================================================================

import type { Env } from '../types/interfaces.js';
import { logger } from './logger.js';

interface JWTPayload {
  sub: string;
  email?: string;
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  role?: string;
}

interface AuthResult {
  isValid: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

// ===============================================================================
// JWT TOKEN VALIDATION
// ===============================================================================

export async function validateJWTToken(token: string, env: Env): Promise<AuthResult> {
  try {
    // Parse JWT header to get algorithm
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { isValid: false, error: 'Invalid JWT format' };
    }

    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1])) as JWTPayload;

    // Check basic token structure
    if (!payload.sub || !payload.exp || !payload.aud) {
      return { isValid: false, error: 'Invalid JWT payload' };
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return { isValid: false, error: 'Token expired' };
    }

    // Check audience (should match your Supabase project)
    const expectedAudience = 'authenticated';
    if (payload.aud !== expectedAudience) {
      return { isValid: false, error: 'Invalid audience' };
    }

    // Verify signature using Supabase JWT secret
    const isSignatureValid = await verifyJWTSignature(token, env);
    if (!isSignatureValid) {
      return { isValid: false, error: 'Invalid signature' };
    }

    return {
      isValid: true,
      userId: payload.sub,
      email: payload.email
    };

  } catch (error: any) {
    logger('error', 'JWT validation failed', { error: error.message });
    return { isValid: false, error: 'Token validation failed' };
  }
}

// ===============================================================================
// JWT SIGNATURE VERIFICATION
// ===============================================================================

async function verifyJWTSignature(token: string, env: Env): Promise<boolean> {
  try {
    // In production, you would verify against Supabase's JWT secret
    // For now, we'll do basic validation since Supabase handles this
    
    // If using Supabase auth, the token is already validated by Supabase
    // Additional verification can be done by calling Supabase's user endpoint
    const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': env.SUPABASE_SERVICE_ROLE  // ✅ USE SERVICE ROLE KEY
      }
    });

    return response.ok;

  } catch (error: any) {
    logger('error', 'Signature verification failed', { error: error.message });
    return false;
  }
}

// ===============================================================================
// EXTRACT USER FROM JWT
// ===============================================================================

export async function extractUserFromJWT(token: string, env: Env): Promise<AuthResult> {
  return validateJWTToken(token, env);
}

// ===============================================================================
// VERIFY USER EXISTS IN DATABASE
// ===============================================================================

export async function verifyUserExists(userId: string, env: Env): Promise<AuthResult> {
  try {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/users?select=id,email&id=eq.${userId}`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return { isValid: false, error: 'Database query failed' };
    }

    const users = await response.json();
    if (!users || users.length === 0) {
      return { isValid: false, error: 'User not found' };
    }

    const user = users[0];
    return {
      isValid: true,
      userId: user.id,
      email: user.email
    };

  } catch (error: any) {
    logger('error', 'User verification failed', { error: error.message, userId });
    return { isValid: false, error: 'User verification failed' };
  }
}
