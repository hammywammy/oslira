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
  
  logger('info', 'Parallel deep analysis starting', { 
    username: profile.username, 
    requestId: this.requestId 
  });

  // Execute 3 parallel analysis components
  const [coreAnalysis, strategyAnalysis, outreachAnalysis] = await Promise.all([
    this.executeCoreScoring(profile, business),
    this.executeStrategyAnalysis(profile, business), 
    this.executeOutreachGeneration(profile, business)
  ]);

  // Merge results
  const analysisData = {
    score: coreAnalysis.score,
    engagement_score: coreAnalysis.engagement_score,
    niche_fit: coreAnalysis.niche_fit,
    quick_summary: coreAnalysis.quick_summary,
    confidence_level: coreAnalysis.confidence_level,
    
    deep_payload: {
      deep_summary: strategyAnalysis.deep_summary,
      selling_points: strategyAnalysis.selling_points,
      reasons: strategyAnalysis.reasons,
      audience_insights: strategyAnalysis.audience_insights,
      outreach_message: outreachAnalysis.outreach_message,
      engagement_breakdown: coreAnalysis.engagement_breakdown
    }
  };

  const processingTime = Date.now() - startTime;
  const totalCost = coreAnalysis.cost + strategyAnalysis.cost + outreachAnalysis.cost;
  const totalTokensIn = coreAnalysis.tokens_in + strategyAnalysis.tokens_in + outreachAnalysis.tokens_in;
  const totalTokensOut = coreAnalysis.tokens_out + strategyAnalysis.tokens_out + outreachAnalysis.tokens_out;

  logger('info', 'Parallel deep analysis completed', {
    username: profile.username,
    processing_time: processingTime,
    total_cost: totalCost,
    parallel_savings: '~50% faster than sequential'
  });

  return {
    analysisData,
    costDetails: {
      actual_cost: totalCost,
      tokens_in: totalTokensIn,
      tokens_out: totalTokensOut,
      model_used: 'gpt-5-mini-parallel',
      block_type: 'parallel_deep',
      processing_duration_ms: processingTime
    }
  };
}

private async executeCoreScoring(profile: ProfileData, business: any): Promise<any> {
  const response = await this.aiAdapter.executeRequest({
    model_name: 'gpt-5-mini',
    system_prompt: 'Score influencer fit for business partnership. Focus on metrics and alignment.',
    user_prompt: `Score @${profile.username} (${profile.followersCount} followers) for: ${business.business_one_liner}\n\nBio: "${profile.bio}"\nVerified: ${profile.isVerified}\nBusiness: ${profile.isBusinessAccount}\n\nReturn scores (0-100) and brief summary with confidence level.`,
    max_tokens: 1500,
    json_schema: {
      name: 'CoreScoring',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
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
}
        },
        required: ['score', 'engagement_score', 'niche_fit', 'quick_summary', 'confidence_level', 'engagement_breakdown']
      }
    },
    response_format: 'json',
    temperature: 0.2,
    analysis_type: 'deep_core'
  });

  const result = JSON.parse(response.content);
  return {
    ...result,
    cost: response.usage.total_cost,
    tokens_in: response.usage.input_tokens,
    tokens_out: response.usage.output_tokens
  };
}

private async executeStrategyAnalysis(profile: ProfileData, business: any): Promise<any> {
  const response = await this.aiAdapter.executeRequest({
    model_name: 'gpt-5-mini',
    system_prompt: 'Generate comprehensive partnership strategy and audience insights for influencer collaboration.',
    user_prompt: `Strategic analysis for @${profile.username} partnership with: ${business.business_name}\n\nProfile: ${profile.followersCount} followers, "${profile.bio}"\nBusiness: ${business.business_one_liner}\n\nGenerate detailed partnership strategy, selling points, audience insights, and risk assessment.`,
    max_tokens: 3000,
    json_schema: {
      name: 'StrategyAnalysis',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          deep_summary: { type: 'string', maxLength: 2000 },
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
          audience_insights: { type: 'string', maxLength: 800 }
        },
        required: ['deep_summary', 'selling_points', 'reasons', 'audience_insights']
      }
    },
    response_format: 'json',
    temperature: 0.4,
    analysis_type: 'deep_strategy'
  });

  const result = JSON.parse(response.content);
  return {
    ...result,
    cost: response.usage.total_cost,
    tokens_in: response.usage.input_tokens,
    tokens_out: response.usage.output_tokens
  };
}

private async executeOutreachGeneration(profile: ProfileData, business: any): Promise<any> {
  const response = await this.aiAdapter.executeRequest({
    model_name: 'gpt-5-mini',
    system_prompt: 'Write personalized outreach message for influencer partnership. Be specific and compelling.',
    user_prompt: `Write outreach message for @${profile.username}\n\nInfluencer: ${profile.followersCount} followers, "${profile.bio}"\nBusiness: ${business.business_name} - ${business.business_one_liner}\n\nWrite personalized, professional outreach message that references specific details about their profile and offers clear value.`,
    max_tokens: 1500,
    json_schema: {
      name: 'OutreachMessage',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          outreach_message: { type: 'string', maxLength: 1000 }
        },
        required: ['outreach_message']
      }
    },
    response_format: 'json',
    temperature: 0.6,
    analysis_type: 'deep_outreach'
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
