export interface StandardAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    requestId: string;
    timestamp: string;
    version: string;
    environment: string;
  };
}

export function createStandardResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  requestId?: string,
  environment?: string
): StandardAPIResponse<T> {
  const response: StandardAPIResponse<T> = {
    success,
    meta: {
      requestId: requestId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: environment || 'unknown'
    }
  };

  if (success) {
    response.data = data;
  } else {
    response.error = error || 'Unknown error';
  }

  return response;
}

export function createSuccessResponse<T>(data?: T, message?: string, requestId?: string): StandardAPIResponse<T> {
  return {
    success: true,
    data,
    message,
    meta: {
      requestId: requestId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.APP_ENV || 'unknown'
    }
  };
}

export function createErrorResponse(error: string, requestId?: string): StandardAPIResponse {
  return {
    success: false,
    error,
    meta: {
      requestId: requestId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.APP_ENV || 'unknown'
    }
  };
}
