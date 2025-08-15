// ============================================================================
// ENHANCED RESPONSE UTILITIES - Complete implementation
// File: cloudflare-workers/src/utils/response.ts
// ============================================================================

import { logger } from './logger.js';
import { getEnvironment } from './env.js';
import type { Env } from '../types/interfaces.js';

// ============================================================================
// ENHANCED RESPONSE INTERFACES
// ============================================================================

export interface StandardAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta: {
    requestId: string;
    timestamp: string;
    version: string;
    environment: string;
    duration?: number;
    traceId?: string;
  };
  debug?: {
    cacheHit?: boolean;
    rateLimited?: boolean;
    throttled?: boolean;
    modelUsed?: string;
    tokensUsed?: number;
    costUSD?: number;
    isTestCall?: boolean;
    meteringEvents?: number;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  rateLimit?: {
    remaining: number;
    resetTime: string;
    limit: number;
  };
}

export interface ErrorContext {
  code?: string;
  details?: Record<string, any>;
  suggestions?: string[];
  documentation?: string;
  supportId?: string;
}

export interface PerformanceMetrics {
  requestDuration: number;
  dbQueries?: number;
  cacheHits?: number;
  apiCalls?: number;
  totalCost?: number;
  breakdown?: {
    parsing: number;
    validation: number;
    database: number;
    analysis: number;
    response: number;
  };
}

// ============================================================================
// CORE RESPONSE FUNCTIONS
// ============================================================================

export function createStandardResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  requestId?: string,
  environment?: string,
  startTime?: number
): StandardAPIResponse<T> {
  const now = Date.now();
  const duration = startTime ? now - startTime : undefined;
  
  const response: StandardAPIResponse<T> = {
    success,
    meta: {
      requestId: requestId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: '3.1.0-enhanced',
      environment: environment || 'unknown',
      duration,
      traceId: requestId ? `trace-${requestId}` : undefined
    }
  };

  if (success) {
    response.data = data;
    if (error) response.message = error; // Allow success message
  } else {
    response.error = error || 'Unknown error occurred';
  }

  return response;
}

export function createSuccessResponse<T>(
  data?: T, 
  message?: string, 
  requestId?: string,
  env?: Env,
  startTime?: number
): StandardAPIResponse<T> {
  const environment = env ? getEnvironment(env) : 'unknown';
  const response = createStandardResponse(true, data, message, requestId, environment, startTime);
  
  if (message) {
    response.message = message;
  }
  
  return response;
}

export function createErrorResponse(
  error: string, 
  requestId?: string,
  env?: Env,
  errorContext?: ErrorContext,
  startTime?: number
): StandardAPIResponse {
  const environment = env ? getEnvironment(env) : 'unknown';
  const response = createStandardResponse(false, undefined, error, requestId, environment, startTime);
  
  // Enhanced error context
  if (errorContext) {
    response.debug = {
      ...response.debug,
      ...errorContext.details
    };
    
    // Add helpful suggestions for common errors
    if (errorContext.suggestions?.length) {
      response.message = errorContext.suggestions.join('. ');
    }
  }
  
  return response;
}

// ============================================================================
// SPECIALIZED RESPONSE FUNCTIONS
// ============================================================================

export function createAnalysisResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  requestId?: string,
  env?: Env,
  metrics?: PerformanceMetrics,
  debug?: {
    cacheHit?: boolean;
    rateLimited?: boolean;
    throttled?: boolean;
    modelUsed?: string;
    tokensUsed?: number;
    costUSD?: number;
    isTestCall?: boolean;
    meteringEvents?: number;
  }
): StandardAPIResponse<T> {
  const environment = env ? getEnvironment(env) : 'unknown';
  const startTime = metrics?.requestDuration ? Date.now() - metrics.requestDuration : undefined;
  
  const response = createStandardResponse(success, data, error, requestId, environment, startTime);
  
  // Add analysis-specific debug information
  if (debug) {
    response.debug = {
      ...response.debug,
      ...debug
    };
  }
  
  // Add performance metrics
  if (metrics) {
    response.meta.duration = metrics.requestDuration;
    if (metrics.breakdown) {
      response.debug = {
        ...response.debug,
        performanceBreakdown: metrics.breakdown
      };
    }
  }
  
  return response;
}

export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  requestId?: string,
  env?: Env
): StandardAPIResponse<T[]> {
  const environment = env ? getEnvironment(env) : 'unknown';
  const response = createStandardResponse(true, data, undefined, requestId, environment);
  
  response.pagination = {
    page,
    limit,
    total,
    hasNext: (page * limit) < total,
    hasPrev: page > 1
  };
  
  return response;
}

export function createRateLimitedResponse(
  requestId?: string,
  env?: Env,
  resetTime?: string,
  remaining?: number,
  limit?: number
): StandardAPIResponse {
  const environment = env ? getEnvironment(env) : 'unknown';
  const response = createStandardResponse(
    false, 
    undefined, 
    'Rate limit exceeded. Please try again later.', 
    requestId, 
    environment
  );
  
  response.rateLimit = {
    remaining: remaining || 0,
    resetTime: resetTime || new Date(Date.now() + 60000).toISOString(),
    limit: limit || 100
  };
  
  response.debug = {
    rateLimited: true,
    throttled: true
  };
  
  return response;
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

export function createValidationErrorResponse(
  validationErrors: string[],
  requestId?: string,
  env?: Env
): StandardAPIResponse {
  const environment = env ? getEnvironment(env) : 'unknown';
  
  const errorContext: ErrorContext = {
    code: 'VALIDATION_ERROR',
    details: { validationErrors },
    suggestions: [
      'Check the required fields and their formats',
      'Ensure all required parameters are provided',
      'Verify data types match the expected format'
    ],
    documentation: 'https://api.oslira.com/docs/validation'
  };
  
  return createErrorResponse(
    `Validation failed: ${validationErrors.join(', ')}`,
    requestId,
    env,
    errorContext
  );
}

export function createDatabaseErrorResponse(
  operation: string,
  originalError: string,
  requestId?: string,
  env?: Env
): StandardAPIResponse {
  const environment = env ? getEnvironment(env) : 'unknown';
  
  const errorContext: ErrorContext = {
    code: 'DATABASE_ERROR',
    details: { operation, originalError },
    suggestions: [
      'This appears to be a temporary database issue',
      'Please try your request again in a few moments',
      'If the problem persists, contact support'
    ],
    supportId: requestId
  };
  
  return createErrorResponse(
    `Database operation failed: ${operation}`,
    requestId,
    env,
    errorContext
  );
}

export function createAuthenticationErrorResponse(
  reason: string,
  requestId?: string,
  env?: Env
): StandardAPIResponse {
  const environment = env ? getEnvironment(env) : 'unknown';
  
  const errorContext: ErrorContext = {
    code: 'AUTHENTICATION_ERROR',
    details: { reason },
    suggestions: [
      'Ensure you have included a valid Authorization header',
      'Check that your token has not expired',
      'Verify you have the correct permissions for this operation'
    ],
    documentation: 'https://api.oslira.com/docs/authentication'
  };
  
  return createErrorResponse(
    `Authentication failed: ${reason}`,
    requestId,
    env,
    errorContext
  );
}

export function createInsufficientCreditsResponse(
  required: number,
  available: number,
  requestId?: string,
  env?: Env
): StandardAPIResponse {
  const environment = env ? getEnvironment(env) : 'unknown';
  
  const errorContext: ErrorContext = {
    code: 'INSUFFICIENT_CREDITS',
    details: { required, available, deficit: required - available },
    suggestions: [
      'Purchase additional credits to continue',
      'Upgrade your subscription plan',
      'Use a lighter analysis type if available'
    ],
    documentation: 'https://api.oslira.com/docs/billing'
  };
  
  return createErrorResponse(
    `Insufficient credits: ${required} required, ${available} available`,
    requestId,
    env,
    errorContext
  );
}

// ============================================================================
// RESPONSE ENHANCEMENT UTILITIES
// ============================================================================

export function addDebugInfo<T>(
  response: StandardAPIResponse<T>,
  debugInfo: Record<string, any>
): StandardAPIResponse<T> {
  response.debug = {
    ...response.debug,
    ...debugInfo
  };
  return response;
}

export function addPerformanceMetrics<T>(
  response: StandardAPIResponse<T>,
  metrics: PerformanceMetrics
): StandardAPIResponse<T> {
  response.meta.duration = metrics.requestDuration;
  
  response.debug = {
    ...response.debug,
    dbQueries: metrics.dbQueries,
    cacheHits: metrics.cacheHits,
    apiCalls: metrics.apiCalls,
    totalCost: metrics.totalCost
  };
  
  if (metrics.breakdown) {
    response.debug.performanceBreakdown = metrics.breakdown;
  }
  
  return response;
}

export function addRateLimitInfo<T>(
  response: StandardAPIResponse<T>,
  remaining: number,
  resetTime: string,
  limit: number
): StandardAPIResponse<T> {
  response.rateLimit = {
    remaining,
    resetTime,
    limit
  };
  return response;
}

// ============================================================================
// LOGGING INTEGRATION
// ============================================================================

export function logResponse<T>(
  response: StandardAPIResponse<T>,
  level: 'info' | 'warn' | 'error' = 'info'
): void {
  const logData = {
    success: response.success,
    requestId: response.meta.requestId,
    duration: response.meta.duration,
    environment: response.meta.environment,
    error: response.error,
    debug: response.debug
  };
  
  if (response.success) {
    logger(level, 'Response sent successfully', logData, response.meta.requestId);
  } else {
    logger('error', 'Error response sent', logData, response.meta.requestId);
  }
}

// ============================================================================
// RESPONSE TRANSFORMATION UTILITIES
// ============================================================================

export function transformToLegacyFormat<T>(
  response: StandardAPIResponse<T>
): any {
  // Transform to match your working main branch format if needed
  return {
    success: response.success,
    data: response.data,
    error: response.error,
    requestId: response.meta.requestId,
    timestamp: response.meta.timestamp
  };
}

export function sanitizeResponse<T>(
  response: StandardAPIResponse<T>,
  isProduction: boolean = false
): StandardAPIResponse<T> {
  if (isProduction) {
    // Remove debug information in production
    const sanitized = { ...response };
    delete sanitized.debug;
    return sanitized;
  }
  return response;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function isSuccessResponse<T>(
  response: StandardAPIResponse<T>
): response is StandardAPIResponse<T> & { success: true; data: T } {
  return response.success === true;
}

export function isErrorResponse<T>(
  response: StandardAPIResponse<T>
): response is StandardAPIResponse<T> & { success: false; error: string } {
  return response.success === false;
}

export function getResponseStatusCode<T>(response: StandardAPIResponse<T>): number {
  if (response.success) return 200;
  
  if (response.error) {
    if (response.error.includes('Validation failed')) return 400;
    if (response.error.includes('Authentication failed')) return 401;
    if (response.error.includes('Insufficient credits')) return 402;
    if (response.error.includes('not found')) return 404;
    if (response.error.includes('Rate limit exceeded')) return 429;
  }
  
  return 500;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  StandardAPIResponse,
  ErrorContext,
  PerformanceMetrics
};
