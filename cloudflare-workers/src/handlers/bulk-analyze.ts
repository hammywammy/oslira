import { Context } from 'hono';
import type { Env, BulkAnalysisRequest, BulkAnalysisResult, AnalysisResponse } from '../types/interfaces.js';
import { generateRequestId, logger } from '../utils/logger.js';
import { createStandardResponse } from '../utils/response.js';
import { updateCreditsAndTransaction, fetchUserAndCredits, fetchBusinessProfile } from '../services/database.ts';
import { processProfileComplete, calculateBulkCosts } from '../services/profile-processor.js';

export async function handleBulkAnalyze(c: Context<{ Bindings: Env }>): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    logger('info', 'Bulk analysis request received', { requestId });

    // Parse and validate request
    const body = await c.req.json() as BulkAnalysisRequest;
    const { profiles, analysis_type, business_id, user_id } = body;

    // Basic validation
    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      return c.json(createStandardResponse(false, undefined, 'profiles array is required and cannot be empty', requestId), 400);
    }

    if (!analysis_type || !['light', 'deep', 'xray'].includes(analysis_type)) {
      return c.json(createStandardResponse(false, undefined, 'analysis_type must be "light", "deep", or "xray"', requestId), 400);
    }

    if (!business_id || !user_id) {
      return c.json(createStandardResponse(false, undefined, 'business_id and user_id are required', requestId), 400);
    }

    const profileCount = profiles.length;
    if (profileCount > 50) {
      return c.json(createStandardResponse(false, undefined, 'Maximum 50 profiles per bulk request', requestId), 400);
    }

    // Validate user and fetch business profile
    const [userResult, business] = await Promise.all([
      fetchUserAndCredits(user_id, c.env),
      fetchBusinessProfile(business_id, user_id, c.env)
    ]);
    
    if (!userResult.isValid) {
      return c.json(createStandardResponse(false, undefined, userResult.error, requestId), 400);
    }

    // Calculate total credit cost
    const creditCostPerAnalysis = analysis_type === 'deep' ? 2 : analysis_type === 'xray' ? 3 : 1;
    const totalCreditCost = profileCount * creditCostPerAnalysis;
    
    if (userResult.credits < totalCreditCost) {
      return c.json(createStandardResponse(false, undefined, `Insufficient credits. Need ${totalCreditCost}, have ${userResult.credits}`, requestId), 402);
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
    
    const BATCH_SIZE = 5;
    const processingContext = { user_id, business_id, business, env: c.env, requestId };

    for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
      const batch = profiles.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (profile) => {
        try {
          logger('info', `Processing profile ${i + batch.indexOf(profile) + 1}/${profileCount}`, { profile });
          
          const result = await processProfileComplete(profile, analysis_type, processingContext);
          return { success: true, result };
          
        } catch (error: any) {
          logger('error', `Profile analysis failed`, { profile, error: error.message });
          return { success: false, profile, error: error.message };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Collect results
      batchResults.forEach(batchResult => {
        if (batchResult.success) {
          results.push(batchResult.result);
        } else {
          errors.push({ profile: batchResult.profile, error: batchResult.error });
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

    // Calculate final costs
    const costDetails = calculateBulkCosts(results);
    const creditsUsed = costDetails.totalCredits;

    // Update credits for all successful analyses
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

    // Build final response
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
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
}
