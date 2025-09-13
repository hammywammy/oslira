export interface ModelConfig {
  model: string;
  cost_per_1k: number;
  max_in: number;
  max_out: number;
}

export const MODEL_CONFIG: Record<string, ModelConfig> = {
  triage: { 
    model: 'gpt-4o-mini', // Using existing model until GPT-5 available
    cost_per_1k: 0.00015, 
    max_in: 600, 
    max_out: 200 
  },
  preproc: { 
    model: 'gpt-4o-mini', 
    cost_per_1k: 0.00015, 
    max_in: 800, 
    max_out: 400 
  },
  light: { 
    model: 'gpt-4o', 
    cost_per_1k: 0.0025, 
    max_in: 800, 
    max_out: 400 
  },
  deep: { 
    model: 'gpt-4o', 
    cost_per_1k: 0.0025, 
    max_in: 1200, 
    max_out: 600 
  },
  xray: { 
    model: 'gpt-4o', 
    cost_per_1k: 0.0025, 
    max_in: 1500, 
    max_out: 800 
  }
};

export const CREDIT_PRICING = {
  base_fees: {
    light: 0.5,
    deep: 1.0,
    xray: 2.0
  },
  minimum_charge: 0.1, // Prevent negative margins
  token_cap: 2200 // Skip remaining if hit
};

export function calculateCost(
  tokensIn: number, 
  tokensOut: number, 
  modelType: string
): number {
  const config = MODEL_CONFIG[modelType];
  if (!config) throw new Error(`Unknown model type: ${modelType}`);
  
  const totalTokens = tokensIn + tokensOut;
  return (totalTokens * config.cost_per_1k) / 1000;
}

export function getTotalCreditsRequired(
  analysisType: string,
  estimatedCost: number
): number {
  const baseFee = CREDIT_PRICING.base_fees[analysisType as keyof typeof CREDIT_PRICING.base_fees];
  const totalCost = baseFee + estimatedCost;
  return Math.max(totalCost, CREDIT_PRICING.minimum_charge);
}
