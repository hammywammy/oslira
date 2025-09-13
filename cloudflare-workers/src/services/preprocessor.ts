import type { ProfileData } from '../types/interfaces.js';
import { MODEL_CONFIG, calculateCost } from '../config/models.js';
import { getApiKey } from './enhanced-config-manager.js';
import { callWithRetry } from '../utils/helpers.js';

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

  const openaiKey = await getApiKey('OPENAI_API_KEY', env);
  if (!openaiKey) throw new Error('OpenAI API key not available');

  const modelConfig = MODEL_CONFIG.preproc;
  const prompt = buildPreprocessorPrompt(profile);
  
  console.log(`📋 [Preprocessor] Starting for @${profile.username}`);
  
  try {
    const response = await callWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelConfig.model,
          messages: [
            { 
              role: 'system', 
              content: 'You are a data extraction specialist. Extract structured facts from Instagram profiles. Only include what you can observe directly - no speculation.' 
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: modelConfig.max_out,
          temperature: 0.2,
          response_format: { type: 'json_object' }
        })
      },
      2, 2000, 20000
    );

    const content = response?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty preprocessor response');

    // Calculate cost
    const usage = response?.usage;
    const tokensIn = usage?.prompt_tokens || 0;
    const tokensOut = usage?.completion_tokens || 0;
    const actualCost = calculateCost(tokensIn, tokensOut, 'preproc');

    // Parse result
    const result = JSON.parse(content) as PreprocessorResult;
    
    // Cache for 24-72h
    await cachePreprocessor(cacheKey, result, env);
    
    console.log(`📋 [Preprocessor] Completed for @${profile.username}, cached for 48h`);

    return {
      result,
      costDetails: {
        actual_cost: actualCost,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        model_used: modelConfig.model,
        block_type: 'preprocessor'
      }
    };

  } catch (error: any) {
    console.error(`📋 [Preprocessor] Failed for @${profile.username}:`, error.message);
    throw new Error(`Preprocessor failed: ${error.message}`);
  }
}

function buildPreprocessorPrompt(profile: ProfileData): string {
  const postsData = profile.latestPosts || [];
  const engagementData = profile.engagement || null;

  return `# DATA EXTRACTION: Instagram Profile Facts

## PROFILE OVERVIEW
- **Username**: @${profile.username}
- **Followers**: ${profile.followersCount.toLocaleString()}
- **Bio**: "${profile.bio || 'No bio'}"
- **External Link**: ${profile.externalUrl || 'None'}
- **Account Type**: ${profile.isBusinessAccount ? 'Business' : 'Personal'} | ${profile.isVerified ? 'Verified' : 'Unverified'}

## CONTENT ANALYSIS
- **Posts Available**: ${postsData.length}
- **Engagement Data**: ${engagementData ? 
    `${engagementData.engagementRate}% rate (${engagementData.avgLikes} avg likes, ${engagementData.avgComments} comments)` : 
    'Not available'}

## POST SAMPLES
${postsData.slice(0, 8).map((post, i) => 
  `**Post ${i+1}**: ${post.likesCount.toLocaleString()} likes, ${post.commentsCount} comments
  Caption: "${(post.caption || '').slice(0, 150)}${post.caption && post.caption.length > 150 ? '...' : ''}"
  Hashtags: ${post.hashtags?.slice(0, 5).join(' ') || 'None'}
  Type: ${post.type || 'Unknown'}`
).join('\n\n')}

## TASK: Extract Observable Facts Only

Return structured data based ONLY on what you can see:

**posting_cadence**: Based on post timestamps/frequency if visible, or "unknown"
**content_themes**: 3-5 main topics from captions/hashtags (be specific)
**audience_signals**: Signs of audience type from comments/engagement patterns
**brand_mentions**: Any brands, products, or companies mentioned in content
**engagement_patterns**: High/low engagement posts patterns, what performs best
**collaboration_history**: Evidence of past partnerships/sponsored content
**contact_readiness**: Email in bio, "DM for collabs", business account signals
**content_quality**: Professional/amateur, consistent/inconsistent, video/photo mix

If you cannot determine something from the visible data, use "insufficient_data" for that field.

Return ONLY JSON:
{
  "posting_cadence": "...",
  "content_themes": ["theme1", "theme2", "theme3"],
  "audience_signals": ["signal1", "signal2"],
  "brand_mentions": ["brand1", "brand2"],
  "engagement_patterns": "...",
  "collaboration_history": "...",
  "contact_readiness": "...",
  "content_quality": "..."
}`;
}

function generateCacheKey(profile: ProfileData): string {
  // Create cache key based on profile content that changes
  const contentHash = profile.latestPosts?.slice(0, 3)
    .map(p => `${p.id}-${p.likesCount}`)
    .join('|') || 'no-posts';
  
  const profileHash = `${profile.username}-${profile.followersCount}-${profile.postsCount}`;
  
  return `preproc:${profileHash}:${contentHash}`;
}

async function getCachedPreprocessor(cacheKey: string, env: any): Promise<PreprocessorResult | null> {
  try {
    if (!env.R2_CACHE_BUCKET) return null;
    
    const cached = await env.R2_CACHE_BUCKET.get(cacheKey);
    if (!cached) return null;
    
    const data = await cached.json();
    
    // Check if cache is still valid (48 hours)
    const cacheAge = Date.now() - new Date(data.cached_at).getTime();
    if (cacheAge > 48 * 60 * 60 * 1000) {
      // Cache expired, delete it
      await env.R2_CACHE_BUCKET.delete(cacheKey);
      return null;
    }
    
    return data.result;
  } catch {
    return null;
  }
}

async function cachePreprocessor(cacheKey: string, result: PreprocessorResult, env: any): Promise<void> {
  try {
    if (!env.R2_CACHE_BUCKET) return;
    
    const cacheData = {
      result,
      cached_at: new Date().toISOString(),
      ttl_hours: 48
    };
    
    await env.R2_CACHE_BUCKET.put(
      cacheKey, 
      JSON.stringify(cacheData),
      {
        httpMetadata: {
          contentType: 'application/json'
        }
      }
    );
  } catch (error) {
    console.warn('Failed to cache preprocessor result:', error);
    // Don't throw - caching failure shouldn't break the flow
  }
}
