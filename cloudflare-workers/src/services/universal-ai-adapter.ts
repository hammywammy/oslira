import { ANALYSIS_PIPELINE_CONFIG } from '../config/analysis-pipeline.js';
import type { ModelConfig } from '../config/analysis-pipeline.js';
import { getApiKey } from './enhanced-config-manager.js';
import { logger } from '../utils/logger.js';

export interface UniversalRequest {
  model_name: string;
  system_prompt: string;
  user_prompt: string;
  max_tokens: number;
  temperature?: number;
  json_schema?: any;
  response_format?: 'json' | 'text';
}

export interface UniversalResponse {
  content: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_cost: number;
  };
  model_used: string;
  provider: string;
}

export class UniversalAIAdapter {
  private env: any;
  private requestId: string;

  constructor(env: any, requestId: string) {
    this.env = env;
    this.requestId = requestId;
  }

  async executeRequest(request: UniversalRequest): Promise<UniversalResponse> {
    const modelConfig = ANALYSIS_PIPELINE_CONFIG.models[request.model_name];
    if (!modelConfig) {
      throw new Error(`Unknown model: ${request.model_name}`);
    }

    try {
      return await this.callModel(modelConfig, request);
    } catch (error: any) {
      logger('warn', `Primary model ${request.model_name} failed, trying backup`, { 
        error: error.message,
        requestId: this.requestId 
      });

      if (modelConfig.backup) {
        const backupConfig = ANALYSIS_PIPELINE_CONFIG.models[modelConfig.backup];
        if (backupConfig) {
          return await this.callModel(backupConfig, request);
        }
      }

      throw error;
    }
  }

  private async callModel(config: ModelConfig, request: UniversalRequest): Promise<UniversalResponse> {
    switch (config.api_format) {
      case 'gpt5_responses':
        return await this.callGPT5Responses(config, request);
      case 'gpt_chat':
        return await this.callGPTChat(config, request);
      case 'claude_messages':
        return await this.callClaudeMessages(config, request);
      default:
        throw new Error(`Unsupported API format: ${config.api_format}`);
    }
  }

  private async callGPT5Responses(config: ModelConfig, request: UniversalRequest): Promise<UniversalResponse> {
    const openaiKey = await getApiKey('OPENAI_API_KEY', this.env);
    if (!openaiKey) throw new Error('OpenAI API key not available');

    const body = {
      model: config.name,
      input: [
        { role: 'system', content: request.system_prompt },
        { role: 'user', content: request.user_prompt }
      ],
      max_output_tokens: request.max_tokens,
      temperature: request.temperature || 0.7,
      ...(request.json_schema && {
        response_format: {
          type: 'json_schema',
          json_schema: request.json_schema
        }
      })
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`GPT-5 API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || {};

    return {
      content,
      usage: {
        input_tokens: usage.prompt_tokens || 0,
        output_tokens: usage.completion_tokens || 0,
        total_cost: this.calculateCost(usage.prompt_tokens || 0, usage.completion_tokens || 0, config)
      },
      model_used: config.name,
      provider: config.provider
    };
  }

  private async callGPTChat(config: ModelConfig, request: UniversalRequest): Promise<UniversalResponse> {
    const openaiKey = await getApiKey('OPENAI_API_KEY', this.env);
    if (!openaiKey) throw new Error('OpenAI API key not available');

    const body = {
      model: config.name,
      messages: [
        { role: 'system', content: request.system_prompt },
        { role: 'user', content: request.user_prompt }
      ],
      max_tokens: request.max_tokens,
      temperature: request.temperature || 0.7,
      ...(request.json_schema && {
        response_format: {
          type: 'json_schema',
          json_schema: request.json_schema
        }
      })
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`GPT Chat API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || {};

    return {
      content,
      usage: {
        input_tokens: usage.prompt_tokens || 0,
        output_tokens: usage.completion_tokens || 0,
        total_cost: this.calculateCost(usage.prompt_tokens || 0, usage.completion_tokens || 0, config)
      },
      model_used: config.name,
      provider: config.provider
    };
  }

  private async callClaudeMessages(config: ModelConfig, request: UniversalRequest): Promise<UniversalResponse> {
    const claudeKey = await getApiKey('CLAUDE_API_KEY', this.env);
    if (!claudeKey) throw new Error('Claude API key not available');

    const body = {
      model: config.name,
      system: request.system_prompt,
      messages: [
        { role: 'user', content: request.user_prompt }
      ],
      max_tokens: request.max_tokens,
      temperature: request.temperature || 0.7
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    const usage = data.usage || {};

    return {
      content,
      usage: {
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
        total_cost: this.calculateCost(usage.input_tokens || 0, usage.output_tokens || 0, config)
      },
      model_used: config.name,
      provider: config.provider
    };
  }

  private calculateCost(inputTokens: number, outputTokens: number, config: ModelConfig): number {
    const inputCost = (inputTokens / 1000) * config.cost_per_1k_in;
    const outputCost = (outputTokens / 1000) * config.cost_per_1k_out;
    return inputCost + outputCost;
  }
}

// Model Selection Logic
export function selectModel(
  stage: string, 
  modelTier: 'premium' | 'balanced' | 'economy',
  context?: { triage?: { lead_score: number } }
): string {
  const mapping = ANALYSIS_PIPELINE_CONFIG.analysis_mappings[stage];
  if (!mapping) {
    throw new Error(`No model mapping found for stage: ${stage}`);
  }

  // Dynamic tier upgrade for high-value leads
  if (context?.triage?.lead_score && context.triage.lead_score > 70 && modelTier === 'balanced') {
    return mapping.premium || mapping.balanced;
  }

  return mapping[modelTier];
}
