import type { MicroSnapshot } from './micro-snapshot.js';
import { UniversalAIAdapter, selectModel } from './universal-ai-adapter.js';
import { getTriageJsonSchema, buildTriagePrompt } from './prompts.js';

export interface TriageResult {
  lead_score: number;
  data_richness: number;
  confidence: number;
  early_exit: boolean;
  focus_points: string[];
}

export async function runTriage(
  snapshot: MicroSnapshot,
  businessOneLiner: string,
  env: any,
  requestId: string
): Promise<{
  result: TriageResult;
  costDetails: {
    actual_cost: number;
    tokens_in: number;
    tokens_out: number;
    model_used: string;
    block_type: string;
  };
}> {
  
  console.log(`🔍 [Triage] Starting for @${snapshot.username}`);
  
  try {
    // Use economy tier for triage (always GPT-5 nano)
    const modelName = selectModel('triage', 'economy');
    
    const aiAdapter = new UniversalAIAdapter(env, requestId);
    const response = await aiAdapter.executeRequest({
      model_name: modelName,
      system_prompt: 'You are a lead qualification expert. Analyze Instagram profiles quickly and return ONLY valid JSON.',
      user_prompt: buildTriagePrompt(snapshot, businessOneLiner),
      max_tokens: 200,
      json_schema: getTriageJsonSchema(),
      response_format: 'json',
      temperature: 0.1
    });

    const result = JSON.parse(response.content) as TriageResult;
    result.early_exit = false; // Always continue to full analysis

    console.log(`🔍 [Triage] Result: Score ${result.lead_score}, Data ${result.data_richness}, Model: ${response.model_used}`);

    return {
      result,
      costDetails: {
        actual_cost: response.usage.total_cost,
        tokens_in: response.usage.input_tokens,
        tokens_out: response.usage.output_tokens,
        model_used: response.model_used,
        block_type: 'triage'
      }
    };

  } catch (error: any) {
    console.error(`🔍 [Triage] Failed:`, error.message);
    throw new Error(`Triage failed: ${error.message}`);
  }
}
