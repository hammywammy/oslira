import type { Context, Next } from 'hono';
import { logger } from '../utils/logger.js';
import { getApiKey } from '../services/enhanced-config-manager.js';

interface AdminRequest extends Context {
  env: Env;
}

export async function adminAuthMiddleware(c: AdminRequest, next: Next) {
  const requestId = crypto.randomUUID();
  const clientIP = c.req.header('CF-Connecting-IP') || 
                   c.req.header('X-Forwarded-For') || 
                   c.req.header('X-Real-IP') || 
                   'unknown';
  
  try {
    // CRITICAL FIX: Multi-layer admin token validation
    
    // 1. Try to get INTERNAL_API_TOKEN from environment first
    let adminToken = c.env.INTERNAL_API_TOKEN;
    
    // 2. Fallback to enhanced config manager if env token missing
    if (!adminToken) {
      try {
        adminToken = await getApiKey('INTERNAL_API_TOKEN', c.env);
      } catch (configError) {
        logger('warn', 'Config manager unavailable, checking fallback tokens', { configError }, requestId);
        
        // 3. Final fallback to ADMIN_TOKEN
        adminToken = c.env.ADMIN_TOKEN;
      }
    }
    
    // 4. Validate token exists
    if (!adminToken) {
      logger('error', 'No admin token configured', { 
        clientIP,
        hasInternalToken: !!c.env.INTERNAL_API_TOKEN,
        hasAdminToken: !!c.env.ADMIN_TOKEN,
        environment: getEnvironment(c.env)
      }, requestId);
      
      return c.json({ 
        success: false, 
        error: 'Admin authentication not configured',
        requestId 
      }, 500);
    }

    // 5. Check Authorization header format
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      logger('warn', 'Admin access attempted without Authorization header', { clientIP }, requestId);
      return c.json({ 
        success: false, 
        error: 'Authorization header required',
        requestId 
      }, 401);
    }

    if (!authHeader.startsWith('Bearer ')) {
      logger('warn', 'Admin access attempted with invalid auth format', { 
        clientIP,
        authFormat: authHeader.substring(0, 10) + '...'
      }, requestId);
      return c.json({ 
        success: false, 
        error: 'Bearer token required',
        requestId 
      }, 401);
    }

    // 6. Extract and validate token
    const providedToken = authHeader.substring(7);
    if (!providedToken || providedToken.length < 10) {
      logger('warn', 'Admin access attempted with invalid token format', { clientIP }, requestId);
      return c.json({ 
        success: false, 
        error: 'Invalid token format',
        requestId 
      }, 401);
    }

    // 7. Compare tokens securely (constant-time comparison)
    const tokensMatch = secureTokenCompare(providedToken, adminToken);
    if (!tokensMatch) {
      logger('warn', 'Admin access attempted with invalid token', { 
        clientIP,
        tokenPrefix: providedToken.substring(0, 8) + '...',
        expectedPrefix: adminToken.substring(0, 8) + '...'
      }, requestId);
      return c.json({ 
        success: false, 
        error: 'Invalid admin token',
        requestId 
      }, 401);
    }

    // 8. Additional security: Rate limiting per IP
    const rateLimitKey = `admin_auth_${clientIP}`;
    if (c.env.RATE_LIMIT) {
      const attempts = await c.env.RATE_LIMIT.get(rateLimitKey);
      if (attempts && parseInt(attempts) > 10) {
        logger('warn', 'Admin access rate limited', { clientIP }, requestId);
        return c.json({ 
          success: false, 
          error: 'Too many authentication attempts',
          requestId 
        }, 429);
      }
    }

    // 9. Set admin context for downstream handlers
    c.set('requestId', requestId);
    c.set('adminAccess', true);
    c.set('clientIP', clientIP);
    c.set('adminToken', adminToken);

    logger('info', 'Admin access granted', { 
      clientIP,
      tokenType: c.env.INTERNAL_API_TOKEN ? 'INTERNAL' : 'ADMIN'
    }, requestId);
    
    await next();
    
    // 10. Reset rate limit on successful auth
    if (c.env.RATE_LIMIT) {
      await c.env.RATE_LIMIT.delete(rateLimitKey);
    }
    
  } catch (error: any) {
    logger('error', 'Admin auth middleware critical error', { 
      error: error.message,
      stack: error.stack,
      clientIP 
    }, requestId);
    
    // Increment rate limit on error
    if (c.env.RATE_LIMIT) {
      const rateLimitKey = `admin_auth_${clientIP}`;
      const attempts = await c.env.RATE_LIMIT.get(rateLimitKey);
      await c.env.RATE_LIMIT.put(rateLimitKey, (parseInt(attempts || '0') + 1).toString(), { expirationTtl: 3600 });
    }
    
    return c.json({ 
      success: false, 
      error: 'Authentication system error',
      requestId 
    }, 500);
  }
}

// Secure constant-time token comparison
function secureTokenCompare(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < provided.length; i++) {
    result |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  
  return result === 0;
}

// Helper function to extract admin context from request
export function getAdminContext(c: Context): { requestId: string; clientIP: string; adminToken?: string } {
  const requestId = c.get('requestId') || crypto.randomUUID();
  const clientIP = c.get('clientIP') || 
                   c.req.header('CF-Connecting-IP') || 
                   c.req.header('X-Forwarded-For') || 
                   c.req.header('X-Real-IP') || 
                   'unknown';
  const adminToken = c.get('adminToken');
  
  return { requestId, clientIP, adminToken };
}

// Helper function to get environment type
function getEnvironment(env: any): string {
  if (env.APP_ENV === 'production') return 'production';
  if (env.APP_ENV === 'staging') return 'staging';
  return 'development';
}
