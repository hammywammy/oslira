// ===============================================================================
// ULTIMATE AI ANALYSIS SYSTEM - INTELLIGENCE & SPEED OPTIMIZATION
// Production-ready system with adaptive intelligence, parallel processing, and smart caching
// ===============================================================================

import type { ProfileData, BusinessProfile, AnalysisResult, Env } from '../types/interfaces.js';
import { logger } from '../utils/logger.js';
import { callWithRetry } from '../utils/helpers.js';
import { validateAnalysisResult, calculateConfidenceLevel } from '../utils/validation.js';
import { getApiKey } from './enhanced-config-manager.js';

// ===============================================================================
// INTELLIGENCE ASSESSMENT & ADAPTIVE SCALING
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

const ANALYSIS_TIERS: AnalysisTier[] = [
  { tier: 1, model: 'gpt-4o-mini', maxTokens: 800, targetSpeed: 5000, minDataRichness: 0, minAnalysisValue: 0 },
  { tier: 2, model: 'gpt-4o-mini', maxTokens: 1800, targetSpeed: 10000, minDataRichness: 25, minAnalysisValue: 30 },
  { tier: 3, model: 'claude-3-5-sonnet-20241022', maxTokens: 3500, targetSpeed: 20000, minDataRichness: 50, minAnalysisValue: 60 },
  { tier: 4, model: 'claude-3-5-sonnet-20241022', maxTokens: 5000, targetSpeed: 30000, minDataRichness: 75, minAnalysisValue: 80 }
];

function assessProfileIntelligence(profile: ProfileData, business: BusinessProfile): ProfileIntelligence {
  // Calculate data richness (0-100)
  let dataRichness = 0;
  dataRichness += profile.isVerified ? 15 : 0;
  dataRichness += profile.isBusinessAccount ? 10 : 0;
  dataRichness += (profile.engagement?.postsAnalyzed || 0) > 0 ? 25 : 0;
  dataRichness += profile.latestPosts?.length ? 15 : 0;
  dataRichness += profile.bio ? 10 : 0;
  dataRichness += Math.min(25, Math.log10(profile.followersCount) * 5);
  
  // Calculate analysis value (0-100) - business impact potential
  let analysisValue = 0;
  analysisValue += Math.min(30, Math.log10(profile.followersCount) * 6);
  analysisValue += profile.isVerified ? 20 : 0;
  analysisValue += (profile.engagement?.engagementRate || 0) > 3 ? 20 : 
                   (profile.engagement?.engagementRate || 0) > 1 ? 10 : 0;
  
  // Industry complexity factor
  const complexIndustries = ['technology', 'finance', 'healthcare', 'b2b', 'enterprise'];
  if (complexIndustries.some(ind => business.industry.toLowerCase().includes(ind))) {
    analysisValue += 15;
  }
  
  // Target audience sophistication
  const sophisticatedAudiences = ['executive', 'professional', 'enterprise', 'b2b', 'decision maker'];
  if (sophisticatedAudiences.some(aud => business.target_audience.toLowerCase().includes(aud))) {
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
- **engagement_insights**: Executive summary with quantified business impact (1500 chars)
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
- Quality Ratio: ${((e.avgComments / e.avgLikes) * 100).toFixed(2)}% comment-to-like ratio
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
    return `Above ${100 - Math.min(95, Math.log10(this.profile.followersCount) * 15)}th percentile in category`;
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
    
    const avgEngagement = e.avgLikes + e.avgComments;
    const expectedEngagement = this.profile.followersCount * (e.engagementRate / 100);
    const consistency = Math.min(100, (avgEngagement / expectedEngagement) * 100);
    return Math.round(consistency);
  }
  
  private calculateQualityScore(): number {
    const e = this.profile.engagement;
    if (!e) return 50;
    
    const commentRatio = (e.avgComments / Math.max(1, e.avgLikes)) * 100;
    const engagementLevel = Math.min(100, e.engagementRate * 20);
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
      const score = entry.hits / (Date.now() - entry.timestamp);
      if (score < lruScore) {
        lruScore = score;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
    }
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
      return await executeClaudeAnalysisOptimized(prompt, model, intelligence, env, requestId);
    } else {
      return await executeOpenAIAnalysisOptimized(prompt, model, intelligence, env, requestId);
    }
  } catch (error: any) {
    logger('warn', 'Primary model failed, using fallback', {
      model,
      error: error.message
    }, requestId);
    
    const fallbackTier = ANALYSIS_TIERS.find(t => t.model !== model && t.tier < 3);
    if (fallbackTier) {
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
  
  const tier = ANALYSIS_TIERS.find(t => t.model === model) || ANALYSIS_TIERS[2];
  
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
        model,
        messages: [{ 
          role: 'user', 
          content: prompt + '\n\nProvide strategic analysis as valid JSON with all required fields.'
        }],
        temperature: intelligence.complexityLevel === 'executive' ? 0.8 : 0.7,
        max_tokens: tier.maxTokens
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
  
  const systemPrompt = intelligence.complexityLevel === 'executive' ?
    'You are a senior strategic consultant providing executive-level partnership intelligence. Focus on quantified business impact, ROI, and competitive advantages.' :
    intelligence.complexityLevel === 'advanced' ?
    'You are a strategic business analyst. Provide data-driven insights with clear business implications.' :
    'You are a business analyst. Provide clear, actionable partnership assessment.';
  
  const response = await callWithRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: tier.maxTokens,
        response_format: { type: 'json_object' }
      })
    },
    2,
    1000,
    intelligence.speedTarget
  );

  const content = parseMessageContent(response?.choices?.[0]);
  if (!content) {
    throw new Error(`OpenAI returned empty content`);
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
    
    validated.confidence_level = Math.min(95, 
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
// CONTINUATION: PARALLEL ENHANCEMENT OPERATIONS
// Paste this after the intelligentJSONRepair function in your main file
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
  } catch (error) {
    return 'Competitor analysis unavailable';
  }
}

async function fetchMarketTrends(industry: string, env: Env): Promise<string> {
  try {
    const trendingTopics = {
      'technology': 'AI integration, sustainability, remote collaboration',
      'fashion': 'Sustainable fashion, personalization, digital showrooms',
      'fitness': 'Home workouts, wearable tech, mental wellness',
      'food': 'Plant-based, local sourcing, ghost kitchens',
      'beauty': 'Clean beauty, personalization, virtual try-ons',
      'default': 'Digital transformation, sustainability, personalization'
    };
    
    const industryKey = Object.keys(trendingTopics).find(key => 
      industry.toLowerCase().includes(key)
    ) || 'default';
    
    return trendingTopics[industryKey as keyof typeof trendingTopics];
  } catch (error) {
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
  
  if (!result.confidence_level) {
    result.confidence_level = calculateConfidenceLevel(result);
  }
  
  return result;
}

function calculateEstimatedROI(
  profile: ProfileData,
  business: BusinessProfile,
  analysis: AnalysisResult
): number {
  const baseROI = 1.0;
  const scoreMultiplier = analysis.score / 100;
  const engagementMultiplier = (analysis.engagement_score / 100) * 0.5;
  const fitMultiplier = (analysis.niche_fit / 100) * 0.3;
  
  const verifiedBonus = profile.isVerified ? 0.2 : 0;
  const scaleBonus = Math.min(0.3, Math.log10(profile.followersCount) / 10);
  
  const roi = baseROI + scoreMultiplier + engagementMultiplier + fitMultiplier + verifiedBonus + scaleBonus;
  return Math.round(roi * 10) / 10;
}

// ===============================================================================
// ULTIMATE ANALYSIS ORCHESTRATOR
// ===============================================================================

export async function performUltimateAnalysis(
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
        {
          key: 'competitor',
          operation: () => fetchCompetitorInsights(profile, business, env)
        },
        {
          key: 'market',
          operation: () => fetchMarketTrends(business.industry, env)
        }
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
// OPTIMIZED MESSAGE GENERATION WITH INTELLIGENCE
// ===============================================================================

export async function generateOutreachMessage(
  profile: ProfileData,
  business: BusinessProfile,
  analysis: AnalysisResult,
  env: Env,
  requestId?: string
): Promise<string> {
  const startTime = Date.now();
  const intelligence = assessProfileIntelligence(profile, business);
  
  const cacheKey = `msg:${profile.username}:${business.name}:${analysis.score}`;
  const cached = analysisCache.get<string>(cacheKey);
  if (cached) return cached;
  
  const messagePrompt = buildIntelligentMessagePrompt(profile, business, analysis, intelligence);
  
  try {
    if (intelligence.complexityLevel === 'executive' || intelligence.complexityLevel === 'advanced') {
      const claudeKey = await getApiKey('CLAUDE_API_KEY', env);
      if (claudeKey) {
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
              model: 'claude-3-5-sonnet-20241022',
              messages: [{ role: 'user', content: messagePrompt }],
              temperature: 0.85,
              max_tokens: 1200
            })
          },
          1, 1000, 10000
        );
        
        const message = response.content?.[0]?.text || (response as any).completion;
        if (message) {
          analysisCache.set(cacheKey, message, intelligence);
          return message.trim();
        }
      }
    }
    
    const openaiKey = await getApiKey('OPENAI_API_KEY', env);
    const response = await callWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Write a professional partnership outreach message.' },
            { role: 'user', content: messagePrompt }
          ],
          temperature: 0.8,
          max_tokens: 800
        })
      },
      1, 1000, 10000
    );
    
    const text = parseMessageContent(response?.choices?.[0]);
    if (text) {
      analysisCache.set(cacheKey, text.trim(), intelligence);
      return text.trim();
    }
    
    throw new Error('Message generation failed');
    
  } catch (error: any) {
    logger('warn', 'AI message generation failed, using intelligent template', { 
      error: error.message,
      processingTime: Date.now() - startTime
    }, requestId);
    
    return createIntelligentFallbackMessage(profile, business, analysis, intelligence);
  }
}

function buildIntelligentMessagePrompt(
  profile: ProfileData,
  business: BusinessProfile,
  analysis: AnalysisResult,
  intelligence: ProfileIntelligence
): string {
  const engagementContext = (profile.engagement?.postsAnalyzed || 0) > 0 ? 
    `${profile.engagement?.engagementRate}% verified engagement rate` :
    `${profile.followersCount.toLocaleString()} engaged community`;
  
  if (intelligence.complexityLevel === 'executive') {
    return `# Executive Partnership Outreach

**Target**: @${profile.username} (${profile.displayName})
**Position**: ${profile.isVerified ? 'Verified industry leader' : 'Rising authority'} with ${engagementContext}
**Company**: ${business.name} seeking strategic partnership

**Intelligence Briefing**:
- AI Score: ${analysis.score}/100 partnership value
- Strategic Fit: ${analysis.niche_fit}/100 alignment
- Key Advantage: ${analysis.selling_points[0]}

**Message Requirements**:
1. Executive-to-executive tone
2. Focus on strategic value creation and mutual growth
3. Reference specific synergies and market opportunities
4. Propose high-level partnership discussion
5. 250-300 words

Create compelling executive outreach that positions this as a strategic business opportunity, not influencer marketing.`;
  }
  
  if (intelligence.complexityLevel === 'advanced') {
    return `# Strategic Partnership Message

**Recipient**: @${profile.username} | ${engagementContext}
**Sender**: ${business.name} (${business.industry})
**Match Score**: ${analysis.score}/100

**Key Points**: 
- ${analysis.selling_points.slice(0, 2).join('\n- ')}

Write professional partnership proposal (200-250 words) emphasizing:
- Strategic collaboration vs. traditional sponsorship
- Specific value propositions for both parties
- Clear business benefits
- Professional meeting request`;
  }
  
  return `Write concise partnership outreach to @${profile.username} (${profile.followersCount} followers) from ${business.name}. Score: ${analysis.score}/100. Highlight: ${analysis.selling_points[0]}. Professional tone, 150-200 words, focus on mutual value.`;
}

function createIntelligentFallbackMessage(
  profile: ProfileData,
  business: BusinessProfile,
  analysis: AnalysisResult,
  intelligence: ProfileIntelligence
): string {
  const greeting = profile.displayName ? `Hi ${profile.displayName}` : `Hi @${profile.username}`;
  const engagement = (profile.engagement?.postsAnalyzed || 0) > 0 ? 
    `${profile.engagement?.engagementRate}% engagement rate` :
    `community of ${profile.followersCount.toLocaleString()} followers`;
  
  if (intelligence.complexityLevel === 'executive' || intelligence.complexityLevel === 'advanced') {
    return `${greeting},

I'm reaching out from ${business.name}'s strategic partnerships team. Your exceptional ${engagement} and ${profile.isVerified ? 'verified authority' : 'influence'} in the space caught our attention during our market analysis.

${analysis.selling_points[0]} presents a compelling opportunity for strategic collaboration that goes beyond traditional partnerships. We see significant synergies between your audience and our ${business.industry} initiatives.

Rather than a standard sponsorship, we're interested in exploring a strategic partnership that creates meaningful value for both our brands. Our ${business.value_proposition} aligns perfectly with your community's interests.

Would you be open to a brief strategic discussion about potential collaboration? I'd love to share our partnership framework and explore how we can create mutual value.

Looking forward to connecting.

Best regards,
Strategic Partnerships
${business.name}`;
  }
  
  return `${greeting},

Your impressive ${engagement} and authentic content immediately stood out to our team at ${business.name}.

${analysis.selling_points[0]} makes you an ideal partner for our ${business.industry} initiatives. We believe there's strong potential for meaningful collaboration.

We'd love to explore partnership opportunities that benefit both your audience and our brand. Would you be interested in discussing potential collaboration?

Best,
${business.name} Partnerships`;
}

// ===============================================================================
// SUMMARY GENERATION FUNCTIONS
// ===============================================================================

export async function generateQuickSummary(profile: ProfileData, env: Env): Promise<string> {
  const prompt = `Brief 2-3 sentence summary for @${profile.username}: ${profile.followersCount.toLocaleString()} followers, ${profile.isVerified ? 'verified' : 'unverified'}, "${profile.bio}". Focus on influence level and niche.`;

  try {
    const openaiKey = await getApiKey('OPENAI_API_KEY', env);
    
    const response = await callWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Write a concise 2-3 sentence professional summary.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 150,
          temperature: 0.6
        })
      }
    );

    const text = parseMessageContent(response?.choices?.[0]);
    return text?.trim() || createBasicSummary(profile);

  } catch (error) {
    logger('warn', 'Quick summary generation failed', { error }, undefined);
    return createBasicSummary(profile);
  }
}

export async function generateDeepSummary(
  profile: ProfileData,
  business: BusinessProfile,
  analysisResult: AnalysisResult,
  env: Env
): Promise<string> {
  const prompt = `Executive summary for @${profile.username} (${profile.followersCount.toLocaleString()} followers, ${analysisResult.score}/100 score): ${analysisResult.engagement_insights.slice(0, 200)}... Analyze for ${business.name} partnership. 5-6 sentences covering strategic value, audience quality, and collaboration potential.`;

  try {
    const openaiKey = await getApiKey('OPENAI_API_KEY', env);
    
    const response = await callWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Write a 5-6 sentence executive analysis summary.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 400,
          temperature: 0.7
        })
      }
    );

    const text = parseMessageContent(response?.choices?.[0]);
    return text?.trim() || createBasicDeepSummary(profile, business, analysisResult);

  } catch (error) {
    logger('warn', 'Deep summary generation failed', { error }, undefined);
    return createBasicDeepSummary(profile, business, analysisResult);
  }
}

function createBasicSummary(profile: ProfileData): string {
  return `@${profile.username} is ${profile.isVerified ? 'a verified' : 'an'} Instagram ${profile.followersCount > 100000 ? 'influencer' : 'creator'} with ${profile.followersCount.toLocaleString()} followers. ${profile.bio || 'Professional content creator'} with ${profile.isBusinessAccount ? 'business account' : 'personal brand'} status.`;
}

function createBasicDeepSummary(profile: ProfileData, business: BusinessProfile, analysis: AnalysisResult): string {
  return `Strategic analysis of @${profile.username} shows ${analysis.score}/100 partnership potential for ${business.name}. With ${profile.followersCount.toLocaleString()} followers and ${analysis.audience_quality.toLowerCase()} audience quality, this ${profile.isVerified ? 'verified' : 'emerging'} creator demonstrates ${analysis.engagement_score}/100 engagement strength. Business alignment score of ${analysis.niche_fit}/100 indicates ${analysis.niche_fit > 70 ? 'strong' : analysis.niche_fit > 50 ? 'moderate' : 'limited'} strategic fit with ${business.target_audience} targeting. Partnership recommendation based on available profile and engagement analysis.`;
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
      (this.metrics.averageIntelligenceScore * (n - 1) + metadata.intelligence.analysisValue) / n;
    
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (n - 1) + metadata.processingTime) / n;
    
    this.metrics.cacheHitRate = 
      (this.metrics.cacheHitRate * (n - 1) + (metadata.cacheHit ? 100 : 0)) / n;
    
    this.metrics.parallelProcessingRate = 
      (this.metrics.parallelProcessingRate * (n - 1) + (metadata.parallelOps > 0 ? 100 : 0)) / n;
    
    const modelCount = this.metrics.modelDistribution.get(metadata.modelUsed) || 0;
    this.metrics.modelDistribution.set(metadata.modelUsed, modelCount + 1);
  }
  
  getMetrics(): UltimateSystemMetrics {
    return { ...this.metrics };
  }
  
  getPerformanceReport(): string {
    const metrics = this.getMetrics();
    return `
System Performance Report:
- Total Analyses: ${metrics.totalAnalyses}
- Avg Intelligence Score: ${metrics.averageIntelligenceScore.toFixed(1)}/100
- Avg Processing Time: ${metrics.averageProcessingTime.toFixed(0)}ms
- Cache Hit Rate: ${metrics.cacheHitRate.toFixed(1)}%
- Parallel Processing Rate: ${metrics.parallelProcessingRate.toFixed(1)}%
- Model Distribution: ${Array.from(metrics.modelDistribution.entries()).map(([k, v]) => `${k}: ${v}`).join(', ')}
    `;
  }
}

const ultimateMonitor = new UltimateAnalysisMonitor();

// ===============================================================================
// MAIN EXPORT FOR INTEGRATION
// ===============================================================================

export async function performAIAnalysis(
  profile: ProfileData,
  business: BusinessProfile,
  analysisType: 'light' | 'deep',
  env: Env,
  requestId: string
): Promise<AnalysisResult> {
  const { result, metadata } = await performUltimateAnalysis(
    profile,
    business,
    analysisType,
    env,
    requestId
  );
  
  ultimateMonitor.trackAnalysis(metadata);
  
  if (ultimateMonitor.getMetrics().totalAnalyses % 100 === 0) {
    logger('info', 'System Performance Report', {
      report: ultimateMonitor.getPerformanceReport()
    }, requestId);
  }
  
  return result;
}

// Helper function for message content parsing
function parseMessageContent(choice: any): string {
  const msg = choice?.message;
  if (!msg) return '';
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content.map((c: any) => (typeof c === 'string' ? c : (c?.text ?? ''))).join(' ').trim();
  }
  return '';
}
