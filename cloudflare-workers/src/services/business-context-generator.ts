import { getApiKey } from './enhanced-config-manager.js';
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
): Promise<{ business_one_liner: string; business_context_pack: BusinessContextPack }> {
  
  try {
    const openaiKey = await getApiKey('OPENAI_API_KEY', env);
    if (!openaiKey) throw new Error('OpenAI API key not available');

    const prompt = `# BUSINESS CONTEXT EXTRACTION

## INPUT BUSINESS
- **Name**: ${business.business_name || business.name}
- **Industry**: ${business.business_niche || business.industry}  
- **Target**: ${business.target_audience}
- **Value**: ${business.value_proposition}
- **Problems**: ${business.target_problems}

## TASK 1: Business One-Liner (140 chars max)
Create: "I help [TARGET] achieve [OUTCOME] through [METHOD]"

## TASK 2: Context Pack
Extract 5 key elements:

**niche**: Single industry/category (e.g., "fitness coaching", "ecommerce beauty")
**value_prop**: Core benefit in 1 sentence  
**must_avoid**: 3 profile types that are definitely wrong fit
**priority_signals**: 4 Instagram signals that indicate good fit
**tone_words**: 3 brand voice descriptors

Return ONLY JSON:
{
  "business_one_liner": "...",
  "business_context_pack": {
    "niche": "...",
    "value_prop": "...", 
    "must_avoid": ["...", "...", "..."],
    "priority_signals": ["...", "...", "...", "..."],
    "tone_words": ["...", "...", "..."]
  }
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are a business analyst. Return only valid JSON matching the exact schema.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 400,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API failed: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content);
    
    logger('info', 'Business context generated', {
      business_id: business.id,
      one_liner_length: parsed.business_one_liner?.length,
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
