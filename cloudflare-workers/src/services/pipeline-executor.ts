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

    logger('info', 'Starting pipeline execution', {
      workflow: workflowName,
      stages: workflow.stages.length,
      requestId: this.requestId
    });

    const results: Record<string, any> = {};
    const costs: Array<any> = [];
    const performance: Record<string, number> = {};

    for (const stage of workflow.stages) {
      const stageStart = Date.now();
      
      if (this.shouldSkipStage(stage, context, results)) {
        logger('info', `Skipping stage: ${stage.name}`, { requestId: this.requestId });
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

        logger('info', `Stage completed: ${stage.name}`, {
          duration_ms: performance[stage.name],
          cost: stageResult.cost.cost,
          requestId: this.requestId
        });

      } catch (error: any) {
        if (stage.required) {
          throw new Error(`Required stage ${stage.name} failed: ${error.message}`);
        } else {
          logger('warn', `Optional stage ${stage.name} failed, continuing`, {
            error: error.message,
            requestId: this.requestId
          });
        }
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
      
      if (condition.skip_if_true && conditionMet) {
        return true;
      }
      if (!condition.skip_if_true && !conditionMet) {
        return true;
      }
    }

    return false;
  }

  private getContextValue(field: string, context: PipelineContext, results: Record<string, any>): any {
    const parts = field.split('.');
    let value: any = context;

    // Try context first, then results
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        // Try results
        value = results;
        for (const part of parts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else {
            return undefined;
          }
        }
        break;
      }
    }

    return value;
  }

  private evaluateCondition(value: any, operator: string, expected: any): boolean {
    switch (operator) {
      case '>': return Number(value) > Number(expected);
      case '<': return Number(value) < Number(expected);
      case '==': return value === expected;
      case 'contains': return String(value).includes(String(expected));
      default: return false;
    }
  }

  private async executeStage(
    stage: AnalysisStage, 
    context: PipelineContext, 
    results: Record<string, any>
  ): Promise<{ data: any; cost: any }> {
    
    // Determine model tier - upgrade for high-value leads
    let modelTier = stage.model_tier || context.model_tier || 'balanced';
    if (context.triage?.lead_score > 70 && modelTier === 'balanced') {
      modelTier = 'premium';
    }

    const modelName = selectModel(stage.type, modelTier, { triage: context.triage });
    
    // Get appropriate prompt and schema
    const { prompt, jsonSchema } = await this.getStagePrompt(stage, context, results);

    const request = {
      model_name: modelName,
      system_prompt: this.getSystemPrompt(stage.type),
      user_prompt: prompt,
      max_tokens: this.getMaxTokens(stage.type),
      response_format: jsonSchema ? 'json' : 'text',
      json_schema: jsonSchema
    };

    const response = await this.aiAdapter.executeRequest(request);

    let data;
    if (jsonSchema) {
      data = JSON.parse(response.content);
    } else {
      data = response.content;
    }

    return {
      data,
      cost: {
        stage: stage.name,
        model: response.model_used,
        cost: response.usage.total_cost,
        tokens_in: response.usage.input_tokens,
        tokens_out: response.usage.output_tokens
      }
    };
  }

  private async getStagePrompt(
    stage: AnalysisStage, 
    context: PipelineContext, 
    results: Record<string, any>
  ): Promise<{ prompt: string; jsonSchema?: any }> {
    
    switch (stage.type) {
      case 'triage': {
        const { buildTriagePrompt, getTriageJsonSchema } = await import('./prompts.js');
        return {
          prompt: buildTriagePrompt(context.profile, context.business.business_one_liner),
          jsonSchema: getTriageJsonSchema()
        };
      }
      
      case 'preprocessor': {
        const { buildPreprocessorPrompt, getPreprocessorJsonSchema } = await import('./prompts.js');
        return {
          prompt: buildPreprocessorPrompt(context.profile),
          jsonSchema: getPreprocessorJsonSchema()
        };
      }
      
      case 'analysis': {
        if (context.analysis_type === 'light') {
          const { buildLightAnalysisPrompt, getLightAnalysisJsonSchema } = await import('./prompts.js');
          return {
            prompt: buildLightAnalysisPrompt(context.profile, context.business, { 
              triage: context.triage, 
              preprocessor: context.preprocessor 
            }),
            jsonSchema: getLightAnalysisJsonSchema()
          };
        } else if (context.analysis_type === 'deep') {
          const { buildDeepAnalysisPrompt, getDeepAnalysisJsonSchema } = await import('./prompts.js');
          return {
            prompt: buildDeepAnalysisPrompt(context.profile, context.business, { 
              triage: context.triage, 
              preprocessor: context.preprocessor 
            }),
            jsonSchema: getDeepAnalysisJsonSchema()
          };
        } else if (context.analysis_type === 'xray') {
          const { buildXRayAnalysisPrompt, getXRayAnalysisJsonSchema } = await import('./prompts.js');
          return {
            prompt: buildXRayAnalysisPrompt(context.profile, context.business, { 
              triage: context.triage, 
              preprocessor: context.preprocessor 
            }),
            jsonSchema: getXRayAnalysisJsonSchema()
          };
        }
        throw new Error(`Unknown analysis type: ${context.analysis_type}`);
      }
      
      case 'context': {
        const { buildBusinessContextPrompt, getBusinessContextJsonSchema } = await import('./prompts.js');
        return {
          prompt: buildBusinessContextPrompt(context.business),
          jsonSchema: getBusinessContextJsonSchema()
        };
      }
      
      default:
        throw new Error(`Unknown stage type: ${stage.type}`);
    }
  }

  private getSystemPrompt(stageType: string): string {
    const prompts = {
      triage: 'You are a lead qualification expert. Analyze profiles quickly and return valid JSON.',
      preprocessor: 'You are a data extraction specialist. Extract structured facts from profiles.',
      analysis: 'You are a business analyst specializing in influencer partnerships. Return valid JSON.',
      context: 'You are a business strategist. Generate business context and one-liners.'
    };
    
    return prompts[stageType] || 'You are an AI assistant. Return valid JSON.';
  }

  private getMaxTokens(stageType: string): number {
    const limits = {
      triage: 1000,
      preprocessor: 1400,
      analysis: 1800,
      context: 1300
    };
    
    return limits[stageType] || 500;
  }
}
