import type { Context } from 'hono';
import { logger } from '../utils/logger.js';
import { getAnalyticsSummary, generateAIInsights } from '../services/analytics.js';

export async function handleAnalyticsSummary(c: Context): Promise<Response> {
  try {
    const summary = await getAnalyticsSummary(c.env);
    return c.json(summary, 200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    });
  } catch (error: any) {
    logger('error', 'Analytics summary error', { error: error.message });
    return c.json({
      success: false,
      error: 'Failed to generate analytics summary',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

export async function handleGenerateInsights(c: Context): Promise<Response> {
  try {
    logger('info', 'AI insights generation requested - using real data');
    const insights = await generateAIInsights(c.env);
    return c.json(insights, 200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
  } catch (error: any) {
    logger('error', 'AI insights generation failed', { error: error.message });
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});
