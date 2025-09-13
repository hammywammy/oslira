import type { ProfileData, BusinessProfile } from '../types/interfaces.js';

// ===============================================================================
// JSON SCHEMAS FOR NEW PAYLOAD STRUCTURE
// ===============================================================================

export function getLightAnalysisJsonSchema() {
  return {
    name: 'LightAnalysisResult',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        // Core scores (for runs table)
        score: { type: 'integer', minimum: 0, maximum: 100 },
        engagement_score: { type: 'integer', minimum: 0, maximum: 100 },
        niche_fit: { type: 'integer', minimum: 0, maximum: 100 },
        quick_summary: { 
          type: 'string', 
          maxLength: 200,
          description: 'Short 1-2 sentence summary for dashboard lists'
        },
        confidence_level: { 
          type: 'number', 
          minimum: 0, 
          maximum: 1,
          description: 'Confidence in analysis from 0.0 to 1.0'
        },
        
        // Light payload structure (for payloads table)
        light_payload: {
          type: 'object',
          additionalProperties: false,
          properties: {
            insights: { 
              type: 'array', 
              items: { type: 'string' }, 
              minItems: 2, 
              maxItems: 5,
              description: 'Key insights about this profile for quick decision making'
            },
            audience_quality: { 
              type: 'string',
              enum: ['High', 'Medium', 'Low'],
              description: 'Assessment of audience quality and engagement'
            },
            basic_demographics: { 
              type: 'string',
              description: 'Basic audience demographics and characteristics'
            },
            engagement_summary: { 
              type: 'string',
              description: 'Summary of engagement patterns and metrics'
            }
          },
required: ['insights', 'audience_quality', 'basic_demographics', 'engagement_summary']
        }
      },
      required: ['score', 'engagement_score', 'niche_fit', 'quick_summary', 'confidence_level', 'light_payload']
    }
  };
}

export function getDeepAnalysisJsonSchema() {
  return {
    name: 'DeepAnalysisResult',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        // Core scores (for runs table)
        score: { type: 'integer', minimum: 0, maximum: 100 },
        engagement_score: { type: 'integer', minimum: 0, maximum: 100 },
        niche_fit: { type: 'integer', minimum: 0, maximum: 100 },
        quick_summary: { 
          type: 'string', 
          maxLength: 200,
          description: 'Short 1-2 sentence summary for dashboard lists'
        },
        confidence_level: { 
          type: 'number', 
          minimum: 0, 
          maximum: 1,
          description: 'Confidence in analysis from 0.0 to 1.0'
        },
        
        // Deep payload structure (for payloads table)
        deep_payload: {
          type: 'object',
          additionalProperties: false,
          properties: {
            deep_summary: { 
              type: 'string',
              description: 'Comprehensive analysis of the profile and partnership potential'
            },
            selling_points: { 
              type: 'array', 
              items: { type: 'string' }, 
              minItems: 3, 
              maxItems: 8,
              description: 'Key selling points for why this influencer is valuable'
            },
            outreach_message: { 
              type: 'string',
              description: 'Personalized outreach message for this specific influencer'
            },
            engagement_breakdown: {
              type: 'object',
              additionalProperties: false,
              properties: {
                avg_likes: { type: 'integer', minimum: 0 },
                avg_comments: { type: 'integer', minimum: 0 },
                engagement_rate: { type: 'number', minimum: 0, maximum: 100 }
              },
              required: ['avg_likes', 'avg_comments', 'engagement_rate'],
              description: 'Detailed engagement metrics breakdown'
            },
            audience_insights: { 
              type: 'string',
              description: 'Detailed audience analysis and insights'
            },
            reasons: { 
              type: 'array', 
              items: { type: 'string' }, 
              minItems: 3, 
              maxItems: 10,
              description: 'Specific reasons why this profile is a good/bad fit'
            }
          },
          required: ['deep_summary', 'selling_points', 'outreach_message', 'engagement_breakdown', 'audience_insights', 'reasons']
        }
      },
      required: ['score', 'engagement_score', 'niche_fit', 'quick_summary', 'confidence_level', 'deep_payload']
    }
  };
}

export function getXRayAnalysisJsonSchema() {
  return {
    name: 'XRayAnalysisResult',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        // Core scores (for runs table)
        score: { type: 'integer', minimum: 0, maximum: 100 },
        engagement_score: { type: 'integer', minimum: 0, maximum: 100 },
        niche_fit: { type: 'integer', minimum: 0, maximum: 100 },
        quick_summary: { 
          type: 'string', 
          maxLength: 200,
          description: 'Short 1-2 sentence summary for dashboard lists'
        },
        confidence_level: { 
          type: 'number', 
          minimum: 0, 
          maximum: 1,
          description: 'Confidence in analysis from 0.0 to 1.0'
        },
        
        // X-Ray payload structure (for payloads table)
        xray_payload: {
          type: 'object',
          additionalProperties: false,
          properties: {
            copywriter_profile: {
              type: 'object',
              additionalProperties: false,
              properties: {
                demographics: { 
                  type: 'string',
                  description: 'Age, gender, location, lifestyle demographics'
                },
                psychographics: { 
                  type: 'string',
                  description: 'Personality traits, values, interests, motivations'
                },
                pain_points: { 
                  type: 'array',
                  items: { type: 'string' },
                  minItems: 2,
                  maxItems: 6,
                  description: 'Key problems and frustrations this person faces'
                },
                dreams_desires: { 
                  type: 'array',
                  items: { type: 'string' },
                  minItems: 2,
                  maxItems: 6,
                  description: 'Goals, aspirations, and desired outcomes'
                }
              },
              required: ['demographics', 'psychographics', 'pain_points', 'dreams_desires']
            },
            commercial_intelligence: {
              type: 'object',
              additionalProperties: false,
              properties: {
                budget_tier: { 
                  type: 'string',
                  enum: ['low-budget', 'mid-market', 'premium', 'luxury'],
                  description: 'Estimated spending capacity based on lifestyle indicators'
                },
                decision_role: { 
                  type: 'string',
                  enum: ['primary', 'influencer', 'gatekeeper', 'researcher'],
                  description: 'Role in purchasing decisions'
                },
                buying_stage: { 
                  type: 'string',
                  enum: ['unaware', 'problem-aware', 'solution-aware', 'product-aware', 'ready-to-buy'],
                  description: 'Current stage in buying journey'
                },
                objections: { 
                  type: 'array',
                  items: { type: 'string' },
                  minItems: 2,
                  maxItems: 5,
                  description: 'Likely objections and concerns about purchasing'
                }
              },
              required: ['budget_tier', 'decision_role', 'buying_stage', 'objections']
            },
            persuasion_strategy: {
              type: 'object',
              additionalProperties: false,
              properties: {
                primary_angle: { 
                  type: 'string',
                  enum: ['transformation', 'status', 'convenience', 'fear-of-missing-out', 'social-proof', 'authority'],
                  description: 'Primary persuasion angle to use'
                },
                hook_style: { 
                  type: 'string',
                  enum: ['problem-agitation', 'curiosity-gap', 'social-proof', 'authority-positioning', 'story-based'],
                  description: 'Most effective hook style for this person'
                },
                proof_elements: { 
                  type: 'array',
                  items: { type: 'string' },
                  minItems: 3,
                  maxItems: 7,
                  description: 'Types of proof that would be most convincing'
                },
                communication_style: { 
                  type: 'string',
                  enum: ['casual-friendly', 'professional', 'authoritative', 'empathetic', 'energetic'],
                  description: 'Communication tone that would resonate best'
                }
              },
              required: ['primary_angle', 'hook_style', 'proof_elements', 'communication_style']
            }
          },
          required: ['copywriter_profile', 'commercial_intelligence', 'persuasion_strategy']
        }
      },
      required: ['score', 'engagement_score', 'niche_fit', 'quick_summary', 'confidence_level', 'xray_payload']
    }
  };
}

// ===============================================================================
// LIGHT ANALYSIS PROMPTS
// ===============================================================================

export function buildLightAnalysisPrompt(profile: ProfileData, business: BusinessProfile): string {
  const engagementInfo = (profile.engagement?.postsAnalyzed || 0) > 0 
    ? `Real engagement data: ${profile.engagement?.engagementRate}% rate (${profile.engagement?.avgLikes} avg likes, ${profile.engagement?.avgComments} avg comments across ${profile.engagement?.postsAnalyzed} posts)`
    : `Estimated engagement based on ${profile.followersCount.toLocaleString()} followers`;

  return `# LIGHT ANALYSIS: Quick Business Fit Assessment

## PROFILE DATA
- **Username**: @${profile.username}
- **Display Name**: ${profile.displayName || 'Not provided'}
- **Bio**: "${profile.bio || 'No bio available'}"
- **Followers**: ${profile.followersCount.toLocaleString()}
- **Following**: ${profile.followingCount.toLocaleString()}
- **Posts**: ${profile.postsCount.toLocaleString()}
- **Verified**: ${profile.isVerified ? 'Yes' : 'No'}
- **Business Account**: ${profile.isBusinessAccount ? 'Yes' : 'No'}
- **Account Type**: ${profile.isPrivate ? 'Private' : 'Public'}
- **Engagement**: ${engagementInfo}

## BUSINESS CONTEXT
- **Company**: ${business.name}
- **Industry**: ${business.industry}
- **Target Audience**: ${business.target_audience}
- **Value Proposition**: ${business.value_proposition}
- **Pain Points We Solve**: ${business.pain_points?.join(', ') || 'Not specified'}

## ANALYSIS REQUIREMENTS

Perform a quick business fit assessment. Provide:

1. **Overall Score** (0-100): Business partnership potential
2. **Engagement Score** (0-100): Quality of audience engagement  
3. **Niche Fit Score** (0-100): Alignment with our target market
4. **Quick Summary**: 1-2 sentences for dashboard display
5. **Confidence Level**: 0.0-1.0 based on available data quality

6. **Light Payload**: Structured insights for quick decision making including:
   - Key insights array (2-5 bullet points)
   - Audience quality assessment
   - Basic demographics insights  
   - Engagement summary

Focus on clear, actionable insights for rapid lead qualification. Be conservative with scores if data is limited.

Return ONLY valid JSON matching the schema - no additional text.`;
}

// ===============================================================================
// DEEP ANALYSIS PROMPTS  
// ===============================================================================

export function buildDeepAnalysisPrompt(profile: ProfileData, business: BusinessProfile): string {
  const engagementInfo = (profile.engagement?.postsAnalyzed || 0) > 0 
    ? `REAL ENGAGEMENT DATA: ${profile.engagement?.engagementRate}% rate (${profile.engagement?.avgLikes} avg likes, ${profile.engagement?.avgComments} avg comments across ${profile.engagement?.postsAnalyzed} posts)`
    : `Estimated engagement based on ${profile.followersCount.toLocaleString()} followers`;

  const contentInfo = (profile.latestPosts?.length || 0) > 0 
    ? `Recent content themes: ${profile.latestPosts.slice(0, 3).map(p => `"${p.caption?.slice(0, 100) || 'Visual content'}"...`).join(' | ')}`
    : 'Content analysis limited - no recent posts available';

  return `# DEEP ANALYSIS: Comprehensive Partnership Assessment

## PROFILE INTELLIGENCE
- **Username**: @${profile.username}
- **Display Name**: ${profile.displayName || 'Not provided'}
- **Bio**: "${profile.bio || 'No bio available'}"
- **External Link**: ${profile.externalUrl || 'None'}
- **Followers**: ${profile.followersCount.toLocaleString()}
- **Following**: ${profile.followingCount.toLocaleString()}
- **Posts**: ${profile.postsCount.toLocaleString()}
- **Verified**: ${profile.isVerified ? 'Yes' : 'No'}
- **Business Account**: ${profile.isBusinessAccount ? 'Yes' : 'No'}
- **Account Type**: ${profile.isPrivate ? 'Private' : 'Public'}

## ENGAGEMENT INTELLIGENCE
${engagementInfo}

## CONTENT INTELLIGENCE  
${contentInfo}

## BUSINESS CONTEXT
- **Company**: ${business.name}
- **Industry**: ${business.industry}
- **Target Audience**: ${business.target_audience}
- **Value Proposition**: ${business.value_proposition}
- **Pain Points We Address**: ${business.pain_points?.join(', ') || 'Not specified'}
- **Unique Advantages**: ${business.unique_advantages?.join(', ') || 'Not specified'}
- **Website**: ${business.website || 'Not provided'}

## DEEP ANALYSIS REQUIREMENTS

Provide comprehensive partnership assessment including:

1. **Scoring Framework**:
   - Overall Score (0-100): Total business partnership potential
   - Engagement Score (0-100): Audience engagement quality and authenticity
   - Niche Fit Score (0-100): Alignment with our target market and goals
   - Quick Summary: 1-2 sentences for dashboard
   - Confidence Level: 0.0-1.0 based on data richness

2. **Deep Payload Structure**:
   - **Deep Summary**: Comprehensive 4-6 sentence analysis of partnership potential
   - **Selling Points**: 3-8 key reasons why this influencer is valuable
   - **Outreach Message**: Personalized, compelling outreach message (150-250 words)
   - **Engagement Breakdown**: Detailed metrics (avg_likes, avg_comments, engagement_rate)
   - **Audience Insights**: Analysis of follower quality, demographics, and engagement patterns
   - **Reasons**: 3-10 specific rationales for the scores and recommendations

## OUTPUT REQUIREMENTS
- Use REAL engagement data when available (marked as "REAL ENGAGEMENT DATA")
- Be specific about partnership opportunities and potential ROI
- Tailor outreach message to their content style and audience
- Provide actionable insights for partnership decisions
- Include engagement_breakdown using actual scraped data when available

Return ONLY valid JSON matching the schema - no additional text.`;
}

// ===============================================================================
// X-RAY ANALYSIS PROMPTS
// ===============================================================================

export function buildXRayAnalysisPrompt(profile: ProfileData, business: BusinessProfile): string {
  const engagementInfo = (profile.engagement?.postsAnalyzed || 0) > 0 
    ? `REAL ENGAGEMENT DATA: ${profile.engagement?.engagementRate}% rate (${profile.engagement?.avgLikes} avg likes, ${profile.engagement?.avgComments} avg comments across ${profile.engagement?.postsAnalyzed} posts)`
    : `Estimated engagement based on ${profile.followersCount.toLocaleString()} followers`;

  const contentInfo = (profile.latestPosts?.length || 0) > 0 
    ? `Recent content analysis: ${profile.latestPosts.slice(0, 5).map(p => `"${p.caption?.slice(0, 150) || 'Visual content'}"...`).join(' | ')}`
    : 'Content analysis limited - profile access restricted';

  return `# X-RAY ANALYSIS: Copywriter's Complete Intelligence Report

## TARGET PROFILE
- **Username**: @${profile.username}
- **Display Name**: ${profile.displayName || 'Not provided'}
- **Bio**: "${profile.bio || 'No bio available'}"
- **External Link**: ${profile.externalUrl || 'None'}
- **Audience Scale**: ${profile.followersCount.toLocaleString()} followers${profile.isVerified ? ' | VERIFIED' : ''}
- **Authority Signals**: ${profile.isBusinessAccount ? 'Business Account' : 'Personal Brand'}
- **Account Accessibility**: ${profile.isPrivate ? 'Private' : 'Public'}

## ENGAGEMENT INTELLIGENCE
${engagementInfo}

## CONTENT INTELLIGENCE
${contentInfo}

## BUSINESS CONTEXT
- **Client**: ${business.name} (${business.industry} industry)
- **Target Market**: ${business.target_audience}
- **Value Proposition**: ${business.value_proposition}
- **Pain Points Addressed**: ${business.pain_points?.join(', ') || 'Not specified'}
- **Competitive Advantages**: ${business.unique_advantages?.join(', ') || 'Not specified'}
- **Company Website**: ${business.website || 'Not provided'}

## X-RAY ANALYSIS MISSION

As a master copywriter, perform complete psychological and commercial intelligence gathering. Provide:

### 1. CORE SCORING
- **Overall Score** (0-100): Total business value and partnership potential
- **Engagement Score** (0-100): Audience quality and engagement authenticity
- **Niche Fit Score** (0-100): Strategic alignment with client objectives
- **Quick Summary**: Executive summary for rapid assessment
- **Confidence Level**: Analysis confidence based on data richness (0.0-1.0)

### 2. COPYWRITER'S PROFILE INTELLIGENCE
- **Demographics**: Age range, gender, location, lifestyle indicators
- **Psychographics**: Personality type, values, communication style, emotional triggers
- **Pain Points**: 2-6 specific problems, frustrations, and challenges they face
- **Dreams & Desires**: 2-6 goals, aspirations, and outcomes they want to achieve

### 3. COMMERCIAL INTELLIGENCE
- **Budget Tier**: low-budget | mid-market | premium | luxury (based on lifestyle signals)
- **Decision Role**: primary | influencer | gatekeeper | researcher (in purchase decisions)
- **Buying Stage**: unaware | problem-aware | solution-aware | product-aware | ready-to-buy
- **Objections**: 2-5 likely concerns and barriers to partnership/purchase

### 4. PERSUASION STRATEGY MAPPING
- **Primary Angle**: transformation | status | convenience | fear-of-missing-out | social-proof | authority
- **Hook Style**: problem-agitation | curiosity-gap | social-proof | authority-positioning | story-based
- **Proof Elements**: 3-7 types of evidence that would be most convincing to this person
- **Communication Style**: casual-friendly | professional | authoritative | empathetic | energetic

## ANALYSIS DEPTH REQUIREMENTS
- Analyze bio language patterns for personality insights
- Assess follower count vs engagement for audience quality
- Evaluate content themes for interests and values
- Identify status symbols and lifestyle indicators for budget assessment
- Map communication style from content tone and interaction patterns
- Project decision-making style based on content and engagement patterns

## OUTPUT REQUIREMENTS
Use actual engagement data when available (marked "REAL ENGAGEMENT DATA"). Be specific and actionable - this intelligence will drive high-value copywriting campaigns.

Return ONLY valid JSON matching the schema - no additional text.`;
}

// ===============================================================================
// OUTREACH MESSAGE PROMPTS
// ===============================================================================

export function buildOutreachMessagePrompt(
  profile: ProfileData, 
  business: BusinessProfile, 
  analysis: any
): string {
  return `# PERSONALIZED OUTREACH MESSAGE GENERATION

## TARGET PROFILE
- **Username**: @${profile.username}
- **Display Name**: ${profile.displayName || profile.username}
- **Followers**: ${profile.followersCount.toLocaleString()}
- **Bio**: "${profile.bio || 'No bio available'}"
- **Verified**: ${profile.isVerified ? 'Yes' : 'No'}
- **Business Account**: ${profile.isBusinessAccount ? 'Yes' : 'No'}

## BUSINESS CONTEXT
- **Company**: ${business.name}
- **Industry**: ${business.industry}
- **Value Proposition**: ${business.value_proposition}
- **Target Audience**: ${business.target_audience}

## ANALYSIS INSIGHTS
- **Overall Score**: ${analysis.score}/100
- **Niche Fit**: ${analysis.niche_fit}/100
- **Key Selling Points**: ${analysis.selling_points?.join(', ') || 'Not available'}

## MESSAGE REQUIREMENTS
Write a personalized outreach message that:

1. **Addresses them personally** using their display name or username
2. **Shows genuine interest** in their content/audience
3. **Mentions specific details** from their profile (follower count, niche, etc.)
4. **Clearly states the collaboration opportunity** 
5. **Includes a clear call-to-action**
6. **Maintains professional but friendly tone**
7. **Keeps length between 150-250 words**

## TONE GUIDELINES
- Professional but approachable
- Genuine interest, not generic template
- Confident but not pushy
- Focus on mutual benefit
- Include specific numbers when relevant (follower count, etc.)

Generate ONLY the message text - no subject line, no extra formatting, no introduction. Start directly with the greeting.`;
}

// ===============================================================================
// SUMMARY GENERATION PROMPTS
// ===============================================================================

export function buildQuickSummaryPrompt(profile: ProfileData): string {
  return `Generate a concise 1-2 sentence summary for this Instagram profile:

@${profile.username} - ${profile.followersCount.toLocaleString()} followers
Bio: "${profile.bio || 'No bio'}"
Verified: ${profile.isVerified ? 'Yes' : 'No'}
Engagement: ${profile.engagement?.engagementRate || 'Unknown'}%

Create a brief summary suitable for dashboard lists. Focus on key characteristics and business potential. Maximum 150 characters.`;
}

export function buildDeepSummaryPrompt(
  profile: ProfileData, 
  business: BusinessProfile, 
  analysis: any
): string {
  return `# EXECUTIVE ANALYSIS SUMMARY

## PROFILE OVERVIEW
- **Influencer**: @${profile.username} (${profile.displayName || 'N/A'})
- **Audience**: ${profile.followersCount.toLocaleString()} followers
- **Verification**: ${profile.isVerified ? 'Verified' : 'Unverified'}
- **Engagement Rate**: ${profile.engagement?.engagementRate || 'Unknown'}%
- **Bio**: "${profile.bio || 'No bio available'}"

## BUSINESS CONTEXT
- **Company**: ${business.name}
- **Industry**: ${business.industry}
- **Target Market**: ${business.target_audience}

## ANALYSIS RESULTS
- **Overall Score**: ${analysis.score}/100
- **Engagement Score**: ${analysis.engagement_score}/100  
- **Niche Fit**: ${analysis.niche_fit}/100
- **Audience Quality**: ${analysis.audience_quality}

## TASK
Write a 5-7 sentence executive summary that covers:
1. Profile overview and key metrics
2. Audience quality assessment
3. Business alignment and partnership potential
4. Key opportunities or concerns
5. Strategic recommendation

Be specific, actionable, and executive-level. No preface or conclusion needed.`;
}
