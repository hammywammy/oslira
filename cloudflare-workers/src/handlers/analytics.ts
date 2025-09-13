import type { Context } from 'hono';
import { logger } from '../utils/logger.js';
import { getAnalyticsSummary, generateAIInsights } from '../services/analytics.js';
import { fetchJson, callWithRetry } from '../utils/helpers.js';

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
}

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
}

export async function generateAIInsights(env: Env): Promise<any> {
  try {
    logger('info', 'Generating AI insights with real data');
    
    const headers = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json'
    };

    // Get recent runs data for insights
    const recentRuns = await fetchJson<any[]>(
      `${env.SUPABASE_URL}/rest/v1/runs?select=*,leads(username,follower_count)&order=created_at.desc&limit=100`,
      { headers }
    );

    const insights = {
      success: true,
      insights: {
        totalAnalyses: recentRuns.length,
        averageScore: recentRuns.reduce((sum, run) => sum + (run.overall_score || 0), 0) / recentRuns.length,
        topPerformers: recentRuns
          .filter(run => run.overall_score > 80)
          .slice(0, 5)
          .map(run => ({
            username: run.leads?.username,
            score: run.overall_score
          })),
        trends: {
          highEngagement: recentRuns.filter(run => run.engagement_score > 70).length,
          goodNicheFit: recentRuns.filter(run => run.niche_fit_score > 70).length
        }
      },
      timestamp: new Date().toISOString()
    };

    return insights;

  } catch (error: any) {
    logger('error', 'generateAIInsights failed', { error: error.message });
    return {
      success: false,
      error: error.message,
      insights: null
    };
  }
}
