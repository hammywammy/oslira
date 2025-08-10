import type { ProfileData, BusinessProfile, AnalysisResult, Env } from '../types/interfaces.js';
import { logger } from '../utils/logger.js';
import { callWithRetry } from '../utils/helpers.js';
import { validateAnalysisResult, calculateConfidenceLevel, extractPostThemes } from '../utils/validation.js';
import { getApiKey } from './enhanced-config-manager.js';

export async function performAIAnalysis(
  profile: ProfileData, 
  business: BusinessProfile, 
  analysisType: 'light' | 'deep', 
  env: Env, 
  requestId: string
): Promise<AnalysisResult> {
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
    });
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
  
  const evaluatorPrompt = analysisType === 'light' ? 
    buildLightEvaluatorPrompt(profile, business) : 
    buildDeepEvaluatorPrompt(profile, business);
  
  // Get OpenAI API key from centralized config
  const openaiKey = await getApiKey('OPENAI_API_KEY', env);

logger('info', 'OpenAI Key Debug Info', {
  hasKey: !!openaiKey,
  keyLength: openaiKey?.length || 0,
  keyPrefix: openaiKey?.substring(0, 10) || 'NONE',
  keySuffix: openaiKey?.substring(-10) || 'NONE',
  keyFormat: openaiKey?.startsWith('sk-') ? 'valid_format' : 'invalid_format'
});

  
  const response = await callWithRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [{ role: 'user', content: evaluatorPrompt }],
        max_completion_tokens: analysisType === 'deep' ? 1500 : 1000,
        response_format: { type: 'json_object' }
      })
    }
  );
  
  const result = JSON.parse(response.choices[0].message.content);
  
  // Generate deep summary after analysis for deep analysis
  if (analysisType === 'deep') {
    const preliminaryResult = validateAnalysisResult(result);
    deepSummary = await generateDeepSummary(profile, business, preliminaryResult, env);
    logger('info', 'Deep summary generated', { 
      username: profile.username,
      summaryLength: deepSummary.length
    });
  }
  
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
// OUTREACH MESSAGE GENERATION
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
    // Get API keys from centralized config
    const claudeKey = await getApiKey('CLAUDE_API_KEY', env);
    const openaiKey = await getApiKey('OPENAI_API_KEY', env);

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
            model: 'claude-3-5-sonnet-20241022',
            messages: [{ role: 'user', content: messagePrompt }],
            temperature: 0.7,
            max_tokens: 1000
          })
        },
        3, 1500, 25000
      );

      let messageText = '';
      if (claudeResponse.completion) {
        messageText = claudeResponse.completion;
      } else if (claudeResponse.content?.[0]?.text) {
        messageText = claudeResponse.content[0].text;
      } else {
        throw new Error('Claude returned unexpected response format');
      }

      return messageText.trim();

    } else if (openaiKey) {
      const openaiResponse = await callWithRetry(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-5-mini',
            messages: [{ role: 'user', content: messagePrompt }],
            max_completion_tokens: 1000
          })
        },
        3, 1500, 25000
      );

      return openaiResponse.choices[0].message.content.trim();

    } else {
      throw new Error('No AI service available for message generation');
    }

  } catch (error: any) {
    logger('error', 'Message generation failed', { error: error.message }, requestId);
    
    // NO FAKE DATA - return basic template based on real data
    return `Hi ${profile.displayName || profile.username},

I came across your profile and was impressed by your content and engagement with your ${profile.followersCount.toLocaleString()} followers.

I'm reaching out from ${business.name}, and I think there could be a great opportunity for collaboration given your audience and our ${business.value_proposition.toLowerCase()}.

Would you be interested in exploring a potential partnership? I'd love to share more details about what we have in mind.

Best regards`;
  }
}

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
    
    const response = await callWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-5-nano',
          messages: [{ role: 'user', content: prompt }],
          max_completion_tokens: 200
        })
      }
    );
    
    return response.choices[0].message.content.trim();
  } catch (error) {
    logger('warn', 'Quick summary generation failed', { error });
    // NO FAKE DATA - return clear "not available" message
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
    
    const response = await callWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          messages: [{ role: 'user', content: prompt }],
          max_completion_tokens: 600
        })
      }
    );
    
    return response.choices[0].message.content.trim();
  } catch (error) {
    logger('warn', 'Deep summary generation failed', { error });
    // NO FAKE DATA - return clear analysis based on available data
    return `Comprehensive analysis of @${profile.username}: ${profile.isVerified ? 'Verified' : 'Unverified'} profile with ${profile.followersCount.toLocaleString()} followers and ${analysisResult.score}/100 business compatibility score. Engagement rate of ${profile.engagement?.engagementRate || 'unknown'}% indicates ${analysisResult.audience_quality.toLowerCase()} audience quality. Content alignment and partnership potential require further evaluation based on specific business objectives and campaign requirements.`;
  }
}

// ===============================================================================
// FINAL AI PROMPTS (DO NOT MODIFY - AS PROVIDED)
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
  const e = profile.engagement;
  const hasRealData = (e?.postsAnalyzed || 0) > 0;
  
  const engagementSection = hasRealData ? `
REAL ENGAGEMENT DATA (calculated from ${e?.postsAnalyzed} scraped posts):
- Followers: ${profile.followersCount.toLocaleString()}
- Posts Analyzed: ${e?.postsAnalyzed}
- Average Likes per Post: ${e?.avgLikes?.toLocaleString()}
- Average Comments per Post: ${e?.avgComments?.toLocaleString()}
- Calculated Engagement Rate: ${e?.engagementRate}%
- Total Average Engagement: ${((e?.avgLikes || 0) + (e?.avgComments || 0)).toLocaleString()}

AUDIENCE QUALITY FACTORS TO EVALUATE:
- Engagement consistency across posts
- Comment-to-like ratio (higher ratio = more engaged audience)
- Engagement rate vs. follower count benchmarks
- Post frequency and audience retention
- Authentic vs. bot-like engagement patterns

USE THESE ACTUAL CALCULATED NUMBERS when evaluating engagement.` : `
NO REAL ENGAGEMENT DATA AVAILABLE:
- Followers: ${profile.followersCount.toLocaleString()}
- Posts Analyzed: 0
- Reason: Profile scraping failed or private account

AUDIENCE QUALITY ASSESSMENT MUST BE CONSERVATIVE:
- Base rating on verification status, follower count tier, and account indicators
- Mark confidence as lower due to missing engagement data`;

  const recentPosts = profile.latestPosts?.slice(0, 5).map((p, i) => {
    return `Post ${i + 1}: "${p.caption?.slice(0, 120) || 'No caption'}..." (${p.likesCount?.toLocaleString() || 0} likes, ${p.commentsCount?.toLocaleString() || 0} comments)`;
  }).join('\n') || 'No post content available.';

  return `You are an expert B2B lead evaluator. Analyze this Instagram profile to assess business collaboration potential using real calculated data where available.

PROFILE:
Username: @${profile.username}
Full Name: ${profile.displayName || 'Not provided'}
Verified: ${profile.isVerified ? 'Yes' : 'No'}
Bio: "${profile.bio || 'No bio available'}"
Business Account: ${profile.isBusinessAccount ? 'Yes' : 'No'}
Posts Count: ${profile.postsCount?.toLocaleString() || 'Unknown'}

${engagementSection}

RECENT POST CONTENT SAMPLE:
${recentPosts}

BUSINESS CONTEXT:
${business.name} operates in the ${business.industry} industry. Target audience: ${business.target_audience}. Value proposition: ${business.value_proposition}.

AUDIENCE QUALITY RATING SYSTEM:
- HIGH (80-100): Engagement rate above industry benchmark, consistent post performance, high comment-to-like ratio, authentic interactions, active community
- MEDIUM (50-79): Decent engagement rate, moderate consistency, some authentic interactions, growing audience
- LOW (0-49): Below-average engagement, inconsistent performance, potential bot followers, low authentic interaction

SCORING METHODOLOGY:
- Use actual calculated engagement rate vs industry benchmarks for follower tier
- engagement_score: Rate the calculated engagement rate against benchmarks
- niche_fit: Analyze content themes and audience alignment with business target market
- audience_quality: Rate based on engagement patterns, authenticity indicators, and interaction quality

RETURN ONLY THIS JSON:
{
  "score": <1–100 overall collaboration potential>,
  "engagement_score": <1–100 based on calculated engagement rate vs benchmarks>,
  "niche_fit": <1–100 content/audience alignment with business>,
  "audience_quality": "<High/Medium/Low>",
  "engagement_insights": "AUDIENCE QUALITY ANALYSIS: [High/Medium/Low] – [Explanation includes: engagement rate vs industry benchmarks, comment-to-like ratio, post consistency, authenticity signals, follower quality, and overall audience behavior]. ${hasRealData ? 'REAL DATA ANALYSIS: Based on actual engagement metrics from ' + e?.postsAnalyzed + ' recent posts.' : e?.postsAnalyzed === 0 ? 'This user has no public posts or their account is private. Engagement data is unavailable.' : 'ESTIMATED ANALYSIS: Limited data available – analysis based on profile signals only with reduced confidence.'}"
  "selling_points": ["<specific collaboration advantage based on audience quality findings>"],
  "reasons": ["<why this profile is/isn't ideal for collaboration with detailed audience analysis>"]
}

Respond with JSON only. No explanation.`;
}
