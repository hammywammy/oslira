import { Context } from 'hono';
import type { Env, AnalysisRequest, ProfileData, AnalysisResult, AnalysisResponse } from '../types/interfaces.js';
import { generateRequestId, logger } from '../utils/logger.js';
import { createStandardResponse } from '../utils/response.js';
import { normalizeRequest } from '../utils/validation.js';
import { ensureBusinessContext } from '../services/business-context-generator.js';
import { runAnalysis } from '../services/analysis-orchestrator.js';
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

// Validate user and fetch business profile
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

// Business context will be ensured in orchestrator

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

    // RUN ORCHESTRATED ANALYSIS
    let orchestrationResult: any;
    try {
      orchestrationResult = await runAnalysis(
        profileData,
        business,
        analysis_type,
        c.env,
        requestId
      );

      // Handle early exit
      if (orchestrationResult.verdict === 'early_exit') {
        return c.json(createStandardResponse(true, {
          ...orchestrationResult.result,
          performance: orchestrationResult.performance,
          credits_used: 0, // No credits charged for early exit
        }, undefined, requestId));
      }

      // Handle analysis error
      if (orchestrationResult.verdict === 'error') {
        return c.json(createStandardResponse(
          false, 
          undefined, 
          `Analysis failed: ${orchestrationResult.result.error}`, 
          requestId
        ), 500);
      }

    } catch (orchestrationError: any) {
      logger('error', 'Analysis orchestration failed', { error: orchestrationError.message });
      return c.json(createStandardResponse(
        false, 
        undefined, 
        `Analysis orchestration failed: ${orchestrationError.message}`, 
        requestId
      ), 500);
    }

    const analysisResult = orchestrationResult.result;

    // PREPARE DATA FOR DATABASE (NEW 3-TABLE STRUCTURE)
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

    // Prepare analysis data based on type (only for deep/xray)
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
      run_id = await saveCompleteAnalysis(leadData, analysisResult, analysis_type, c.env);
      logger('info', 'Database save successful', { run_id, username: profileData.username });
    } catch (saveError: any) {
      logger('error', 'Database save failed', { error: saveError.message });
      return c.json(createStandardResponse(
        false, 
        undefined, 
        `Database save failed: ${saveError.message}`,
        requestId
      ), 500);
    }

// UPDATE USER CREDITS
    try {
      const costDetails = {
        actual_cost: orchestrationResult.totalCost.actual_cost,
        tokens_in: orchestrationResult.totalCost.tokens_in,
        tokens_out: orchestrationResult.totalCost.tokens_out,
        model_used: orchestrationResult.totalCost.blocks_used.join('+'),
        block_type: orchestrationResult.totalCost.blocks_used.join('+')
      };
      
      const newBalance = userResult.credits - creditCost;
      await updateCreditsAndTransaction(
        user_id, 
        creditCost, 
        newBalance,
        `${analysis_type} analysis (${orchestrationResult.totalCost.blocks_used.join('+')})`,
        'use',
        c.env,
        run_id,
        costDetails
      );
      logger('info', 'Credits updated successfully', { 
        userId: user_id, 
        creditsUsed: creditCost,
        actualCost: costDetails.actual_cost,
        remaining: newBalance
      });
    } catch (creditError: any) {
      logger('error', 'Credit update failed', { error: creditError.message });
      // Analysis completed but credit update failed - still return success
    }

    // PREPARE RESPONSE DATA
    const responseData: AnalysisResponse = {
      run_id,
      profile: {
        username: profileData.username,
        displayName: profileData.displayName,
        followersCount: profileData.followersCount,
        isVerified: profileData.isVerified,
        profilePicUrl: profileData.profilePicUrl,
        dataQuality: profileData.dataQuality || 'medium',
        scraperUsed: profileData.scraperUsed || 'unknown'
      },
      analysis: {
        overall_score: analysisResult.score,
        niche_fit_score: analysisResult.niche_fit,
        engagement_score: analysisResult.engagement_score,
        type: analysis_type,
        confidence_level: analysisResult.confidence_level,
        summary_text: analysisResult.quick_summary,
        
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
        schema_version: '3.0',
        orchestration: {
          blocks_used: orchestrationResult.totalCost.blocks_used,
          performance_ms: orchestrationResult.performance,
          total_cost: orchestrationResult.totalCost.actual_cost
        }
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
