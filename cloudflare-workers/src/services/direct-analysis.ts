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
  max_tokens: 5000,
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
    
    logger('info', 'Direct deep analysis starting', { 
      username: profile.username, 
      requestId: this.requestId 
    });

const response = await this.aiAdapter.executeRequest({
  model_name: 'gpt-5-mini',
  system_prompt: 'You are a partnership analysis specialist. Generate detailed collaboration strategies for Instagram influencers. Return valid JSON only.',
  user_prompt: buildDeepAnalysisPrompt(profile, business),
  max_tokens: 1500,
  json_schema: getDeepAnalysisJsonSchema(),
  response_format: 'json',
  temperature: 0.4,
  analysis_type: 'deep'
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
        block_type: 'direct_deep',
        processing_duration_ms: processingTime
      }
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
  }
}
