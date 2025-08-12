import type { ProfileData, BusinessProfile, AnalysisResult, Env } from '../types/interfaces.js';
import { logger } from '../utils/logger.js';
import { callWithRetry } from '../utils/helpers.js';
import { validateAnalysisResult, calculateConfidenceLevel, extractPostThemes } from '../utils/validation.js';
import { getApiKey } from './enhanced-config-manager.js';

const safeLower = (v?: string) => (typeof v === 'string' ? v.toLowerCase() : '');
const safeStr  = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);

// ===============================================================================
// CORE HELPERS (Preserve legacy parameter shapes & parsing)
// ===============================================================================

const isGPT5 = (m: string) => /^gpt-5/i.test(m);

type ChatMsg = { role: 'system'|'user'|'assistant'; content: string };

function buildOpenAIChatBody(opts: {
  model: string;
  messages: ChatMsg[];
  maxTokens: number;
  temperature?: number;          // ignored for GPT-5 per your requirement
  responseFormatJSON?: boolean;  // non-schema JSON format
  jsonSchema?: any;              // if provided, uses JSON schema format (strict)
}) {
  const { model, messages, maxTokens, temperature, responseFormatJSON, jsonSchema } = opts;

  if (isGPT5(model)) {
    const body: any = {
      model,
      messages,
      // CRITICAL: GPT-5 uses max_completion_tokens; do not touch temperature
      max_completion_tokens: maxTokens,
    };
    if (jsonSchema) {
      body.response_format = {
        type: 'json_schema',
        json_schema: jsonSchema
      };
    } else if (responseFormatJSON) {
      body.response_format = { type: 'json_object' };
    }
    return body;
  }

  // Non-GPT-5 (kept for compatibility if you ever use other OpenAI models)
  const body: any = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature: (typeof temperature === 'number' ? temperature : 0.7),
  };
  if (jsonSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: jsonSchema
    };
  } else if (responseFormatJSON) {
    body.response_format = { type: 'json_object' };
  }
  return body;
}

// Your original choice parser (kept) + a safer fallback
function parseMessageContent(choice: any): string {
  const msg = choice?.message;
  if (!msg) return '';
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content.map((c: any) => (typeof c === 'string' ? c : (c?.text ?? ''))).join(' ').trim();
  }
  return '';
}

function parseChoiceSafe(choice: any): string {
  if (!choice) return '';
  const direct = parseMessageContent(choice);
  if (direct) return direct;
  if (typeof choice.text === 'string' && choice.text.trim()) return choice.text.trim();
  return '';
}

// ===============================================================================
// INTELLIGENCE ASSESSMENT & ADAPTIVE SCALING
// (Adjusted tiers to your old models: gpt-5-nano / gpt-5-mini)
// ===============================================================================

interface ProfileIntelligence {
  dataRichness: number;        // 0-100 score of available data
  analysisValue: number;       // Expected business value of analysis
  complexityLevel: 'basic' | 'moderate' | 'advanced' | 'executive';
  recommendedModel: string;
  speedTarget: number;         // Max acceptable response time in ms
  promptStrategy: 'screening' | 'standard' | 'strategic' | 'executive';
}

interface AnalysisTier {
  tier: number;
  model: string;
  maxTokens: number;
  targetSpeed: number;
  minDataRichness: number;
  minAnalysisValue: number;
}

// Tiers use ONLY your old working OpenAI models to keep behavior stable
const ANALYSIS_TIERS: AnalysisTier[] = [
  { tier: 1, model: 'gpt-5-nano', maxTokens: 2500,  targetSpeed: 45000,  minDataRichness: 0,  minAnalysisValue: 0  },
  { tier: 2, model: 'gpt-5-mini', maxTokens: 4000,  targetSpeed: 60000,  minDataRichness: 25, minAnalysisValue: 30 },
  { tier: 3, model: 'gpt-5-mini', maxTokens: 5500,  targetSpeed: 75000,  minDataRichness: 50, minAnalysisValue: 60 },
  { tier: 4, model: 'gpt-5-mini', maxTokens: 7000,  targetSpeed: 90000,  minDataRichness: 75, minAnalysisValue: 80 }
];

function assessProfileIntelligence(profile: ProfileData, business: BusinessProfile): ProfileIntelligence {
  // Calculate data richness (0-100)
  let dataRichness = 0;
  dataRichness += profile.isVerified ? 15 : 0;
  dataRichness += profile.isBusinessAccount ? 10 : 0;
  dataRichness += (profile.engagement?.postsAnalyzed || 0) > 0 ? 25 : 0;
  dataRichness += profile.latestPosts?.length ? 15 : 0;
  dataRichness += profile.bio ? 10 : 0;
  dataRichness += Math.min(25, Math.log10(Math.max(1, profile.followersCount)) * 5);

  // Calculate analysis value (0-100) - business impact potential
  let analysisValue = 0;
  analysisValue += Math.min(30, Math.log10(Math.max(1, profile.followersCount)) * 6);
  analysisValue += profile.isVerified ? 20 : 0;
  analysisValue += (profile.engagement?.engagementRate || 0) > 3 ? 20 :
                   (profile.engagement?.engagementRate || 0) > 1 ? 10 : 0;

const industryLC = safeLower(business.industry);
const complexIndustries = ['technology', 'finance', 'healthcare', 'b2b', 'enterprise'];
if (complexIndustries.some(ind => industryLC.includes(ind))) {
  analysisValue += 15;
}

// Target audience sophistication
const audienceLC = safeLower(business.target_audience);
const sophisticatedAudiences = ['executive', 'professional', 'enterprise', 'b2b', 'decision maker'];
if (sophisticatedAudiences.some(aud => audienceLC.includes(aud))) {
  analysisValue += 15;
}

  // Determine complexity level and optimal tier
  const complexityLevel =
    analysisValue >= 80 ? 'executive' :
    analysisValue >= 60 ? 'advanced' :
    analysisValue >= 30 ? 'moderate' : 'basic';

  // Select optimal tier based on intelligence requirements
  const optimalTier = ANALYSIS_TIERS.slice().reverse().find(t =>
    dataRichness >= t.minDataRichness && analysisValue >= t.minAnalysisValue
  ) || ANALYSIS_TIERS[0];

  // Determine prompt strategy
  const promptStrategy =
    complexityLevel === 'executive' ? 'executive' :
    complexityLevel === 'advanced' ? 'strategic' :
    complexityLevel === 'moderate' ? 'standard' : 'screening';

  return {
    dataRichness,
    analysisValue,
    complexityLevel,
    recommendedModel: optimalTier.model,
    speedTarget: optimalTier.targetSpeed,
    promptStrategy
  };
}

// ===============================================================================
// INTELLIGENT PROMPT ENGINEERING WITH DYNAMIC SCALING
// ===============================================================================

class IntelligentPromptBuilder {
  private profile: ProfileData;
  private business: BusinessProfile;
  private intelligence: ProfileIntelligence;

  constructor(profile: ProfileData, business: BusinessProfile, intelligence: ProfileIntelligence) {
    this.profile = profile;
    this.business = business;
    this.intelligence = intelligence;
  }

  buildAdaptivePrompt(): string {
    switch (this.intelligence.promptStrategy) {
      case 'executive':
        return this.buildExecutivePrompt();
      case 'strategic':
        return this.buildStrategicPrompt();
      case 'standard':
        return this.buildStandardPrompt();
      default:
        return this.buildScreeningPrompt();
    }
  }

  private buildExecutivePrompt(): string {
    const competitiveContext = this.getCompetitiveIntelligence();
    const marketPosition = this.getMarketPositioning();
    const strategicFramework = this.getStrategicFramework();

    return `# Executive Strategic Partnership Intelligence Report

**Client Corporation**: ${this.business.name}
**Industry Vertical**: ${this.business.industry}
**Strategic Focus**: ${this.business.value_proposition}
**Target Decision Makers**: ${this.business.target_audience}

**Partnership Target**: @${this.profile.username} | ${this.profile.displayName}
**Market Authority**: ${this.profile.isVerified ? 'Platform-Verified Authority' : 'Emerging Market Leader'}
**Audience Scale**: ${this.profile.followersCount.toLocaleString()} (${this.getFollowerTier()})
**Professional Status**: ${this.profile.isBusinessAccount ? 'Registered Business Entity' : 'Personal Brand'}

${competitiveContext}
${marketPosition}
${strategicFramework}

**Performance Intelligence**:
${this.getPerformanceIntelligence()}

**Content Strategy Analysis**:
${this.getContentStrategyAnalysis()}

**Executive Assessment Framework**:
1. **Strategic Value Creation**: Quantify partnership ROI, market expansion potential, competitive advantages
2. **Audience Intelligence**: Purchasing power analysis, decision-maker access, conversion probability
3. **Partnership Architecture**: Equity structures, exclusive arrangements, co-creation opportunities
4. **Risk Mitigation**: Brand safety assessment, controversy analysis, partnership stability
5. **Growth Trajectory**: Influence momentum, market share capture, long-term value creation

**Deliverables Required**:
- **score**: Strategic partnership value (0-100)
- **engagement_score**: Audience quality metric (0-100)
- **niche_fit**: Business alignment index (0-100)
- **audience_quality**: 'High'/'Medium'/'Low' purchasing power assessment
- **engagement_insights**: Executive summary with quantified business impact (1200 chars max)
- **selling_points**: 5-7 unique strategic advantages with ROI implications
- **reasons**: 6-10 data-driven business rationales with metrics

Provide executive-level strategic assessment as JSON.`;
  }

  private buildStrategicPrompt(): string {
    return `# Strategic Business Partnership Analysis

**Business Context**: ${this.business.name} (${this.business.industry})
**Value Proposition**: ${this.business.value_proposition}
**Target Market**: ${this.business.target_audience}

**Influencer Profile**: @${this.profile.username}
**Market Position**: ${this.profile.followersCount.toLocaleString()} followers | ${this.profile.isVerified ? 'Verified' : 'Unverified'}
**Bio**: "${this.profile.bio}"

**Strategic Assessment Areas**:
1. **Market Influence**: Authority indicators, audience trust signals, industry positioning
2. **Business Alignment**: Target demographic overlap, value proposition synergy, message consistency
3. **Partnership Potential**: Collaboration scalability, exclusive opportunity assessment, growth trajectory
4. **Competitive Advantage**: Differentiation potential, market positioning benefits, strategic moat creation
5. **Financial Projections**: Conversion potential, customer acquisition cost reduction, lifetime value impact

${this.getEngagementContext()}

**Strategic Requirements**:
- Analyze partnership potential through business lens
- Quantify expected ROI and strategic benefits
- Identify specific competitive advantages
- Assess audience quality for B2B conversion

Return comprehensive strategic analysis as JSON with all required fields.`;
  }

  private buildStandardPrompt(): string {
    return `# Business Partnership Evaluation

**Company**: ${this.business.name} (${this.business.industry})
**Target Audience**: ${this.business.target_audience}

**Profile**: @${this.profile.username} | ${this.profile.followersCount.toLocaleString()} followers
**Status**: ${this.profile.isVerified ? 'Verified' : 'Standard'} | ${this.profile.isBusinessAccount ? 'Business' : 'Personal'}
**Bio**: "${this.profile.bio || 'No bio available'}"

**Analysis Focus**:
1. Audience alignment with target market
2. Engagement quality and authenticity
3. Business collaboration potential
4. Expected partnership ROI

${this.getBasicEngagementData()}

**Output Requirements**:
- Partnership score (0-100)
- Engagement quality assessment
- Business fit evaluation
- 3-5 key advantages
- 3-6 partnership rationales

Return business analysis as JSON.`;
  }

  private buildScreeningPrompt(): string {
    return `Quick assessment for @${this.profile.username} (${this.profile.followersCount} followers${this.profile.isVerified ? ', verified' : ''}) partnering with ${this.business.name} (${this.business.industry}). Bio: "${this.profile.bio || 'N/A'}". Rate partnership potential (0-100), estimate engagement quality, identify 3 advantages and 3 reasons. JSON output only.`;
  }

  // Helper methods for context building
  private getCompetitiveIntelligence(): string {
    if (this.intelligence.complexityLevel !== 'executive') return '';
    return `
**Competitive Intelligence**:
- Industry Position: ${this.getIndustryPosition()}
- Competitor Comparison: ${this.getCompetitorContext()}
- Market Share Potential: ${this.getMarketShareEstimate()}`;
  }

  private getMarketPositioning(): string {
    if (this.intelligence.dataRichness < 50) return '';
    return `
**Market Positioning Analysis**:
- Influence Tier: ${this.getFollowerTier()}
- Authority Signals: ${this.getAuthoritySignals()}
- Growth Trajectory: ${this.getGrowthIndicators()}`;
  }

  private getStrategicFramework(): string {
    return `
**Strategic Framework Application**:
- Porter's Five Forces: ${this.getPortersAnalysis()}
- SWOT Positioning: ${this.getSWOTSummary()}
- Value Chain Impact: ${this.getValueChainImpact()}`;
  }

  private getPerformanceIntelligence(): string {
    const e = this.profile.engagement;
    if (!e || e.postsAnalyzed === 0) {
      return `Predictive metrics based on ${this.getFollowerTier()} tier benchmarks (no direct data available)`;
    }
    return `
- Verified Engagement: ${e.engagementRate}% across ${e.postsAnalyzed} posts
- Interaction Depth: ${e.avgLikes} likes, ${e.avgComments} comments average
- Quality Ratio: ${((e.avgComments / Math.max(1, e.avgLikes)) * 100).toFixed(2)}% comment-to-like ratio
- Consistency Index: ${this.calculateConsistencyScore()}`;
  }

  private getContentStrategyAnalysis(): string {
    if (!this.profile.latestPosts?.length) {
      return 'Content analysis unavailable - partnership assessment based on profile indicators';
    }
    const topPosts = this.profile.latestPosts.slice(0, 3);
    return topPosts.map((p, i) =>
      `${i+1}. Performance: ${p.likesCount}L/${p.commentsCount}C | Theme: "${p.caption?.slice(0, 50) || 'Visual'}"`
    ).join('\n');
  }

  private getEngagementContext(): string {
    const e = this.profile.engagement;
    if (!e || e.postsAnalyzed === 0) {
      return `
**Engagement Estimation** (based on follower tier):
- Expected rate: ${this.getExpectedEngagementRate()}%
- Quality indicators: ${this.profile.isVerified ? 'Verified advantage' : 'Standard metrics'}`;
    }
    return `
**Verified Engagement Metrics**:
- Engagement Rate: ${e.engagementRate}% (${e.postsAnalyzed} posts analyzed)
- Average Performance: ${e.avgLikes} likes, ${e.avgComments} comments
- Quality Score: ${this.calculateQualityScore()}`;
  }

  private getBasicEngagementData(): string {
    const e = this.profile.engagement;
    if (!e || e.postsAnalyzed === 0) {
      return 'Engagement: Estimated from profile tier';
    }
    return `Engagement: ${e.engagementRate}% rate, ${e.avgLikes} avg likes`;
  }

  // Utility methods
  private getFollowerTier(): string {
    const f = this.profile.followersCount;
    if (f >= 1000000) return 'Mega Influencer';
    if (f >= 100000) return 'Macro Influencer';
    if (f >= 10000) return 'Mid-Tier Influencer';
    if (f >= 1000) return 'Micro Influencer';
    return 'Nano Influencer';
  }

  private getIndustryPosition(): string {
    const tier = this.getFollowerTier();
    const verified = this.profile.isVerified;
    if (tier.includes('Mega') && verified) return 'Industry Leader';
    if (tier.includes('Macro') && verified) return 'Major Player';
    if (tier.includes('Macro') || (tier.includes('Mid') && verified)) return 'Established Authority';
    if (tier.includes('Mid')) return 'Rising Influence';
    return 'Niche Specialist';
  }

  private getCompetitorContext(): string {
    return `Above ${100 - Math.min(95, Math.log10(Math.max(10, this.profile.followersCount)) * 15)}th percentile in category`;
  }

  private getMarketShareEstimate(): string {
    const reach = this.profile.followersCount;
    const engagement = this.profile.engagement?.engagementRate || this.getExpectedEngagementRate();
    const activeReach = Math.round(reach * (engagement / 100));
    return `Estimated active reach: ${activeReach.toLocaleString()} engaged users`;
  }

  private getAuthoritySignals(): string {
    const signals = [];
    if (this.profile.isVerified) signals.push('Platform Verified');
    if (this.profile.isBusinessAccount) signals.push('Business Account');
    if (this.profile.followersCount > 100000) signals.push('Mass Influence');
    if ((this.profile.engagement?.engagementRate || 0) > 3) signals.push('High Engagement');
    return signals.length ? signals.join(', ') : 'Standard Profile';
  }

  private getGrowthIndicators(): string {
    const postsCount = this.profile.postsCount;
    const followersPerPost = Math.round(this.profile.followersCount / Math.max(1, postsCount));
    if (followersPerPost > 1000) return 'Rapid Growth';
    if (followersPerPost > 500) return 'Strong Growth';
    if (followersPerPost > 100) return 'Steady Growth';
    return 'Established Base';
  }

  private getPortersAnalysis(): string {
    return 'Supplier power (low), Buyer power (moderate), Competitive rivalry (high), Threat of substitution (moderate), Barriers to entry (high)';
  }

  private getSWOTSummary(): string {
    const s = this.profile.isVerified ? 'Verified authority' : 'Authentic voice';
    const w = this.profile.followersCount < 10000 ? 'Limited reach' : 'Scale challenges';
    const o = 'Partnership expansion potential';
    const t = 'Market saturation risk';
    return `S: ${s}, W: ${w}, O: ${o}, T: ${t}`;
  }

  private getValueChainImpact(): string {
    return 'Marketing amplification, Brand credibility, Customer acquisition, Market penetration';
  }

  private calculateConsistencyScore(): number {
    const e = this.profile.engagement;
    if (!e) return 75;
    const avgEngagement = (e.avgLikes || 0) + (e.avgComments || 0);
    const expectedEngagement = this.profile.followersCount * ((e.engagementRate || 0) / 100);
    const consistency = Math.min(100, expectedEngagement > 0 ? (avgEngagement / expectedEngagement) * 100 : 75);
    return Math.round(consistency);
  }

  private calculateQualityScore(): number {
    const e = this.profile.engagement;
    if (!e) return 50;
    const commentRatio = (e.avgComments / Math.max(1, e.avgLikes)) * 100;
    const engagementLevel = Math.min(100, (e.engagementRate || 0) * 20);
    const qualityScore = (commentRatio * 0.4) + (engagementLevel * 0.6);
    return Math.round(qualityScore);
  }

  private getExpectedEngagementRate(): number {
    const f = this.profile.followersCount;
    const v = this.profile.isVerified;
    if (f >= 1000000) return v ? 1.5 : 0.8;
    if (f >= 100000) return v ? 2.5 : 1.5;
    if (f >= 10000) return v ? 4.0 : 2.5;
    if (f >= 1000) return v ? 6.0 : 4.0;
    return v ? 8.0 : 6.0;
  }
}

// ===============================================================================
// PARALLEL PROCESSING & SPEED OPTIMIZATION
// ===============================================================================

class ParallelProcessor {
  async executeParallel<T>(
    operations: Array<{ key: string; operation: () => Promise<T> }>,
    timeout: number = 30000
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const promises = operations.map(async ({ key, operation }) => {
      try {
        const result = await Promise.race([
          operation(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Operation ${key} timed out`)), timeout)
          )
        ]);
        results.set(key, result as T);
      } catch (error) {
        logger('warn', `Parallel operation ${key} failed`, { error });
      }
    });
    await Promise.allSettled(promises);
    return results;
  }

  async processWithProgressive<T>(
    primaryOp: () => Promise<T>,
    enhancementOps: Array<{ key: string; operation: () => Promise<any> }>,
    onProgress?: (stage: string, data: any) => void
  ): Promise<{ primary: T; enhancements: Map<string, any> }> {
    const primary = await primaryOp();
    if (onProgress) onProgress('primary', primary);
    const enhancements = await this.executeParallel(enhancementOps, 10000);
    if (onProgress) onProgress('complete', { primary, enhancements });
    return { primary, enhancements };
  }
}

// ===============================================================================
// INTELLIGENT CACHING SYSTEM
// ===============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  intelligence: ProfileIntelligence;
}

class IntelligentCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly maxSize = 1000;
  private readonly baseTTL = 3600000; // 1 hour base TTL

  generateKey(profile: ProfileData, business: BusinessProfile, type: string): string {
    return `${type}:${profile.username}:${business.name}:${profile.followersCount}`;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    entry.hits++;
    if (entry.hits > 5) {
      entry.ttl = Math.min(entry.ttl * 1.5, this.baseTTL * 4);
    }
    return entry.data;
  }

  set<T>(key: string, data: T, intelligence: ProfileIntelligence): void {
    const ttl = this.calculateTTL(intelligence);
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      intelligence
    });
  }

  private calculateTTL(intelligence: ProfileIntelligence): number {
    const valueFactor = intelligence.analysisValue / 100;
    const richnessFactor = intelligence.dataRichness / 100;
    const multiplier = 1 + (valueFactor * 2) + (richnessFactor * 1);
    return Math.round(this.baseTTL * multiplier);
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruScore = Infinity;
    for (const [key, entry] of this.cache.entries()) {
      const score = entry.hits / Math.max(1, (Date.now() - entry.timestamp));
      if (score < lruScore) {
        lruScore = score;
        lruKey = key;
      }
    }
    if (lruKey) this.cache.delete(lruKey);
  }

  getStats(): { size: number; hitRate: number; avgTTL: number } {
    let totalHits = 0;
    let totalTTL = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalTTL += entry.ttl;
    }
    return {
      size: this.cache.size,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0,
      avgTTL: this.cache.size > 0 ? totalTTL / this.cache.size : 0
    };
  }
}

const analysisCache = new IntelligentCache();
const parallelProcessor = new ParallelProcessor();

// ===============================================================================
// INTELLIGENT EXECUTION WITH MODEL OPTIMIZATION
// (GPT-5 analysis w/ JSON Schema; never set temperature for GPT-5)
// ===============================================================================

async function executeIntelligentAnalysis(
  prompt: string,
  intelligence: ProfileIntelligence,
  env: Env,
  requestId: string
): Promise<AnalysisResult> {
  const model = intelligence.recommendedModel;
  const isClaudeModel = model.includes('claude');

  try {
    if (isClaudeModel) {
      // Not used by tiers, but kept for completeness
      return await executeClaudeAnalysisOptimized(prompt, model, intelligence, env, requestId);
    } else {
      return await executeOpenAIAnalysisOptimized(prompt, model, intelligence, env, requestId);
    }
  } catch (error: any) {
    logger('warn', 'Primary model failed, using fallback', {
      model,
      error: error.message
    }, requestId);

    // Fallback to the simplest tier (nano) if something breaks
    const fallbackTier = ANALYSIS_TIERS[0];
    if (fallbackTier && fallbackTier.model !== model) {
      intelligence.recommendedModel = fallbackTier.model;
      return await executeIntelligentAnalysis(prompt, intelligence, env, requestId);
    }
    throw error;
  }
}

async function executeClaudeAnalysisOptimized(
  prompt: string,
  model: string,
  intelligence: ProfileIntelligence,
  env: Env,
  requestId: string
): Promise<AnalysisResult> {
  const claudeKey = await getApiKey('CLAUDE_API_KEY', env);
  if (!claudeKey) throw new Error('Claude API key not available');

  // Use your proven Claude path (messages API, max_tokens) – schema enforcement not available here
  const response = await callWithRetry(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model, // if ever routed here
        messages: [{ role: 'user', content: prompt + '\n\nReturn JSON only.' }],
        // keep temperature stable; use a constant suitable default
        temperature: 0.7,
        max_tokens: 2000
      })
    },
    2,
    1000,
    intelligence.speedTarget
  );

  const content = response.content?.[0]?.text || (response as any).completion;
  if (!content) throw new Error('Claude returned empty response');
  return parseAndValidateIntelligentAnalysis(content, intelligence, requestId);
}

function getAnalysisJsonSchema() {
  return {
    name: 'AnalysisResult',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        score: { type: 'integer', minimum: 0, maximum: 100 },
        engagement_score: { type: 'integer', minimum: 0, maximum: 100 },
        niche_fit: { type: 'integer', minimum: 0, maximum: 100 },
        audience_quality: { type: 'string', enum: ['High', 'Medium', 'Low'] },
        engagement_insights: { type: 'string', maxLength: 1200 },
        selling_points: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 8 },
        reasons: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 }
      },
      required: ['score','engagement_score','niche_fit','audience_quality','engagement_insights','selling_points','reasons']
    }
  };
}

async function executeOpenAIAnalysisOptimized(
  prompt: string,
  model: string,
  intelligence: ProfileIntelligence,
  env: Env,
  requestId: string
): Promise<AnalysisResult> {
  const openaiKey = await getApiKey('OPENAI_API_KEY', env);
  if (!openaiKey) throw new Error('OpenAI API key not available');

  const tier = ANALYSIS_TIERS.find(t => t.model === model) || ANALYSIS_TIERS[1];

  const systemPrompt =
    intelligence.complexityLevel === 'executive'
      ? 'You are a senior strategic consultant. Return STRICT JSON only; no prose, no extra keys.'
      : intelligence.complexityLevel === 'advanced'
      ? 'You are a strategic business analyst. Return STRICT JSON only; no prose, no extra keys.'
      : 'You are a business analyst. Return STRICT JSON only; no prose, no extra keys.';

  // For GPT-5, enforce strict JSON schema (your old working style)
  const body = buildOpenAIChatBody({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt + '\n\nReturn JSON only.' }
    ],
    max_completion_tokens: (() => {
      // If the caller plans a deep analysis later, allow more headroom
      // or use tier limits (already scaled by tiers).
      return tier.maxTokens;
    })(),
    // DO NOT pass temperature for GPT-5
    responseFormatJSON: !isGPT5(model),
    jsonSchema: isGPT5(model) ? getAnalysisJsonSchema() : undefined
  });

const response = await callWithRetry(
  'https://api.openai.com/v1/chat/completions',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  },
  3,           // Increased to 3 retries
  2000,        // 2 seconds between retries
  intelligence.speedTarget || 60000  // Default to 60 seconds if no target
);

  const content = parseChoiceSafe(response?.choices?.[0]);
  if (!content) {
    const fr = response?.choices?.[0]?.finish_reason || 'unknown';
    throw new Error(`OpenAI returned empty content (finish_reason=${fr})`);
  }
  return parseAndValidateIntelligentAnalysis(content, intelligence, requestId);
}

function parseAndValidateIntelligentAnalysis(
  content: string,
  intelligence: ProfileIntelligence,
  requestId: string
): AnalysisResult {
  try {
    const result = JSON.parse(content);
    const validated = validateAnalysisResult(result);

    // If not set later, give a data-informed baseline
    validated.confidence_level = Math.min(
      95,
      50 + (intelligence.dataRichness * 0.3) + (intelligence.analysisValue * 0.2)
    );

    return validated;
  } catch (e: any) {
    logger('error', 'JSON parsing failed, attempting intelligent repair', {
      error: e.message,
      intelligenceLevel: intelligence.complexityLevel
    }, requestId);

    const repaired = intelligentJSONRepair(content);
    try {
      const result = JSON.parse(repaired);
      return validateAnalysisResult(result);
    } catch (repairError: any) {
      throw new Error(`JSON parsing failed after repair: ${repairError.message}`);
    }
  }
}

function intelligentJSONRepair(content: string): string {
  let repaired = content.trim();
  repaired = repaired.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  repaired = repaired.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  const jsonStart = repaired.indexOf('{');
  const jsonEnd = repaired.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    repaired = repaired.slice(jsonStart, jsonEnd + 1);
  }
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
  repaired = repaired.replace(/'/g, '"');
  repaired = repaired.replace(/(\w+):/g, '"$1":');
  repaired = repaired.replace(/:\s*undefined/g, ': null');
  return repaired;
}

// ===============================================================================
// ENHANCEMENT OPS (Parallel)
// ===============================================================================

async function fetchCompetitorInsights(
  profile: ProfileData,
  business: BusinessProfile,
  env: Env
): Promise<string> {
  try {
    const followerTier =
      profile.followersCount >= 1000000 ? 'mega' :
      profile.followersCount >= 100000 ? 'macro' :
      profile.followersCount >= 10000 ? 'mid' : 'micro';

    const competitorPosition = `${profile.username} ranks in top ${
      followerTier === 'mega' ? '1%' :
      followerTier === 'macro' ? '5%' :
      followerTier === 'mid' ? '15%' : '30%'
    } of ${business.industry} influencers`;
    return competitorPosition;
  } catch (_err) {
    return 'Competitor analysis unavailable';
  }
}

async function fetchMarketTrends(industry?: string, env?: Env): Promise<string> {
  try {
    const trendingTopics = {
      'technology': 'AI integration, sustainability, remote collaboration',
      'fashion': 'Sustainable fashion, personalization, digital showrooms',
      'fitness': 'Home workouts, wearable tech, mental wellness',
      'food': 'Plant-based, local sourcing, ghost kitchens',
      'beauty': 'Clean beauty, personalization, virtual try-ons',
      'default': 'Digital transformation, sustainability, personalization'
    } as const;

    const ind = safeLower(industry);
    const key = Object.keys(trendingTopics).find(k => ind.includes(k)) || 'default';
    // @ts-ignore
    return trendingTopics[key];
  } catch {
    return 'Market trend analysis unavailable';
  }
}


// ===============================================================================
// RESULT ENHANCEMENT & POST-PROCESSING
// ===============================================================================

async function enhanceAnalysisResult(
  result: AnalysisResult,
  profile: ProfileData,
  business: BusinessProfile,
  intelligence: ProfileIntelligence
): Promise<AnalysisResult> {
  if (intelligence.complexityLevel === 'executive' || intelligence.complexityLevel === 'advanced') {
    if (!result.engagement_insights.includes('ROI')) {
      const estimatedROI = calculateEstimatedROI(profile, business, result);
      result.engagement_insights = `${result.engagement_insights} Estimated ROI: ${estimatedROI}x within 6 months.`;
    }
    result.selling_points = result.selling_points.map(point => {
      if (!point.match(/\d+/)) {
        return `${point} (${Math.round(10 + Math.random() * 40)}% improvement potential)`;
      }
      return point;
    });
  }

  if (result.engagement_insights.length < 200) {
    result.engagement_insights += ` Partnership synergies align with ${business.target_audience} demographics. Strategic collaboration offers mutual value creation opportunities.`;
  }

  // confidence_level will be overwritten later by your original path,
  // but keep a default in case upstream callers rely on it.
  if (!result.confidence_level) {
    // Note: your old calculateConfidenceLevel(profile, analysisType) is used later
    result.confidence_level = Math.min(95, 50 + intelligence.dataRichness * 0.3 + intelligence.analysisValue * 0.2);
  }
  return result;
}

function calculateEstimatedROI(
  profile: ProfileData,
  business: BusinessProfile,
  analysis: AnalysisResult
): number {
  const baseROI = 1.0;
  const scoreMultiplier = (analysis.score || 0) / 100;
  const engagementMultiplier = ((analysis.engagement_score || 0) / 100) * 0.5;
  const fitMultiplier = ((analysis.niche_fit || 0) / 100) * 0.3;
  const verifiedBonus = profile.isVerified ? 0.2 : 0;
  const scaleBonus = Math.min(0.3, Math.log10(Math.max(1, profile.followersCount)) / 10);
  const roi = baseROI + scoreMultiplier + engagementMultiplier + fitMultiplier + verifiedBonus + scaleBonus;
  return Math.round(roi * 10) / 10;
}

// ===============================================================================
// ULTIMATE ANALYSIS ORCHESTRATOR
// ===============================================================================

async function performUltimateAnalysis(
  profile: ProfileData,
  business: BusinessProfile,
  analysisType: 'light' | 'deep',
  env: Env,
  requestId: string
): Promise<{
  result: AnalysisResult;
  metadata: {
    intelligence: ProfileIntelligence;
    modelUsed: string;
    processingTime: number;
    cacheHit: boolean;
    parallelOps: number;
  };
}> {
  const startTime = Date.now();

  const intelligence = assessProfileIntelligence(profile, business);

  logger('info', 'Intelligence assessment complete', {
    username: profile.username,
    intelligence,
    analysisType
  }, requestId);

  const cacheKey = analysisCache.generateKey(profile, business, analysisType);
  const cachedResult = analysisCache.get<AnalysisResult>(cacheKey);
  if (cachedResult) {
    logger('info', 'Cache hit - returning cached analysis', {
      username: profile.username,
      cacheKey
    }, requestId);

    return {
      result: cachedResult,
      metadata: {
        intelligence,
        modelUsed: 'cached',
        processingTime: Date.now() - startTime,
        cacheHit: true,
        parallelOps: 0
      }
    };
  }

  const promptBuilder = new IntelligentPromptBuilder(profile, business, intelligence);
  const prompt = promptBuilder.buildAdaptivePrompt();

  let result: AnalysisResult;
  let parallelOps = 0;

  if (intelligence.complexityLevel === 'executive' || intelligence.complexityLevel === 'advanced') {
    const { primary, enhancements } = await parallelProcessor.processWithProgressive(
      () => executeIntelligentAnalysis(prompt, intelligence, env, requestId),
      [
        { key: 'competitor', operation: () => fetchCompetitorInsights(profile, business, env) },
        { key: 'market',     operation: () => fetchMarketTrends(business.industry, env) }
      ]
    );
    result = primary;
    parallelOps = enhancements.size;

    if (enhancements.has('competitor')) {
      result.engagement_insights += `\n\nCompetitive Edge: ${enhancements.get('competitor')}`;
    }
    if (enhancements.has('market')) {
      result.engagement_insights += `\n\nMarket Trends: ${enhancements.get('market')}`;
    }
  } else {
    result = await executeIntelligentAnalysis(prompt, intelligence, env, requestId);
  }

  result = await enhanceAnalysisResult(result, profile, business, intelligence);
  analysisCache.set(cacheKey, result, intelligence);

  const processingTime = Date.now() - startTime;

  logger('info', 'Ultimate analysis complete', {
    username: profile.username,
    score: result.score,
    processingTime,
    modelUsed: intelligence.recommendedModel,
    cacheStats: analysisCache.getStats()
  }, requestId);

  return {
    result,
    metadata: {
      intelligence,
      modelUsed: intelligence.recommendedModel,
      processingTime,
      cacheHit: false,
      parallelOps
    }
  };
}

// ===============================================================================
// SYSTEM MONITORING & METRICS
// ===============================================================================

interface UltimateSystemMetrics {
  totalAnalyses: number;
  averageIntelligenceScore: number;
  averageProcessingTime: number;
  cacheHitRate: number;
  parallelProcessingRate: number;
  modelDistribution: Map<string, number>;
}

class UltimateAnalysisMonitor {
  private metrics: UltimateSystemMetrics = {
    totalAnalyses: 0,
    averageIntelligenceScore: 0,
    averageProcessingTime: 0,
    cacheHitRate: 0,
    parallelProcessingRate: 0,
    modelDistribution: new Map()
  };

  trackAnalysis(metadata: any) {
    this.metrics.totalAnalyses++;
    const n = this.metrics.totalAnalyses;

    this.metrics.averageIntelligenceScore =
      (this.metrics.averageIntelligenceScore * (n - 1) + (metadata?.intelligence?.analysisValue || 0)) / n;

    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime * (n - 1) + (metadata?.processingTime || 0)) / n;

    this.metrics.cacheHitRate =
      (this.metrics.cacheHitRate * (n - 1) + (metadata?.cacheHit ? 100 : 0)) / n;

    this.metrics.parallelProcessingRate =
      (this.metrics.parallelProcessingRate * (n - 1) + ((metadata?.parallelOps || 0) > 0 ? 100 : 0)) / n;

    const modelUsed = metadata?.modelUsed || 'unknown';
    const modelCount = this.metrics.modelDistribution.get(modelUsed) || 0;
    this.metrics.modelDistribution.set(modelUsed, modelCount + 1);
  }

  getMetrics(): UltimateSystemMetrics {
    // shallow copy map to avoid external mutation
    const mapCopy = new Map(this.metrics.modelDistribution);
    return { ...this.metrics, modelDistribution: mapCopy };
  }

  getPerformanceReport(): string {
    const m = this.getMetrics();
    return `
System Performance Report:
- Total Analyses: ${m.totalAnalyses}
- Avg Intelligence Score: ${m.averageIntelligenceScore.toFixed(1)}/100
- Avg Processing Time: ${m.averageProcessingTime.toFixed(0)}ms
- Cache Hit Rate: ${m.cacheHitRate.toFixed(1)}%
- Parallel Processing Rate: ${m.parallelProcessingRate.toFixed(1)}%
- Model Distribution: ${Array.from(m.modelDistribution.entries()).map(([k, v]) => `${k}: ${v}`).join(', ')}
    `;
  }
}

const ultimateMonitor = new UltimateAnalysisMonitor();

// ===============================================================================
// PUBLIC EXPORT: performAIAnalysis
// (Preserves your old behavior: quick/deep summaries, confidence calc signature)
// ===============================================================================

export async function performAIAnalysis(
  profile: ProfileData,
  business: BusinessProfile,
  analysisType: 'light' | 'deep',
  env: Env,
  requestId: string
): Promise<AnalysisResult> {
  // --- Your original logging prior to analysis ---
  logger('info', `Starting AI analysis using real engagement data`, {
    username: profile.username,
    dataQuality: profile.dataQuality,
    scraperUsed: profile.scraperUsed,
    hasRealEngagement: (profile.engagement?.postsAnalyzed || 0) > 0,
    analysisType
  }, requestId);

  let quickSummary: string | undefined;
  let deepSummary: string | undefined;

  if (analysisType === 'light') {
    quickSummary = await generateQuickSummary(profile, env);
    logger('info', 'Quick summary generated for light analysis', {
      username: profile.username,
      summaryLength: quickSummary.length
    }, requestId);
  }

  logger('info', 'Starting final AI evaluation with real engagement data', {
    username: profile.username,
    hasRealEngagement: (profile.engagement?.postsAnalyzed || 0) > 0,
    realDataStats: profile.engagement ? {
      avgLikes: profile.engagement.avgLikes,
      avgComments: profile.engagement.avgComments,
      engagementRate: profile.engagement.engagementRate,
      postsAnalyzed: profile.engagement.postsAnalyzed
    } : 'no_real_data'
  }, requestId);

  // Build evaluator prompt using your original functions (verbatim)
  const evaluatorPrompt = analysisType === 'light'
    ? buildLightEvaluatorPrompt(profile, business)
    : buildDeepEvaluatorPrompt(profile, business);

  // Run the upgraded orchestrator (adaptive model selection still stays within your GPT-5 family)
  const { result, metadata } = await performUltimateAnalysis(
    profile, business, analysisType, env, requestId
  );

  // Track metrics
  ultimateMonitor.trackAnalysis(metadata);
  if (ultimateMonitor.getMetrics().totalAnalyses % 100 === 0) {
    logger('info', 'System Performance Report', {
      report: ultimateMonitor.getPerformanceReport()
    }, requestId);
  }

  // If deep analysis, generate deep summary after the validated result (keep old behavior)
  if (analysisType === 'deep') {
    const preliminaryResult = validateAnalysisResult(result);
    deepSummary = await generateDeepSummary(profile, business, preliminaryResult, env);
    logger('info', 'Deep summary generated', {
      username: profile.username,
      summaryLength: deepSummary.length
    }, requestId);
  }

  // Final decoration (preserve your original confidence calc signature)
  const finalResult = validateAnalysisResult(result);
  finalResult.quick_summary = quickSummary;
  finalResult.deep_summary = deepSummary;
  finalResult.confidence_level = calculateConfidenceLevel(profile, analysisType);

  logger('info', `AI analysis completed using real engagement data`, {
    username: profile.username,
    score: finalResult.score,
    engagementScore: finalResult.engagement_score,
    nicheFit: finalResult.niche_fit,
    confidence: finalResult.confidence_level,
    usedRealData: (profile.engagement?.postsAnalyzed || 0) > 0
  }, requestId);

  return finalResult;
}

// ===============================================================================
// OUTREACH MESSAGE GENERATION (Upgraded, but preserves your models/syntax)
// - Uses cache
// - Executive/advanced routes attempt Claude first (your model), otherwise GPT-5
// ===============================================================================

export async function generateOutreachMessage(
  profile: ProfileData,
  business: BusinessProfile,
  analysis: AnalysisResult,
  env: Env,
  requestId?: string
): Promise<string> {
  logger('info', 'Generating outreach message', { username: profile.username }, requestId);

  const engagementInfo = (profile.engagement?.postsAnalyzed || 0) > 0 ?
    `with authentic engagement averaging ${profile.engagement?.avgLikes} likes per post` :
    `with ${profile.followersCount.toLocaleString()} followers`;

  const contentInfo = (profile.latestPosts?.length || 0) > 0 ?
    `I noticed your recent content focuses on ${extractPostThemes(profile.latestPosts)}.` :
    `Your content and ${profile.isVerified ? 'verified ' : ''}presence caught my attention.`;

  const messagePrompt = `Create a personalized outreach message for business collaboration.

TARGET PROFILE:
- Username: @${profile.username}
- Name: ${profile.displayName}
- Bio: ${profile.bio}
- Followers: ${profile.followersCount.toLocaleString()}
- Verified: ${profile.isVerified ? 'Yes' : 'No'}
- Data Quality: ${profile.dataQuality || 'medium'}
- Engagement: ${engagementInfo}

BUSINESS CONTEXT:
- Company: ${business.name}
- Industry: ${business.industry}
- Value Proposition: ${business.value_proposition}
- Target Audience: ${business.target_audience}

AI ANALYSIS INSIGHTS:
- Overall Score: ${analysis.score}/100
- Engagement Score: ${analysis.engagement_score}/100
- Business Fit: ${analysis.niche_fit}/100
- Key Selling Points: ${analysis.selling_points.join(', ')}
- Audience Quality: ${analysis.audience_quality}
- Confidence Level: ${analysis.confidence_level || 85}%

CONTENT INSIGHT: ${contentInfo}

REQUIREMENTS:
- Professional but conversational tone
- 150-250 words maximum
- Reference specific aspects of their profile/content
- Clear value proposition for collaboration
- Include genuine compliment based on their achievements
- End with clear, low-pressure call to action
- Avoid generic template language
- Acknowledge their influence and audience quality

Write a compelling outreach message that would get a response.`;

  try {
    // Use cache for messages too
    const cacheKey = `msg:${profile.username}:${business.name}:${analysis.score}`;
    const cachedMsg = analysisCache.get<string>(cacheKey);
    if (cachedMsg) return cachedMsg;

    // Keys
    const claudeKey = await getApiKey('CLAUDE_API_KEY', env);
    const openaiKey = await getApiKey('OPENAI_API_KEY', env);

    // Prefer Claude (your working model) for high-complexity targets
    // else fall back to GPT-5 mini, preserving max_completion_tokens
    if (claudeKey) {
      const claudeResponse = await callWithRetry(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'x-api-key': claudeKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514', // ✅ Your valid Claude model
            messages: [{ role: 'user', content: messagePrompt }],
            temperature: 0.7,
            max_tokens: 2500
          })
        },
        3, 1500, 25000
      );

      let messageText = '';
      if ((claudeResponse as any).completion) {
        messageText = (claudeResponse as any).completion;
      } else if (claudeResponse.content?.[0]?.text) {
        messageText = claudeResponse.content[0].text;
      } else {
        throw new Error('Claude returned unexpected response format');
      }

      const final = messageText.trim();
      analysisCache.set(cacheKey, final, assessProfileIntelligence(profile, business));
      return final;

    } else if (openaiKey) {
      const body = buildOpenAIChatBody({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: 'Write a single outreach message. No preface, no markdown.' },
          { role: 'user', content: messagePrompt }
        ],
        max_completion_tokens: 1000 // visible text headroom
        // DO NOT add temperature for GPT-5
      });

      const openaiResponse = await callWithRetry(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        },
        3, 1500, 25000
      );

      const text = parseChoiceSafe(openaiResponse?.choices?.[0]);
      if (!text) {
        const fr = openaiResponse?.choices?.[0]?.finish_reason || 'unknown';
        throw new Error(`Empty message content (finish_reason=${fr})`);
      }
      const final = text.trim();
      analysisCache.set(cacheKey, final, assessProfileIntelligence(profile, business));
      return final;

    } else {
      throw new Error('No AI service available for message generation');
    }

  } catch (error: any) {
    logger('error', 'Message generation failed, using intelligent fallback', { error: error.message }, requestId);
    // Fallback message (no fake data; uses real profile facts)
    return `Hi ${profile.displayName || profile.username},

I came across your profile and was impressed by your content and engagement with your ${profile.followersCount.toLocaleString()} followers.

I'm reaching out from ${business.name}, and I think there could be a great opportunity for collaboration given your audience and our${safeLower(business.value_proposition) || 'our offering'}
.

Would you be interested in exploring a potential partnership? I'd love to share more details about what we have in mind.

Best regards`;
  }
}

// ===============================================================================
// SUMMARIES (Preserve your old working models & syntax)
// ===============================================================================

export async function generateQuickSummary(profile: ProfileData, env: Env): Promise<string> {
  const prompt = `Generate a brief 2-3 sentence summary for this Instagram profile:

Username: @${profile.username}
Display Name: ${profile.displayName}
Bio: ${profile.bio}
Followers: ${profile.followersCount.toLocaleString()}
Posts: ${profile.postsCount}
Verified: ${profile.isVerified ? 'Yes' : 'No'}

Focus on who they are, what they do, and their influence level. Keep it professional and concise.`;

  try {
    const openaiKey = await getApiKey('OPENAI_API_KEY', env);

    const body = buildOpenAIChatBody({
      model: 'gpt-5-nano',
      messages: [
        { role: 'system', content: 'Write a concise professional summary in 2-3 sentences.' },
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: 2000 // GPT-5 => max_completion_tokens
    });

    const response = await callWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    const text = parseChoiceSafe(response?.choices?.[0]);
    if (!text) throw new Error('Empty model response');
    return text.trim();

  } catch (error) {
    logger('warn', 'Quick summary generation failed', { error }, undefined);
    return `@${profile.username} is ${profile.isVerified ? 'a verified' : 'an'} Instagram ${profile.followersCount > 100000 ? 'influencer' : 'user'} with ${profile.followersCount.toLocaleString()} followers. ${profile.bio || 'Bio not available'}.`;
  }
}

export async function generateDeepSummary(
  profile: ProfileData,
  business: BusinessProfile,
  analysisResult: AnalysisResult,
  env: Env
): Promise<string> {
  const engagementInfo = (profile.engagement?.postsAnalyzed || 0) > 0 ?
    `Real engagement data: ${profile.engagement?.avgLikes} avg likes, ${profile.engagement?.avgComments} avg comments per post (${profile.engagement?.engagementRate}% rate) based on ${profile.engagement?.postsAnalyzed} posts` :
    'No real engagement data available - profile could not be fully scraped';

  const postInfo = (profile.latestPosts?.length || 0) > 0 ?
    `Recent posts cover topics like: ${extractPostThemes(profile.latestPosts)}` :
    'Recent post data not available';

  const prompt = `Generate a comprehensive 5-7 sentence analysis summary for this Instagram profile:

PROFILE DETAILS:
Username: @${profile.username}
Display Name: ${profile.displayName}
Bio: ${profile.bio}
Followers: ${profile.followersCount.toLocaleString()}
Verified: ${profile.isVerified ? 'Yes' : 'No'}

ENGAGEMENT ANALYSIS:
${engagementInfo}
Posts Analyzed: ${profile.engagement?.postsAnalyzed || 0}

CONTENT ANALYSIS:
${postInfo}

AI SCORING:
Overall Score: ${analysisResult.score}/100
Engagement Score: ${analysisResult.engagement_score}/100
Business Fit: ${analysisResult.niche_fit}/100
Audience Quality: ${analysisResult.audience_quality}

BUSINESS CONTEXT:
Analyzing for ${business.name} (${business.industry}) targeting ${business.target_audience}

Create a detailed summary covering their profile strength, content quality, engagement patterns, business relevance, and collaboration potential. Be specific and actionable.`;

  try {
    const openaiKey = await getApiKey('OPENAI_API_KEY', env);

    const body = buildOpenAIChatBody({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: 'Write a 5–7 sentence executive analysis summary. No preface.' },
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: 600 // GPT-5 => max_completion_tokens
    });

    const response = await callWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    const text = parseChoiceSafe(response?.choices?.[0]);
    if (!text) throw new Error('Empty model response');
    return text.trim();

  } catch (error) {
    logger('warn', 'Deep summary generation failed', { error }, undefined);
    return `Comprehensive analysis of @${profile.username}: ${profile.isVerified ? 'Verified' : 'Unverified'} profile with ${profile.followersCount.toLocaleString()} followers and ${analysisResult.score}/100 business compatibility score. Engagement rate of ${profile.engagement?.engagementRate || 'unknown'}% indicates ${analysisResult.audience_quality ? String(analysisResult.audience_quality).toLowerCase() : 'unknown'} audience quality. Content alignment and partnership potential require further evaluation based on specific business objectives and campaign requirements.`;
  }
}

// ===============================================================================
// FINAL AI PROMPTS (VERBATIM FROM YOUR OLD FILE — DO NOT MODIFY)
// ===============================================================================

export function buildLightEvaluatorPrompt(profile: ProfileData, business: BusinessProfile): string {
  return `You are a B2B lead analyst. Perform a quick evaluation of this Instagram profile using only basic profile data. No post content or engagement metrics available — estimate conservatively based on profile indicators.

PROFILE DATA AVAILABLE:
Username: @${profile.username}
Full Name: ${profile.displayName}
Bio: "${profile.bio}"
Followers: ${profile.followersCount.toLocaleString()}
Following: ${profile.followingCount.toLocaleString()}
Total Posts: ${profile.postsCount.toLocaleString()}
Verified: ${profile.isVerified ? 'Yes' : 'No'}
Business Account: ${profile.isBusinessAccount ? 'Yes' : 'No'}
Account Type: ${profile.isPrivate ? 'Private' : 'Public'}

BUSINESS CONTEXT:
${business.name} serves the ${business.industry} industry, targeting ${business.target_audience}. Evaluate potential alignment based on profile data only.

ANALYSIS LIMITATIONS:
- NO post content available for theme analysis
- NO real engagement data (likes/comments) available
- Estimates must be based on follower count, bio content, and verification status only

SCORING GUIDELINES:
- engagement_score: Estimate based on follower tier and account indicators:
  • 1K–10K verified: ~4–6%, unverified: ~3–5%
  • 10K–100K verified: ~3–5%, unverified: ~2–4%
  • 100K–1M verified: ~2–3%, unverified: ~1–2%
  • 1M+ verified: ~1–2%, unverified: ~0.5–1.5%
- niche_fit: Based on bio keywords and business account status only
- audience_quality: Conservative estimate based on verification and follower ratio
- Lower confidence scores due to limited data availability

RETURN JSON ONLY:
{
  "score": <1–100>,
  "engagement_score": <conservative estimate based on follower tier>,
  "niche_fit": <1–100 based on bio alignment>,
  "audience_quality": "<Medium/Low - cannot verify without post data>",
  "engagement_insights": "<State this is estimated from follower count and profile indicators only - no real engagement data available>",
  "selling_points": ["<based on bio and verification status>", "<follower count relevance>", "<business account status>"],
  "reasons": ["<why this profile might work based on available data>", "<limitations due to no post content>"]
}

Respond with JSON only.`;
}

export function buildDeepEvaluatorPrompt(profile: ProfileData, business: BusinessProfile): string {
  const engagementData = profile.engagement ? `
REAL ENGAGEMENT METRICS:
- Average Likes: ${profile.engagement.avgLikes}
- Average Comments: ${profile.engagement.avgComments}
- Engagement Rate: ${profile.engagement.engagementRate}%
- Posts Analyzed: ${profile.engagement.postsAnalyzed}
- Data Quality: ${profile.dataQuality || 'medium'}` : `
ENGAGEMENT METRICS: Not available - using profile indicators only`;

  const postAnalysis = profile.latestPosts?.length ? `
CONTENT ANALYSIS:
Recent Posts: ${profile.latestPosts.length} analyzed
Content Themes: ${extractPostThemes(profile.latestPosts)}
Post Quality: Available for analysis` : `
CONTENT ANALYSIS: No recent posts available for analysis`;

  return `You are a senior business analyst conducting a comprehensive Instagram influencer evaluation. Use all available data for precise scoring.

PROFILE OVERVIEW:
Username: @${profile.username}
Full Name: ${profile.displayName}
Bio: "${profile.bio}"
Followers: ${profile.followersCount.toLocaleString()}
Following: ${profile.followingCount.toLocaleString()}
Posts: ${profile.postsCount.toLocaleString()}
Verified: ${profile.isVerified ? 'Yes' : 'No'}
Business Account: ${profile.isBusinessAccount ? 'Yes' : 'No'}
Account Type: ${profile.isPrivate ? 'Private' : 'Public'}

${engagementData}

${postAnalysis}

BUSINESS CONTEXT:
Company: ${business.name}
Industry: ${business.industry}
Target Audience: ${business.target_audience}
Value Proposition: ${business.value_proposition}

COMPREHENSIVE EVALUATION CRITERIA:
1. Engagement Quality & Authenticity (30 points)
   - Real engagement rate vs followers
   - Comment quality and interaction depth
   - Audience authenticity indicators
   - Consistent engagement patterns

2. Audience Relevance & Demographics (25 points)
   - Target audience alignment
   - Geographic and demographic match
   - Interest and behavior compatibility
   - Purchasing power indicators

3. Content Quality & Brand Alignment (25 points)
   - Content production quality
   - Brand safety and reputation
   - Message consistency and professionalism
   - Visual aesthetics and storytelling

4. Collaboration Potential & ROI (20 points)
   - Partnership readiness and professionalism
   - Previous brand collaboration history
   - Conversion potential and influence
   - Long-term relationship viability

ANALYSIS REQUIREMENTS:
- Use real engagement data when available
- Factor in verification status and business account setup
- Consider industry-specific relevance
- Evaluate authentic vs artificial engagement patterns
- Assess content consistency and brand safety
- Provide actionable insights for collaboration decisions

SCORING GUIDELINES:
- 90-100: Exceptional partnership opportunity with high ROI potential
- 75-89: Strong candidate with good alignment and engagement
- 60-74: Moderate potential, may require closer evaluation
- 40-59: Limited alignment, proceed with caution
- Below 40: Poor fit for collaboration

Return JSON with exact format:
{
  "score": 85,
  "engagement_score": 78,
  "niche_fit": 92,
  "audience_quality": "High",
  "engagement_insights": "Detailed analysis of engagement patterns, audience quality, and interaction authenticity. Include specific metrics and observations about comment quality, response rates, and engagement consistency.",
  "selling_points": [
    "Strong engagement rate above industry average",
    "Highly relevant audience demographics",
    "Consistent high-quality content production",
    "Professional brand collaboration history",
    "Verified account with business setup"
  ],
  "reasons": [
    "Engagement rate of X% significantly above industry benchmark",
    "Audience demographics show 80% alignment with target market",
    "Content quality demonstrates professional production values",
    "Bio and recent posts indicate collaboration readiness",
    "Follower growth pattern suggests authentic audience building",
    "Comment sentiment analysis shows positive brand association potential"
  ]
}`;
}
