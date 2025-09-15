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
console.log(`📋 [Preprocessor] Generated cache key: ${cacheKey}`);
console.log(`📋 [Preprocessor] R2_CACHE_BUCKET available: ${!!env.R2_CACHE_BUCKET}`);

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

console.log(`📋 [Preprocessor] Cache miss, running analysis for @${profile.username}`);

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
  // Round follower count to nearest 1000 to avoid cache misses on small changes
  const followerBucket = Math.floor(profile.followersCount / 1000) * 1000;
  const contentHash = profile.latestPosts?.slice(0, 3) // Reduce to 3 posts for stability
    .map(p => `${p.shortCode}`)
    .join('|') || 'no-posts';
  
  return `preprocessor:v2:${profile.username}:${followerBucket}:${contentHash}`;
}

async function getCachedPreprocessor(cacheKey: string, env: any): Promise<PreprocessorResult | null> {
  try {
    if (!env.R2_CACHE_BUCKET) {
      console.log(`📋 [Preprocessor] R2_CACHE_BUCKET not available`);
      return null;
    }
    
    console.log(`📋 [Preprocessor] Checking R2 cache for key: ${cacheKey}`);
    const cached = await env.R2_CACHE_BUCKET.get(cacheKey);
    if (!cached) {
      console.log(`📋 [Preprocessor] No cache entry found`);
      return null;
    }
    
    const cacheData = await cached.json();
    if (cacheData.expires > Date.now()) {
      console.log(`📋 [Preprocessor] Cache hit! Data valid until ${new Date(cacheData.expires)}`);
      return cacheData.result;
    }
    
    console.log(`📋 [Preprocessor] Cache expired`);
    return null;
  } catch (error: any) {
    console.warn('R2 cache read failed:', error.message);
    return null;
  }
}

async function cachePreprocessor(cacheKey: string, result: PreprocessorResult, env: any): Promise<void> {
  try {
    if (!env.R2_CACHE_BUCKET) return;
    
    const cacheData = {
      result,
      expires: Date.now() + (48 * 60 * 60 * 1000) // 48 hours
    };
    
    await env.R2_CACHE_BUCKET.put(cacheKey, JSON.stringify(cacheData));
  } catch (error: any) {
    console.warn('R2 cache write failed:', error.message);
  }
}
