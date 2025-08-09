import type { Env } from '../types/interfaces.js';
import { fetchJson } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';
import { getApiKey } from './enhanced-config-manager.js';

export async function getAnalyticsSummary(env: Env): Promise<any> {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };

  try {
    // Get real data from database
    const [leadsResponse, analysesResponse] = await Promise.all([
      fetchJson<any[]>(
        `${env.SUPABASE_URL}/rest/v1/leads?select=*`,
        { headers }
      ),
      fetchJson<any[]>(
        `${env.SUPABASE_URL}/rest/v1/lead_analyses?select=*`,
        { headers }
      )
    ]);

    const totalLeads = leadsResponse.length;
    const avgScore = totalLeads > 0 ? Math.round(leadsResponse.reduce((sum, lead) => sum + (lead.score || 0), 0) / totalLeads) : 0;
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentLeads = leadsResponse.filter(lead => lead.created_at > sevenDaysAgo).length;
    
    const avgEngagement = analysesResponse.length > 0 ? 
      Math.round(analysesResponse.reduce((sum, analysis) => sum + (analysis.engagement_rate || 0), 0) / analysesResponse.length * 100) / 100 : 0;

    return {
      success: true,
      summary: {
        totalLeads,
        averageScore: avgScore,
        avgEngagementRate: avgEngagement,
        recentActivity: recentLeads,
        topPerformingNiche: "Real data analysis needed",
        dataSource: "real_database_queries"
      },
      trends: {
        leadsGrowth: recentLeads > 0 ? "+growth" : "stable",
        scoreImprovement: "needs_calculation",
        engagementTrend: "data_driven_analysis"
      },
      sparklines: {
        leads: "needs_time_series_calculation", 
        conversions: "needs_outcome_tracking"
      },
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    logger('error', 'Analytics summary query failed', { error: error.message });
    throw error;
  }
}

export async function generateAIInsights(env: Env): Promise<any> {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const recentAnalyses = await fetchJson<any[]>(
      `${env.SUPABASE_URL}/rest/v1/lead_analyses?created_at=gte.${thirtyDaysAgo}&select=*`,
      { headers }
    );

    if (recentAnalyses.length === 0) {
      return {
        success: true,
        insights: {
          keyTrends: ["Insufficient data for trend analysis"],
          recommendations: ["Generate more leads to enable meaningful insights"], 
          predictions: {
            nextMonth: "Need more historical data",
            trendDirection: "neutral",
            confidence: 0.1
          }
        },
        dataSource: "real_database_queries_insufficient_data",
        timestamp: new Date().toISOString()
      };
    }

    // Calculate real metrics
    const avgScore = Math.round(recentAnalyses.reduce((sum, analysis) => sum + (analysis.score_total || 0), 0) / recentAnalyses.length);
    const avgEngagement = Math.round(recentAnalyses.reduce((sum, analysis) => sum + (analysis.engagement_rate || 0), 0) / recentAnalyses.length * 100) / 100;
    const highScoreProfiles = recentAnalyses.filter(analysis => (analysis.score_total || 0) > 75).length;

    // Generate AI insights based on real data
    const analysisPrompt = `Analyze this real lead generation data and provide insights:

REAL DATA FROM LAST 30 DAYS:
- Total leads analyzed: ${recentAnalyses.length}
- Average overall score: ${avgScore}/100  
- Average engagement rate: ${avgEngagement}%
- High-scoring profiles (>75): ${highScoreProfiles}
- Success rate: ${Math.round((highScoreProfiles / recentAnalyses.length) * 100)}%

Based on this REAL data, generate 3 data-driven insights and 3 actionable recommendations. 
Return JSON: {"keyTrends": ["trend1", "trend2", "trend3"], "recommendations": ["rec1", "rec2", "rec3"], "predictions": {"nextMonth": "prediction", "trendDirection": "positive/neutral/negative", "confidence": 0.75}}`;

    const aiResponse = await callWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        const openaiKey = await getApiKey('OPENAI_API_KEY', env);

      headers: {
      Authorization: `Bearer ${openaiKey}`, // ✅ CORRECT
      'Content-Type': 'application/json'
      }
        body: JSON.stringify({
          model: 'gpt-5-mini',
          messages: [{ role: 'user', content: analysisPrompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      }
    );

    const insights = JSON.parse(aiResponse.choices[0].message.content);

    return {
      success: true,
      insights,
      dataSource: "real_database_analysis",
      generated_at: new Date().toISOString(),
      model: "gpt-4o",
      dataPoints: recentAnalyses.length
    };

  } catch (error: any) {
    logger('error', 'AI insights generation failed', { error: error.message });
    throw error;
  }
}
