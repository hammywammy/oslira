import { Context } from 'hono';
import type { Env, AnalysisRequest, ProfileData, AnalysisResult, AnalysisResponse } from '../types/interfaces.js';
import { generateRequestId, logger } from '../utils/logger.js';
import { createStandardResponse } from '../utils/response.js';
import { normalizeRequest } from '../utils/validation.js';
import { PipelineExecutor, type PipelineContext } from '../services/pipeline-executor.js';
import { saveCompleteAnalysis, updateCreditsAndTransaction, fetchUserAndCredits, fetchBusinessProfile, getLeadIdFromRun } from '../services/database.js';
import { FeatureFlagManager } from '../utils/feature-flags.js';
import { PerformanceMonitor } from '../utils/performance-monitor.js';

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
workflow = analysis_type === 'light' ? 'light_speed' : 
           analysis_type === 'deep' ? 'deep_fast' : 
           analysis_type === 'xray' ? 'xray_complete' : 'auto',
      model_tier = analysis_type === 'light' ? 'economy' : 'balanced',
      force_model
    } = normalizeRequest(body);

// Initialize feature flags for A/B testing
    const featureFlags = new FeatureFlagManager(c.env);
    const useOptimizedSystem = featureFlags.shouldUseOptimizedSystem(requestId);
    
    featureFlags.logFlagStatus(requestId);
    
    logger('info', 'Request validated with A/B testing', { 
      requestId, 
      username, 
      analysis_type, 
      business_id,
      workflow,
      model_tier,
      useOptimizedSystem,
      rolloutPercentage: featureFlags.getPercentage()
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

    // OPTIMIZATION: Pre-screen for light analysis
    if (analysis_type === 'light') {
      const { preScreenProfile } = await import('../services/prompts.js');
      const preScreen = preScreenProfile(profileData, business);
      
      if (!preScreen.shouldProcess) {
        // Return early result without AI call
        const earlyResult = {
          run_id: 'pre-screen-' + requestId,
          profile: {
            username: profileData.username,
            displayName: profileData.displayName,
            followersCount: profileData.followersCount,
            isVerified: profileData.isVerified,
            profilePicUrl: profileData.profilePicUrl,
            dataQuality: 'low',
            scraperUsed: profileData.scraperUsed || 'unknown'
          },
          analysis: {
            overall_score: preScreen.earlyScore || 0,
            niche_fit_score: 0,
            engagement_score: 0,
            type: analysis_type,
            confidence_level: 0.9,
            summary_text: preScreen.reason || 'Pre-screened as low quality',
            audience_quality: 'Low'
          },
          credits: { used: 0, remaining: userResult.credits },
          metadata: {
            request_id: requestId,
            analysis_completed_at: new Date().toISOString(),
            schema_version: '3.1',
            system_used: 'pre_screen'
          }
        };
        
        logger('info', 'Profile pre-screened - early exit', { 
          username: profileData.username,
          reason: preScreen.reason,
          score: preScreen.earlyScore
        });
        
        return c.json(createStandardResponse(true, earlyResult, undefined, requestId));
      }
    }
    
// ANALYSIS: A/B test between optimized and legacy systems
    let orchestrationResult;
    const systemUsed = useOptimizedSystem ? 'optimized_direct' : 'legacy_pipeline';
    
    try {
      logger('info', `Using ${systemUsed} system`, { 
        analysis_type, 
        useOptimizedSystem,
        requestId 
      });

      if (useOptimizedSystem) {
        // Use new optimized direct execution
        orchestrationResult = await executeOptimizedAnalysis(profileData, business, analysis_type, c.env, requestId);
      } else {
        // Use legacy pipeline system
        orchestrationResult = await executeLegacyPipelineAnalysis(profileData, business, analysis_type, workflow, model_tier, c.env, requestId);
      }

      // Import direct analysis executor
      const { DirectAnalysisExecutor } = await import('../services/direct-analysis.js');
      const directExecutor = new DirectAnalysisExecutor(c.env, requestId);

      let directResult: any;
      
      // Execute direct analysis based on type
      switch (analysis_type) {
        case 'light':
          directResult = await directExecutor.executeLight(profileData, business);
          break;
        case 'deep':
          directResult = await directExecutor.executeDeep(profileData, business);
          break;
        case 'xray':
          directResult = await directExecutor.executeXRay(profileData, business);
          break;
        default:
          throw new Error(`Unknown analysis type: ${analysis_type}`);
      }

      // Transform direct result to match interface
      orchestrationResult = {
        result: directResult.analysisData,
        totalCost: {
          actual_cost: directResult.costDetails.actual_cost,
          tokens_in: directResult.costDetails.tokens_in,
          tokens_out: directResult.costDetails.tokens_out,
          blocks_used: [directResult.costDetails.block_type],
          total_blocks: 1
        },
        performance: {
          [directResult.costDetails.block_type]: directResult.costDetails.processing_duration_ms,
          total_ms: directResult.costDetails.processing_duration_ms
        },
        verdict: 'success',
        workflow_used: 'direct_execution'
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

      // Record performance metrics for A/B testing
    try {
      const performanceMonitor = new PerformanceMonitor(c.env);
      
      const creditCost = analysis_type === 'deep' ? 2 : analysis_type === 'xray' ? 3 : 1;
      const revenue = creditCost * 0.30; // $0.30 per credit
      const marginPercentage = Math.round(((revenue - orchestrationResult.totalCost.actual_cost) / revenue) * 100);

      const metrics = {
        requestId,
        analysisType: analysis_type,
        systemUsed: useOptimizedSystem ? 'optimized_direct' as const : 'legacy_pipeline' as const,
        username: profileData.username,
        
        // Timing metrics
        totalDurationMs: orchestrationResult.performance.total_ms,
        scrapingDurationMs: 0, // Would need to track separately
        analysisDurationMs: orchestrationResult.performance.total_ms,
        
        // Cost metrics
        actualCost: orchestrationResult.totalCost.actual_cost,
        creditsUsed: creditCost,
        marginPercentage,
        
        // Quality metrics
        overallScore: analysisResult.score,
        confidenceLevel: analysisResult.confidence_level || 0.7,
        dataQuality: profileData.dataQuality || 'medium',
        
        // System metrics
        blocksUsed: orchestrationResult.totalCost.blocks_used,
        modelUsed: orchestrationResult.totalCost.blocks_used[0] || 'unknown',
        tokensIn: orchestrationResult.totalCost.tokens_in,
        tokensOut: orchestrationResult.totalCost.tokens_out
      };

      performanceMonitor.recordMetrics(metrics);
    } catch (monitoringError: any) {
      logger('warn', 'Performance monitoring failed', { 
        error: monitoringError.message, 
        requestId 
      });
    }

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

async function executeOptimizedAnalysis(
  profileData: any,
  business: any,
  analysisType: string,
  env: any,
  requestId: string
): Promise<any> {
  // Import direct analysis executor
  const { DirectAnalysisExecutor } = await import('../services/direct-analysis.js');
  const directExecutor = new DirectAnalysisExecutor(env, requestId);

  let directResult: any;
  
  // Execute direct analysis based on type
  switch (analysisType) {
    case 'light':
      directResult = await directExecutor.executeLight(profileData, business);
      break;
    case 'deep':
      directResult = await directExecutor.executeDeep(profileData, business);
      break;
    case 'xray':
      directResult = await directExecutor.executeXRay(profileData, business);
      break;
    default:
      throw new Error(`Unknown analysis type: ${analysisType}`);
  }

  // Transform direct result to match interface
  return {
    result: directResult.analysisData,
    totalCost: {
      actual_cost: directResult.costDetails.actual_cost,
      tokens_in: directResult.costDetails.tokens_in,
      tokens_out: directResult.costDetails.tokens_out,
      blocks_used: [directResult.costDetails.block_type],
      total_blocks: 1
    },
    performance: {
      [directResult.costDetails.block_type]: directResult.costDetails.processing_duration_ms,
      total_ms: directResult.costDetails.processing_duration_ms
    },
    verdict: 'success',
    workflow_used: 'direct_execution'
  };
}

async function executeLegacyPipelineAnalysis(
  profileData: any,
  business: any,
  analysisType: string,
  workflow: string,
  modelTier: string,
  env: any,
  requestId: string
): Promise<any> {
  // Get business context if available
  const { fetchBusinessProfile } = await import('../services/database.js');
  const enrichedBusiness = business.business_one_liner || business.business_context_pack ? 
    business : 
    await fetchBusinessProfile(business.business_id, business.user_id, env);

  // Create pipeline context
  const { PipelineExecutor } = await import('../services/pipeline-executor.js');
  const pipelineContext = {
    profile: profileData,
    business: enrichedBusiness,
    analysis_type: analysisType,
    workflow,
    model_tier: modelTier as 'premium' | 'balanced' | 'economy'
  };

  // Execute pipeline
  const executor = new PipelineExecutor(env, requestId);
  const pipelineResult = await executor.execute(pipelineContext);

  // Transform pipeline result to match interface
  const transformPipelineResult = (await import('./analyze.js')).transformPipelineResult;
  
  return {
    result: transformPipelineResult(pipelineResult, analysisType),
    totalCost: {
      actual_cost: pipelineResult.costs.reduce((sum: number, c: any) => sum + c.cost, 0),
      tokens_in: pipelineResult.costs.reduce((sum: number, c: any) => sum + c.tokens_in, 0),
      tokens_out: pipelineResult.costs.reduce((sum: number, c: any) => sum + c.tokens_out, 0),
      blocks_used: pipelineResult.costs.map((c: any) => c.stage),
      total_blocks: pipelineResult.costs.length
    },
    performance: {
      ...pipelineResult.performance,
      total_ms: Object.values(pipelineResult.performance).reduce((sum: number, time: number) => sum + time, 0)
    },
    verdict: 'success',
    workflow_used: pipelineResult.workflow_used
  };
}
