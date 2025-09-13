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

export function buildLightAnalysisPrompt(
  profile: ProfileData, 
  business: BusinessProfile,
  context?: {
    triage?: any;
    preprocessor?: any;
  }
): string {
  const engagementInfo = (profile.engagement?.postsAnalyzed || 0) > 0 
    ? `Real engagement data: ${profile.engagement?.engagementRate}% rate (${profile.engagement?.avgLikes} avg likes, ${profile.engagement?.avgComments} avg comments across ${profile.engagement?.postsAnalyzed} posts)`
    : `Estimated engagement based on ${profile.followersCount.toLocaleString()} followers`;

  const triageContext = context?.triage ? `
## TRIAGE INSIGHTS
- **Lead Score**: ${context.triage.lead_score}/100
- **Data Quality**: ${context.triage.data_richness}/100  
- **Key Observations**: ${context.triage.focus_points?.join(', ') || 'None'}
` : '';

  return `# LIGHT ANALYSIS: Quick Business Fit Assessment
${triageContext}

# LIGHT ANALYSIS: 10-Second Lead Check

## PROFILE SNAPSHOT
- **Handle**: @${profile.username}
- **Followers**: ${profile.followersCount.toLocaleString()}
- **Verified**: ${profile.isVerified ? 'Yes ✓' : 'No'}
- **Private**: ${profile.isPrivate ? 'Yes (LIMITED DATA)' : 'No'}
- **Bio**: "${profile.bio || 'Empty'}"
- **Link**: ${profile.externalUrl || 'None'}
- **Posts**: ${profile.postsCount}
- **Following**: ${profile.followingCount} (Ratio: ${(profile.followersCount/profile.followingCount).toFixed(1)}:1)

## YOUR BUSINESS
- **Company**: ${business.name} (${business.industry})
- **Target**: ${business.target_audience}
- **Goal**: ${business.value_proposition}

## MISSION: Quick Pass/Fail Decision

Generate a rapid lead assessment. Focus ONLY on what's visible from Instagram:

### SCORING (0-100)
- **score**: Partnership viability (0=waste of time, 100=pursue immediately)
- **engagement_score**: Audience quality signal (high following/follower ratio = bot risk)
- **niche_fit**: Match to ${business.target_audience}
- **confidence_level**: Data reliability (0.2 if private, 0.5 if <1000 followers, else 0.7-0.9)

### LIGHT PAYLOAD REQUIREMENTS

**insights** (2-5 bullets):
- Follower tier: Nano (<10k), Micro (10-100k), Mid (100k-1M), Macro (1M+)
- Follow ratio red flags (following > followers = likely spam)
- Bio signals (email present? business category? CTAs?)
- Content frequency estimate from posts/account age
- Verification/business account as trust signals

**audience_quality**: 
- "High" = Verified OR business account with good follow ratio
- "Medium" = Normal ratios, active posting
- "Low" = Poor ratios, low posts, or private

**basic_demographics**: 
Extract ONLY from bio/username: language hints, location tags, niche keywords. 
If nothing extractable: "No demographic signals in bio"

**engagement_summary**: 
With ${profile.followersCount} followers, estimate typical engagement:
- Nano: 5-7% ER expected
- Micro: 2-4% ER expected  
- Mid: 1-2% ER expected
- Macro: 0.5-1% ER expected
State if account likely above/below benchmark based on post count and account age.

### DECISION LOGIC
- Score >70: Clear signals of fit + reachable + active
- Score 40-70: Possible fit but needs deep analysis
- Score <40: Wrong fit OR dead account OR spam signals

Return JSON only. Make the decision binary: pursue or skip.
`;
}

// ===============================================================================
// DEEP ANALYSIS PROMPTS  
// ===============================================================================

export function buildDeepAnalysisPrompt(
  profile: ProfileData, 
  business: BusinessProfile,
  context?: {
    triage?: any;
    preprocessor?: any;
  }
): string {
const engagementInfo = (profile.engagement?.postsAnalyzed || 0) > 0 
    ? `REAL ENGAGEMENT DATA: ${profile.engagement.engagementRate}% rate (${profile.engagement.avgLikes} avg likes, ${profile.engagement.avgComments} avg comments across ${profile.engagement.postsAnalyzed} posts)`
    : `Estimated engagement based on ${profile.followersCount.toLocaleString()} followers`;

  const triageContext = context?.triage ? `
## TRIAGE INSIGHTS  
- **Lead Score**: ${context.triage.lead_score}/100 (${context.triage.confidence * 100}% confidence)
- **Focus Areas**: ${context.triage.focus_points?.join(', ') || 'General analysis'}
` : '';

  const preprocessorContext = context?.preprocessor ? `
## EXTRACTED PROFILE FACTS
- **Content Themes**: ${context.preprocessor.content_themes?.join(', ') || 'Unknown'}
- **Posting Pattern**: ${context.preprocessor.posting_cadence || 'Unknown'}
- **Collaboration History**: ${context.preprocessor.collaboration_history || 'No evidence'}
- **Contact Readiness**: ${context.preprocessor.contact_readiness || 'Unknown'}
- **Brand Mentions**: ${context.preprocessor.brand_mentions?.join(', ') || 'None found'}
` : '';

  const contentInfo = (profile.latestPosts?.length || 0) > 0 
    ? `Recent content themes: ${profile.latestPosts.slice(0, 3).map(p => `"${p.caption?.slice(0, 100) || 'Visual content'}"...`).join(' | ')}`
    : 'Content analysis limited - no recent posts available';

  return `
  # DEEP ANALYSIS: Partnership Intelligence Report

## VERIFIED PROFILE DATA
- **Handle**: @${profile.username}
- **Metrics**: ${profile.followersCount.toLocaleString()} followers | ${profile.postsCount} posts
- **Bio**: "${profile.bio || 'No bio'}"
- **Link**: ${profile.externalUrl || 'No external link'}
- **Status**: ${profile.isVerified ? 'Verified ✓' : 'Unverified'} | ${profile.isBusinessAccount ? 'Business' : 'Personal'}

## ACTUAL ENGAGEMENT DATA
${profile.engagement && profile.engagement.postsAnalyzed > 0
  ? `REAL METRICS from ${profile.engagement.postsAnalyzed} posts:
    - Avg Likes: ${profile.engagement.avgLikes.toLocaleString()}
    - Avg Comments: ${profile.engagement.avgComments.toLocaleString()}
    - Engagement Rate: ${profile.engagement.engagementRate}%
    - Total Interactions: ${profile.engagement.totalEngagement.toLocaleString()}`
  : `ESTIMATED for ${profile.followersCount.toLocaleString()} followers (no post data available)`}

## CONTENT ANALYSIS
${(profile.latestPosts?.length || 0) > 0 
  ? `Latest ${profile.latestPosts.length} posts analyzed:
    ${profile.latestPosts.slice(0, 3).map(p => 
      `- ${p.likesCount.toLocaleString()} likes, ${p.commentsCount} comments: "${(p.caption || '').slice(0, 50)}..."`
    ).join('\n    ')}`
  : 'No recent posts available for analysis'}

## BUSINESS CONTEXT
- **Company**: ${business.name}
- **Industry**: ${business.industry}
- **Target**: ${business.target_audience}
- **Value Prop**: ${business.value_proposition}

## DEEP ANALYSIS REQUIREMENTS

### SCORING FRAMEWORK
- **score**: Overall partnership value (0-100)
- **engagement_score**: Based on ACTUAL data if available, else use follower-tier benchmarks
- **niche_fit**: Alignment with ${business.target_audience}
- **confidence_level**: ${profile.engagement?.postsAnalyzed ? '0.85-0.95 (real data)' : '0.4-0.6 (estimated)'}

### DEEP PAYLOAD - BE SPECIFIC

**deep_summary** (4-6 sentences):
Start with engagement reality check. State actual ER% vs expected for their follower tier. Identify content patterns from captions/hashtags. Assess partnership viability based on measurable signals. End with specific recommendation.

**selling_points** (3-8 bullets):
ONLY claims you can defend with numbers:
- "ER of ${profile.engagement?.engagementRate}% beats follower tier average"
- "Consistent posting (${profile.latestPosts?.length || 0} recent posts)"
- "High comment ratio suggests engaged community"
- "Verified status + business account = platform trust"
NO generic claims like "great content" or "strong influence"

**outreach_message** (150-250 words):
Open with specific metric about their engagement rate and follower count
Reference actual content theme from their posts
Propose specific collaboration format (Reel, Carousel, Story series)
Include concrete success metric (target reach, engagement, conversions)
End with clear CTA and contact preference

**engagement_breakdown**:
Use REAL data when available from profile.engagement object

**audience_insights**:
From actual post performance:
- High engagement posts topics (from captions)
- Comment patterns (questions vs praise vs emojis)
- Posting time patterns if visible
- Hashtag communities they engage

**reasons** (3-10 specific points):
Each must reference a metric or observation:
- "ER of X% is Y% above category average"
- "Bio contains email, suggesting openness to partnerships"
- "Recent posts show collaborations with similar brands"
- "Recent posts show consistent activity"

### DECISION OUTPUTS
If score >75: Provide exact outreach angle and first message
If score 50-75: List 2-3 tests to validate fit
If score <50: State specific disqualifiers

Return JSON only. Every claim must trace to profile data.
  `;
}

// ===============================================================================
// X-RAY ANALYSIS PROMPTS
// ===============================================================================

export function buildXRayAnalysisPrompt(
  profile: ProfileData, 
  business: BusinessProfile,
  context?: {
    triage?: any;
    preprocessor?: any;
  }
): string {
  const engagementInfo = (profile.engagement?.postsAnalyzed || 0) > 0 
    ? `REAL ENGAGEMENT DATA: ${profile.engagement?.engagementRate}% rate (${profile.engagement?.avgLikes} avg likes, ${profile.engagement?.avgComments} avg comments across ${profile.engagement?.postsAnalyzed} posts)`
    : `Estimated engagement based on ${profile.followersCount.toLocaleString()} followers`;

  const triageContext = context?.triage ? `
## STRATEGIC CONTEXT
- **Lead Quality**: ${context.triage.lead_score}/100 (${Math.round(context.triage.confidence * 100)}% confidence)
- **Analysis Focus**: ${context.triage.focus_points?.join(' | ') || 'Comprehensive profile'}
` : '';

  const preprocessorContext = context?.preprocessor ? `
## BEHAVIORAL INTELLIGENCE
- **Content Strategy**: ${context.preprocessor.content_themes?.join(' + ') || 'Unknown themes'}
- **Engagement Drivers**: ${context.preprocessor.engagement_patterns || 'Unknown patterns'}
- **Brand Relationships**: ${context.preprocessor.brand_mentions?.length > 0 ? context.preprocessor.brand_mentions.join(', ') : 'No brand connections visible'}
- **Business Readiness**: ${context.preprocessor.contact_readiness || 'Unknown'}
- **Collaboration Track Record**: ${context.preprocessor.collaboration_history || 'No evidence'}
` : '';

  const contentInfo = (profile.latestPosts?.length || 0) > 0 
    ? `Recent content analysis: ${profile.latestPosts.slice(0, 5).map(p => `"${p.caption?.slice(0, 150) || 'Visual content'}"...`).join(' | ')}`
    : 'Content analysis limited - profile access restricted';

  return `
  # X-RAY ANALYSIS: Deep Psychological & Commercial Profiling

## PROFILE INTELLIGENCE
- **Handle**: @${profile.username} (${profile.followersCount.toLocaleString()} followers)
- **Verification**: ${profile.isVerified ? 'VERIFIED ✓ (trust signal)' : 'Unverified'}
- **Account Type**: ${profile.isBusinessAccount ? 'Business Account' : 'Personal/Creator'}
- **Bio Signals**: "${profile.bio || 'No bio'}"
- **Link Strategy**: ${profile.externalUrl ? `Active (${profile.externalUrl.includes('linktr') ? 'Linktree' : 'Direct site'})` : 'No external link'}

## BEHAVIORAL DATA
${(profile.engagement?.postsAnalyzed || 0) > 0 
  ? `MEASURED BEHAVIOR from ${profile.engagement.postsAnalyzed} posts:
    - Engagement: ${profile.engagement.engagementRate}% (${profile.engagement.avgLikes} likes, ${profile.engagement.avgComments} comments avg)
    - Comment Ratio: ${((profile.engagement.avgComments/profile.engagement.avgLikes)*100).toFixed(1)}% (community engagement signal)
    - Per-Post Reach: ~${((profile.engagement.avgLikes/profile.followersCount)*100).toFixed(1)}% of audience`
  : 'Limited behavioral data - assessment based on profile signals'}

## CONTENT PATTERNS
${(profile.latestPosts?.length || 0) > 0 
  ? `${profile.latestPosts.length} recent posts reveal:
    ${profile.latestPosts.slice(0, 5).map(p => {
      const wordCount = (p.caption || '').split(' ').length;
      const hasQuestion = (p.caption || '').includes('?');
      const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(p.caption || '');
      const hasCTA = /(link|bio|shop|swipe|save|comment|share|tag)/i.test(p.caption || '');
      return `- ${p.likesCount} likes: ${wordCount} words, ${hasQuestion ? 'question' : 'statement'}, ${hasEmoji ? 'emojis' : 'no emojis'}, ${hasCTA ? 'CTA present' : 'no CTA'}`;
    }).join('\n    ')}`
  : 'No content patterns available'}

## BUSINESS CONTEXT
- **Your Company**: ${business.name} (${business.industry})
- **Your Audience**: ${business.target_audience}
- **Your Goal**: ${business.value_proposition}

## X-RAY INTELLIGENCE EXTRACTION

### SCORING (same as deep but with psychological confidence)
- **score**: Partnership value (0-100)
- **engagement_score**: Audience quality (0-100)
- **niche_fit**: Strategic alignment (0-100)
- **confidence_level**: ${profile.latestPosts?.length >= 5 ? '0.8-0.95' : '0.3-0.5'}

### COPYWRITER PROFILE - Extract from Instagram patterns only

**demographics**:
Based on visual content + bio + captions:
- Age signals: Caption formality, emoji usage, cultural references
- Location: Tagged locations, timezone patterns, language
- Lifestyle: Post locations (gym/travel/home), brand mentions

**psychographics**:
From content themes and caption style:
- Values: What they celebrate/criticize in captions
- Communication: Long vs short captions, question frequency, emoji density
- Authority style: Educational vs entertainment vs inspiration

**pain_points** (2-6 from content):
Look for complaint patterns, questions asked, problems mentioned:
- "Posts about specific topics suggest frustration with relevant issues"
- "Asking followers about problems indicates struggle with those areas"
- "Collaboration requests suggest need for partnerships"

**dreams_desires** (2-6 from content):
From aspirational posts, goals mentioned, celebration posts:
- "Celebrates achievements suggesting their values and priorities"
- "Posts about future goals indicating their desires and aspirations"
- "Hashtags show aspiration toward specific outcomes or lifestyles"

### COMMERCIAL INTELLIGENCE - Based on observable signals

**budget_tier**:
- "luxury": Verified + >1M followers + brand collabs visible
- "premium": 100k-1M followers + business account + professional content
- "mid-market": 10k-100k followers + consistent posting
- "low-budget": <10k followers or inconsistent activity

**decision_role**:
- "primary": Solopreneur/creator (no team visible)
- "influencer": Part of network (collabs/mentions visible)
- "gatekeeper": Business account with team mentions
- "researcher": Asks audience for input frequently

**buying_stage** (for partnerships):
- "ready-to-buy": Email in bio + past collabs + business account
- "product-aware": Mentions partnerships but no clear CTA
- "solution-aware": Business account but no collab history
- "problem-aware": Growing but not monetizing
- "unaware": Personal account, no business signals

**objections** (2-5 based on patterns):
- From low engagement: "Audience quality concerns"
- From irregular posting: "Consistency issues"
- From no collab history: "Unproven partnership record"
- From caption style: "Brand voice misalignment"

### PERSUASION STRATEGY - How to approach based on their patterns

**primary_angle**:
- "transformation": If posts show before/after, growth, change
- "status": If posts show achievements, milestones, recognition
- "convenience": If posts emphasize ease, simplicity, efficiency
- "fear-of-missing-out": If posts use urgency, limited time, exclusive
- "social-proof": If posts show testimonials, community, numbers
- "authority": If posts teach, guide, demonstrate expertise

**hook_style** (based on their content style):
- "problem-agitation": If they discuss pain points
- "curiosity-gap": If they use questions, teasers
- "social-proof": If they showcase results, testimonials
- "authority-positioning": If they teach, educate
- "story-based": If they share personal narratives

**proof_elements** (3-7 they'd respond to):
Based on what THEY use in content:
- Numbers/metrics if they share stats
- Visual proof if they post before/afters
- Testimonials if they share feedback
- Process proof if they show behind-scenes
- Authority proof if they cite sources

**communication_style** (match their tone):
- "casual-friendly": Heavy emoji use, informal language
- "professional": Business language, formal structure
- "authoritative": Educational, factual, structured
- "empathetic": Personal stories, emotional language
- "energetic": Exclamations, caps, enthusiasm markers

## CRITICAL REQUIREMENT
Every insight must reference observable Instagram behavior. No external assumptions.
Mark any field as "insufficient_data" if you can't defend it from the profile.

Return JSON only. This is intelligence for high-stakes outreach - be precise.
  `;
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
