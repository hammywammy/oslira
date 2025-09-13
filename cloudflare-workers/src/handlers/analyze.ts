import { Context } from 'hono';
import type { Env, AnalysisRequest, ProfileData, AnalysisResult } from '../types/interfaces.js';
import { generateRequestId, logger } from '../utils/logger.js';
import { createStandardResponse } from '../utils/response.js';
import { normalizeRequest } from '../utils/validation.js';
import { saveCompleteAnalysis, updateCreditsAndTransaction, fetchUserAndCredits, fetchBusinessProfile } from '../services/database.ts';

export async function handleAnalyze(c: Context<{ Bindings: Env }>): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    logger('info', 'Analysis request received', { requestId });

    // Parse and validate request
    const body = await c.req.json() as AnalysisRequest;
    const { profile_url, username, analysis_type, business_id, user_id } = normalizeRequest(body);

    logger('info', 'Request validated', { 
      requestId, 
      username, 
      analysis_type, 
      business_id 
    });

    // Validate user and check credits
    const [userResult, business] = await Promise.all([
  fetchUserAndCredits(user_id, c.env),
  fetchBusinessProfile(business_id, user_id, c.env)
]);
    if (!userResult.isValid) {
      return c.json(createStandardResponse(
        false, 
        undefined, 
        userResult.error, 
        requestId
      ), 400);
    }

    // Check credit requirements
    const creditCost = analysis_type === 'deep' ? 2 : analysis_type === 'xray' ? 3 : 1;
    if (userResult.credits < creditCost) {
      return c.json(createStandardResponse(
        false, 
        undefined, 
        `Insufficient credits. Need ${creditCost}, have ${userResult.credits}`, 
        requestId
      ), 402);
    }

    logger('info', 'User validation passed', { 
      userId: user_id, 
      credits: userResult.credits, 
      creditCost 
    });

    // SCRAPE PROFILE DATA
    let profileData: ProfileData;
    try {
      logger('info', 'Starting profile scraping', { username });
const { scrapeInstagramProfile } = await import('../services/instagram-scraper.js');
profileData = await scrapeInstagramProfile(username, analysis_type, c.env);
      logger('info', 'Profile scraping completed', { 
        username: profileData.username,
        followersCount: profileData.followersCount,
        dataQuality: profileData.dataQuality
      });
    } catch (scrapeError: any) {
      logger('error', 'Profile scraping failed', { error: scrapeError.message });
      return c.json(createStandardResponse(
        false, 
        undefined, 
        `Profile scraping failed: ${scrapeError.message}`, 
        requestId
      ), 500);
    }

    // AI ANALYSIS
    let analysisResult: AnalysisResult;
    try {
      logger('info', 'Starting AI analysis', { analysis_type, username: profileData.username });
      const { performAIAnalysis } = await import('../services/ai-analysis.js');
      analysisResult = await performAIAnalysis(profileData, analysis_type, user_id, c.env);
      logger('info', 'AI analysis completed', { 
        score: analysisResult.score,
        confidence: analysisResult.confidence_level
      });
    } catch (analysisError: any) {
      logger('error', 'AI analysis failed', { error: analysisError.message });
      return c.json(createStandardResponse(
        false, 
        undefined, 
        `AI analysis failed: ${analysisError.message}`, 
        requestId
      ), 500);
    }

    // PREPARE DATA FOR NEW SCHEMA
    const leadData = {
      user_id,
      business_id,
      username: profileData.username,
      full_name: profileData.displayName,
      profile_pic_url: profileData.profilePicUrl,
      bio: profileData.bio,
      external_url: profileData.externalUrl,
      followers_count: profileData.followersCount,
      following_count: profileData.followingCount,
      posts_count: profileData.postsCount,
      is_verified: profileData.isVerified,
      is_private: profileData.isPrivate,
      is_business_account: profileData.isBusinessAccount || false,
      profile_url
    };

    // Prepare analysis data based on type
    let analysisData = null;
    if (analysis_type === 'deep' || analysis_type === 'xray') {
      analysisData = {
        ...analysisResult,
        // Engagement data from scraping
        avg_likes: profileData.engagement?.avgLikes || 0,
        avg_comments: profileData.engagement?.avgComments || 0,
        engagement_rate: profileData.engagement?.engagementRate || 0,
        
        // Structured data
        latest_posts: profileData.latestPosts ? JSON.stringify(profileData.latestPosts) : null,
        engagement_data: profileData.engagement ? JSON.stringify({
          avg_likes: profileData.engagement.avgLikes,
          avg_comments: profileData.engagement.avgComments,
          engagement_rate: profileData.engagement.engagementRate,
          posts_analyzed: profileData.engagement.postsAnalyzed,
          data_source: 'real_scraped_calculation'
        }) : null,
        
        // Analysis metadata
        analysis_timestamp: new Date().toISOString(),
        ai_model_used: 'gpt-4o',
        scraperUsed: profileData.scraperUsed,
        dataQuality: profileData.dataQuality
      };
    }

    // SAVE TO DATABASE (NEW 3-TABLE STRUCTURE)
    let run_id: string;
    try {
      logger('info', 'Saving complete analysis to new schema');
      run_id = await saveCompleteAnalysis(leadData, analysisData, analysis_type, c.env);
      logger('info', 'Database save successful', { run_id });
    } catch (saveError: any) {
      logger('error', 'Database save failed', { error: saveError.message });
      return c.json(createStandardResponse(
        false, 
        undefined, 
        `Database save failed: ${saveError.message}`, 
        requestId
      ), 500);
    }

    // UPDATE CREDITS
    try {
      await updateCreditsAndTransaction(
        user_id,
        creditCost,
        userResult.credits - creditCost,
        `${analysis_type} analysis for @${profileData.username}`,
        'use',
        c.env,
        run_id // Use run_id instead of lead_id
      );
      logger('info', 'Credits updated successfully', { 
        creditCost, 
        remainingCredits: userResult.credits - creditCost 
      });
    } catch (creditError: any) {
      logger('error', 'Credit update failed', { error: creditError.message });
      return c.json(createStandardResponse(
        false, 
        undefined, 
        `Failed to log credit transaction: ${creditError.message}`, 
        requestId
      ), 500);
    }

    // PREPARE RESPONSE (Updated for new schema)
    const responseData = {
      run_id, // Return run_id instead of lead_id
      profile: {
        username: profileData.username,
        displayName: profileData.displayName,
        followersCount: profileData.followersCount,
        isVerified: profileData.isVerified,
        profilePicUrl: profileData.profilePicUrl,
        dataQuality: profileData.dataQuality,
        scraperUsed: profileData.scraperUsed
      },
      analysis: {
        overall_score: analysisResult.score, // Updated field name
        niche_fit_score: analysisResult.niche_fit, // Updated field name
        engagement_score: analysisResult.engagement_score,
        type: analysis_type,
        confidence_level: analysisResult.confidence_level,
        summary_text: analysisResult.quick_summary, // Updated field name
        
        // Include detailed data for deep/xray analyses
        ...(analysis_type === 'deep' && {
          audience_quality: analysisResult.audience_quality,
          selling_points: analysisResult.selling_points,
          reasons: analysisResult.reasons,
          deep_summary: analysisResult.deep_summary,
          outreach_message: analysisData?.outreach_message || null,
          engagement_breakdown: profileData.engagement ? {
            avg_likes: profileData.engagement.avgLikes,
            avg_comments: profileData.engagement.avgComments,
            engagement_rate: profileData.engagement.engagementRate,
            posts_analyzed: profileData.engagement.postsAnalyzed,
            data_source: 'real_scraped_calculation'
          } : {
            data_source: 'no_real_data_available',
            avg_likes: 0,
            avg_comments: 0,
            engagement_rate: 0
          }
        }),
        
        ...(analysis_type === 'xray' && {
          copywriter_profile: analysisData?.copywriter_profile || {},
          commercial_intelligence: analysisData?.commercial_intelligence || {},
          persuasion_strategy: analysisData?.persuasion_strategy || {}
        })
      },
      credits: {
        used: creditCost,
        remaining: userResult.credits - creditCost
      },
      metadata: {
        request_id: requestId,
        analysis_completed_at: new Date().toISOString(),
        schema_version: '3.0' // Indicate new schema version
      }
    };

    logger('info', 'Analysis completed successfully', { 
      run_id, 
      username: profileData.username, 
      overall_score: analysisResult.score,
      confidence: analysisResult.confidence_level,
      dataQuality: profileData.dataQuality
    });

    return c.json(createStandardResponse(true, responseData, undefined, requestId));

  } catch (error: any) {
    logger('error', 'Analysis request failed', { error: error.message, requestId });
    return c.json(createStandardResponse(
      false, 
      undefined, 
      error.message, 
      requestId
    ), 500);
  }
}
