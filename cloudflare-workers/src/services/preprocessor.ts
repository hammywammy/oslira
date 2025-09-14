import type { ProfileData } from '../types/interfaces.js';
import { UniversalAIAdapter, selectModel } from './universal-ai-adapter.js';
import { getPreprocessorJsonSchema, buildPreprocessorPrompt } from './prompts.js';

export interface PreprocessorResult {
  posting_cadence: string;
  content_themes: string[];
  audience_signals: string[];
  brand_mentions: string[];
  engagement_patterns: string;
  collaboration_history: string;
  contact_readiness: string;
  content_quality: string;
}

export async function runPreprocessor(
  profile: ProfileData,
  env: any,
  requestId: string
): Promise<{
  result: PreprocessorResult;
  costDetails: {
    actual_cost: number;
    tokens_in: number;
    tokens_out: number;
    model_used: string;
    block_type: string;
  };
}> {
  
  // Check R2 cache first
  const cacheKey = generateCacheKey(profile);
  const cached = await getCachedPreprocessor(cacheKey, env);
  if (cached) {
    console.log(`📋 [Preprocessor] Cache hit for @${profile.username}`);
    return {
      result: cached,
      costDetails: {
        actual_cost: 0,
        tokens_in: 0,
        tokens_out: 0,
        model_used: 'cached',
        block_type: 'preprocessor'
      }
    };
  }

  console.log(`📋 [Preprocessor] Starting for @${profile.username}`);
  
  try {
    // Use economy tier for preprocessor (GPT-5 nano or mini)
    const modelName = selectModel('preprocessor', 'economy');
    
    const aiAdapter = new UniversalAIAdapter(env, requestId);
    const response = await aiAdapter.executeRequest({
      model_name: modelName,
      system_prompt: 'You are a data extraction specialist. Extract structured facts from Instagram profiles. Only include what you can observe directly.',
      user_prompt: buildPreprocessorPrompt(profile),
      max_tokens: 400,
      json_schema: getPreprocessorJsonSchema(),
      response_format: 'json',
      temperature: 0.2
    });

    const result = JSON.parse(response.content) as PreprocessorResult;
    
    // Cache for 24-72h
    await cachePreprocessor(cacheKey, result, env);
    
    console.log(`📋 [Preprocessor] Completed for @${profile.username}, cached for 48h, model: ${response.model_used}`);

    return {
      result,
      costDetails: {
        actual_cost: response.usage.total_cost,
        tokens_in: response.usage.input_tokens,
        tokens_out: response.usage.output_tokens,
        model_used: response.model_used,
        block_type: 'preprocessor'
      }
    };

  } catch (error: any) {
    console.error(`📋 [Preprocessor] Failed:`, error.message);
    throw new Error(`Preprocessor failed: ${error.message}`);
  }
}

function generateCacheKey(profile: ProfileData): string {
  const contentHash = profile.latestPosts?.slice(0, 5)
    .map(p => `${p.shortCode}:${p.likesCount}:${p.commentsCount}`)
    .join('|') || 'no-posts';
  
  return `preprocessor:${profile.username}:${profile.followersCount}:${contentHash}`;
}

async function getCachedPreprocessor(cacheKey: string, env: any): Promise<PreprocessorResult | null> {
  try {
    if (!env.ANALYSIS_CACHE) return null;
    
    const cached = await env.ANALYSIS_CACHE.get(cacheKey, 'json');
    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }
    
    return null;
  } catch (error: any) {
    console.warn('Cache read failed:', error.message);
    return null;
  }
}

async function cachePreprocessor(cacheKey: string, result: PreprocessorResult, env: any): Promise<void> {
  try {
    if (!env.ANALYSIS_CACHE) return;
    
    const cacheData = {
      result,
      expires: Date.now() + (48 * 60 * 60 * 1000) // 48 hours
    };
    
    await env.ANALYSIS_CACHE.put(cacheKey, JSON.stringify(cacheData));
  } catch (error: any) {
    console.warn('Cache write failed:', error.message);
  }
}
