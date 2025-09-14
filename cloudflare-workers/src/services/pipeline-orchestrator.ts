import type { ProfileData } from '../types/interfaces.js';
import { PipelineExecutor, type PipelineContext } from './pipeline-executor.js';
import { ensureBusinessContext } from './business-context-generator.js';
import { logger } from '../utils/logger.js';

export interface PipelineOrchestrationResult {
  result: any;
  totalCost: {
    actual_cost: number;
    tokens_in: number;
    tokens_out: number;
    blocks_used: string[];
    total_blocks: number;
  };
  performance: Record<string, number>;
  verdict: 'success' | 'early_exit' | 'error';
  workflow_used: string;
}

export async function runPipelineAnalysis(
  profile: ProfileData,
  business: any,
  analysisType: 'light' | 'deep' | 'xray',
  env: any,
  requestId: string,
  options: {
    workflow?: string;
    model_tier?: 'premium' | 'balanced' | 'economy';
    force_model?: string;
  } = {}
): Promise<PipelineOrchestrationResult> {
  
  const startTime = Date.now();
  
  logger('info', 'Starting pipeline-based analysis', { 
    username: profile.username,
    analysisType,
    workflow: options.workflow || 'auto',
    model_tier: options.model_tier || 'balanced',
    requestId
  });

  try {
    // Ensure business context exists
    const enrichedBusiness = await ensureBusinessContext(business, env, requestId);
    
    // Create pipeline context
    const pipelineContext: PipelineContext = {
      profile,
      business: enrichedBusiness,
      analysis_type: analysisType,
      workflow: options.workflow || 'auto',
      model_tier: options.model_tier || 'balanced'
    };

    // Execute pipeline
    const executor = new PipelineExecutor(env, requestId);
    const pipelineResult = await executor.execute(pipelineContext);
    
    // Transform results to match old interface
    const transformedResult = transformPipelineResult(pipelineResult, analysisType);
    
    const totalTime = Date.now() - startTime;
    
    logger('info', 'Pipeline analysis completed', {
      username: profile.username,
      analysisType,
      workflow_used: pipelineResult.workflow_used,
      stages_executed: Object.keys(pipelineResult.results).length,
      total_ms: totalTime,
      total_cost: pipelineResult.costs.reduce((sum, c) => sum + c.cost, 0),
      requestId
    });

    return {
      result: transformedResult,
      totalCost: {
        actual_cost: pipelineResult.costs.reduce((sum, c) => sum + c.cost, 0),
        tokens_in: pipelineResult.costs.reduce((sum, c) => sum + c.tokens_in, 0),
        tokens_out: pipelineResult.costs.reduce((sum, c) => sum + c.tokens_out, 0),
        blocks_used: pipelineResult.costs.map(c => c.stage),
        total_blocks: pipelineResult.costs.length
      },
      performance: {
        ...pipelineResult.performance,
        total_ms: totalTime
      },
      verdict: 'success',
      workflow_used: pipelineResult.workflow_used
    };

  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    
    logger('error', 'Pipeline analysis failed', {
      username: profile.username,
      error: error.message,
      total_ms: totalTime,
      requestId
    });

    return {
      result: { error: error.message },
      totalCost: {
        actual_cost: 0,
        tokens_in: 0,
        tokens_out: 0,
        blocks_used: [],
        total_blocks: 0
      },
      performance: { total_ms: totalTime },
      verdict: 'error',
      workflow_used: 'none'
    };
  }
}

function transformPipelineResult(pipelineResult: any, analysisType: string): any {
  // Extract the final analysis result based on analysis type
  const mainAnalysisKey = `${analysisType}_analysis` || 'main_analysis';
  const mainResult = pipelineResult.results[mainAnalysisKey] || pipelineResult.results.analysis;
  
  if (!mainResult) {
    throw new Error('No analysis result found in pipeline output');
  }
  
  // Transform to match expected format
  return {
    ...mainResult,
    // Add pipeline metadata
    pipeline_metadata: {
      triage: pipelineResult.results.triage,
      preprocessor: pipelineResult.results.preprocessor,
      workflow_used: pipelineResult.workflow_used
    }
  };
}
