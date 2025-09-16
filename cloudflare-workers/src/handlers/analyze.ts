import { Context } from 'hono';
import type { Env, AnalysisRequest, ProfileData, AnalysisResult, AnalysisResponse } from '../types/interfaces.js';
import { generateRequestId, logger } from '../utils/logger.js';
import { createStandardResponse } from '../utils/response.js';
import { normalizeRequest } from '../utils/validation.js';
import { PipelineExecutor, type PipelineContext } from '../services/pipeline-executor.js';
import { saveCompleteAnalysis, updateCreditsAndTransaction, fetchUserAndCredits, fetchBusinessProfile, getLeadIdFromRun } from '../services/database.js';

export async function handleAnalyze(c: Context<{ Bindings: Env }>): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    logger('info', 'Analysis request received', { requestId });

    // Parse and validate request with pipeline support
    const body = await c.req.json() as AnalysisRequest & {
      workflow?: string;           // 'micro_only', 'auto', 'full'
      model_tier?: string;        // 'premium', 'balanced', 'economy'
      force_model?: string;       // Override specific model
    };
    
    const { 
      profile_url, 
      username, 
      analysis_type, 
      business_id, 
      user_id,
      workflow = analysis_type === 'light' ? 'light_fast' : 
                 analysis_type === 'deep' ? 'deep_fast' : 'auto',
      model_tier = analysis_type === 'light' ? 'economy' : 'balanced',
      force_model
    } = normalizeRequest(body);

    logger('info', 'Request validated', { 
      requestId, 
      username, 
      analysis_type, 
      business_id,
      workflow,
      model_tier
    });

// Start all non-dependent operations in parallel
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
        `Insufficient credits. Required: ${creditCost}, Available: ${userResult.credits}`, 
        requestId
      ), 400);
    }

    // Scrape profile with error handling
    let profileData: ProfileData;
    try {
      const { scrapeInstagramProfile } = await import('../services/instagram-scraper.js');
      profileData = await scrapeInstagramProfile(username, analysis_type, c.env);
      
      if (!profileData.username) {
        throw new Error('Profile scraping failed - no username returned');
      }
      
      logger('info', 'Profile scraping completed', { 
        username: profileData.username,
        followers: profileData.followersCount,
        dataQuality: profileData.dataQuality,
        requestId
      });
      
    } catch (scrapeError: any) {
      logger('error', 'Profile scraping failed', { error: scrapeError.message, requestId });
      return c.json(createStandardResponse(
        false, 
        undefined, 
        `Profile scraping failed: ${scrapeError.message}`, 
        requestId
      ), 400);
    }
    // ANALYSIS: Execute pipeline system
    let orchestrationResult;
    try {
      logger('info', 'Using pipeline system', { workflow, model_tier, requestId });

      // Get business context if available
      const enrichedBusiness = business.business_one_liner || business.business_context_pack ? 
        business : 
        await fetchBusinessProfile(business_id, user_id, c.env);

      // Create pipeline context
      const pipelineContext: PipelineContext = {
        profile: profileData,
        business: enrichedBusiness,
        analysis_type: analysis_type,
        workflow,
        model_tier: model_tier as 'premium' | 'balanced' | 'economy'
      };

      // Execute pipeline
      const executor = new PipelineExecutor(c.env, requestId);
      const pipelineResult = await executor.execute(pipelineContext);

      // Transform pipeline result to match interface
      orchestrationResult = {
        result: transformPipelineResult(pipelineResult, analysis_type),
        totalCost: {
          actual_cost: pipelineResult.costs.reduce((sum, c) => sum + c.cost, 0),
          tokens_in: pipelineResult.costs.reduce((sum, c) => sum + c.tokens_in, 0),
          tokens_out: pipelineResult.costs.reduce((sum, c) => sum + c.tokens_out, 0),
          blocks_used: pipelineResult.costs.map(c => c.stage),
          total_blocks: pipelineResult.costs.length
        },
        performance: {
          ...pipelineResult.performance,
          total_ms: Object.values(pipelineResult.performance).reduce((sum: number, time: number) => sum + time, 0)
        },
        verdict: 'success',
        workflow_used: pipelineResult.workflow_used
      };

      logger('info', 'Pipeline analysis completed', {
        username: profileData.username,
        workflow_used: pipelineResult.workflow_used,
        stages_executed: Object.keys(pipelineResult.results).length,
        total_cost: orchestrationResult.totalCost.actual_cost,
        requestId
      });

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
      logger('error', 'Analysis orchestration failed', { 
        error: orchestrationError.message,
        system: 'pipeline',
        requestId
      });
      return c.json(createStandardResponse(
        false, 
        undefined, 
        `Analysis orchestration failed: ${orchestrationError.message}`, 
        requestId
      ), 500);
    }

    const analysisResult = orchestrationResult.result;

    // PREPARE DATA FOR DATABASE (3-TABLE STRUCTURE)
    const leadData = {
      user_id,
      business_id,
      username: profileData.username,
      full_name: profileData.displayName,
      profile_pic_url: profileData.profilePicUrl,
      bio: profileData.bio,
      external_url: profileData.externalUrl,
      followersCount: profileData.followersCount,
      followsCount: profileData.followingCount,  // Use followsCount to match scraper
      postsCount: profileData.postsCount,
      is_verified: profileData.isVerified,
      is_private: profileData.isPrivate,
      is_business_account: profileData.isBusinessAccount || false,
      profile_url
    };

    // SAVE TO DATABASE AND UPDATE CREDITS
    let run_id: string;
    let lead_id: string;
    try {
      // Step 1: Save analysis to database
      run_id = await saveCompleteAnalysis(leadData, analysisResult, analysis_type, c.env);
      
      // Step 2: Get lead_id for credit transaction
      lead_id = await getLeadIdFromRun(run_id, c.env);
      
      logger('info', 'Database save successful', { 
        run_id, 
        lead_id,
        username: profileData.username 
      });

      // Step 3: Update user credits with lead_id
      const primaryModel = orchestrationResult.totalCost.blocks_used.length > 0 
        ? orchestrationResult.totalCost.blocks_used[orchestrationResult.totalCost.blocks_used.length - 1]
        : 'unknown';

      const costDetails = {
        actual_cost: orchestrationResult.totalCost.actual_cost,
        tokens_in: orchestrationResult.totalCost.tokens_in,
        tokens_out: orchestrationResult.totalCost.tokens_out,
        model_used: primaryModel.substring(0, 20), // Truncate to DB limit
        block_type: 'pipeline',
        processing_duration_ms: orchestrationResult.performance.total_ms,
        blocks_used: orchestrationResult.totalCost.blocks_used,
        system_used: 'pipeline'
      };

      await updateCreditsAndTransaction(
        user_id, 
        creditCost, 
        analysis_type, 
        run_id,
        costDetails,
        c.env,
        lead_id
      );

      logger('info', 'Credits updated successfully', { 
        user_id, 
        creditCost, 
        run_id, 
        lead_id 
      });

    } catch (saveError: any) {
      logger('error', 'Database save or credit update failed', { 
        error: saveError.message,
        username: profileData.username,
        requestId
      });
      return c.json(createStandardResponse(
        false, 
        undefined, 
        `Database operation failed: ${saveError.message}`,
        requestId
      ), 500);
    }

    // BUILD RESPONSE
    const responseData: AnalysisResponse = {
      run_id: run_id,
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
        
        // Additional analysis fields based on type
        audience_quality: analysisResult.audience_quality,
        selling_points: analysisResult.selling_points || [],
        reasons: analysisResult.reasons || [],
        
        // Deep analysis fields
        ...(analysis_type === 'deep' && {
          deep_summary: analysisResult.deep_summary,
          outreach_message: analysisResult.outreach_message,
          engagement_breakdown: profileData.engagement ? {
            avg_likes: profileData.engagement.avgLikes,
            avg_comments: profileData.engagement.avgComments,
            engagement_rate: profileData.engagement.engagementRate,
            posts_analyzed: profileData.engagement.postsAnalyzed,
            data_source: 'real_scraped_calculation'
          } : null
        }),
        
        // X-Ray analysis fields
        ...(analysis_type === 'xray' && {
          copywriter_profile: analysisResult.copywriter_profile || {},
          commercial_intelligence: analysisResult.commercial_intelligence || {},
          persuasion_strategy: analysisResult.persuasion_strategy || {}
        })
      },
      credits: {
        used: creditCost,
        remaining: userResult.credits - creditCost,
        actual_cost: orchestrationResult.totalCost.actual_cost,
        margin: creditCost - orchestrationResult.totalCost.actual_cost
      },
      metadata: {
        request_id: requestId,
        analysis_completed_at: new Date().toISOString(),
        schema_version: '3.1',
        system_used: 'pipeline',
        workflow_used: orchestrationResult.workflow_used,
        orchestration: {
          blocks_used: orchestrationResult.totalCost.blocks_used,
          performance_ms: orchestrationResult.performance,
          total_cost: orchestrationResult.totalCost.actual_cost,
          pipeline_stages: Object.keys(orchestrationResult.performance),
          model_tier: model_tier,
          workflow: workflow
        }
      }
    };

    logger('info', 'Analysis completed successfully', { 
      run_id, 
      lead_id,
      username: profileData.username, 
      overall_score: analysisResult.score,
      confidence: analysisResult.confidence_level,
      dataQuality: profileData.dataQuality,
      systemUsed: 'pipeline',
      workflowUsed: orchestrationResult.workflow_used
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

// Helper function to transform pipeline results to standard interface
function transformPipelineResult(pipelineResult: any, analysisType: string): any {
  // Extract the final analysis result based on analysis type
  const mainAnalysisKey = 'main_analysis';
  const mainResult = pipelineResult.results[mainAnalysisKey] || 
                     pipelineResult.results.analysis ||
                     pipelineResult.results[`${analysisType}_analysis`];
  
  if (!mainResult) {
    throw new Error('No analysis result found in pipeline output');
  }
  
  // Ensure required fields for database save
  const transformedResult = {
    ...mainResult,
    // Ensure summary_text is present
    quick_summary: mainResult.quick_summary || 
                   mainResult.summary_text || 
                   `${analysisType} analysis completed - Score: ${mainResult.score || 0}/100`,
    
    // Ensure confidence_level is present
    confidence_level: mainResult.confidence_level || 
                     mainResult.confidence || 
                     (analysisType === 'light' ? 0.6 : analysisType === 'deep' ? 0.75 : 0.85),
    
    // Add pipeline-specific metadata for debugging/monitoring
    pipeline_metadata: {
      triage: pipelineResult.results.triage,
      preprocessor: pipelineResult.results.preprocessor,
      context: pipelineResult.results.context_generation,
      workflow_used: pipelineResult.workflow_used,
      stages_executed: Object.keys(pipelineResult.results)
    }
  };
  
  logger('info', 'Pipeline result transformation', {
    analysis_type: analysisType,
    has_quick_summary: !!transformedResult.quick_summary,
    has_confidence_level: !!transformedResult.confidence_level,
    quick_summary: transformedResult.quick_summary,
    confidence_level: transformedResult.confidence_level
  });
  
  return transformedResult;
}
