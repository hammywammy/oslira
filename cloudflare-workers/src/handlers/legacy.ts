import type { Context } from 'hono';
import { generateRequestId, logger } from '../utils/logger.js';
import { createStandardResponse } from '../utils/response.js';

export async function handleLegacyAnalyze(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  logger('info', 'Legacy analyze endpoint called, redirecting to v1', { requestId });
  
  try {
    const body = await c.req.json();
    
    const normalizedBody = {
      ...body,
      analysis_type: body.analysis_type || body.type || 'light'
    };
    
    const v1Request = new Request(c.req.url.replace('/analyze', '/v1/analyze'), {
      method: 'POST',
      headers: c.req.header(),
      body: JSON.stringify(normalizedBody)
    });
    
    const response = await fetch(v1Request.url, {
  method: v1Request.method,
  headers: Object.fromEntries(v1Request.headers.entries()),
  body: v1Request.body
});
return response;
    
  } catch (error: any) {
    logger('error', 'Legacy endpoint forwarding failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
});

export async function handleLegacyBulkAnalyze(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  logger('info', 'Legacy bulk-analyze endpoint called, redirecting to v1', { requestId });
  
  try {
    const body = await c.req.json();
    
    const v1Request = new Request(c.req.url.replace('/bulk-analyze', '/v1/bulk-analyze'), {
      method: 'POST',
      headers: c.req.header(),
      body: JSON.stringify(body)
    });
    
    const response = await fetch(v1Request.url, {
  method: v1Request.method,
  headers: Object.fromEntries(v1Request.headers.entries()),
  body: v1Request.body
});
return response;
    
  } catch (error: any) {
    logger('error', 'Legacy bulk endpoint forwarding failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
});
