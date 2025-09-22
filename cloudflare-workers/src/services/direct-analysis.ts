import { UniversalAIAdapter } from './universal-ai-adapter.js';
import { buildSpeedLightAnalysisPrompt, buildDeepAnalysisPrompt, buildXRayAnalysisPrompt, getLightAnalysisJsonSchema, getDeepAnalysisJsonSchema, getXRayAnalysisJsonSchema } from './prompts.js';
import { logger } from '../utils/logger.js';
import type { ProfileData } from '../types/interfaces.js';

export interface DirectAnalysisResult {
  analysisData: any;
  costDetails: {
    actual_cost: number;
    tokens_in: number;
    tokens_out: number;
    model_used: string;
    block_type: string;
    processing_duration_ms: number;
  };
}

export class DirectAnalysisExecutor {
  private aiAdapter: UniversalAIAdapter;
  private env: any;
  private requestId: string;

  constructor(env: any, requestId: string) {
    this.env = env;
    this.requestId = requestId;
    this.aiAdapter = new UniversalAIAdapter(env, requestId);
  }

  async executeLight(profile: ProfileData, business: any): Promise<DirectAnalysisResult> {
    const startTime = Date.now();
    
    logger('info', 'Direct light analysis starting', { 
      username: profile.username, 
      requestId: this.requestId 
    });

const response = await this.aiAdapter.executeRequest({
  model_name: 'gpt-5-mini',
  system_prompt: 'Rate leads fast. Return JSON only.',
  user_prompt: buildSpeedLightAnalysisPrompt(profile, business),
  max_tokens: 1500,
  json_schema: getLightAnalysisJsonSchema(),
  response_format: 'json',
  temperature: 0.0,
  analysis_type: 'light'
});

    const processingTime = Date.now() - startTime;
    const analysisData = JSON.parse(response.content);

    return {
      analysisData,
      costDetails: {
        actual_cost: response.usage.total_cost,
        tokens_in: response.usage.input_tokens,
        tokens_out: response.usage.output_tokens,
        model_used: response.model_used,
        block_type: 'direct_light',
        processing_duration_ms: processingTime
      }
    };
  }

async executeDeep(profile: ProfileData, business: any): Promise<DirectAnalysisResult> {
  const startTime = Date.now();
  
  logger('info', 'Optimized deep analysis starting', { 
    username: profile.username, 
    requestId: this.requestId 
  });

  // Execute 2 parallel calls instead of 3 (merged core+strategy)
  const [coreStrategyAnalysis, outreachAnalysis] = await Promise.all([
    this.executeCoreStrategyMerged(profile, business),
    this.executeOutreachGeneration(profile, business)
  ]);

  // Merge results
  const analysisData = {
    score: coreStrategyAnalysis.score,
    engagement_score: coreStrategyAnalysis.engagement_score,
    niche_fit: coreStrategyAnalysis.niche_fit,
    quick_summary: coreStrategyAnalysis.quick_summary,
    confidence_level: coreStrategyAnalysis.confidence_level,
    
    deep_payload: {
      deep_summary: coreStrategyAnalysis.deep_summary,
      selling_points: coreStrategyAnalysis.selling_points,
      reasons: coreStrategyAnalysis.reasons,
      audience_insights: coreStrategyAnalysis.audience_insights,
      outreach_message: outreachAnalysis.outreach_message,
      engagement_breakdown: coreStrategyAnalysis.engagement_breakdown
    }
  };

  const processingTime = Date.now() - startTime;
  const totalCost = coreStrategyAnalysis.cost + outreachAnalysis.cost;
  const totalTokensIn = coreStrategyAnalysis.tokens_in + outreachAnalysis.tokens_in;
  const totalTokensOut = coreStrategyAnalysis.tokens_out + outreachAnalysis.tokens_out;

  logger('info', 'Optimized deep analysis completed', {
    username: profile.username,
    processing_time: processingTime,
    total_cost: totalCost,
    optimization: '2-call merged strategy'
  });

  return {
    analysisData,
    costDetails: {
      actual_cost: totalCost,
      tokens_in: totalTokensIn,
      tokens_out: totalTokensOut,
      model_used: 'gpt-5-mini-merged',
      block_type: 'optimized_deep',
      processing_duration_ms: processingTime
    }
  };
}

private async executeCoreStrategyMerged(profile: ProfileData, business: any): Promise<any> {
  const response = await this.aiAdapter.executeRequest({
    model_name: 'gpt-5-mini',
    system_prompt: 'Score influencer partnership potential AND generate comprehensive strategy in single response. Combine scoring with strategic analysis efficiently.',
    user_prompt: `Partnership Analysis: @${profile.username} (${profile.followersCount}) + ${business.business_name}
    
Bio: "${profile.bio}"
Business: ${business.business_one_liner || business.target_audience}

Score 0-100 for niche fit, engagement, overall match. Generate partnership strategy, selling points, audience insights, and reasons for collaboration.`,
    max_tokens: 3500,
    json_schema: {
      name: 'MergedCoreStrategy',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          // Core scoring
          score: { type: 'integer', minimum: 0, maximum: 100 },
          engagement_score: { type: 'integer', minimum: 0, maximum: 100 },
          niche_fit: { type: 'integer', minimum: 0, maximum: 100 },
          quick_summary: { type: 'string', maxLength: 200 },
          confidence_level: { type: 'number', minimum: 0, maximum: 1 },
          engagement_breakdown: {
            type: 'object',
            additionalProperties: false,
            properties: {
              avg_likes: { type: 'integer' },
              avg_comments: { type: 'integer' },
              engagement_rate: { type: 'number' }
            },
            required: ['avg_likes', 'avg_comments', 'engagement_rate']
          },
          // Strategy analysis
          deep_summary: { type: 'string', maxLength: 1500 },
          selling_points: { 
            type: 'array', 
            items: { type: 'string' }, 
            minItems: 3, 
            maxItems: 6 
          },
          reasons: { 
            type: 'array', 
            items: { type: 'string' }, 
            minItems: 3, 
            maxItems: 8 
          },
          audience_insights: { type: 'string', maxLength: 600 }
        },
        required: ['score', 'engagement_score', 'niche_fit', 'quick_summary', 'confidence_level', 'engagement_breakdown', 'deep_summary', 'selling_points', 'reasons', 'audience_insights']
      }
    },
    response_format: 'json',
    temperature: 0.3,
    analysis_type: 'deep_merged'
  });

  const result = JSON.parse(response.content);
  return {
    ...result,
    cost: response.usage.total_cost,
    tokens_in: response.usage.input_tokens,
    tokens_out: response.usage.output_tokens
  };
}

  async executeXRay(profile: ProfileData, business: any): Promise<DirectAnalysisResult> {
    const startTime = Date.now();
    
    logger('info', 'Direct X-Ray analysis starting', { 
      username: profile.username, 
      requestId: this.requestId 
    });

    const response = await this.aiAdapter.executeRequest({
      model_name: 'gpt-5',
      system_prompt: 'You are a consumer psychology expert. Extract deep demographic and psychographic insights from Instagram profiles. Return valid JSON only.',
      user_prompt: buildXRayAnalysisPrompt(profile, business),
      max_tokens: 2000,
      json_schema: getXRayAnalysisJsonSchema(),
      response_format: 'json',
      temperature: 0.5,
  analysis_type: 'xray'
    });

    const processingTime = Date.now() - startTime;
    const analysisData = JSON.parse(response.content);

    return {
      analysisData,
      costDetails: {
        actual_cost: response.usage.total_cost,
        tokens_in: response.usage.input_tokens,
        tokens_out: response.usage.output_tokens,
        model_used: response.model_used,
        block_type: 'direct_xray',
        processing_duration_ms: processingTime
      }
    };
  }}
