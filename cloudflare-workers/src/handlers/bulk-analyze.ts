import { Context } from 'hono';
import type { Env, BulkAnalysisRequest, BulkAnalysisResult, AnalysisResponse, ProfileData, AnalysisResult } from '../types/interfaces.js';
import { generateRequestId, logger } from '../utils/logger.js';
import { createStandardResponse } from '../utils/response.js';
import { extractUsername } from '../utils/validation.js';
import { saveCompleteAnalysis, updateCreditsAndTransaction, fetchUserAndCredits, fetchBusinessProfile } from '../services/database.ts';

export async function handleBulkAnalyze(c: Context<{ Bindings: Env }>): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    logger('info', 'Bulk analysis request received', { requestId });

    // Parse and validate request
    const body = await c.req.json() as BulkAnalysisRequest;
    const { profiles, analysis_type, business_id, user_id } = body;

    // Validate required fields
    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      return c.json(createStandardResponse(
        false, 
        undefined, 
        'profiles array is required and cannot be empty', 
        requestId
      ), 400);
    }

    if (!analysis_type || !['light', 'deep', 'xray'].includes(analysis_type)) {
      return c.json(createStandardResponse(
        false, 
        undefined, 
        'analysis_type must be "light", "deep", or "xray"', 
        requestId
      ), 400);
    }

    if (!business_id || !user_id) {
      return c.json(createStandardResponse(
        false, 
        undefined, 
        'business_id and user_id are required', 
        requestId
      ), 400);
    }

    const profileCount = profiles.length;
    if (profileCount > 50) {
      return c.json(createStandardResponse(
        false, 
        undefined, 
        'Maximum 50 profiles per bulk request', 
        requestId
      ), 400);
    }

    logger('info', 'Bulk request validated', { 
      requestId, 
      profileCount, 
      analysis_type, 
      business_id 
    });

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

    // Calculate total credit cost
    const creditCostPerAnalysis = analysis_type === 'deep' ? 2 : analysis_type === 'xray' ? 3 : 1;
    const totalCreditCost = profileCount * creditCostPerAnalysis;
    
    if (userResult.credits < totalCreditCost) {
      return c.json(createStandardResponse(
        false, 
        undefined, 
        `Insufficient credits. Need ${totalCreditCost}, have ${userResult.credits}`, 
        requestId
      ), 402);
    }

    logger('info', 'User validation passed for bulk analysis', { 
      userId: user_id, 
      credits: userResult.credits, 
      totalCreditCost,
      profileCount
    });

    // Process profiles in parallel with concurrency limit
    const results: AnalysisResponse[] = [];
    const errors: Array<{ profile: string; error: string }> = [];
    let creditsUsed = 0;

    // Import required services
    const { scrapeInstagramProfile } = await import('../services/instagram-scraper.js');
    const { performAIAnalysis } = await import('../services/ai-analysis.js');

    // Process profiles with controlled concurrency (5 at a time)
    const BATCH_SIZE = 5;
    for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
      const batch = profiles.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (profile) => {
        const profileId = `${i + batch.indexOf(profile) + 1}`;
        
        try {
          logger('info', `Processing profile ${profileId}/${profileCount}`, { profile });

          // Extract username and build URL
          const username = extractUsername(profile);
          if (!username) {
            throw new Error('Invalid username or URL format');
          }

          const profile_url = profile.includes('instagram.com') ? profile : `https://instagram.com/${username}`;

          // SCRAPE PROFILE DATA
          let profileData: ProfileData;
          try {
            profileData = await scrapeInstagramProfile(profile_url, c.env);
            logger('info', `Profile scraped successfully`, { 
              username: profileData.username,
              followersCount: profileData.followersCount
            });
          } catch (scrapeError: any) {
            throw new Error(`Scraping failed: ${scrapeError.message}`);
          }

          // AI ANALYSIS
          let analysisResult: AnalysisResult;
          try {
            analysisResult = await performAIAnalysis(profileData, analysis_type, user_id, c.env);
            logger('info', `AI analysis completed`, { 
              username: profileData.username,
              score: analysisResult.score
            });
          } catch (analysisError: any) {
            throw new Error(`AI analysis failed: ${analysisError.message}`);
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
            run_id = await saveCompleteAnalysis(leadData, analysisData, analysis_type, c.env);
            logger('info', `Database save successful for ${profileData.username}`, { run_id });
          } catch (saveError: any) {
            throw new Error(`Database save failed: ${saveError.message}`);
          }

          // Increment credits used
          creditsUsed += creditCostPerAnalysis;

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
              used: creditCostPerAnalysis,
              remaining: userResult.credits - creditsUsed
            },
            metadata: {
              request_id: requestId,
              analysis_completed_at: new Date().toISOString(),
              schema_version: '3.0'
            }
          };

          return responseData;

        } catch (error: any) {
          logger('error', `Profile ${profileId} analysis failed`, { 
            profile, 
            error: error.message 
          });
          
          errors.push({
            profile,
            error: error.message
          });
          
          return null;
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Add successful results
      batchResults.forEach(result => {
        if (result) {
          results.push(result);
        }
      });

      // Log batch progress
      logger('info', `Batch ${Math.floor(i / BATCH_SIZE) + 1} completed`, {
        processed: Math.min(i + BATCH_SIZE, profiles.length),
        total: profiles.length,
        successful: results.length,
        errors: errors.length
      });
    }

    // UPDATE CREDITS FOR ALL SUCCESSFUL ANALYSES
    if (creditsUsed > 0) {
      try {
        const newBalance = userResult.credits - creditsUsed;
        await updateCreditsAndTransaction(
          user_id,
          creditsUsed,
          newBalance,
          `Bulk ${analysis_type} analysis - ${results.length} profiles`,
          'use',
          c.env
        );
        logger('info', 'Bulk credits updated successfully', { 
          creditsUsed, 
          remainingCredits: newBalance 
        });
      } catch (creditError: any) {
        logger('error', 'Bulk credit update failed', { error: creditError.message });
        // Don't fail the entire request for credit logging issues
      }
    }

    // PREPARE FINAL RESPONSE
    const bulkResult: BulkAnalysisResult = {
      total_requested: profileCount,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
      credits_used: creditsUsed,
      credits_remaining: userResult.credits - creditsUsed
    };

    logger('info', 'Bulk analysis completed', { 
      requestId,
      totalRequested: profileCount,
      successful: results.length,
      failed: errors.length,
      creditsUsed
    });

    return c.json(createStandardResponse(true, bulkResult, undefined, requestId));

  } catch (error: any) {
    logger('error', 'Bulk analysis request failed', { error: error.message, requestId });
    return c.json(createStandardResponse(
      false, 
      undefined, 
      error.message, 
      requestId
    ), 500);
  }
}
