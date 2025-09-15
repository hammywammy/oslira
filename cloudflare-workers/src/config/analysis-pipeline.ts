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
  // Workflow Definitions
  workflows: {
    // Quick assessment only
    micro_only: {
      name: 'micro_only',
      description: 'Triage and basic analysis only',
      stages: [
        { name: 'triage', type: 'triage', required: true, model_tier: 'economy' },
        { 
          name: 'light_analysis', 
          type: 'analysis', 
          required: true, 
          model_tier: 'economy',
          conditions: [{ field: 'analysis_type', operator: '==', value: 'light' }]
        }
      ]
    } as WorkflowConfig,

    light_ultra_fast: {
  name: 'light_ultra_fast',
  description: 'Single-stage light analysis with micro model',
  stages: [
    { 
      name: 'light_analysis', 
      type: 'analysis', 
      required: true, 
      model_tier: 'economy',
      model_override: 'gpt-5-nano' // Force cheapest model
    }
  ]
} as WorkflowConfig,

auto: {
  name: 'auto',
  description: 'AI decides preprocessing based on data quality',
  stages: [
    { name: 'triage', type: 'triage', required: true, model_tier: 'economy' },
    { 
      name: 'preprocessor', 
      type: 'preprocessor', 
      required: false, 
      model_tier: 'economy',
      conditions: [
        { field: 'triage.data_richness', operator: '>', value: 70 },
        { field: 'analysis_type', operator: '==', value: 'deep', skip_if_true: false }
      ]
    },
    { 
      name: 'main_analysis', 
      type: 'analysis', 
      required: true,
      model_tier: 'balanced'
    }
  ]
} as WorkflowConfig,

    // Run everything regardless
    full: {
      name: 'full',
      description: 'Complete analysis pipeline - all stages',
      stages: [
        { name: 'context_generation', type: 'context', required: true, model_tier: 'economy' },
        { name: 'triage', type: 'triage', required: true, model_tier: 'economy' },
        { name: 'preprocessor', type: 'preprocessor', required: true, model_tier: 'economy' },
        { name: 'main_analysis', type: 'analysis', required: true, model_tier: 'balanced' }
      ]
    } as WorkflowConfig,

    // Add after existing workflows
light_fast: {
  name: 'light_fast',
  description: 'Speed-optimized light analysis - single stage only',
  stages: [
    { 
      name: 'light_analysis', 
      type: 'analysis', 
      required: true, 
      model_tier: 'economy'
    }
  ]
} as WorkflowConfig,

deep_fast: {
  name: 'deep_fast',
  description: 'Speed-optimized deep analysis with caching',
  stages: [
    { name: 'preprocessor', type: 'preprocessor', required: false, model_tier: 'economy' },
    { name: 'main_analysis', type: 'analysis', required: true, model_tier: 'balanced' }
  ]
} as WorkflowConfig
  },

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
  triage: {
    premium: 'gpt-5-nano',
    balanced: 'gpt-5-nano', 
    economy: 'gpt-5-nano'
  },
  preprocessor: {
    premium: 'gpt-5-nano',
    balanced: 'gpt-5-nano',
    economy: 'gpt-5-nano'
  },
  light: {
    premium: 'gpt-5-nano',
    balanced: 'gpt-5-nano',
    economy: 'gpt-5-nano'
  },
  deep: {
    premium: 'gpt-5',
    balanced: 'gpt-5',
    economy: 'gpt-5-mini'
  },
xray: {
  premium: 'claude-opus-4-1-20250805',
  balanced: 'gpt-5', 
  economy: 'gpt-5'
}
  },

  // Default Settings
  defaults: {
    workflow: 'auto',
    model_tier: 'balanced',
    max_retries: 3,
    timeout_ms: 30000
  }
};
