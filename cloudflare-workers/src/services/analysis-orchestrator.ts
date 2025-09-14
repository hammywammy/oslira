import type { ProfileData } from '../types/interfaces.js';
import { createMicroSnapshot } from './micro-snapshot.js';
import { runTriage } from './triage.js';
import { runPreprocessor } from './preprocessor.js';
import { performAIAnalysis } from './ai-analysis.js';
import { logger } from '../utils/logger.js';

export interface OrchestrationResult {
  result: any;
  totalCost: {
    actual_cost: number;
    tokens_in: number;
    tokens_out: number;
    blocks_used: string[];
    total_blocks: number;
  };
  performance: {
    triage_ms: number;
    preprocessor_ms: number;
    analysis_ms: number;
    total_ms: number;
  };
  verdict: 'success' | 'early_exit' | 'error';
  early_exit_reason?: string;
}

export async function runAnalysis(
  profile: ProfileData,
  business: any,
  analysisType: 'light' | 'deep' | 'xray',
  env: any,
  requestId: string
): Promise<OrchestrationResult> {
  
  const startTime = Date.now();
  let triageTime = 0;
  let preprocessorTime = 0;
  let analysisTime = 0;
  
  const costs: any[] = [];
  const blocksUsed: string[] = [];

// Use existing business context from database
const enrichedBusiness = {
  ...business,
  business_one_liner: business.business_one_liner || null,
  business_context_pack: business.business_context_pack || null
};

// Only generate if missing (fallback for incomplete data)
if (!enrichedBusiness.business_one_liner || !enrichedBusiness.business_context_pack) {
  logger('warn', 'Business context missing, generating fallback', { business_id: business.id, requestId });
  const generatedContext = await ensureBusinessContext(business, env, requestId);
  Object.assign(enrichedBusiness, generatedContext);
}

logger('info', 'Starting analysis orchestration', { 
  username: profile.username,
  analysisType,
  business_name: enrichedBusiness.business_name || enrichedBusiness.name,
  has_one_liner: !!enrichedBusiness.business_one_liner
}, requestId);

  try {
    // STEP 1: Always run triage
    const triageStart = Date.now();
const snapshot = createMicroSnapshot(profile);
const triageResponse = await runTriage(snapshot, enrichedBusiness.business_one_liner, env, requestId);
triageTime = Date.now() - triageStart;
    
    costs.push(triageResponse.costDetails);
    blocksUsed.push('triage');
    
// Log triage results but continue analysis regardless
    logger('info', 'Triage completed, proceeding to analysis', {
      username: profile.username,
      lead_score: triageResponse.result.lead_score,
      data_richness: triageResponse.result.data_richness
    }, requestId);

    // STEP 2: Determine if preprocessor is needed
    const needsPreprocessor = shouldRunPreprocessor(analysisType, triageResponse.result);
    
    let preprocessorResult = null;
    if (needsPreprocessor) {
      const preprocessorStart = Date.now();
      try {
        const preprocessorResponse = await runPreprocessor(profile, env, requestId);
        preprocessorTime = Date.now() - preprocessorStart;
        
        preprocessorResult = preprocessorResponse.result;
        costs.push(preprocessorResponse.costDetails);
        blocksUsed.push('preprocessor');
        
        logger('info', 'Preprocessor completed', {
          username: profile.username,
          cached: preprocessorResponse.costDetails.actual_cost === 0,
          themes: preprocessorResult.content_themes?.length || 0
        }, requestId);
        
      } catch (prepError: any) {
        preprocessorTime = Date.now() - preprocessorStart;
        logger('warn', 'Preprocessor failed, continuing without it', { 
          error: prepError.message 
        }, requestId);
        // Continue without preprocessor data
      }
    }

    // STEP 3: Run main analysis with context
    const analysisStart = Date.now();
    const context = {
      triage: triageResponse.result,
      preprocessor: preprocessorResult
    };
    
const analysisResponse = await performAIAnalysis(
  profile, 
  enrichedBusiness, 
  analysisType, 
  env, 
  requestId,
  context
);
    analysisTime = Date.now() - analysisStart;
    
    costs.push(analysisResponse.costDetails);
    blocksUsed.push(analysisType);
    
    const totalTime = Date.now() - startTime;
    
    logger('info', 'Analysis orchestration completed', {
      username: profile.username,
      analysisType,
      overall_score: analysisResponse.result.score,
      blocks_used: blocksUsed.join('+'),
      total_ms: totalTime,
      total_cost: aggregateCosts(costs).actual_cost
    }, requestId);

    return {
      result: analysisResponse.result,
      totalCost: aggregateCosts(costs),
      performance: {
        triage_ms: triageTime,
        preprocessor_ms: preprocessorTime,
        analysis_ms: analysisTime,
        total_ms: totalTime
      },
      verdict: 'success'
    };

  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    
    logger('error', 'Analysis orchestration failed', {
      username: profile.username,
      error: error.message,
      blocks_completed: blocksUsed.join('+'),
      total_ms: totalTime
    }, requestId);

    return {
      result: { error: error.message },
      totalCost: aggregateCosts(costs),
      performance: {
        triage_ms: triageTime,
        preprocessor_ms: preprocessorTime,
        analysis_ms: analysisTime,
        total_ms: totalTime
      },
      verdict: 'error'
    };
  }
}

function shouldRunPreprocessor(analysisType: string, triageResult: any): boolean {
  switch (analysisType) {
    case 'light':
      return false; // Light never needs preprocessor
    case 'deep':
      return triageResult.data_richness >= 70; // Deep only if rich data
    case 'xray':
      return true; // X-ray always needs preprocessor
    default:
      return false;
  }
}

function aggregateCosts(costs: any[]): {
  actual_cost: number;
  tokens_in: number;
  tokens_out: number;
  blocks_used: string[];
  total_blocks: number;
} {
  return {
    actual_cost: costs.reduce((sum, cost) => sum + (cost.actual_cost || 0), 0),
    tokens_in: costs.reduce((sum, cost) => sum + (cost.tokens_in || 0), 0),
    tokens_out: costs.reduce((sum, cost) => sum + (cost.tokens_out || 0), 0),
    blocks_used: costs.map(cost => cost.block_type).filter(Boolean),
    total_blocks: costs.length
  };
}

// Helper function for bulk analysis
export async function runBulkAnalysis(
  profiles: ProfileData[],
  business: any,
  analysisType: 'light' | 'deep' | 'xray',
  env: any,
  requestId: string,
  progressCallback?: (completed: number, total: number) => void
): Promise<OrchestrationResult[]> {
  
  const results: OrchestrationResult[] = [];
  const BATCH_SIZE = 3; // Process 3 at a time to avoid overwhelming
  
  logger('info', 'Starting bulk analysis orchestration', {
    total_profiles: profiles.length,
    analysisType,
    batch_size: BATCH_SIZE
  }, requestId);

  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    const batch = profiles.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.all(
      batch.map(profile => 
        runAnalysis(profile, business, analysisType, env, `${requestId}-${i + batch.indexOf(profile)}`)
          .catch(error => ({
            result: { error: error.message },
            totalCost: { actual_cost: 0, tokens_in: 0, tokens_out: 0, blocks_used: [], total_blocks: 0 },
            performance: { triage_ms: 0, preprocessor_ms: 0, analysis_ms: 0, total_ms: 0 },
            verdict: 'error' as const
          }))
      )
    );
    
    results.push(...batchResults);
    
    // Progress callback
    if (progressCallback) {
      progressCallback(Math.min(i + BATCH_SIZE, profiles.length), profiles.length);
    }
    
    // Brief pause between batches to be respectful to APIs
    if (i + BATCH_SIZE < profiles.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  const totalCost = results.reduce((sum, r) => sum + r.totalCost.actual_cost, 0);
  const successCount = results.filter(r => r.verdict === 'success').length;
  const earlyExitCount = results.filter(r => r.verdict === 'early_exit').length;
  
  logger('info', 'Bulk analysis orchestration completed', {
    total_profiles: profiles.length,
    successful: successCount,
    early_exits: earlyExitCount,
    errors: results.length - successCount - earlyExitCount,
    total_cost: totalCost
  }, requestId);
  
  return results;
}

// Add these new schema functions for pipeline support

export function getTriageJsonSchema() {
  return {
    name: 'TriageResult',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        lead_score: { type: 'integer', minimum: 0, maximum: 100 },
        data_richness: { type: 'integer', minimum: 0, maximum: 100 },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        early_exit: { type: 'boolean' },
        focus_points: { 
          type: 'array', 
          items: { type: 'string' }, 
          minItems: 2, 
          maxItems: 4 
        }
      },
      required: ['lead_score', 'data_richness', 'confidence', 'early_exit', 'focus_points']
    }
  };
}

export function getPreprocessorJsonSchema() {
  return {
    name: 'PreprocessorResult',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        posting_cadence: { type: 'string' },
        content_themes: { 
          type: 'array', 
          items: { type: 'string' },
          maxItems: 5
        },
        audience_signals: { 
          type: 'array', 
          items: { type: 'string' },
          maxItems: 4
        },
        brand_mentions: { 
          type: 'array', 
          items: { type: 'string' }
        },
        engagement_patterns: { type: 'string' },
        collaboration_history: { type: 'string' },
        contact_readiness: { type: 'string' },
        content_quality: { type: 'string' }
      },
      required: ['posting_cadence', 'content_themes', 'audience_signals', 'brand_mentions', 'engagement_patterns', 'collaboration_history', 'contact_readiness', 'content_quality']
    }
  };
}

export function getBusinessContextJsonSchema() {
  return {
    name: 'BusinessContext',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        business_one_liner: { 
          type: 'string', 
          maxLength: 140,
          description: 'I help [TARGET] achieve [OUTCOME] through [METHOD]'
        },
        business_context_pack: {
          type: 'object',
          additionalProperties: false,
          properties: {
            niche: { type: 'string' },
            value_prop: { type: 'string' },
            must_avoid: { 
              type: 'array', 
              items: { type: 'string' },
              minItems: 3,
              maxItems: 3
            },
            priority_signals: { 
              type: 'array', 
              items: { type: 'string' },
              minItems: 4,
              maxItems: 4
            },
            tone_words: { 
              type: 'array', 
              items: { type: 'string' },
              minItems: 3,
              maxItems: 3
            }
          },
          required: ['niche', 'value_prop', 'must_avoid', 'priority_signals', 'tone_words']
        }
      },
      required: ['business_one_liner', 'business_context_pack']
    }
  };
}

export function buildTriagePrompt(profile: any, businessOneLiner: string): string {
  return `# LEAD TRIAGE: Quick Pass/Fail Decision

## YOUR BUSINESS
${businessOneLiner}

## PROFILE SNAPSHOT
- **Username**: @${profile.username}
- **Followers**: ${profile.followers?.toLocaleString() || 0}
- **Status**: ${profile.verified ? 'Verified ✓' : 'Unverified'} | ${profile.private ? 'Private ⚠️' : 'Public'}
- **Bio**: "${profile.bio_short || 'No bio'}"
- **External Links**: ${profile.external_domains?.length > 0 ? profile.external_domains.join(', ') : 'None'}
- **Recent Activity**: ~${profile.posts_30d || 0} posts estimated
- **Engagement Data**: ${profile.engagement_signals ? 
    `${profile.engagement_signals.avg_likes?.toLocaleString() || 0} avg likes, ${profile.engagement_signals.avg_comments || 0} comments (${profile.engagement_signals.posts_analyzed || 0} posts)` : 
    'Not available'}

## TASK: 10-Second Lead Decision

Score this profile on two dimensions:

**lead_score (0-100)**: Business fit potential
- 80-100: Clear target match, obvious collaboration potential
- 60-79: Good fit signals, worth deeper analysis  
- 40-59: Possible fit but unclear value
- 20-39: Weak signals, probably wrong audience
- 0-19: Obviously wrong fit, different niche entirely

**data_richness (0-100)**: Available information quality
**confidence (0-1)**: How certain are you about these scores?
**early_exit**: Set to false (always continue to full analysis)
**focus_points**: 2-4 specific observations that drove your scores

Return ONLY JSON matching the exact schema.`;
}

export function buildPreprocessorPrompt(profile: any): string {
  const postsData = profile.latestPosts || [];
  const engagementData = profile.engagement || null;

  return `# DATA EXTRACTION: Instagram Profile Facts

## PROFILE OVERVIEW
- **Username**: @${profile.username}
- **Followers**: ${profile.followersCount?.toLocaleString() || 0}
- **Bio**: "${profile.bio || 'No bio'}"
- **External Link**: ${profile.externalUrl || 'None'}
- **Account Type**: ${profile.isBusinessAccount ? 'Business' : 'Personal'} | ${profile.isVerified ? 'Verified' : 'Unverified'}

## CONTENT ANALYSIS
- **Posts Available**: ${postsData.length}
- **Engagement Data**: ${engagementData ? 
    `${engagementData.engagementRate}% rate (${engagementData.avgLikes} avg likes, ${engagementData.avgComments} comments)` : 
    'Not available'}

Extract observable facts only. Return structured data based ONLY on what you can see.

Return ONLY JSON matching the exact schema.`;
}

export function buildBusinessContextPrompt(business: any): string {
  return `# BUSINESS CONTEXT EXTRACTION

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

Return ONLY JSON matching the exact schema.`;
}
