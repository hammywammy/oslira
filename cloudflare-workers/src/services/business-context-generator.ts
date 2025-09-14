import { getApiKey } from './enhanced-config-manager.js';
import { UniversalAIAdapter, selectModel } from './universal-ai-adapter.js';
import { getBusinessContextJsonSchema, buildBusinessContextPrompt } from './prompts.js';
import { logger } from '../utils/logger.js';

interface BusinessContextPack {
  niche: string;
  value_prop: string;
  must_avoid: string[];
  priority_signals: string[];
  tone_words: string[];
}

interface BusinessOneLiner {
  text: string;
  target: string;
  outcome: string;
  method: string;
}

export async function generateBusinessContext(
  business: any,
  env: any,
  requestId: string
): Promise<{ business_one_liner: string; business_context_pack: any }> {
  
  try {
    // Use economy tier for context generation (GPT-5 nano)
    const modelName = selectModel('context', 'economy');
    
    const aiAdapter = new UniversalAIAdapter(env, requestId);
    const response = await aiAdapter.executeRequest({
      model_name: modelName,
      system_prompt: 'You are a business analyst. Return only valid JSON matching the exact schema.',
      user_prompt: buildBusinessContextPrompt(business),
      max_tokens: 400,
      json_schema: getBusinessContextJsonSchema(),
      response_format: 'json',
      temperature: 0.3
    });

    const parsed = JSON.parse(response.content);
    
    logger('info', 'Business context generated', {
      business_id: business.id,
      one_liner_length: parsed.business_one_liner?.length,
      model_used: response.model_used,
      cost: response.usage.total_cost,
      requestId
    });

    return parsed;

  } catch (error: any) {
    logger('error', 'Business context generation failed', { 
      error: error.message, 
      requestId 
    });
    throw error;
  }
}
export async function ensureBusinessContext(
  business: any,
  env: any,
  requestId: string
): Promise<{ business_one_liner: string; business_context_pack: BusinessContextPack }> {
  
  // Check if context exists and is recent (24 hours)
  const contextAge = business.context_updated_at ? 
    Date.now() - new Date(business.context_updated_at).getTime() : 
    Infinity;
    
  const isContextFresh = contextAge < (24 * 60 * 60 * 1000); // 24 hours
  
  if (business.business_one_liner && business.business_context_pack && isContextFresh) {
    logger('info', 'Using existing business context', { business_id: business.id, requestId });
    return {
      business_one_liner: business.business_one_liner,
      business_context_pack: business.business_context_pack
    };
  }

  // Generate new context
  logger('info', 'Generating fresh business context', { business_id: business.id, requestId });
  const context = await generateBusinessContext(business, env, requestId);
  
  // Update database
  await updateBusinessContext(business.id, context, env);
  
  return context;
}

async function updateBusinessContext(
  business_id: string,
  context: { business_one_liner: string; business_context_pack: BusinessContextPack },
  env: any
): Promise<void> {
  
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };

  const updateData = {
    business_one_liner: context.business_one_liner,
    business_context_pack: context.business_context_pack,
    context_version: 'v1.0',
    context_updated_at: new Date().toISOString()
  };

  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/business_profiles?id=eq.${business_id}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updateData)
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update business context: ${response.status}`);
  }

  logger('info', 'Business context updated in database', { business_id });
}
