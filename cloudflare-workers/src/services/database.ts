import type { Env, User, BusinessProfile } from '../types/interfaces.js';
import { fetchJson } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

export async function fetchUserAndCredits(user_id: string, env: Env): Promise<{ user: User; credits: number }> {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };

  const usersResponse = await fetchJson<User[]>(
    `${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}&select=*`, 
    { headers }
  );

  if (!usersResponse.length) {
    throw new Error('User not found');
  }

  const user = usersResponse[0];
  const credits = user.credits || 0;

  return { user, credits };
}

export async function fetchBusinessProfile(business_id: string, user_id: string, env: Env): Promise<BusinessProfile> {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };

  const businesses = await fetchJson<BusinessProfile[]>(
    `${env.SUPABASE_URL}/rest/v1/business_profiles?id=eq.${business_id}&user_id=eq.${user_id}&select=*`,
    { headers }
  );

  if (!businesses.length) {
    throw new Error('Business profile not found or access denied');
  }

  return businesses[0];
}

export async function updateCreditsAndTransaction(
  user_id: string,
  cost: number,
  newBalance: number,
  description: string,
  transactionType: 'use' | 'add',
  env: Env,
  lead_id?: string
): Promise<void> {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };

  try {
    logger('info', `Updating user ${user_id} credits to ${newBalance}`);
    
    await fetchJson(
      `${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          credits: newBalance
        })
      },
      10000
    );

    const transactionData = {
      user_id: user_id,
      amount: transactionType === 'use' ? -cost : cost,
      type: transactionType,
      description: description,
      lead_id: lead_id || null
    };

    await fetchJson(
      `${env.SUPABASE_URL}/rest/v1/credit_transactions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(transactionData)
      },
      10000
    );

  } catch (error: any) {
    logger('error', 'updateCreditsAndTransaction error:', error.message);
    throw new Error(`Failed to update credits: ${error.message}`);
  }
}

export async function saveLeadAndAnalysis(
  leadData: any,
  analysisData: any | null,
  analysisType: string,
  env: Env
): Promise<string> {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };

  try {
    logger('info', 'Saving to leads table with complete data mapping', { 
      username: leadData.username,
      hasQuickSummary: !!leadData.quick_summary
    });
    
    const cleanLeadData = {
      ...leadData,
      score: Math.round(parseFloat(leadData.score) || 0),
      followers_count: parseInt(leadData.followers_count) || 0,
      quick_summary: leadData.quick_summary || null
    };

    logger('info', 'Lead data being saved', {
      username: cleanLeadData.username,
      score: cleanLeadData.score,
      followers: cleanLeadData.followers_count,
      hasQuickSummary: !!cleanLeadData.quick_summary
    });

    const leadResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify(cleanLeadData)
    });

    if (!leadResponse.ok) {
      const errorText = await leadResponse.text();
      throw new Error(`Failed to save to leads table: ${leadResponse.status} - ${errorText}`);
    }

    const leadResult = await leadResponse.json();
    if (!leadResult || !leadResult.length) {
      throw new Error('Failed to create lead record - no data returned');
    }

    const lead_id = leadResult[0].id;

    logger('info', 'Lead saved successfully', { 
      lead_id, 
      username: leadData.username,
      analysisType
    });

    // Save analysis data for deep analysis with complete field mapping
    if (analysisType === 'deep' && analysisData) {
      logger('info', 'Saving complete analysis data to lead_analyses table');
      
      const cleanAnalysisData = {
        ...analysisData,
        lead_id: lead_id,
        
        // Core scores
        score: Math.round(parseFloat(analysisData.score) || 0),
        engagement_score: Math.round(parseFloat(analysisData.engagement_score) || 0),
        score_niche_fit: Math.round(parseFloat(analysisData.score_niche_fit) || 0),
        score_total: Math.round(parseFloat(analysisData.score_total) || 0),
        niche_fit: Math.round(parseFloat(analysisData.niche_fit) || 0),
        
        // Real engagement data (CRITICAL FIX)
        avg_likes: parseInt(analysisData.avg_likes) || 0,
        avg_comments: parseInt(analysisData.avg_comments) || 0,
engagement_rate: (() => {
  const rate = parseFloat(analysisData.engagement_rate) || 0;
  // Convert percentage to decimal if needed (58.5% -> 0.585)
  return rate > 1 ? Math.min(rate / 100, 9.9999) : Math.min(rate, 9.9999);
})(),
        
        // Analysis results
        audience_quality: analysisData.audience_quality || 'Unknown',
        engagement_insights: analysisData.engagement_insights || 'No insights available',
        selling_points: analysisData.selling_points || null,
        reasons: analysisData.reasons || null,
        
        // Structured data fields
        latest_posts: analysisData.latest_posts || null,
        engagement_data: analysisData.engagement_data || null,
        analysis_data: analysisData.analysis_data || null,
        
        // Summaries and messages
        deep_summary: analysisData.deep_summary || null,
        outreach_message: analysisData.outreach_message || null,
        
        created_at: new Date().toISOString()
      };

      logger('info', 'Complete analysis data being saved', {
        lead_id,
        score: cleanAnalysisData.score,
        engagement_score: cleanAnalysisData.engagement_score,
        niche_fit: cleanAnalysisData.niche_fit,
        avg_likes: cleanAnalysisData.avg_likes,
        avg_comments: cleanAnalysisData.avg_comments,
        engagement_rate: cleanAnalysisData.engagement_rate,
        hasDeepSummary: !!cleanAnalysisData.deep_summary,
        hasLatestPosts: !!cleanAnalysisData.latest_posts,
        hasEngagementData: !!cleanAnalysisData.engagement_data,
        hasAnalysisData: !!cleanAnalysisData.analysis_data
      });

      const analysisResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/lead_analyses`, {
        method: 'POST',
        headers,
        body: JSON.stringify(cleanAnalysisData)
      });

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        logger('error', 'Failed to save analysis data', { error: errorText });
        
        // Rollback lead record
        try {
          await fetch(`${env.SUPABASE_URL}/rest/v1/leads?id=eq.${lead_id}`, {
            method: 'DELETE',
            headers
          });
          logger('info', 'Rolled back lead record due to analysis save failure');
        } catch (rollbackError) {
          logger('error', 'Failed to rollback lead record', { error: rollbackError });
        }
        
        throw new Error(`Failed to save analysis data: ${analysisResponse.status} - ${errorText}`);
      }

      logger('info', 'Complete analysis data saved successfully with all fields populated');
    }

    return lead_id;

  } catch (error: any) {
    logger('error', 'saveLeadAndAnalysis failed', { error: error.message });
    throw new Error(`Database save failed: ${error.message}`);
  }
}
