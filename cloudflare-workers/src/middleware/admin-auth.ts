// ============================================================================
// ADMIN AUTHENTICATION MIDDLEWARE
// File: src/middleware/admin-auth.ts
// ============================================================================

import type { Context, Next } from 'hono';
import type { Env } from '../types/interfaces.js';
import { logger } from '../utils/logger.js';
import { getApiKey } from '../services/enhanced-config-manager.js';

interface AdminRequest extends Context {
  env: Env;
}

// IP allowlist for additional security (optional)
const ALLOWED_IPS = [
  '127.0.0.1',
  '::1',
  // Add your actual admin IPs here
];

export async function adminAuthMiddleware(c: AdminRequest, next: Next) {
  const requestId = crypto.randomUUID();
  const clientIP = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
  
  try {
    // Get admin token from enhanced config manager
    const adminToken = await getApiKey('ADMIN_TOKEN', c.env);
    
    if (!adminToken) {
      logger('error', 'Admin token not configured', { clientIP }, requestId);
      return c.json({ 
        success: false, 
        error: 'Admin access not configured',
        requestId 
      }, 500);
    }

    // Check Authorization header
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger('warn', 'Admin access attempted without token', { clientIP }, requestId);
      return c.json({ 
        success: false, 
        error: 'Admin token required',
        requestId 
      }, 401);
    }

    const providedToken = authHeader.substring(7);
    if (providedToken !== adminToken) {
      logger('warn', 'Admin access attempted with invalid token', { 
        clientIP,
        tokenPrefix: providedToken.substring(0, 8) + '...'
      }, requestId);
      return c.json({ 
        success: false, 
        error: 'Invalid admin token',
        requestId 
      }, 401);
    }

    // Optional: IP allowlist check (uncomment if needed)
    // if (ALLOWED_IPS.length > 0 && !ALLOWED_IPS.includes(clientIP)) {
    //   logger('warn', 'Admin access from unauthorized IP', { clientIP }, requestId);
    //   return c.json({ 
    //     success: false, 
    //     error: 'Access denied from this IP',
    //     requestId 
    //   }, 403);
    // }

    // Add admin context to request
    c.set('requestId', requestId);
    c.set('adminAccess', true);
    c.set('clientIP', clientIP);

    logger('info', 'Admin access granted', { clientIP }, requestId);
    
    await next();
    
  } catch (error: any) {
    logger('error', 'Admin auth middleware error', { 
      error: error.message,
      clientIP 
    }, requestId);
    
    return c.json({ 
      success: false, 
      error: 'Authentication error',
      requestId 
    }, 500);
  }
}

export function requireAdmin(c: AdminRequest): boolean {
  return c.get('adminAccess') === true;
}

export function getAdminContext(c: AdminRequest): { requestId: string; clientIP: string } {
  return {
    requestId: c.get('requestId') || crypto.randomUUID(),
    clientIP: c.get('clientIP') || 'unknown'
  };
}
