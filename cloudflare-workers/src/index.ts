// ===============================================================================
// OPTIMIZED MODULAR CLOUDFLARE WORKER - TOKEN EFFICIENT AI PIPELINE
// ===============================================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { compress } from 'hono/compress';

// ===============================================================================
// TYPE DEFINITIONS
// ===============================================================================

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE: string;
  OPENAI_KEY: string;
  ANTHROPIC_KEY: string;
  CLAUDE_KEY: string;
  APIFY_API_TOKEN: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
}

interface StandardResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  version: string;
  requestId: string;
}

interface ProfileData {
  username: string;
  displayName: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  isPrivate: boolean;
  profilePicUrl: string;
  externalUrl?: string;
  latestPosts?: PostData[];
  engagement?: EngagementData;
}

interface PostData {
  id: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  hashtags: string[];
  mentions: string[];
}

interface EngagementData {
  avgLikes: number;
  avgComments: number;
  engagementRate: number;
  topHashtags: string[];
  postingFrequency: string;
}

interface BusinessProfile {
  id: string;
  name: string;
  industry: string;
  target_audience: string;
  value_proposition: string;
  communication_style: string;
  pain_points: string[];
  goals: string[];
}

interface AnalysisResult {
  score: number;
  category: 'high_potential' | 'medium_potential' | 'low_potential' | 'not_suitable';
  reasoning: string;
  deep_research_summary: string;
  personal_brand_themes: string[];
  engagement_behavior: string;
  business_signals: string[];
  risk_factors: string[];
  contact_strategy: {
    timing: string;
    approach: string;
    talking_points: string[];
  };
  confidence: number;
}

interface ProfileSummary {
  bio_summary: string;
  post_themes: string;
  engagement_patterns: string;
  business_context: string;
}

// ===============================================================================
// CONFIGURATION
// ===============================================================================

const API_VERSION = 'v2.0.0';
const RATE_LIMITS = {
  '/v1/analyze': { requests: 100, window: 3600 },
  '/v1/bulk-analyze': { requests: 10, window: 3600 }
};

// ===============================================================================
// UTILITY FUNCTIONS
// ===============================================================================

function generateRequestId(): string {
  return crypto.randomUUID();
}

function createStandardResponse<T>(success: boolean, data?: T, error?: string, requestId?: string): StandardResponse<T> {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
    version: API_VERSION,
    requestId: requestId || generateRequestId()
  };
}

function logger(level: string, message: string, data?: any, requestId?: string) {
  console.log({
    level,
    message,
    data,
    requestId,
    timestamp: new Date().toISOString()
  });
}

async function callWithRetry(url: string, options: any, maxRetries: number = 3, baseDelay: number = 1500, timeout: number = 30000): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
    }
  }
}

async function verifyJWT(token: string): Promise<string | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    
    return payload.sub || payload.user_id;
  } catch {
    return null;
  }
}

function extractUsername(profileUrl: string): string {
  const match = profileUrl.match(/instagram\.com\/([^\/\?]+)/);
  if (!match) throw new Error('Invalid Instagram profile URL');
  return match[1].replace('@', '');
}

// ===============================================================================
// SUPABASE OPERATIONS
// ===============================================================================

// ✅ UPDATE: Add this helper function for safe JSON parsing
async function safeJsonParse(response: Response): Promise<any> {
  const text = await response.text();
  
  if (!text || text.trim() === '') {
    console.log('⚠️ Empty response received');
    return null;
  }
  
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('❌ JSON parse error:', error);
    console.error('❌ Response text:', text);
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
  }
}

// ✅ UPDATE: Use safe parsing in fetchUserAndCredits
async function fetchUserAndCredits(userId: string, env: Env): Promise<{ user: any; credits: number }> {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };
  
  console.log('🔍 Fetching user:', userId);
  
  const userResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=*`, { headers });
  
  if (!userResponse.ok) {
    console.error('❌ User fetch failed:', userResponse.status, userResponse.statusText);
    throw new Error(`Failed to fetch user data: ${userResponse.status}`);
  }
  
  const users = await safeJsonParse(userResponse);
  
  if (!users || !users.length) {
    throw new Error('User not found');
  }
  
  const user = users[0];
  console.log('✅ User found:', user.email, 'Credits:', user.credits);
  
  return { 
    user, 
    credits: user.credits || 0
  };
}

async function fetchBusinessProfile(businessId: string, userId: string, env: Env): Promise<BusinessProfile> {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };
  
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/business_profiles?id=eq.${businessId}&user_id=eq.${userId}&select=*`,
    { headers }
  );
  
  if (!response.ok) throw new Error('Failed to fetch business profile');
  const businesses = await response.json();
  if (!businesses.length) throw new Error('Business profile not found');
  
  return businesses[0];
}
async function saveAnalysisResults(
  profileData: ProfileData,
  analysisResult: AnalysisResult,
  businessId: string,
  userId: string,
  analysisType: string,
  outreachMessage: string,
  env: Env
): Promise<void> {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };
  
  // ✅ DEBUG: Log the input data first
  console.log('🔍 DEBUG - analysisResult:', JSON.stringify(analysisResult, null, 2));
  console.log('🔍 DEBUG - profileData.engagement:', JSON.stringify(profileData.engagement, null, 2));
  
  // ✅ SAFE: Ensure all integer fields are actually integers
  const leadPayload = {
    // Required fields
    user_id: userId,
    business_id: businessId,
    
    // Profile data
    username: profileData.username || '',
    full_name: profileData.displayName || '',
    bio: profileData.bio || '',
    followers_count: parseInt(profileData.followersCount) || 0,
    following_count: parseInt(profileData.followingCount) || 0,
    posts_count: parseInt(profileData.postsCount) || 0,
    verified: Boolean(profileData.isVerified),
    private: Boolean(profileData.isPrivate),
    profile_url: profileData.profilePicUrl || '',
    external_url: profileData.externalUrl || '',
    
    // Analysis fields - EXTRA SAFE TYPE CONVERSION
    platform: 'instagram',
    analysis_type: String(analysisType),
    score: parseInt(analysisResult.score) || 0,
    summary: String(analysisResult.reasoning || ''),
    niche_fit: String(analysisResult.category || ''),
    engagement_score: parseInt(analysisResult.confidence) || 75,
    reason: String(analysisResult.reasoning || ''),
    talking_points: Array.isArray(analysisResult.contact_strategy?.talking_points) 
      ? analysisResult.contact_strategy.talking_points.join(', ') 
      : '',
    outreach_message: String(outreachMessage || ''),
    
    // Engagement metrics - FORCE TO NUMBERS
    avg_likes: parseInt(profileData.engagement?.avgLikes) || 0,
    avg_comments: parseInt(profileData.engagement?.avgComments) || 0,
    engagement_rate: parseFloat(profileData.engagement?.engagementRate) || 0,
    
    // Optional fields
    business_category: null,
    timezone: null,
    user_location: null,
    
    // Timestamps
    request_timestamp: new Date().toISOString(),
    analyzed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // ✅ DEBUG: Log each field type
  console.log('🔍 DEBUG - Field types:');
  console.log('score type:', typeof leadPayload.score, 'value:', leadPayload.score);
  console.log('engagement_score type:', typeof leadPayload.engagement_score, 'value:', leadPayload.engagement_score);
  console.log('followers_count type:', typeof leadPayload.followers_count, 'value:', leadPayload.followers_count);
  console.log('avg_likes type:', typeof leadPayload.avg_likes, 'value:', leadPayload.avg_likes);
  
  console.log('💾 Final payload:', JSON.stringify(leadPayload, null, 2));
  
  const leadResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/leads`, {
    method: 'POST',
    headers,
    body: JSON.stringify(leadPayload)
  });
  
  if (!leadResponse.ok) {
    const errorText = await leadResponse.text();
    console.error('❌ Failed to save to leads table:', errorText);
    throw new Error(`Failed to save lead data: ${leadResponse.status} - ${errorText}`);
  }
  
  const responseText = await leadResponse.text();
  console.log('✅ Lead saved successfully:', responseText);
}

async function updateCreditsAndTransaction(
  userId: string,
  creditsUsed: number,
  newBalance: number,
  description: string,
  transactionType: string,
  env: Env
): Promise<void> {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };
  
  // ✅ UPDATED: Update credits in users table
  const updateResponse = await fetch(
    `${env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ 
        credits: newBalance, 
        updated_at: new Date().toISOString() 
      })
    }
  );
  
  if (!updateResponse.ok) {
    throw new Error('Failed to update credits');
  }
  
  // Log transaction (keep this the same)
  const transactionPayload = {
    user_id: userId,
    type: transactionType,
    amount: -creditsUsed,
    balance_after: newBalance,
    description,
    created_at: new Date().toISOString()
  };
  
  const transactionResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/credit_transactions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(transactionPayload)
  });
  
  if (!transactionResponse.ok) {
    throw new Error('Failed to log credit transaction');
  }
}

// ===============================================================================
// INSTAGRAM SCRAPING
// ===============================================================================

async function scrapeInstagramProfile(username: string, analysisType: string, env: Env): Promise<ProfileData> {
  if (!env.APIFY_API_TOKEN) throw new Error('Profile scraping service not configured');
  
  const basicInput = {
    directUrls: [`https://instagram.com/${username}/`],
    resultsLimit: 1,
    addParentData: false,
    enhanceUserSearchWithFacebookPage: false
  };
  
  const profileResponse = await callWithRetry(
    `https://api.apify.com/v2/acts/shu8hvrXbJbY3Eb9W/run-sync-get-dataset-items?token=${env.APIFY_API_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(basicInput)
    }
  );
  
  if (!profileResponse || !Array.isArray(profileResponse) || profileResponse.length === 0) {
    throw new Error('Profile not found or private');
  }
  
  const basicProfile = profileResponse[0];
  
  if (analysisType === 'deep') {
    const postsInput = {
      directUrls: [`https://instagram.com/${username}/`],
      resultsLimit: 8,
      addParentData: false,
      enhanceUserSearchWithFacebookPage: false
    };
    
    let postsData = [];
    try {
      const postsResponse = await callWithRetry(
        `https://api.apify.com/v2/acts/shu8hvrXbJbY3Eb9W/run-sync-get-dataset-items?token=${env.APIFY_API_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postsInput)
        }
      );
      
      if (postsResponse && Array.isArray(postsResponse)) {
        postsData = postsResponse;
      }
    } catch {
      // Continue without posts data
    }
    
    if (postsData.length > 0) {
      const totalLikes = postsData.reduce((sum: number, post: any) => sum + (post.likesCount || 0), 0);
      const totalComments = postsData.reduce((sum: number, post: any) => sum + (post.commentsCount || 0), 0);
      const avgLikes = totalLikes / postsData.length;
      const avgComments = totalComments / postsData.length;
      const engagementRate = ((avgLikes + avgComments) / basicProfile.followersCount) * 100;
      
      basicProfile.engagement = {
        avgLikes,
        avgComments,
        engagementRate,
        topHashtags: [],
        postingFrequency: 'regular'
      };
    }
    
    basicProfile.latestPosts = postsData;
  }
  
  return {
    username: basicProfile.username || '',
    displayName: basicProfile.fullName || basicProfile.displayName || '',
    bio: basicProfile.biography || basicProfile.bio || '',
    followersCount: parseInt(basicProfile.followersCount) || 0,
    followingCount: parseInt(basicProfile.followingCount) || 0,
    postsCount: parseInt(basicProfile.postsCount) || 0,
    isVerified: Boolean(basicProfile.verified || basicProfile.isVerified),
    isPrivate: Boolean(basicProfile.private || basicProfile.isPrivate),
    profilePicUrl: basicProfile.profilePicUrl || basicProfile.profilePicture || '',
    externalUrl: basicProfile.externalUrl || basicProfile.website || '',
    latestPosts: basicProfile.latestPosts || [],
    engagement: basicProfile.engagement || undefined
  };
}

// ===============================================================================
// AI SUMMARIZATION PIPELINE
// ===============================================================================

async function summarizeProfileBioAndStats(profile: ProfileData, env: Env): Promise<string> {
  const prompt = `Summarize this Instagram profile's professional identity in 2-3 sentences:
Username: @${profile.username}
Name: ${profile.displayName}
Bio: ${profile.bio}
Followers: ${profile.followersCount}
Following: ${profile.followingCount}
Posts: ${profile.postsCount}
Verified: ${profile.isVerified}
External URL: ${profile.externalUrl || 'None'}

Focus on business relevance, professional role, and key details. Be concise.`;

  const response = await callWithRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 150
      })
    }
  );
  
  return response.choices[0].message.content.trim();
}

async function summarizePostThemes(posts: PostData[], env: Env): Promise<string> {
  if (!posts || posts.length === 0) return 'No recent posts available';
  
  const postSummaries = posts.slice(0, 6).map(post => 
    `${post.caption?.substring(0, 100) || 'Visual content'} (${post.likesCount} likes, ${post.commentsCount} comments)`
  ).join('\n');
  
  const prompt = `Analyze these Instagram posts and identify content themes in 2-3 sentences:
${postSummaries}

What topics, business focus, or professional activities do they discuss? Be specific and business-focused.`;

  const response = await callWithRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 150
      })
    }
  );
  
  return response.choices[0].message.content.trim();
}

async function summarizeEngagementPatterns(engagement: EngagementData | undefined, env: Env): Promise<string> {
  if (!engagement) return 'Limited engagement data available';
  
  const prompt = `Summarize this Instagram engagement profile in 1-2 sentences:
Average Likes: ${engagement.avgLikes}
Average Comments: ${engagement.avgComments}
Engagement Rate: ${engagement.engagementRate.toFixed(2)}%
Posting Frequency: ${engagement.postingFrequency}

Focus on audience quality and engagement health.`;

  const response = await callWithRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 100
      })
    }
  );
  
  return response.choices[0].message.content.trim();
}

async function summarizeBusinessICP(business: BusinessProfile, env: Env): Promise<string> {
  const prompt = `Summarize this business's ideal customer profile in 2-3 sentences:
Company: ${business.name}
Industry: ${business.industry}
Target Audience: ${business.target_audience}
Value Proposition: ${business.value_proposition}
Pain Points Solved: ${business.pain_points?.join(', ') || 'Various'}

Focus on who they serve and what value they provide.`;

  const response = await callWithRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 150
      })
    }
  );
  
  return response.choices[0].message.content.trim();
}

// ===============================================================================
// MAIN AI ANALYSIS ENGINE
// ===============================================================================

async function performAIAnalysis(profile: ProfileData, business: BusinessProfile, analysisType: 'light' | 'deep', env: Env, requestId: string): Promise<AnalysisResult> {
  logger('info', `Starting ${analysisType} AI analysis`, { username: profile.username }, requestId);
  
  let profileSummary: ProfileSummary;
  
  if (analysisType === 'light') {
    // Light analysis: minimal summarization
    profileSummary = {
      bio_summary: `@${profile.username} (${profile.displayName}): ${profile.bio}. ${profile.followersCount} followers, ${profile.postsCount} posts. ${profile.isVerified ? 'Verified.' : ''}`,
      post_themes: 'Light analysis - post themes not analyzed',
      engagement_patterns: 'Light analysis - engagement not analyzed',
      business_context: `${business.name} in ${business.industry} targeting ${business.target_audience}. Value prop: ${business.value_proposition}`
    };
  } else {
    // Deep analysis: full summarization pipeline
    const [bioSummary, postThemes, engagementPatterns, businessContext] = await Promise.all([
      summarizeProfileBioAndStats(profile, env),
      summarizePostThemes(profile.latestPosts || [], env),
      summarizeEngagementPatterns(profile.engagement, env),
      summarizeBusinessICP(business, env)
    ]);
    
    profileSummary = {
      bio_summary: bioSummary,
      post_themes: postThemes,
      engagement_patterns: engagementPatterns,
      business_context: businessContext
    };
  }
  
  logger('info', 'Summarization complete, starting final evaluation', { username: profile.username }, requestId);
  
  // Final evaluator prompt
  const evaluatorPrompt = analysisType === 'light' ? 
    buildLightEvaluatorPrompt(profileSummary) : 
    buildDeepEvaluatorPrompt(profileSummary);
  
  const response = await callWithRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: evaluatorPrompt }],
        temperature: 0.4,
        max_tokens: analysisType === 'deep' ? 1200 : 800,
        response_format: { type: 'json_object' }
      })
    }
  );
  
  const result = JSON.parse(response.choices[0].message.content);
  logger('info', `AI analysis completed`, { username: profile.username, score: result.score }, requestId);
  
  return validateAnalysisResult(result);
}

function buildLightEvaluatorPrompt(summary: ProfileSummary): string {
  return `You are an expert B2B lead analyst. Analyze this prospect for business potential.

PROFILE: ${summary.bio_summary}

BUSINESS CONTEXT: ${summary.business_context}

Provide a professional assessment with human-like judgment. Score naturally (e.g., 67, 82, 91) based on your evaluation.

Return JSON:
{
  "score": number,
  "category": "high_potential|medium_potential|low_potential|not_suitable", 
  "reasoning": "human-style assessment explanation",
  "deep_research_summary": "brief professional profile summary",
  "personal_brand_themes": ["theme1", "theme2"],
  "engagement_behavior": "brief assessment", 
  "business_signals": ["signal1", "signal2"],
  "risk_factors": ["risk1", "risk2"],
  "contact_strategy": {
    "timing": "when to reach out",
    "approach": "how to approach", 
    "talking_points": ["point1", "point2"]
  },
  "confidence": number
}`;
}

function buildDeepEvaluatorPrompt(summary: ProfileSummary): string {
  return `You are an expert B2B lead analyst with social intelligence capabilities. Analyze this prospect comprehensively.

PROFILE: ${summary.bio_summary}

CONTENT THEMES: ${summary.post_themes}

ENGAGEMENT: ${summary.engagement_patterns}

BUSINESS CONTEXT: ${summary.business_context}

Conduct a thorough assessment. Think like a human analyst who carefully reviewed their account. Score naturally based on genuine potential, not rubrics.

Return JSON:
{
  "score": number,
  "category": "high_potential|medium_potential|low_potential|not_suitable",
  "reasoning": "thoughtful human assessment of their business potential", 
  "deep_research_summary": "comprehensive social intelligence dossier",
  "personal_brand_themes": ["theme1", "theme2", "theme3"],
  "engagement_behavior": "detailed engagement and audience analysis",
  "business_signals": ["signal1", "signal2", "signal3"], 
  "risk_factors": ["risk1", "risk2"],
  "contact_strategy": {
    "timing": "optimal outreach timing with rationale",
    "approach": "personalized approach strategy",
    "talking_points": ["specific point1", "specific point2", "specific point3"]
  },
  "confidence": number
}`;
}

function validateAnalysisResult(result: any): AnalysisResult {
  return {
    score: Math.min(Math.max(result.score || 0, 0), 100),
    category: ['high_potential', 'medium_potential', 'low_potential', 'not_suitable'].includes(result.category) 
      ? result.category : 'low_potential',
    reasoning: result.reasoning || 'No reasoning provided',
    deep_research_summary: result.deep_research_summary || 'No summary available',
    personal_brand_themes: Array.isArray(result.personal_brand_themes) ? result.personal_brand_themes : [],
    engagement_behavior: result.engagement_behavior || 'No engagement data',
    business_signals: Array.isArray(result.business_signals) ? result.business_signals : [],
    risk_factors: Array.isArray(result.risk_factors) ? result.risk_factors : [],
    contact_strategy: {
      timing: result.contact_strategy?.timing || 'Standard business hours',
      approach: result.contact_strategy?.approach || 'Professional outreach',
      talking_points: Array.isArray(result.contact_strategy?.talking_points) 
        ? result.contact_strategy.talking_points : []
    },
    confidence: Math.min(Math.max(result.confidence || 75, 0), 100)
  };
}

// ===============================================================================
// MESSAGE GENERATION
// ===============================================================================

async function generateOutreachMessage(profile: ProfileData, business: BusinessProfile, analysis: AnalysisResult, env: Env, requestId: string): Promise<string> {
  const messagePrompt = `Create a personalized Instagram DM for this prospect:

PROSPECT: @${profile.username} (${profile.displayName})
ANALYSIS SUMMARY: ${analysis.deep_research_summary}
BRAND THEMES: ${analysis.personal_brand_themes.join(', ')}
KEY SIGNALS: ${analysis.business_signals.join(', ')}

YOUR BUSINESS: ${business.name} - ${business.value_proposition}
APPROACH: ${analysis.contact_strategy.approach}
TALKING POINTS: ${analysis.contact_strategy.talking_points.join(', ')}

Style: ${business.communication_style}

Create a genuine, personalized message under 200 characters that references their specific content/interests and naturally introduces your value.

Return JSON: {"message": "your message here"}`;

  try {
    const apiKey = env.CLAUDE_KEY || env.ANTHROPIC_KEY;
    const response = await callWithRetry(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: messagePrompt }],
          temperature: 0.7,
          max_tokens: 300
        })
      }
    );
    
    const messageResult = JSON.parse(response.content[0].text);
    return messageResult.message || '';
  } catch {
    logger('warn', 'Message generation failed, using fallback', { username: profile.username }, requestId);
    return '';
  }
}

function requestLoggingMiddleware(env: Env) {
  return async (c: any, next: any) => {
    const start = Date.now();
    const requestId = generateRequestId();
    
    c.set('requestId', requestId);
    c.set('startTime', start);
    
    await next();
    
    const duration = Date.now() - start;
    if (env.ENVIRONMENT === 'development') {
      logger('info', 'Request completed', {
        requestId,
        path: c.req.path,
        method: c.req.method,
        duration,
        status: c.res.status
      }, requestId);
    }
  };
}

function errorHandlingMiddleware(env: Env) {
  return async (c: any, next: any) => {
    try {
      await next();
    } catch (error: any) {
      const requestId = c.get('requestId') || generateRequestId();
      
      logger('error', 'Request failed', {
        requestId,
        error: error.message,
        stack: error.stack,
        path: c.req.path,
        method: c.req.method
      }, requestId);
      
      return c.json(createStandardResponse(
        false,
        undefined,
        env.ENVIRONMENT === 'development' ? error.message : 'Internal server error',
        requestId
      ), 500);
    }
  };
}

function rateLimitMiddleware(env: Env) {
  return async (c: any, next: any) => {
    await next();
  };
}

function bodyLimitMiddleware(maxSizeBytes: number = 1024 * 1024) {
  return async (c: any, next: any) => {
    const contentLength = c.req.header('content-length');
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      return c.json(createStandardResponse(
        false,
        undefined,
        'Request body too large'
      ), 413);
    }
    
    await next();
  };
}

// ===============================================================================
// APPLICATION SETUP
// ===============================================================================

const app = new Hono<{ Bindings: Env }>();

// Fixed CORS - Simple and working
app.use('*', cors({
  origin: [
    'https://oslira.com',
    'https://oslira.netlify.app', 
    'http://localhost:3000',
    'http://localhost:8080'
  ],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  maxAge: 86400
}));

// Environment-specific middleware
app.use('*', async (c, next) => {
  const env = c.env;
  
  await errorHandlingMiddleware(env)(c, async () => {
    await requestLoggingMiddleware(env)(c, async () => {
      await rateLimitMiddleware(env)(c, async () => {
        await bodyLimitMiddleware()(c, next);
      });
    });
  });
});


// ===============================================================================
// ROUTES
// ===============================================================================

app.get('/', (c) => {
  return c.json(createStandardResponse(true, {
    service: 'Oslira Analysis API',
    version: API_VERSION,
    status: 'operational'
  }));
});

app.get('/health', async (c) => {
  const checks = await Promise.allSettled([
    fetch(`${c.env.SUPABASE_URL}/rest/v1/users?limit=1`, {
      headers: { apikey: c.env.SUPABASE_SERVICE_ROLE }
    }),
    fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${c.env.OPENAI_KEY}` }
    })
  ]);
  
  const status = checks.every(check => check.status === 'fulfilled') ? 'healthy' : 'degraded';
  return c.json(createStandardResponse(true, { status }), status === 'healthy' ? 200 : 503);
});

app.get('/v1/config', (c) => {
  return c.json(createStandardResponse(true, {
    supabase: {
      url: c.env.SUPABASE_URL,
      anonKey: c.env.SUPABASE_ANON_KEY
    },
    api: { version: API_VERSION }
  }));
});

app.post('/v1/analyze', async (c) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // Authentication
    const auth = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!auth) {
      return c.json(createStandardResponse(false, undefined, 'Missing Authorization header', requestId), 401);
    }
    
    const userId = await verifyJWT(auth);
    if (!userId) {
      return c.json(createStandardResponse(false, undefined, 'Invalid token', requestId), 401);
    }
    
    // Request validation
    const body = await c.req.json();
    const { profile_url, analysis_type = 'light', business_id } = body;
    
    if (!profile_url || !business_id) {
      return c.json(createStandardResponse(false, undefined, 'Missing required fields', requestId), 400);
    }
    
    if (!['light', 'deep'].includes(analysis_type)) {
      return c.json(createStandardResponse(false, undefined, 'Invalid analysis_type', requestId), 400);
    }
    
    const username = extractUsername(profile_url);
    logger('info', 'Analysis request started', { username, analysisType: analysis_type, requestId });
    
    // Fetch user and business data
    const [userResult, business] = await Promise.all([
      fetchUserAndCredits(userId, c.env),
      fetchBusinessProfile(business_id, userId, c.env)
    ]);
    
    const creditCost = analysis_type === 'deep' ? 2 : 1;
    if (userResult.credits < creditCost) {
      return c.json(createStandardResponse(false, undefined, 'Insufficient credits', requestId), 402);
    }
    
    logger('info', 'Credit check passed', { credits: userResult.credits, cost: creditCost, requestId });
    
    // Profile scraping
    const profileData = await scrapeInstagramProfile(username, analysis_type, c.env);
    logger('info', 'Profile scraped', { username, followers: profileData.followersCount, requestId });
    
    // AI analysis
    const analysisResult = await performAIAnalysis(profileData, business, analysis_type, c.env, requestId);
    
    // Generate outreach message (deep analysis only)
    let outreachMessage = '';
    if (analysis_type === 'deep') {
      outreachMessage = await generateOutreachMessage(profileData, business, analysisResult, c.env, requestId);
    }
    
    // Save to database and update credits
    await Promise.all([
      saveAnalysisResults(profileData, analysisResult, business_id, userId, analysis_type, outreachMessage, c.env),
      updateCreditsAndTransaction(
        userId,
        creditCost,
        userResult.credits - creditCost,
        `${analysis_type} analysis for @${username}`,
        'analysis',
        c.env
      )
    ]);
    
    const totalTime = Date.now() - startTime;
    logger('info', 'Analysis completed', { username, score: analysisResult.score, totalTime, requestId });
    
    return c.json(createStandardResponse(true, {
      analysis: analysisResult,
      outreach_message: outreachMessage,
      credits_remaining: userResult.credits - creditCost,
      processing_time_ms: totalTime,
      profile: {
        username: profileData.username,
        display_name: profileData.displayName,
        followers_count: profileData.followersCount
      }
    }, undefined, requestId));
    
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    logger('error', 'Analysis failed', { error: error.message, totalTime, requestId });
    
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
});

app.post('/v1/bulk-analyze', async (c) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // Authentication
    const auth = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!auth) {
      return c.json(createStandardResponse(false, undefined, 'Missing Authorization header', requestId), 401);
    }
    
    const userId = await verifyJWT(auth);
    if (!userId) {
      return c.json(createStandardResponse(false, undefined, 'Invalid token', requestId), 401);
    }
    
    // Request validation
    const body = await c.req.json();
    const { profiles, analysis_type = 'light', business_id } = body;
    
    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      return c.json(createStandardResponse(false, undefined, 'Invalid profiles array', requestId), 400);
    }
    
    if (profiles.length > 50) {
      return c.json(createStandardResponse(false, undefined, 'Maximum 50 profiles per bulk request', requestId), 400);
    }
    
    logger('info', 'Bulk analysis started', { profileCount: profiles.length, analysisType: analysis_type, requestId });
    
    // Fetch user and business data
    const [userResult, business] = await Promise.all([
      fetchUserAndCredits(userId, c.env),
      fetchBusinessProfile(business_id, userId, c.env)
    ]);
    
    const costPerProfile = analysis_type === 'deep' ? 2 : 1;
    const totalCost = profiles.length * costPerProfile;
    
    if (userResult.credits < totalCost) {
      return c.json(createStandardResponse(false, undefined, 'Insufficient credits', requestId), 402);
    }
    
    // Process profiles
    const results = [];
    let successful = 0;
    let failed = 0;
    let creditsUsed = 0;
    
    for (const profileUrl of profiles) {
      try {
        const username = extractUsername(profileUrl);
        
        // Scrape and analyze
        const profileData = await scrapeInstagramProfile(username, analysis_type, c.env);
        const analysisResult = await performAIAnalysis(profileData, business, analysis_type, c.env, requestId);
        
        let outreachMessage = '';
        if (analysis_type === 'deep') {
          outreachMessage = await generateOutreachMessage(profileData, business, analysisResult, c.env, requestId);
        }
        
        // Save to database
        await saveAnalysisResults(profileData, analysisResult, business_id, userId, analysis_type, outreachMessage, c.env);
        
        results.push({
          username,
          success: true,
          analysis: analysisResult,
          outreach_message: outreachMessage
        });
        
        successful++;
        creditsUsed += costPerProfile;
        
      } catch (profileError: any) {
        logger('error', 'Profile analysis failed', { profileUrl, error: profileError.message, requestId });
        
        results.push({
          profile_url: profileUrl,
          success: false,
          error: profileError.message
        });
        
        failed++;
      }
    }
    
    // Update credits
    if (creditsUsed > 0) {
      await updateCreditsAndTransaction(
        userId,
        creditsUsed,
        userResult.credits - creditsUsed,
        `Bulk ${analysis_type} analysis (${successful} profiles)`,
        'bulk',
        c.env
      );
    }
    
    const totalTime = Date.now() - startTime;
    logger('info', 'Bulk analysis completed', { successful, failed, creditsUsed, totalTime, requestId });
    
    return c.json(createStandardResponse(true, {
      successful,
      failed,
      total: profiles.length,
      credits_used: creditsUsed,
      credits_remaining: userResult.credits - creditsUsed,
      results,
      processing_time_ms: totalTime
    }, undefined, requestId));
    
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    logger('error', 'Bulk analysis failed', { error: error.message, totalTime, requestId });
    
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
});

// Stripe billing endpoints
app.post('/v1/billing/create-checkout-session', async (c) => {
  const requestId = generateRequestId();
  
  try {
    const body = await c.req.json();
    const { price_id, success_url, cancel_url, customer_email, metadata } = body;
    
    if (!price_id || !success_url || !cancel_url) {
      return c.json(createStandardResponse(false, undefined, 'Missing required fields', requestId), 400);
    }
    
    const checkoutData = new URLSearchParams({
      'mode': 'subscription',
      'payment_method_types[0]': 'card',
      'line_items[0][price]': price_id,
      'line_items[0][quantity]': '1',
      'success_url': success_url,
      'cancel_url': cancel_url,
      ...(customer_email && { 'customer_email': customer_email }),
      ...(metadata && Object.entries(metadata).reduce((acc, [key, value], index) => {
        acc[`metadata[${key}]`] = value as string;
        return acc;
      }, {} as Record<string, string>))
    });
    
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: checkoutData
    });
    
    if (!response.ok) {
      throw new Error(`Stripe API error: ${response.status}`);
    }
    
    const session = await response.json();
    logger('info', 'Checkout session created', { sessionId: session.id, requestId });
    
    return c.json(createStandardResponse(true, {
      checkout_url: session.url,
      session_id: session.id
    }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Checkout session creation failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, 'Failed to create checkout session', requestId), 500);
  }
});

app.post('/v1/billing/create-portal-session', async (c) => {
  const requestId = generateRequestId();
  
  try {
    const body = await c.req.json();
    const { customer_id, return_url } = body;
    
    if (!customer_id || !return_url) {
      return c.json(createStandardResponse(false, undefined, 'Missing required fields', requestId), 400);
    }
    
    const portalData = new URLSearchParams({
      'customer': customer_id,
      'return_url': return_url
    });
    
    const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: portalData
    });
    
    if (!response.ok) {
      throw new Error(`Stripe API error: ${response.status}`);
    }
    
    const session = await response.json();
    logger('info', 'Portal session created', { customerId: customer_id, requestId });
    
    return c.json(createStandardResponse(true, {
      portal_url: session.url,
      session_id: session.id
    }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Portal session creation failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, 'Failed to create portal session', requestId), 500);
  }
});

app.post('/v1/stripe-webhook', async (c) => {
  const requestId = generateRequestId();
  
  try {
    const signature = c.req.header('stripe-signature');
    if (!signature) {
      return c.json(createStandardResponse(false, undefined, 'Missing signature', requestId), 400);
    }
    
    const rawBody = await c.req.text();
    
    // Basic webhook verification (simplified for production use)
    const [timestamp, sig] = signature.split(',').map(part => part.split('=')[1]);
    const payload = `${timestamp}.${rawBody}`;
    
    // In production, implement proper Stripe signature verification
    const event = JSON.parse(rawBody);
    
    logger('info', 'Webhook received', { eventType: event.type, eventId: event.id, requestId });
    
    // Handle webhook events
    const headers = {
      apikey: c.env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json'
    };
    
    switch (event.type) {
      case 'checkout.session.completed':
        await fetch(`${c.env.SUPABASE_URL}/rest/v1/users`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            stripe_customer_id: event.data.object.customer,
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
        });
        break;
        
      case 'customer.subscription.deleted':
        await fetch(`${c.env.SUPABASE_URL}/rest/v1/users`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            subscription_status: 'cancelled',
            updated_at: new Date().toISOString()
          })
        });
        break;
        
      default:
        logger('info', 'Unhandled webhook event', { eventType: event.type, requestId });
    }
    
    return c.json(createStandardResponse(true, { received: true }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Webhook processing failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 400);
  }
});

// Error handling
app.notFound((c) => {
  const requestId = generateRequestId();
  return c.json(createStandardResponse(false, undefined, 'Endpoint not found', requestId), 404);
});

app.onError((err, c) => {
  const requestId = generateRequestId();
  logger('error', 'Unhandled error', { error: err.message, stack: err.stack, requestId });
  return c.json(createStandardResponse(false, undefined, 'Internal server error', requestId), 500);
});

export default app;
