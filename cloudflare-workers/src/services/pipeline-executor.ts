import { ANALYSIS_PIPELINE_CONFIG, type WorkflowConfig, type AnalysisStage } from '../config/analysis-pipeline.js';
import { UniversalAIAdapter, selectModel } from './universal-ai-adapter.js';
import { logger } from '../utils/logger.js';

export interface PipelineContext {
  profile: any;
  business: any;
  analysis_type: string;
  triage?: any;
  preprocessor?: any;
  workflow?: string;
  model_tier?: 'premium' | 'balanced' | 'economy';
}

export interface PipelineResult {
  results: Record<string, any>;
  costs: Array<{
    stage: string;
    model: string;
    cost: number;
    tokens_in: number;
    tokens_out: number;
  }>;
  performance: Record<string, number>;
  workflow_used: string;
}

export class PipelineExecutor {
  private aiAdapter: UniversalAIAdapter;
  private env: any;
  private requestId: string;

  constructor(env: any, requestId: string) {
    this.env = env;
    this.requestId = requestId;
    this.aiAdapter = new UniversalAIAdapter(env, requestId);
  }

  async execute(context: PipelineContext): Promise<PipelineResult> {
    const workflowName = context.workflow || ANALYSIS_PIPELINE_CONFIG.defaults.workflow;
    const workflow = ANALYSIS_PIPELINE_CONFIG.workflows[workflowName];
    
    if (!workflow) {
      throw new Error(`Unknown workflow: ${workflowName}`);
    }

    const results: Record<string, any> = {};
    const costs: Array<any> = [];
    const performance: Record<string, number> = {};

    for (const stage of workflow.stages) {
      const stageStart = Date.now();
      
      if (this.shouldSkipStage(stage, context, results)) {
        continue;
      }

      try {
        const stageResult = await this.executeStage(stage, context, results);
        results[stage.name] = stageResult.data;
        costs.push(stageResult.cost);
        performance[stage.name] = Date.now() - stageStart;

        // Update context with stage results
        if (stage.type === 'triage') {
          context.triage = stageResult.data;
        } else if (stage.type === 'preprocessor') {
          context.preprocessor = stageResult.data;
        }

      } catch (error: any) {
        if (stage.required) {
          throw new Error(`Required stage ${stage.name} failed: ${error.message}`);
        }
        
        logger('warn', `Optional stage ${stage.name} failed, continuing`, {
          error: error.message,
          requestId: this.requestId
        });
      }
    }

    return {
      results,
      costs,
      performance,
      workflow_used: workflowName
    };
  }

  private shouldSkipStage(stage: AnalysisStage, context: PipelineContext, results: Record<string, any>): boolean {
    if (!stage.conditions) return false;
    
    for (const condition of stage.conditions) {
      const value = this.getContextValue(condition.field, context, results);
      const conditionMet = this.evaluateCondition(value, condition.operator, condition.value);
      
      if (condition.skip_if_true && conditionMet) return true;
      if (!condition.skip_if_true && !conditionMet) return true;
    }
    
    return false;
  }

  private async executeStage(stage: AnalysisStage, context: PipelineContext, results: Record<string, any>) {
const stageKey = stage.type === 'analysis' ? context.analysis_type : stage.type;
const modelName = selectModel(stageKey, stage.model_tier || context.model_tier || 'balanced', results);
    const prompt = this.generatePrompt(stage.type, context, results);
    
const response = await this.aiAdapter.executeRequest({
  model_name: modelName,
  system_prompt: this.getSystemPrompt(stage.type),
  user_prompt: prompt,
  max_tokens: this.getMaxTokens(stage.type),
  response_format: 'json',
  json_schema: this.getJsonSchema(stage.type)
});

// Clean Claude's markdown formatting if present
let cleanContent = response.content.trim();
if (cleanContent.startsWith('```json')) {
  cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
} else if (cleanContent.startsWith('```')) {
  cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
}

return {
  data: JSON.parse(cleanContent),
  cost: {
    stage: stage.name,
    model: modelName,
    cost: response.usage.total_cost,
    tokens_in: response.usage.input_tokens,
    tokens_out: response.usage.output_tokens
  }
};
  }

  private getContextValue(field: string, context: PipelineContext, results: Record<string, any>): any {
    const parts = field.split('.');
    let value: any = { ...context, ...results };
    
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }
    
    return value;
  }

  private evaluateCondition(value: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case '>': return Number(value) > Number(expectedValue);
      case '<': return Number(value) < Number(expectedValue);
      case '==': return value == expectedValue;
      case 'contains': return String(value).includes(String(expectedValue));
      default: return false;
    }
  }

  private generatePrompt(stageType: string, context: PipelineContext, results: Record<string, any>): string {
    const profile = context.profile;
    const business = context.business;
    
    switch (stageType) {
case 'triage':
  return `@${profile.username} - ${profile.followersCount} followers
Bio: "${profile.bio || 'No bio'}"
Business: ${business.business_one_liner || business.name}

Score this profile quickly. Return only valid JSON:
{"lead_score": 0-100, "data_richness": 0-100, "confidence": 0-1, "early_exit": false, "focus_points": ["reason1", "reason2"]}`;

      case 'preprocessor':
        return `Profile: @${profile.username}
Bio: "${profile.bio || 'No bio'}"
Recent posts: ${profile.latestPosts?.slice(0, 3).map(p => p.caption?.slice(0, 100)).join(' | ') || 'No recent posts'}
Extract key facts and themes. Return JSON with content_themes, posting_cadence, collaboration_history, contact_readiness.`;

case 'analysis':
  const contextStr = results.triage ? `Score:${results.triage.lead_score}` : '';
  const themesStr = results.preprocessor?.content_themes?.slice(0,3).join(',') || '';
  return `@${profile.username}|${profile.followersCount}f|"${(profile.bio || '').slice(0,50)}"|${business.business_one_liner}|${contextStr}|${themesStr}
Return JSON: score(0-100), engagement_score(0-100), niche_fit(0-100), audience_quality, engagement_insights, selling_points[], reasons[]`;

      case 'context':
        return `Business: ${business.name}
Industry: ${business.industry || 'Not specified'}
Target Audience: ${business.target_audience || 'Not specified'}
Generate a compelling one-liner description. Return JSON with business_one_liner.`;

      default:
        return 'Analyze this data and return valid JSON.';
    }
  }

  private getSystemPrompt(stageType: string): string {
    const prompts = {
      triage: 'You are a rapid assessment specialist. Analyze profiles quickly and return valid JSON.',
      preprocessor: 'You are a data extraction specialist. Extract structured facts from profiles.',
      analysis: 'You are a business analyst specializing in influencer partnerships. Return valid JSON.',
      context: 'You are a business strategist. Generate business context and one-liners.'
    };
    
    return prompts[stageType] || 'You are an AI assistant. Return valid JSON.';
  }

  private getMaxTokens(stageType: string): number {
    const limits = {
      triage: 10000,
      preprocessor: 14000,
      analysis: 18000,
      context: 13000
    };
    
    return limits[stageType] || 500;
  }

  private getJsonSchema(stageType: string): any {
    // Return appropriate JSON schema for each stage type
    switch (stageType) {
case 'triage':
  return {
    name: 'TriageResult',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        lead_score: { type: 'integer', minimum: 0, maximum: 100 },
        data_richness: { type: 'integer', minimum: 0, maximum: 100 },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        early_exit: { type: 'boolean' },
        focus_points: { type: 'array', items: { type: 'string' } }
      },
      required: ['lead_score', 'data_richness', 'confidence', 'early_exit', 'focus_points']
    }
  };

case 'preprocessor':
  return {
    name: 'PreprocessorResult',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        content_themes: { type: 'array', items: { type: 'string' } },
        posting_cadence: { type: 'string' },
        collaboration_history: { type: 'string' },
        contact_readiness: { type: 'string' }
      },
      required: ['content_themes', 'posting_cadence', 'collaboration_history', 'contact_readiness']
    }
  };

case 'analysis':
  return {
    name: 'AnalysisResult',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        score: { type: 'integer', minimum: 0, maximum: 100 },
        engagement_score: { type: 'integer', minimum: 0, maximum: 100 },
        niche_fit: { type: 'integer', minimum: 0, maximum: 100 },
        audience_quality: { type: 'string' },
        engagement_insights: { type: 'string' },
        selling_points: { type: 'array', items: { type: 'string' } },
        reasons: { type: 'array', items: { type: 'string' } }
      },
      required: ['score', 'engagement_score', 'niche_fit', 'audience_quality', 'engagement_insights', 'selling_points', 'reasons']
    }
  };

case 'context':
  return {
    name: 'ContextResult',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        business_one_liner: { type: 'string' }
      },
      required: ['business_one_liner']
    }
  };

      default:
        return undefined;
    }
  }
}
