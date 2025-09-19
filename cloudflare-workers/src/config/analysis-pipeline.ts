// Universal Analysis Pipeline Configuration
export interface WorkflowConfig {
  name: string;
  description: string;
  stages: AnalysisStage[];
  conditions?: WorkflowCondition[];
}

export interface AnalysisStage {
  name: string;
  type: 'triage' | 'preprocessor' | 'analysis' | 'context';
  required: boolean;
  model_tier?: 'premium' | 'balanced' | 'economy';
  conditions?: StageCondition[];
}

export interface WorkflowCondition {
  field: string;
  operator: '>' | '<' | '==' | 'contains';
  value: any;
}

export interface StageCondition extends WorkflowCondition {
  skip_if_true?: boolean;
}

export interface ModelConfig {
  name: string;
  provider: 'openai' | 'claude';
  intelligence: number;
  cost_per_1k_in: number;
  cost_per_1k_out: number;
  max_context: number;
  api_format: 'gpt5_responses' | 'gpt_chat' | 'claude_messages';
  backup?: string;
}

// Master Pipeline Configuration
export const ANALYSIS_PIPELINE_CONFIG = {
  // Model Configurations
  models: {
'claude-opus-4-1-20250805': {
  name: 'claude-opus-4-1-20250805',
  provider: 'claude',
  intelligence: 100,
  cost_per_1m_in: 15.00,
  cost_per_1m_out: 75.00,
  max_context: 200000,
  api_format: 'claude_messages',
  backup: 'gpt-5'
} as ModelConfig,

    'gpt-5': {
      name: 'gpt-5',
      provider: 'openai',
      intelligence: 96,
      cost_per_1m_in: 1.25,
      cost_per_1m_out: 10.00,
      max_completion_tokens: 128000,
      api_format: 'gpt5_responses',
      backup: 'claude-sonnet-4'
    } as ModelConfig,

'claude-sonnet-4': {
  name: 'claude-3-5-sonnet-20241022',
  provider: 'claude',
  intelligence: 90,
  cost_per_1m_in: 3.00,
  cost_per_1m_out: 15.00,
  max_context: 200000,
  api_format: 'claude_messages',
  backup: 'gpt-4o'
} as ModelConfig,

    'gpt-4o': {
      name: 'gpt-4o',
      provider: 'openai',
      intelligence: 88,
      cost_per_1m_in: 2.50,
      cost_per_1m_out: 10.00,
      max_context: 128000,
      api_format: 'gpt_chat'
    } as ModelConfig,

    // Economy Tier Models
    'gpt-5-nano': {
      name: 'gpt-5-nano',
      provider: 'openai',
      intelligence: 64,
      cost_per_1m_in: 0.05,
      cost_per_1m_out: 0.40,
      max_completion_tokens: 64000,
      api_format: 'gpt5_responses',
      backup: 'gpt-5-mini'
    } as ModelConfig,

    'gpt-5-mini': {
      name: 'gpt-5-mini',
      provider: 'openai',
      intelligence: 80,
      cost_per_1m_in: 0.25,
      cost_per_1m_out: 2.00,
      max_completion_tokens: 64000,
      api_format: 'gpt5_responses'
    } as ModelConfig
  },

analysis_mappings: {
  triage: 'gpt-5-nano',
  preprocessor: 'gpt-5-nano',
  light: 'gpt-5-nano',
  speed_analysis: 'gpt-5-nano',
  deep: 'gpt-5-mini',
  xray: 'gpt-5',
  context: 'gpt-5-mini'
},
};
