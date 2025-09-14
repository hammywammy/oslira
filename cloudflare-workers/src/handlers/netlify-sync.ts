import type { Context } from 'hono';
import { generateRequestId, logger } from '../utils/logger.js';
import { createStandardResponse } from '../utils/response.js';

export async function handleConfigChanged(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    const { keyName, updatedBy } = await c.req.json();
    
    logger('info', 'Config change detected, triggering Netlify rebuild', { 
      keyName, 
      updatedBy, 
      requestId 
    });

    // Trigger Netlify build hook
    const netlifyBuildHook = c.env.NETLIFY_BUILD_HOOK_URL;
    
    if (netlifyBuildHook) {
      const netlifyResponse = await fetch(netlifyBuildHook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: 'config_update',
          keyName,
          updatedBy,
          timestamp: new Date().toISOString()
        })
      });

      if (netlifyResponse.ok) {
        logger('info', 'Netlify rebuild triggered successfully', { 
          keyName, 
          buildId: netlifyResponse.headers.get('x-netlify-deploy-id'),
          requestId 
        });
      } else {
        logger('error', 'Failed to trigger Netlify rebuild', { 
          status: netlifyResponse.status,
          keyName,
          requestId 
        });
      }
    } else {
      logger('warn', 'NETLIFY_BUILD_HOOK_URL not configured - skipping rebuild', { requestId });
    }

    // Optional: Trigger other services that need to know about config changes
    await notifyConfigSubscribers(keyName, updatedBy, c.env);

    return c.json(createStandardResponse(true, {
      message: 'Config change processed',
      netlifyTriggered: !!netlifyBuildHook
    }, undefined, requestId));

  } catch (error: any) {
    logger('error', 'Config change processing failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
}

async function notifyConfigSubscribers(keyName: string, updatedBy: string, env: any) {
  // Add other services that need to be notified of config changes
  
  // Example: Clear CDN cache for config endpoints
  if (env.CLOUDFLARE_ZONE_ID && env.CLOUDFLARE_API_TOKEN) {
    try {
      await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/purge_cache`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: [
            `${env.WORKER_URL}/config`,
            `${env.WORKER_URL}/v1/config`
          ]
        })
      });
      
      logger('info', 'CDN cache purged for config endpoints', { keyName });
    } catch (error) {
      logger('warn', 'Failed to purge CDN cache', { error: error.message });
    }
  }

  // Example: Notify monitoring/alerting systems
  if (env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🔑 Config Updated: ${keyName} was updated by ${updatedBy}`,
          channel: '#alerts'
        })
      });
    } catch (error) {
      logger('warn', 'Failed to send Slack notification', { error: error.message });
    }
  }
}
