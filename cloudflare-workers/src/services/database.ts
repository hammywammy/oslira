import type { Env } from '../types/interfaces.js';
import { fetchJson } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

// ===============================================================================
// SHARED UTILITIES
// ===============================================================================

const createHeaders = (env: Env) => ({
  apikey: env.SUPABASE_SERVICE_ROLE,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
  'Content-Type': 'application/json'
});

const createPreferHeaders = (env: Env, prefer: string) => ({
  ...createHeaders(env),
  Prefer: prefer
});

// ===============================================================================
// LEADS TABLE OPERATIONS
// ===============================================================================

export async function upsertLead(
  leadData: any,
  env: Env
): Promise<string> {
  try {
    logger('info', 'Upserting lead record', { 
      username: leadData.username,
      business_id: leadData.business_id
    });

    logger('info', 'Upserting lead record', { 
  username: leadData.username,
  business_id: leadData.business_id,
  raw_following_data: {
    followingCount: leadData.followingCount,
    following_count: leadData.following_count,
    postsCount: leadData.postsCount,
    posts_count: leadData.posts_count,
    followersCount: leadData.followersCount,
    followers_count: leadData.followers_count
  }
});

    const cleanLeadData = {
      user_id: leadData.user_id,
      business_id: leadData.business_id,
      username: leadData.username,
      display_name: leadData.full_name || leadData.displayName || null,
      profile_picture_url: leadData.profile_pic_url || leadData.profilePicUrl || null,
      bio_text: leadData.bio || null,
      external_website_url: leadData.external_url || leadData.externalUrl || null,
      
following_count: parseInt(leadData.followingCount || leadData.following_count) || 0,
post_count: parseInt(leadData.postsCount || leadData.posts_count) || 0,
      
      // Profile attributes
      is_verified_account: leadData.is_verified || leadData.isVerified || false,
      is_private_account: leadData.is_private || leadData.isPrivate || false,
      is_business_account: leadData.is_business_account || leadData.isBusinessAccount || false,
      
      // Platform info
      platform_type: 'instagram',
      profile_url: leadData.profile_url || `https://instagram.com/${leadData.username}`,
      
      // Update timestamp
      last_updated_at: new Date().toISOString()
    };

    logger('info', 'Clean lead data before upsert', {
  username: cleanLeadData.username,
  follower_count: cleanLeadData.follower_count,
  following_count: cleanLeadData.following_count,
  post_count: cleanLeadData.post_count,
  original_fields_available: {
    followingCount: !!leadData.followingCount,
    following_count: !!leadData.following_count,
    postsCount: !!leadData.postsCount,
    posts_count: !!leadData.posts_count
  }
});

    // Use UPSERT to handle duplicates
    const upsertQuery = `${env.SUPABASE_URL}/rest/v1/leads?on_conflict=user_id,username,business_id`;

    const leadResponse = await fetch(upsertQuery, {
      method: 'POST',
      headers: createPreferHeaders(env, 'return=representation,resolution=merge-duplicates'),
      body: JSON.stringify(cleanLeadData)
    });

    if (!leadResponse.ok) {
      const errorText = await leadResponse.text();
      throw new Error(`Failed to upsert lead: ${leadResponse.status} - ${errorText}`);
    }

    const leadResult = await leadResponse.json();
    if (!leadResult || !leadResult.length) {
      throw new Error('Failed to create/update lead record - no data returned');
    }

    const lead_id = leadResult[0].lead_id;
    logger('info', 'Lead upserted successfully', { lead_id, username: leadData.username });
    
    return lead_id;

  } catch (error: any) {
    logger('error', 'upsertLead failed', { error: error.message });
    throw new Error(`Lead upsert failed: ${error.message}`);
  }
}

// ===============================================================================
// RUNS TABLE OPERATIONS
// ===============================================================================

export async function insertAnalysisRun(
  lead_id: string,
  user_id: string,
  business_id: string,
  analysisType: string,
  analysisResult: any,
  env: Env
): Promise<string> {
  try {
    logger('info', 'Inserting analysis run', { 
      lead_id, 
      analysisType,
      score: analysisResult.score
    });

    const runData = {
      lead_id,
      user_id,
      business_id,
      analysis_type: analysisType,
      analysis_version: '1.0',
      
      // Universal scores (required for all analysis types)
      overall_score: Math.round(parseFloat(analysisResult.score) || 0),
      niche_fit_score: Math.round(parseFloat(analysisResult.niche_fit) || 0),
      engagement_score: Math.round(parseFloat(analysisResult.engagement_score) || 0),
      
      // Quick reference data
      summary_text: analysisResult.quick_summary || null,
      confidence_level: parseFloat(analysisResult.confidence_level) || null,
      
      // Processing metadata
      run_status: 'completed',
      ai_model_used: 'gpt-4o',
      analysis_completed_at: new Date().toISOString()
    };

    const runResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/runs`, {
      method: 'POST',
      headers: createPreferHeaders(env, 'return=representation'),
      body: JSON.stringify(runData)
    });

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      throw new Error(`Failed to insert run: ${runResponse.status} - ${errorText}`);
    }

    const runResult = await runResponse.json();
    if (!runResult || !runResult.length) {
      throw new Error('Failed to create run record - no data returned');
    }

    const run_id = runResult[0].run_id;
    logger('info', 'Analysis run inserted successfully', { run_id, analysisType });
    
    return run_id;

  } catch (error: any) {
    logger('error', 'insertAnalysisRun failed', { error: error.message });
    throw new Error(`Run insert failed: ${error.message}`);
  }
}

// ===============================================================================
// PAYLOADS TABLE OPERATIONS
// ===============================================================================

export async function insertAnalysisPayload(
  run_id: string,
  lead_id: string,
  user_id: string,
  business_id: string,
  analysisType: string,
  analysisData: any,
  env: Env
): Promise<string> {
  try {
    logger('info', 'Inserting analysis payload', { 
      run_id, 
      analysisType,
      dataKeys: Object.keys(analysisData || {}).length
    });

    // Structure payload based on analysis type
    let structuredPayload;
    
    switch (analysisType) {
      case 'light':
        structuredPayload = {
          insights: analysisData.selling_points || [],
          audience_quality: analysisData.audience_quality || 'Unknown',
          basic_demographics: analysisData.engagement_insights || null,
          engagement_summary: `Avg engagement: ${analysisData.engagement_score || 0}%`
        };
        break;
        
      case 'deep':
        structuredPayload = {
          deep_summary: analysisData.deep_summary || null,
          selling_points: analysisData.selling_points || [],
          outreach_message: analysisData.outreach_message || null,
          engagement_breakdown: {
            avg_likes: parseInt(analysisData.avg_likes) || 0,
            avg_comments: parseInt(analysisData.avg_comments) || 0,
            engagement_rate: parseFloat(analysisData.engagement_rate) || 0
          },
          latest_posts: analysisData.latest_posts || null,
          audience_insights: analysisData.engagement_insights || null,
          reasons: analysisData.reasons || []
        };
        break;
        
      case 'xray':
        structuredPayload = {
          copywriter_profile: analysisData.copywriter_profile || {},
          commercial_intelligence: analysisData.commercial_intelligence || {},
          persuasion_strategy: analysisData.persuasion_strategy || {}
        };
        break;
        
      default:
        structuredPayload = analysisData;
    }

    const payloadData = {
      run_id,
      lead_id,
      user_id,
      business_id,
      analysis_type: analysisType,
      analysis_data: structuredPayload,
      data_size_bytes: JSON.stringify(structuredPayload).length
    };

    const payloadResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/payloads`, {
      method: 'POST',
      headers: createPreferHeaders(env, 'return=representation'),
      body: JSON.stringify(payloadData)
    });

    if (!payloadResponse.ok) {
      const errorText = await payloadResponse.text();
      throw new Error(`Failed to insert payload: ${payloadResponse.status} - ${errorText}`);
    }

    const payloadResult = await payloadResponse.json();
    if (!payloadResult || !payloadResult.length) {
      throw new Error('Failed to create payload record - no data returned');
    }

    const payload_id = payloadResult[0].payload_id;
    logger('info', 'Analysis payload inserted successfully', { payload_id, analysisType });
    
    return payload_id;

  } catch (error: any) {
    logger('error', 'insertAnalysisPayload failed', { error: error.message });
    throw new Error(`Payload insert failed: ${error.message}`);
  }
}

// ===============================================================================
// MAIN SAVE FUNCTION (Replaces saveLeadAndAnalysis)
// ===============================================================================

export async function saveCompleteAnalysis(
  leadData: any,
  analysisData: any,
  analysisType: string,
  env: Env
): Promise<string> {
  try {
    logger('info', 'Starting complete analysis save', { 
      username: leadData.username,
      analysisType
    });

    // Step 1: Upsert lead record
    const lead_id = await upsertLead(leadData, env);

    // Step 2: Insert analysis run
    const run_id = await insertAnalysisRun(
      lead_id,
      leadData.user_id,
      leadData.business_id,
      analysisType,
      analysisData, // Always use analysisData parameter
      env
    );

    // Step 3: Insert analysis payload (if we have analysis data)
    if (analysisData && (analysisType === 'deep' || analysisType === 'xray')) {
      await insertAnalysisPayload(
        run_id,
        lead_id,
        leadData.user_id,
        leadData.business_id,
        analysisType,
        analysisData,
        env
      );
    }

    logger('info', 'Complete analysis save successful', { 
      lead_id, 
      run_id, 
      analysisType 
    });
    
    return run_id; // Return run_id instead of lead_id for new system

  } catch (error: any) {
    logger('error', 'saveCompleteAnalysis failed', { error: error.message });
    throw new Error(`Complete analysis save failed: ${error.message}`);
  }
}

// ===============================================================================
// QUERY FUNCTIONS FOR DASHBOARD
// ===============================================================================

export async function getDashboardLeads(
  user_id: string,
  business_id: string,
  env: Env,
  limit: number = 50
): Promise<any[]> {
  try {
    const query = `
      ${env.SUPABASE_URL}/rest/v1/leads?
      select=lead_id,username,display_name,profile_picture_url,follower_count,is_verified_account,
      runs(run_id,analysis_type,overall_score,niche_fit_score,engagement_score,summary_text,confidence_level,created_at)
      &user_id=eq.${user_id}
      &business_id=eq.${business_id}
      &order=runs.created_at.desc
      &limit=${limit}
    `;

    const response = await fetch(query, { headers: createHeaders(env) });

    if (!response.ok) {
      throw new Error(`Dashboard query failed: ${response.status}`);
    }

    const results = await response.json();
    logger('info', 'Dashboard leads retrieved', { count: results.length });
    
    return results;

  } catch (error: any) {
    logger('error', 'getDashboardLeads failed', { error: error.message });
    throw new Error(`Dashboard query failed: ${error.message}`);
  }
}

export async function getAnalysisDetails(
  run_id: string,
  user_id: string,
  env: Env
): Promise<any> {
  try {
    const query = `
      ${env.SUPABASE_URL}/rest/v1/runs?
      select=*,leads(*),payloads(analysis_data)
      &run_id=eq.${run_id}
      &leads.user_id=eq.${user_id}
    `;

    const response = await fetch(query, { headers: createHeaders(env) });

    if (!response.ok) {
      throw new Error(`Analysis details query failed: ${response.status}`);
    }

    const results = await response.json();
    if (!results.length) {
      throw new Error('Analysis not found or access denied');
    }

    logger('info', 'Analysis details retrieved', { run_id });
    return results[0];

  } catch (error: any) {
    logger('error', 'getAnalysisDetails failed', { error: error.message });
    throw new Error(`Analysis details query failed: ${error.message}`);
  }
}

// ===============================================================================
// CREDIT SYSTEM (ENHANCED WITH SHARED HEADERS)
// ===============================================================================

export async function updateCreditsAndTransaction(
  user_id: string,
  cost: number,
  analysisType: string,
  run_id: string,
  costDetails?: {
    actual_cost: number;
    tokens_in: number;
    tokens_out: number;
    model_used: string;
    block_type: string;
    processing_duration_ms?: number;
    blocks_used?: string[];
  },
  env: Env
): Promise<void> {
  const headers = createHeaders(env);

  try {
    // Get current user data to calculate new balance
    const userResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/users?select=credits&id=eq.${user_id}`,
      { headers }
    );

    if (!userResponse.ok) {
      throw new Error(`Failed to fetch user: ${userResponse.status}`);
    }

    const users = await userResponse.json();
    if (!users.length) {
      throw new Error('User not found');
    }

    const currentCredits = users[0].credits || 0;
    const newBalance = Math.max(0, currentCredits - cost);

    // Update user credits
    await fetchJson(
      `${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ credits: newBalance })
      },
      10000
    );

    // Create transaction record with enhanced cost tracking
    const transactionData = {
      user_id,
      amount: -cost,
      type: 'use',
      description: `${analysisType} analysis`,
      run_id: run_id,
      actual_cost: costDetails?.actual_cost || null,
      tokens_in: costDetails?.tokens_in || null,
      tokens_out: costDetails?.tokens_out || null,
      model_used: costDetails?.model_used || null,
      block_type: costDetails?.block_type || null,
      processing_duration_ms: costDetails?.processing_duration_ms || null,
      blocks_used: costDetails?.blocks_used?.join('+') || null,
      margin: cost - (costDetails?.actual_cost || 0) // Track profit margin
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

    logger('info', 'Credits and transaction updated successfully', { 
      user_id, 
      cost, 
      newBalance,
      margin: transactionData.margin 
    });

  } catch (error: any) {
    logger('error', 'updateCreditsAndTransaction error:', error.message);
    throw new Error(`Failed to update credits: ${error.message}`);
  }
}

export async function fetchUserAndCredits(user_id: string, env: Env): Promise<any> {
  try {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/users?select=*&id=eq.${user_id}`,
      { headers: createHeaders(env) }
    );

    if (!response.ok) {
      throw new Error(`User fetch failed: ${response.status}`);
    }

    const users = await response.json();
    if (!users.length) {
      return { isValid: false, error: 'User not found' };
    }

    const user = users[0];
    return {
      isValid: true,
      credits: user.credits || 0,
      userId: user.id
    };

  } catch (error: any) {
    logger('error', 'fetchUserAndCredits failed', { error: error.message });
    return { isValid: false, error: error.message };
  }
}

export async function fetchBusinessProfile(business_id: string, user_id: string, env: Env): Promise<any> {
  try {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/business_profiles?select=*,business_one_liner,business_context_pack,context_version,context_updated_at&id=eq.${business_id}&user_id=eq.${user_id}`,
      { headers: createHeaders(env) }
    );

    if (!response.ok) {
      throw new Error(`Business profile fetch failed: ${response.status}`);
    }

    const profiles = await response.json();
    if (!profiles.length) {
      throw new Error('Business profile not found or access denied');
    }

    return profiles[0];

  } catch (error: any) {
    logger('error', 'fetchBusinessProfile failed', { error: error.message });
    throw new Error(`Business profile fetch failed: ${error.message}`);
  }
}
