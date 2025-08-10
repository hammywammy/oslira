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
    // Parallel database queries for efficiency
    const [leadsResponse, analysesResponse, usersResponse] = await Promise.all([
      fetchJson<any[]>(
        `${env.SUPABASE_URL}/rest/v1/leads?select=id,score,created_at,analysis_type,username,platform&order=created_at.desc`,
        { headers }
      ),
      fetchJson<any[]>(
        `${env.SUPABASE_URL}/rest/v1/lead_analyses?select=engagement_rate,score_total,avg_likes,avg_comments,created_at`,
        { headers }
      ),
      fetchJson<any[]>(
        `${env.SUPABASE_URL}/rest/v1/users?select=id,created_at,subscription_status,credits`,
        { headers }
      )
    ]);

    // Calculate time-based metrics
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Core metrics
    const totalLeads = leadsResponse.length;
    const recentLeads = leadsResponse.filter(lead => lead.created_at > sevenDaysAgo).length;
    const monthlyLeads = leadsResponse.filter(lead => lead.created_at > thirtyDaysAgo).length;
    
    // Score analysis
    const avgScore = totalLeads > 0 ? 
      Math.round(leadsResponse.reduce((sum, lead) => sum + (lead.score || 0), 0) / totalLeads) : 0;
    
    const highScoreLeads = leadsResponse.filter(lead => (lead.score || 0) > 75).length;
    const conversionRate = totalLeads > 0 ? Math.round((highScoreLeads / totalLeads) * 100) : 0;
    
    // Engagement analysis from deep analyses
    const avgEngagement = analysesResponse.length > 0 ? 
      Math.round(analysesResponse.reduce((sum, analysis) => sum + (analysis.engagement_rate || 0), 0) / analysesResponse.length * 100) / 100 : 0;
    
    // User metrics
    const activeUsers = usersResponse.filter(user => user.subscription_status === 'active').length;
    const totalCreditsAvailable = usersResponse.reduce((sum, user) => sum + (user.credits || 0), 0);
    
    // Analysis type breakdown
    const lightAnalyses = leadsResponse.filter(lead => lead.analysis_type === 'light').length;
    const deepAnalyses = leadsResponse.filter(lead => lead.analysis_type === 'deep').length;
    
    // Growth calculation
    const previousWeekLeads = leadsResponse.filter(lead => {
      const leadDate = new Date(lead.created_at);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      return leadDate > twoWeeksAgo && leadDate <= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }).length;
    
    const growthRate = previousWeekLeads > 0 ? 
      Math.round(((recentLeads - previousWeekLeads) / previousWeekLeads) * 100) : 
      (recentLeads > 0 ? 100 : 0);

    return {
      success: true,
      summary: {
        totalLeads,
        averageScore: avgScore,
        conversionRate: `${conversionRate}%`,
        avgEngagementRate: `${avgEngagement}%`,
        recentActivity: recentLeads,
        monthlyActivity: monthlyLeads,
        activeUsers,
        totalCreditsAvailable,
        analysisBreakdown: {
          light: lightAnalyses,
          deep: deepAnalyses
        }
      },
      trends: {
        leadsGrowth: `${growthRate >= 0 ? '+' : ''}${growthRate}%`,
        scoreImprovement: avgScore > 60 ? "above_average" : "needs_improvement",
        engagementTrend: avgEngagement > 3 ? "healthy" : "low_engagement",
        userGrowth: activeUsers > 0 ? "active" : "no_subscribers"
      },
      insights: {
        topPerformingScore: Math.max(...leadsResponse.map(lead => lead.score || 0)),
        mostActiveWeek: recentLeads > previousWeekLeads ? "current" : "previous",
        recommendedFocus: conversionRate < 20 ? "improve_targeting" : "scale_operations"
      },
      timestamp: new Date().toISOString(),
      dataSource: "real_database_queries_comprehensive"
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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Get comprehensive real data for AI analysis
    const [recentAnalyses, allLeads, recentLeads] = await Promise.all([
      fetchJson<any[]>(
        `${env.SUPABASE_URL}/rest/v1/lead_analyses?created_at=gte.${thirtyDaysAgo}&select=*`,
        { headers }
      ),
      fetchJson<any[]>(
        `${env.SUPABASE_URL}/rest/v1/leads?select=id,score,created_at,analysis_type,username,platform,followers_count`,
        { headers }
      ),
      fetchJson<any[]>(
        `${env.SUPABASE_URL}/rest/v1/leads?created_at=gte.${sevenDaysAgo}&select=score,followers_count,analysis_type`,
        { headers }
      )
    ]);

    if (recentAnalyses.length === 0 && allLeads.length === 0) {
      return {
        success: true,
        insights: {
          keyTrends: ["No analysis data available yet"],
          recommendations: ["Start analyzing Instagram profiles to generate insights"], 
          predictions: {
            nextMonth: "Insufficient data for predictions",
            trendDirection: "neutral",
            confidence: 0.0
          }
        },
        dataSource: "no_data_available",
        timestamp: new Date().toISOString()
      };
    }

    // Calculate comprehensive metrics
    const totalAnalyses = recentAnalyses.length;
    const totalLeads = allLeads.length;
    const recentLeadsCount = recentLeads.length;
    
    // Score analysis
    const avgScore = totalLeads > 0 ? 
      Math.round(allLeads.reduce((sum, lead) => sum + (lead.score || 0), 0) / totalLeads) : 0;
    const recentAvgScore = recentLeadsCount > 0 ?
      Math.round(recentLeads.reduce((sum, lead) => sum + (lead.score || 0), 0) / recentLeadsCount) : 0;
    
    // Engagement analysis (from deep analyses)
    const avgEngagement = totalAnalyses > 0 ? 
      Math.round(recentAnalyses.reduce((sum, analysis) => sum + (analysis.engagement_rate || 0), 0) / totalAnalyses * 100) / 100 : 0;
    
    // Performance segmentation
    const highScoreProfiles = allLeads.filter(lead => (lead.score || 0) > 75).length;
    const mediumScoreProfiles = allLeads.filter(lead => (lead.score || 0) >= 50 && (lead.score || 0) <= 75).length;
    const lowScoreProfiles = allLeads.filter(lead => (lead.score || 0) < 50).length;
    
    // Follower analysis
    const avgFollowers = totalLeads > 0 ?
      Math.round(allLeads.reduce((sum, lead) => sum + (lead.followers_count || 0), 0) / totalLeads) : 0;
    const microInfluencers = allLeads.filter(lead => (lead.followers_count || 0) >= 1000 && (lead.followers_count || 0) <= 100000).length;
    const macroInfluencers = allLeads.filter(lead => (lead.followers_count || 0) > 100000).length;
    
    // Analysis type breakdown
    const lightAnalyses = allLeads.filter(lead => lead.analysis_type === 'light').length;
    const deepAnalyses = allLeads.filter(lead => lead.analysis_type === 'deep').length;
    
    // Success rate calculation
    const successRate = totalLeads > 0 ? Math.round((highScoreProfiles / totalLeads) * 100) : 0;
    
    // Trend analysis
    const isImproving = recentAvgScore > avgScore;
    const trendDirection = isImproving ? "positive" : (recentAvgScore === avgScore ? "stable" : "negative");
    
    // Generate AI insights based on real data
    const analysisPrompt = `Analyze this comprehensive lead generation data and provide strategic insights:

PERFORMANCE METRICS (Last 30 Days):
- Total leads analyzed: ${totalLeads}
- Deep analyses conducted: ${totalAnalyses}
- Average overall score: ${avgScore}/100
- Recent weekly average: ${recentAvgScore}/100
- Success rate (>75 score): ${successRate}%
- Average engagement rate: ${avgEngagement}%

LEAD SEGMENTATION:
- High performers (>75): ${highScoreProfiles} leads (${Math.round((highScoreProfiles/totalLeads)*100)}%)
- Medium performers (50-75): ${mediumScoreProfiles} leads (${Math.round((mediumScoreProfiles/totalLeads)*100)}%)
- Low performers (<50): ${lowScoreProfiles} leads (${Math.round((lowScoreProfiles/totalLeads)*100)}%)

AUDIENCE ANALYSIS:
- Average follower count: ${avgFollowers.toLocaleString()}
- Micro-influencers (1K-100K): ${microInfluencers} profiles
- Macro-influencers (>100K): ${macroInfluencers} profiles

ANALYSIS BREAKDOWN:
- Light analyses: ${lightAnalyses}
- Deep analyses: ${deepAnalyses}
- Analysis depth ratio: ${Math.round((deepAnalyses/(lightAnalyses+deepAnalyses))*100)}%

TREND DIRECTION: ${trendDirection.toUpperCase()}

Based on this REAL performance data, provide 3 key insights about lead quality patterns, 3 actionable recommendations for improving results, and predict next month's performance with confidence level.

Return JSON: {"keyTrends": ["insight1", "insight2", "insight3"], "recommendations": ["rec1", "rec2", "rec3"], "predictions": {"nextMonth": "prediction", "trendDirection": "${trendDirection}", "confidence": 0.75}}`;

    // Get AI insights using enhanced config manager
    const openaiKey = await getApiKey('OPENAI_API_KEY', env);
    
    const aiResponse = await callWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
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
      metrics: {
        totalAnalyses,
        avgScore,
        recentAvgScore,
        successRate: `${successRate}%`,
        avgEngagement: `${avgEngagement}%`,
        trendDirection,
        dataPoints: totalLeads
      },
      segmentation: {
        highPerformers: highScoreProfiles,
        mediumPerformers: mediumScoreProfiles,
        lowPerformers: lowScoreProfiles,
        microInfluencers,
        macroInfluencers
      },
      dataSource: "real_database_analysis_with_ai",
      generated_at: new Date().toISOString(),
      model: "gpt-5-mini",
      confidence: insights.predictions?.confidence || 0.75
    };

  } catch (error: any) {
    logger('error', 'AI insights generation failed', { error: error.message });
    
    // Fallback: Return basic insights without AI
    const basicInsights = {
      keyTrends: [
        "AI analysis temporarily unavailable",
        "Using fallback data-driven insights",
        "Manual review recommended for trends"
      ],
      recommendations: [
        "Check API key configuration for AI insights",
        "Review recent lead quality manually",
        "Consider adjusting targeting criteria"
      ],
      predictions: {
        nextMonth: "AI predictions unavailable - review data manually",
        trendDirection: "unknown",
        confidence: 0.1
      }
    };

    return {
      success: false,
      insights: basicInsights,
      error: error.message,
      dataSource: "fallback_without_ai",
      timestamp: new Date().toISOString()
    };
  }
}

