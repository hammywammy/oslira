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
      return { isValid: false, error: 'Invali
