import type { ProfileData } from '../types/interfaces.js';
import { createMicroSnapshot } from './micro-snapshot.js';
import { runTriage } from './triage.js';
import { runPreprocessor } from './preprocessor.js';
import { performAIAnalysis } from './ai-analysis.js';
import { generateBusinessContext, ensureBusinessContext } from './business-context-generator.js';
import { logger } from '../utils/logger.js';

export interface OrchestrationResult {
  result: any;
  totalCost: {
    actual_cost: number;
    tokens_in: number;
    tokens_out: number;
    blocks_used: string[];
    total_blocks: number;
  };
  performance: {
    triage_ms: number;
    preprocessor_ms: number;
    analysis_ms: number;
    total_ms: number;
  };
  verdict: 'success' | 'early_exit' | 'error';
  early_exit_reason?: string;
}

export async function runAnalysis(
  profile: ProfileData,
  business: any,
  analysisType: 'light' | 'deep' | 'xray',
  env: any,
  requestId: string
): Promise<OrchestrationResult> {
  
  const startTime = Date.now();
  let triageTime = 0;
  let preprocessorTime = 0;
  let analysisTime = 0;
  
  const costs: any[] = [];
  const blocksUsed: string[] = [];

// Ensure business context exists before analysis
const businessContext = await ensureBusinessContext(business, env, requestId);
const enrichedBusiness = { ...business, ...businessContext };

logger('info', 'Starting analysis orchestration', { 
  username: profile.username,
  analysisType,
  business_name: enrichedBusiness.business_name || enrichedBusiness.name,
  has_one_liner: !!enrichedBusiness.business_one_liner
}, requestId);

  try {
    // STEP 1: Always run triage
    const triageStart = Date.now();
const snapshot = createMicroSnapshot(profile);
const triageResponse = await runTriage(snapshot, enrichedBusiness.business_one_liner, env, requestId);
triageTime = Date.now() - triageStart;
    
    costs.push(triageResponse.costDetails);
    blocksUsed.push('triage');
    
    // Check for early exit
    if (triageResponse.result.early_exit) {
      const totalTime = Date.now() - startTime;
      
      logger('info', 'Analysis orchestration: early exit', {
        username: profile.username,
        lead_score: triageResponse.result.lead_score,
        data_richness: triageResponse.result.data_richness,
        total_ms: totalTime
      }, requestId);

      return {
        result: {
          verdict: 'low_quality_lead',
          triage: triageResponse.result,
          reason: triageResponse.result.lead_score < 25 ? 'Poor business fit' : 'Insufficient data',
          early_exit: true
        },
        totalCost: aggregateCosts(costs),
        performance: {
          triage_ms: triageTime,
          preprocessor_ms: 0,
          analysis_ms: 0,
          total_ms: totalTime
        },
        verdict: 'early_exit',
        early_exit_reason: triageResponse.result.lead_score < 25 ? 'poor_fit' : 'low_data'
      };
    }

    // STEP 2: Determine if preprocessor is needed
    const needsPreprocessor = shouldRunPreprocessor(analysisType, triageResponse.result);
    
    let preprocessorResult = null;
    if (needsPreprocessor) {
      const preprocessorStart = Date.now();
      try {
        const preprocessorResponse = await runPreprocessor(profile, env, requestId);
        preprocessorTime = Date.now() - preprocessorStart;
        
        preprocessorResult = preprocessorResponse.result;
        costs.push(preprocessorResponse.costDetails);
        blocksUsed.push('preprocessor');
        
        logger('info', 'Preprocessor completed', {
          username: profile.username,
          cached: preprocessorResponse.costDetails.actual_cost === 0,
          themes: preprocessorResult.content_themes?.length || 0
        }, requestId);
        
      } catch (prepError: any) {
        preprocessorTime = Date.now() - preprocessorStart;
        logger('warn', 'Preprocessor failed, continuing without it', { 
          error: prepError.message 
        }, requestId);
        // Continue without preprocessor data
      }
    }

    // STEP 3: Run main analysis with context
    const analysisStart = Date.now();
    const context = {
      triage: triageResponse.result,
      preprocessor: preprocessorResult
    };
    
const analysisResponse = await performAIAnalysis(
  profile, 
  enrichedBusiness, 
  analysisType, 
  env, 
  requestId,
  context
);
    analysisTime = Date.now() - analysisStart;
    
    costs.push(analysisResponse.costDetails);
    blocksUsed.push(analysisType);
    
    const totalTime = Date.now() - startTime;
    
    logger('info', 'Analysis orchestration completed', {
      username: profile.username,
      analysisType,
      overall_score: analysisResponse.result.score,
      blocks_used: blocksUsed.join('+'),
      total_ms: totalTime,
      total_cost: aggregateCosts(costs).actual_cost
    }, requestId);

    return {
      result: analysisResponse.result,
      totalCost: aggregateCosts(costs),
      performance: {
        triage_ms: triageTime,
        preprocessor_ms: preprocessorTime,
        analysis_ms: analysisTime,
        total_ms: totalTime
      },
      verdict: 'success'
    };

  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    
    logger('error', 'Analysis orchestration failed', {
      username: profile.username,
      error: error.message,
      blocks_completed: blocksUsed.join('+'),
      total_ms: totalTime
    }, requestId);

    return {
      result: { error: error.message },
      totalCost: aggregateCosts(costs),
      performance: {
        triage_ms: triageTime,
        preprocessor_ms: preprocessorTime,
        analysis_ms: analysisTime,
        total_ms: totalTime
      },
      verdict: 'error'
    };
  }
}

function shouldRunPreprocessor(analysisType: string, triageResult: any): boolean {
  switch (analysisType) {
    case 'light':
      return false; // Light never needs preprocessor
    case 'deep':
      return triageResult.data_richness >= 70; // Deep only if rich data
    case 'xray':
      return true; // X-ray always needs preprocessor
    default:
      return false;
  }
}

function aggregateCosts(costs: any[]): {
  actual_cost: number;
  tokens_in: number;
  tokens_out: number;
  blocks_used: string[];
  total_blocks: number;
} {
  return {
    actual_cost: costs.reduce((sum, cost) => sum + (cost.actual_cost || 0), 0),
    tokens_in: costs.reduce((sum, cost) => sum + (cost.tokens_in || 0), 0),
    tokens_out: costs.reduce((sum, cost) => sum + (cost.tokens_out || 0), 0),
    blocks_used: costs.map(cost => cost.block_type).filter(Boolean),
    total_blocks: costs.length
  };
}

// Helper function for bulk analysis
export async function runBulkAnalysis(
  profiles: ProfileData[],
  business: any,
  analysisType: 'light' | 'deep' | 'xray',
  env: any,
  requestId: string,
  progressCallback?: (completed: number, total: number) => void
): Promise<OrchestrationResult[]> {
  
  const results: OrchestrationResult[] = [];
  const BATCH_SIZE = 3; // Process 3 at a time to avoid overwhelming
  
  logger('info', 'Starting bulk analysis orchestration', {
    total_profiles: profiles.length,
    analysisType,
    batch_size: BATCH_SIZE
  }, requestId);

  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    const batch = profiles.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.all(
      batch.map(profile => 
        runAnalysis(profile, business, analysisType, env, `${requestId}-${i + batch.indexOf(profile)}`)
          .catch(error => ({
            result: { error: error.message },
            totalCost: { actual_cost: 0, tokens_in: 0, tokens_out: 0, blocks_used: [], total_blocks: 0 },
            performance: { triage_ms: 0, preprocessor_ms: 0, analysis_ms: 0, total_ms: 0 },
            verdict: 'error' as const
          }))
      )
    );
    
    results.push(...batchResults);
    
    // Progress callback
    if (progressCallback) {
      progressCallback(Math.min(i + BATCH_SIZE, profiles.length), profiles.length);
    }
    
    // Brief pause between batches to be respectful to APIs
    if (i + BATCH_SIZE < profiles.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  const totalCost = results.reduce((sum, r) => sum + r.totalCost.actual_cost, 0);
  const successCount = results.filter(r => r.verdict === 'success').length;
  const earlyExitCount = results.filter(r => r.verdict === 'early_exit').length;
  
  logger('info', 'Bulk analysis orchestration completed', {
    total_profiles: profiles.length,
    successful: successCount,
    early_exits: earlyExitCount,
    errors: results.length - successCount - earlyExitCount,
    total_cost: totalCost
  }, requestId);
  
  return results;
}
