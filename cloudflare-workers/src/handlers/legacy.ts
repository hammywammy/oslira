app.post('/analyze', async (c) => {
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
    
    return app.fetch(v1Request, c.env);
    
  } catch (error: any) {
    logger('error', 'Legacy endpoint forwarding failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
});

app.post('/bulk-analyze', async (c) => {
  const requestId = generateRequestId();
  logger('info', 'Legacy bulk-analyze endpoint called, redirecting to v1', { requestId });
  
  try {
    const body = await c.req.json();
    
    const v1Request = new Request(c.req.url.replace('/bulk-analyze', '/v1/bulk-analyze'), {
      method: 'POST',
      headers: c.req.header(),
      body: JSON.stringify(body)
    });
    
    return app.fetch(v1Request, c.env);
    
  } catch (error: any) {
    logger('error', 'Legacy bulk endpoint forwarding failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
});
export async function handleLegacyAnalyze(c: Context): Promise<Response>
export async function handleLegacyBulkAnalyze(c: Context): Promise<Response>
