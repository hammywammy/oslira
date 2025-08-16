import { Env } from '../types/interfaces';

// ✅ REPLACE WITH THIS EXACT CODE:
export function getEnvironment(env: Env): string {
  // Check for staging environment
  if (env.ENVIRONMENT === 'staging' || env.NODE_ENV === 'staging') {
    return 'staging';
  }
  
  // Check for production environment
  if (env.ENVIRONMENT === 'production' || env.NODE_ENV === 'production') {
    return 'production';
  }
  
  // Check by URL patterns if env vars not set
  const request = env.REQUEST;
  if (request && request.url) {
    const url = new URL(request.url);
    if (url.hostname.includes('staging') || url.hostname.includes('test')) {
      return 'staging';
    }
    if (url.hostname.includes('oslira.com')) {
      return 'production';
    }
  }
  
  // Default to development
  return 'development';
}

export function isProduction(env: Env): boolean {
  return getEnvironment(env) === 'production';
}

export function isStaging(env: Env): boolean {
  return getEnvironment(env) === 'staging';
}

export function isDevelopment(env: Env): boolean {
  return getEnvironment(env) === 'development';
}
