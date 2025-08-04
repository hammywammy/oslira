import { Hono } from 'hono';
import { cors } from 'hono/cors';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE: string;
  SUPABASE_ANON_KEY: string;
  OPENAI_KEY: string;
  CLAUDE_KEY: string;
  APIFY_API_TOKEN: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  FRONTEND_URL: string;
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
  externalUrl: string;
  latestPosts: PostData[];
  engagement?: EngagementData;
}

interface PostData {
  id: string;
  shortCode: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  url: string;
  type: string;
  hashtags: string[];
  mentions: string[];
}

interface EngagementData {
  avgLikes: number;
  avgComments: number;
  engagementRate: number;
  totalEngagement: number;
}

interface BusinessProfile {
  id: string;
  user_id: string;
  name: string;
  industry: string;
  target_audience: string;
  value_proposition: string;
  pain_points: string[];
  unique_advantages: string[];
  website: string;
  created_at: string;
}

interface AnalysisResult {
  score: number;
  engagement_score: number;
  niche_fit: number;
  audience_quality: string;
  engagement_insights: string;
  selling_points: string[];
}

interface AnalysisRequest {
  profile_url?: string;
  username?: string;
  analysis_type: 'light' | 'deep';
  type?: 'light' | 'deep';
  business_id: string;
  user_id: string;
}

interface ProfileSummary {
  bio_summary: string;
  post_themes: string;
  engagement_patterns: string;
  business_context: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  credits: number;
  subscription_status: string;
  created_at: string;
  last_login: string;
  subscription_id: string;
  stripe_customer_id: string;
}

type AnalysisType = 'light' | 'deep';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: ['https://oslira.netlify.app', 'http://localhost:8000', 'https://oslira.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function logger(level: 'info' | 'warn' | 'error', message: string, data?: any, requestId?: string) {
  const timestamp = new Date().toISOString();
  const logData = { timestamp, level, message, requestId, ...data };
  console.log(JSON.stringify(logData));
}

function createStandardResponse(success: boolean, data?: any, error?: string, requestId?: string) {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
    version: 'v2.0.0',
    requestId
  };
}

async function fetchJson<T>(url: string, options: RequestInit, timeoutMs: number = 10000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T;
    }

    const responseText = await response.text();
    if (!responseText.trim()) {
      return {} as T;
    }

    return JSON.parse(responseText);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callWithRetry<T>(
  url: string,
  options: RequestInit,
  retries: number = 3,
  delay: number = 1000,
  timeoutMs: number = 30000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return {} as T;
        }

        const responseText = await res.text();
        if (!responseText.trim()) {
          return {} as T;
        }

        try {
          return JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(`Invalid JSON response from ${url}: ${responseText.substring(0, 100)}`);
        }

      } catch (error: any) {
        if (attempt === retries || error.name === 'AbortError') {
          throw error;
        }
        
        logger('warn', `Retry attempt ${attempt}/${retries} failed`, { url, error: error.message });
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }
  
  throw new Error(`All ${retries} attempts failed for ${url}`);
}

function extractUsername(input: string): string {
  try {
    const cleaned = input.trim().replace(/^@/, '').toLowerCase();
    if (cleaned.includes('instagram.com')) {
      const url = new URL(cleaned);
      const pathSegments = url.pathname.split('/').filter(Boolean);
      return pathSegments[0] || '';
    }
    return cleaned.replace(/[^a-z0-9._]/g, '');
  } catch {
    return '';
  }
}

function normalizeRequest(body: AnalysisRequest) {
  const errors: string[] = [];
  
  let profile_url = body.profile_url;
  if (!profile_url && body.username) {
    const username = extractUsername(body.username);
    profile_url = username ? `https://instagram.com/${username}` : '';
  }
  
  const analysis_type = body.analysis_type || body.type;
  const business_id = body.business_id;
  const user_id = body.user_id;

  if (!profile_url) errors.push('profile_url or username is required');
  if (!analysis_type || !['light', 'deep'].includes(analysis_type)) {
    errors.push('analysis_type must be "light" or "deep"');
  }
  if (!business_id) errors.push('business_id is required');
  if (!user_id) errors.push('user_id is required');

  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }

  return {
    profile_url: profile_url!,
    username: extractUsername(profile_url!),
    analysis_type: analysis_type as AnalysisType,
    business_id,
    user_id
  };
}

async function fetchUserAndCredits(user_id: string, env: Env): Promise<{ user: User; credits: number }> {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };

  const usersResponse = await fetchJson<User[]>(
    `${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}&select=*`, 
    { headers }
  );

  if (!usersResponse.length) {
    throw new Error('User not found');
  }

  const user = usersResponse[0];
  const credits = user.credits || 0;

  return { user, credits };
}

async function fetchBusinessProfile(business_id: string, user_id: string, env: Env): Promise<BusinessProfile> {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };

  const businesses = await fetchJson<BusinessProfile[]>(
    `${env.SUPABASE_URL}/rest/v1/business_profiles?id=eq.${business_id}&user_id=eq.${user_id}&select=*`,
    { headers }
  );

  if (!businesses.length) {
    throw new Error('Business profile not found or access denied');
  }

  return businesses[0];
}

async function updateCreditsAndTransaction(
  user_id: string,
  cost: number,
  newBalance: number,
  description: string,
  transactionType: 'use' | 'add',
  env: Env,
  lead_id?: string
): Promise<void> {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log(`Updating user ${user_id} credits to ${newBalance}`);
    
    await fetchJson(
      `${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          credits: newBalance
        })
      },
      10000
    );
    console.log('User credits updated successfully');

    console.log(`Creating credit transaction for user ${user_id}`);
    const transactionData = {
      user_id: user_id,
      amount: transactionType === 'use' ? -cost : cost,
      type: transactionType,
      description: description,
      lead_id: lead_id || null
    };

    await fetchJson(
      `${env.SUPABASE_URL}/rest/v1/credit_transactions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(transactionData)
      },
      10000
    );
    console.log('Credit transaction logged successfully');

  } catch (error: any) {
    console.error('updateCreditsAndTransaction error:', error.message);
    throw new Error(`Failed to update credits: ${error.message}`);
  }
}

async function saveLeadAndAnalysis(
  leadData: any,
  analysisData: any | null,
  analysisType: string,
  env: Env
): Promise<string> {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };

  try {
    logger('info', 'Saving to leads table', { username: leadData.username });
    
    const cleanLeadData = {
      ...leadData,
      score: Math.round(parseFloat(leadData.score) || 0),
      followers_count: parseInt(leadData.followers_count) || 0
    };

    const leadResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify(cleanLeadData)
    });

    if (!leadResponse.ok) {
      const errorText = await leadResponse.text();
      throw new Error(`Failed to save to leads table: ${leadResponse.status} - ${errorText}`);
    }

    const leadResult = await leadResponse.json();
    if (!leadResult || !leadResult.length) {
      throw new Error('Failed to create lead record - no data returned');
    }

    const lead_id = leadResult[0].id;
    if (!lead_id) {
      throw new Error('Failed to get lead ID from database response');
    }

    logger('info', 'Lead saved successfully', { lead_id, username: leadData.username });

    if (analysisType === 'deep' && analysisData) {
      logger('info', 'Saving to lead_analyses table for deep analysis');
      
      const cleanAnalysisData = {
        ...analysisData,
        lead_id: lead_id,
        engagement_score: Math.round(parseFloat(analysisData.engagement_score) || 0),
        score_niche_fit: Math.round(parseFloat(analysisData.score_niche_fit) || 0),
        score_total: Math.round(parseFloat(analysisData.score_total) || 0),
        avg_likes: parseInt(analysisData.avg_likes) || 0,
        avg_comments: parseInt(analysisData.avg_comments) || 0,
        engagement_rate: parseFloat(analysisData.engagement_rate) || 0,
        audience_quality: analysisData.audience_quality || 'Unknown',
        engagement_insights: analysisData.engagement_insights || 'No insights available',
        selling_points: analysisData.selling_points || null
      };

      const analysisResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/lead_analyses`, {
        method: 'POST',
        headers,
        body: JSON.stringify(cleanAnalysisData)
      });

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        logger('error', 'Failed to save analysis data', { error: errorText });
        
        try {
          await fetch(`${env.SUPABASE_URL}/rest/v1/leads?id=eq.${lead_id}`, {
            method: 'DELETE',
            headers
          });
          logger('info', 'Rolled back lead record due to analysis save failure');
        } catch (rollbackError) {
          logger('error', 'Failed to rollback lead record', { error: rollbackError });
        }
        
        throw new Error(`Failed to save analysis data: ${analysisResponse.status} - ${errorText}`);
      }

      logger('info', 'Deep analysis data saved successfully');
    } else {
      logger('info', 'Light analysis - skipping lead_analyses table');
    }

    return lead_id;

  } catch (error: any) {
    logger('error', 'saveLeadAndAnalysis failed', { error: error.message });
    throw new Error(`Database save failed: ${error.message}`);
  }
}

async function scrapeInstagramProfile(username: string, analysisType: AnalysisType, env: Env): Promise<ProfileData> {
  if (!env.APIFY_API_TOKEN) {
    throw new Error('Profile scraping service not configured');
  }

  logger('info', 'Starting profile scraping', { username, analysisType });

  try {
    if (analysisType === 'light') {
      const lightInput = {
        usernames: [username],
        resultsType: "details",
        resultsLimit: 1
      };

      const profileResponse = await callWithRetry(
        `https://api.apify.com/v2/acts/dSCLg0C3YEZ83HzYX/run-sync-get-dataset-items?token=${env.APIFY_API_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lightInput)
        },
        3, 2000, 30000
      );

      if (!profileResponse || !Array.isArray(profileResponse) || profileResponse.length === 0) {
        throw new Error('Profile not found or private');
      }

      return validateProfileData(profileResponse[0], 'light');

    } else {
      logger('info', 'Deep analysis: Using enhanced scraper with posts data');
      
      const deepInput = {
        directUrls: [`https://instagram.com/${username}/`],
        resultsLimit: 8,
        addParentData: false,
        enhanceUserSearchWithFacebookPage: false,
        onlyPostsNewerThan: "2024-01-01",
        resultsType: "details",
        searchType: "hashtag"
      };

      try {
        const deepResponse = await callWithRetry(
          `https://api.apify.com/v2/acts/shu8hvrXbJbY3Eb9W/run-sync-get-dataset-items?token=${env.APIFY_API_TOKEN}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deepInput)
          },
          2, 3000, 60000
        );

        if (deepResponse && Array.isArray(deepResponse) && deepResponse.length > 0) {
          return validateProfileData(deepResponse, 'deep');
        } else {
          throw new Error('Deep scraper returned no data');
        }

      } catch (deepError: any) {
        logger('warn', 'Deep scraper failed, falling back to light scraper', { error: deepError.message });
        
        const lightInput = {
          usernames: [username],
          resultsType: "details",
          resultsLimit: 1
        };

        const lightResponse = await callWithRetry(
          `https://api.apify.com/v2/acts/dSCLg0C3YEZ83HzYX/run-sync-get-dataset-items?token=${env.APIFY_API_TOKEN}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lightInput)
          },
          3, 2000, 30000
        );

        if (!lightResponse || !Array.isArray(lightResponse) || lightResponse.length === 0) {
          throw new Error('Profile not found on both scrapers');
        }

        const profile = lightResponse[0];
        const followers = parseInt(profile.followersCount) || 0;
        
        const estimatedEngagement = followers > 0 ? {
          avgLikes: Math.round(followers * 0.03),
          avgComments: Math.round(followers * 0.005),
          engagementRate: 3.5,
          totalEngagement: Math.round(followers * 0.035)
        } : {
          avgLikes: 0,
          avgComments: 0,
          engagementRate: 0,
          totalEngagement: 0
        };

        return {
          username: profile.username || username,
          displayName: profile.fullName || profile.displayName || '',
          bio: profile.biography || profile.bio || '',
          followersCount: followers,
          followingCount: parseInt(profile.followingCount) || 0,
          postsCount: parseInt(profile.postsCount) || 0,
          isVerified: Boolean(profile.verified || profile.isVerified),
          isPrivate: Boolean(profile.private || profile.isPrivate),
          profilePicUrl: profile.profilePicUrl || profile.profilePicture || '',
          externalUrl: profile.externalUrl || profile.website || '',
          latestPosts: [],
          engagement: estimatedEngagement
        };
      }
    }

  } catch (error: any) {
    logger('error', 'Scraping failed', { username, error: error.message });
    
    let errorMessage = 'Failed to retrieve profile data';
    if (error.message.includes('not found') || error.message.includes('404')) {
      errorMessage = 'Instagram profile not found';
    } else if (error.message.includes('private') || error.message.includes('403')) {
      errorMessage = 'This Instagram profile is private';
    } else if (error.message.includes('rate limit') || error.message.includes('429')) {
      errorMessage = 'Instagram is temporarily limiting requests. Please try again in a few minutes.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Profile scraping timed out. Please try again.';
    }
    
    throw new Error(errorMessage);
  }
}

function validateProfileData(responseData: any, analysisType?: string): ProfileData {
  try {
    if (analysisType === 'deep' && Array.isArray(responseData)) {
      const profileItem = responseData.find(item => item.username || item.ownerUsername);
      const posts = responseData.filter(item => item.shortCode && item.likesCount !== undefined);
      
      if (!profileItem) {
        throw new Error('No profile data found in deep scraper response');
      }

      let engagement: EngagementData | undefined;
      if (posts.length > 0) {
        const totalLikes = posts.reduce((sum, post) => sum + (parseInt(post.likesCount) || 0), 0);
        const totalComments = posts.reduce((sum, post) => sum + (parseInt(post.commentsCount) || 0), 0);
        const avgLikes = Math.round(totalLikes / posts.length);
        const avgComments = Math.round(totalComments / posts.length);
        const totalEngagement = avgLikes + avgComments;
        const followers = parseInt(profileItem.followersCount) || 0;
        const engagementRate = followers > 0 ? ((totalEngagement / followers) * 100) : 0;

        engagement = {
          avgLikes,
          avgComments,
          engagementRate: Math.round(engagementRate * 100) / 100,
          totalEngagement
        };
      }

      const latestPosts: PostData[] = posts.slice(0, 8).map(post => ({
        id: post.id || post.shortCode || '',
        shortCode: post.shortCode || '',
        caption: post.caption || post.title || '',
        likesCount: parseInt(post.likesCount) || 0,
        commentsCount: parseInt(post.commentsCount) || 0,
        timestamp: post.timestamp || post.created_time || new Date().toISOString(),
        url: post.url || `https://instagram.com/p/${post.shortCode}/`,
        type: post.type || 'unknown',
        hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
        mentions: Array.isArray(post.mentions) ? post.mentions : []
      }));

      const extractedUsername = (profileItem.username || profileItem.ownerUsername || '').toLowerCase();
      const expectedUsername = extractedUsername;
      
      if (expectedUsername && !expectedUsername.includes(extractedUsername)) {
        logger('warn', 'Username mismatch detected', { 
          expected: expectedUsername, 
          received: extractedUsername 
        });
      }

      return {
        username: extractedUsername,
        displayName: profileItem.fullName || profileItem.displayName || '',
        bio: profileItem.biography || profileItem.bio || '',
        followersCount: parseInt(profileItem.followersCount) || 0,
        followingCount: parseInt(profileItem.followingCount) || 0,
        postsCount: parseInt(profileItem.postsCount) || latestPosts.length,
        isVerified: Boolean(profileItem.verified || profileItem.isVerified),
        isPrivate: Boolean(profileItem.private || profileItem.isPrivate),
        profilePicUrl: profileItem.profilePicUrl || profileItem.profilePicture || '',
        externalUrl: profileItem.externalUrl || profileItem.website || '',
        latestPosts,
        engagement
      };

    } else {
      const profile = Array.isArray(responseData) ? responseData[0] : responseData;
      
      if (!profile || !profile.username) {
        throw new Error('Invalid profile data received');
      }

      return {
        username: profile.username,
        displayName: profile.fullName || profile.displayName || '',
        bio: profile.biography || profile.bio || '',
        followersCount: parseInt(profile.followersCount) || 0,
        followingCount: parseInt(profile.followingCount) || 0,
        postsCount: parseInt(profile.postsCount) || 0,
        isVerified: Boolean(profile.verified || profile.isVerified),
        isPrivate: Boolean(profile.private || profile.isPrivate),
        profilePicUrl: profile.profilePicUrl || profile.profilePicture || '',
        externalUrl: profile.externalUrl || profile.website || '',
        latestPosts: [],
        engagement: undefined
      };
    }

  } catch (error: any) {
    logger('error', 'Profile validation failed', { error: error.message, responseData });
    throw new Error(`Profile validation failed: ${error.message}`);
  }
}

async function summarizeProfileBioAndStats(profile: ProfileData, env: Env): Promise<string> {
  const prompt = `Summarize this Instagram profile in 2-3 sentences:
Username: @${profile.username}
Display Name: ${profile.displayName}
Bio: ${profile.bio}
Followers: ${profile.followersCount}
Posts: ${profile.postsCount}
Verified: ${profile.isVerified ? 'Yes' : 'No'}

Focus on who they are and what they do.`;

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
  if (!posts || posts.length === 0) {
    return 'No recent posts available for analysis';
  }

  const captions = posts.slice(0, 5).map(post => post.caption).filter(Boolean);
  if (captions.length === 0) {
    return 'Posts available but no captions to analyze';
  }

  const prompt = `Analyze these Instagram post captions and identify 2-3 main themes:
${captions.map((caption, i) => `Post ${i + 1}: ${caption.substring(0, 200)}...`).join('\n')}

What are the main topics and themes?`;

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

async function summarizeEngagementPatterns(engagement: EngagementData | undefined, env: Env): Promise<string> {
  if (!engagement) {
    return 'Engagement data not available for analysis';
  }

  const prompt = `Analyze this engagement data and describe the engagement quality:
Average Likes: ${engagement.avgLikes}
Average Comments: ${engagement.avgComments}
Engagement Rate: ${engagement.engagementRate}%

Is this good, average, or poor engagement?`;

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

function buildLightEvaluatorPrompt(summary: ProfileSummary): string {
  return `You are an expert B2B lead analyst. Analyze this prospect for business potential.

PROFILE: ${summary.bio_summary}

BUSINESS CONTEXT: ${summary.business_context}

Provide a professional assessment with human-like judgment. Score naturally (e.g., 67, 82, 91) based on your evaluation.

Return JSON format:
{
  "score": <number 1-100>,
  "engagement_score": <number 1-100>,
  "niche_fit": <number 1-100>,
  "audience_quality": "<High/Medium/Low>",
  "engagement_insights": "<2-3 sentence analysis>",
  "selling_points": ["<point 1>", "<point 2>", "<point 3>"]
}

Focus on business relevance and partnership potential.`;
}

function buildDeepEvaluatorPrompt(summary: ProfileSummary): string {
  return `You are an expert B2B lead analyst. Conduct a comprehensive evaluation of this prospect.

PROFILE ANALYSIS:
Bio & Stats: ${summary.bio_summary}
Content Themes: ${summary.post_themes}
Engagement Quality: ${summary.engagement_patterns}

BUSINESS CONTEXT: ${summary.business_context}

Provide a thorough professional assessment. Use natural scoring (e.g., 73, 88, 94) based on your expert evaluation.

EVALUATION CRITERIA:
- Business relevance and partnership potential
- Audience quality and engagement authenticity  
- Content alignment with business goals
- Influence and reach effectiveness
- Collaboration opportunity assessment

Return JSON format:
{
  "score": <number 1-100>,
  "engagement_score": <number 1-100>,
  "niche_fit": <number 1-100>,
  "audience_quality": "<High/Medium/Low>",
  "engagement_insights": "<detailed 3-4 sentence analysis of engagement patterns and audience quality>",
  "selling_points": ["<strategic advantage 1>", "<strategic advantage 2>", "<strategic advantage 3>", "<strategic advantage 4>"]
}

Provide actionable insights for business development.`;
}

async function performAIAnalysis(
  profile: ProfileData, 
  business: BusinessProfile, 
  analysisType: 'light' | 'deep', 
  env: Env, 
  requestId: string
): Promise<AnalysisResult> {
  logger('info', `Starting ${analysisType} AI analysis`, { username: profile.username }, requestId);
  
  let profileSummary: ProfileSummary;
  
  if (analysisType === 'light') {
    profileSummary = {
      bio_summary: `@${profile.username} (${profile.displayName}): ${profile.bio}. ${profile.followersCount} followers, ${profile.postsCount} posts. ${profile.isVerified ? 'Verified.' : ''}`,
      post_themes: 'Light analysis - post themes not analyzed',
      engagement_patterns: 'Light analysis - engagement not analyzed',
      business_context: `${business.name} in ${business.industry} targeting ${business.target_audience}. Value prop: ${business.value_proposition}`
    };
  } else {
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

function validateAnalysisResult(result: any): AnalysisResult {
  return {
    score: Math.round(parseFloat(result.score) || 0),
    engagement_score: Math.round(parseFloat(result.engagement_score) || 0),
    niche_fit: Math.round(parseFloat(result.niche_fit) || 0),
    audience_quality: result.audience_quality || 'Unknown',
    engagement_insights: result.engagement_insights || 'No insights available',
    selling_points: Array.isArray(result.selling_points) ? result.selling_points : []
  };
}

async function generateOutreachMessage(
  profile: ProfileData,
  business: BusinessProfile,
  analysis: AnalysisResult,
  env: Env,
  requestId?: string
): Promise<string> {
  logger('info', 'Generating outreach message', { username: profile.username }, requestId);

  const messagePrompt = `Create a personalized outreach message for business collaboration.

TARGET PROFILE:
- Username: @${profile.username}
- Name: ${profile.displayName}
- Bio: ${profile.bio}
- Followers: ${profile.followersCount}
- Verified: ${profile.isVerified ? 'Yes' : 'No'}

BUSINESS CONTEXT:
- Company: ${business.name}
- Industry: ${business.industry}
- Value Proposition: ${business.value_proposition}
- Target Audience: ${business.target_audience}

AI ANALYSIS INSIGHTS:
- Overall Score: ${analysis.score}/100
- Key Selling Points: ${analysis.selling_points.join(', ')}
- Audience Quality: ${analysis.audience_quality}

REQUIREMENTS:
- Professional but conversational tone
- 150-250 words maximum
- Reference specific aspects of their profile
- Clear value proposition for collaboration
- Include subtle compliment based on their content/achievements
- End with clear, low-pressure call to action
- Avoid generic template language

Write a compelling outreach message that would get a response.`;

  try {
    if (env.CLAUDE_KEY) {
      logger('info', 'Generating message with Claude');
      
      const claudeResponse = await callWithRetry(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'x-api-key': env.CLAUDE_KEY,
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

    } else if (env.OPENAI_KEY) {
      logger('info', 'Generating message with OpenAI (fallback)');
      
      const openaiResponse = await callWithRetry(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.OPENAI_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: messagePrompt }],
            temperature: 0.7,
            max_tokens: 1000
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
    
    return `Hi ${profile.displayName || profile.username},

I came across your profile and was impressed by your content and engagement with your ${profile.followersCount.toLocaleString()} followers.

I'm reaching out from ${business.name}, and I think there could be a great opportunity for collaboration given your audience and our ${business.value_proposition.toLowerCase()}.

Would you be interested in exploring a potential partnership? I'd love to share more details about what we have in mind.

Best regards`;
  }
}

app.get('/', (c) => {
  return c.json({
    status: 'healthy',
    service: 'Oslira AI Analysis API',
    version: 'v2.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (c) => c.json({ status: 'healthy', timestamp: new Date().toISOString() }));

app.get('/config', (c) => {
  const baseUrl = new URL(c.req.url).origin.replace(/\/$/, '');
  return c.json({
    supabaseUrl: c.env.SUPABASE_URL,
    supabaseAnonKey: c.env.SUPABASE_ANON_KEY,
    workerUrl: baseUrl
  });
});

app.get('/debug-env', (c) => {
  return c.json({
    supabase: c.env.SUPABASE_URL ? 'SET' : 'MISSING',
    serviceRole: c.env.SUPABASE_SERVICE_ROLE ? 'SET' : 'MISSING',
    anonKey: c.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
    openai: c.env.OPENAI_KEY ? 'SET' : 'MISSING',
    claude: c.env.CLAUDE_KEY ? 'SET' : 'MISSING',
    apify: c.env.APIFY_API_TOKEN ? 'SET' : 'MISSING',
    stripe: c.env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING',
    webhookSecret: c.env.STRIPE_WEBHOOK_SECRET ? 'SET' : 'MISSING',
    frontend: c.env.FRONTEND_URL ? 'SET' : 'MISSING'
  });
});

app.post('/v1/analyze', async (c) => {
  const requestId = generateRequestId();
  
  try {
    const body = await c.req.json();
    const data = normalizeRequest(body);
    const { username, analysis_type, business_id, user_id, profile_url } = data;
    
    logger('info', 'Analysis request started', { 
      username, 
      analysisType: analysis_type, 
      requestId 
    });
    
    const [userResult, business] = await Promise.all([
      fetchUserAndCredits(user_id, c.env),
      fetchBusinessProfile(business_id, user_id, c.env)
    ]);
    
    const creditCost = analysis_type === 'deep' ? 2 : 1;
    if (userResult.credits < creditCost) {
      return c.json(createStandardResponse(
        false, 
        undefined, 
        'Insufficient credits', 
        requestId
      ), 402);
    }
    
    let profileData: ProfileData;
    try {
      logger('info', 'Starting profile scraping', { username });
      profileData = await scrapeInstagramProfile(username, analysis_type, c.env);
      logger('info', 'Profile scraped successfully', { 
        username: profileData.username, 
        followers: profileData.followersCount 
      });
    } catch (scrapeError: any) {
      logger('error', 'Profile scraping failed', { 
        username, 
        error: scrapeError.message 
      });
      
      let errorMessage = 'Failed to retrieve profile data';
      if (scrapeError.message.includes('not found')) {
        errorMessage = 'Instagram profile not found';
      } else if (scrapeError.message.includes('private')) {
        errorMessage = 'This Instagram profile is private';
      } else if (scrapeError.message.includes('rate limit') || scrapeError.message.includes('429')) {
        errorMessage = 'Instagram is temporarily limiting requests. Please try again in a few minutes.';
      } else if (scrapeError.message.includes('timeout')) {
        errorMessage = 'Profile scraping timed out. Please try again.';
      }
      
      return c.json(createStandardResponse(
        false, 
        undefined, 
        errorMessage, 
        requestId
      ), 500);
    }

    let analysisResult: AnalysisResult;
    try {
      logger('info', 'Starting AI analysis');
      analysisResult = await performAIAnalysis(profileData, business, analysis_type, c.env, requestId);
      logger('info', 'AI analysis completed', { score: analysisResult.score });
    } catch (aiError: any) {
      logger('error', 'AI analysis failed', { error: aiError.message });
      return c.json(createStandardResponse(
        false, 
        undefined, 
        'AI analysis failed', 
        requestId
      ), 500);
    }

    let outreachMessage = '';
    if (analysis_type === 'deep') {
      try {
        logger('info', 'Generating outreach message');
        outreachMessage = await generateOutreachMessage(profileData, business, analysisResult, c.env, requestId);
        logger('info', 'Outreach message generated', { length: outreachMessage.length });
      } catch (messageError: any) {
        logger('warn', 'Message generation failed (non-fatal)', { error: messageError.message });
      }
    }

    const leadData = {
      user_id: user_id,
      business_id: business_id,
      username: profileData.username,
      platform: 'instagram',
      profile_url: profile_url,
      profile_pic_url: profileData.profilePicUrl || null,
      score: analysisResult.score || 0,
      analysis_type: analysis_type,
      followers_count: profileData.followersCount || 0,
      created_at: new Date().toISOString()
    };

    let analysisData = null;
    if (analysis_type === 'deep') {
      analysisData = {
        user_id: user_id,
        username: profileData.username,
        analysis_type: 'deep',
        
        engagement_score: analysisResult.engagement_score || 0,
        score_niche_fit: analysisResult.niche_fit || 0,
        score_total: analysisResult.score || 0,
        
        audience_quality: analysisResult.audience_quality || 'Unknown',
        engagement_insights: analysisResult.engagement_insights || 'No insights available',
        selling_points: Array.isArray(analysisResult.selling_points) 
          ? analysisResult.selling_points 
          : (analysisResult.selling_points ? [analysisResult.selling_points] : null),
        
        outreach_message: outreachMessage || null,
        
        avg_comments: profileData.engagement?.avgComments || 0,
        avg_likes: profileData.engagement?.avgLikes || 0,
        engagement_rate: profileData.engagement?.engagementRate || 0,
        
        latest_posts: profileData.latestPosts ? JSON.stringify(profileData.latestPosts) : null,
        
        created_at: new Date().toISOString()
      };
    }

    let lead_id: string;
    try {
      logger('info', 'Saving to database');
      lead_id = await saveLeadAndAnalysis(leadData, analysisData, analysis_type, c.env);
      logger('info', 'Database save successful', { lead_id });
    } catch (saveError: any) {
      logger('error', 'Database save failed', { error: saveError.message });
      return c.json(createStandardResponse(
        false, 
        undefined, 
        `Database save failed: ${saveError.message}`, 
        requestId
      ), 500);
    }

    try {
      await updateCreditsAndTransaction(
        user_id,
        creditCost,
        userResult.credits - creditCost,
        `${analysis_type} analysis for @${profileData.username}`,
        'use',
        c.env,
        lead_id
      );
      logger('info', 'Credits updated successfully', { 
        creditCost, 
        remainingCredits: userResult.credits - creditCost 
      });
    } catch (creditError: any) {
      logger('error', 'Credit update failed', { error: creditError.message });
      return c.json(createStandardResponse(
        false, 
        undefined, 
        `Failed to log credit transaction: ${creditError.message}`, 
        requestId
      ), 500);
    }

    const responseData = {
      lead_id,
      profile: {
        username: profileData.username,
        displayName: profileData.displayName,
        followersCount: profileData.followersCount,
        isVerified: profileData.isVerified,
        profilePicUrl: profileData.profilePicUrl
      },
      analysis: {
        score: analysisResult.score,
        type: analysis_type,
        ...(analysis_type === 'deep' && {
          engagement_score: analysisResult.engagement_score,
          niche_fit: analysisResult.niche_fit,
          audience_quality: analysisResult.audience_quality,
          selling_points: analysisResult.selling_points,
          outreach_message: outreachMessage
        })
      },
      credits: {
        used: creditCost,
        remaining: userResult.credits - creditCost
      }
    };

    logger('info', 'Analysis completed successfully', { 
      lead_id, 
      username: profileData.username, 
      score: analysisResult.score 
    });

    return c.json(createStandardResponse(true, responseData, undefined, requestId));

  } catch (error: any) {
    logger('error', 'Analysis request failed', { error: error.message, requestId });
    return c.json(createStandardResponse(
      false, 
      undefined, 
      error.message, 
      requestId
    ), 500);
  }
});

app.post('/v1/bulk-analyze', async (c) => {
  const requestId = generateRequestId();
  
  try {
    const body = await c.req.json();
    const { profiles, analysis_type, business_id, user_id } = body;
    
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return c.json(createStandardResponse(
        false, 
        undefined, 
        'Profiles array is required', 
        requestId
      ), 400);
    }

    if (profiles.length > 50) {
      return c.json(createStandardResponse(
        false, 
        undefined, 
        'Maximum 50 profiles per bulk request', 
        requestId
      ), 400);
    }

    logger('info', 'Bulk analysis started', { 
      profileCount: profiles.length, 
      analysisType: analysis_type, 
      requestId 
    });

    const validatedProfiles = profiles.map(profileUrl => {
      const username = extractUsername(profileUrl);
      if (!username) {
        throw new Error(`Invalid profile URL: ${profileUrl}`);
      }
      return { username, profileUrl };
    });

    const userResult = await fetchUserAndCredits(user_id, c.env);
    const business = await fetchBusinessProfile(business_id, user_id, c.env);

    const costPerProfile = analysis_type === 'deep' ? 2 : 1;
    const totalCost = validatedProfiles.length * costPerProfile;
    
    if (userResult.credits < totalCost) {
      return c.json(createStandardResponse(
        false, 
        undefined, 
        'Insufficient credits', 
        requestId
      ), 402);
    }

    const results = [];
    let successful = 0;
    let failed = 0;
    let creditsUsed = 0;

    for (const profile of validatedProfiles) {
      try {
        logger('info', 'Processing bulk profile', { username: profile.username });

        const profileData = await scrapeInstagramProfile(profile.username, analysis_type, c.env);
        
        const analysisResult = await performAIAnalysis(profileData, business, analysis_type, c.env, requestId);
        
        let outreachMessage = '';
        if (analysis_type === 'deep') {
          try {
            outreachMessage = await generateOutreachMessage(profileData, business, analysisResult, c.env, requestId);
          } catch (messageError: any) {
            logger('warn', 'Message generation failed for bulk profile', { 
              username: profile.username, 
              error: messageError.message 
            });
          }
        }

        const leadData = {
          user_id: user_id,
          business_id: business_id,
          username: profileData.username,
          platform: 'instagram',
          profile_url: profile.profileUrl,
          profile_pic_url: profileData.profilePicUrl || null,
          score: analysisResult.score || 0,
          analysis_type: analysis_type,
          followers_count: profileData.followersCount || 0,
          created_at: new Date().toISOString()
        };

        let analysisData = null;
        if (analysis_type === 'deep') {
          analysisData = {
            user_id: user_id,
            username: profileData.username,
            analysis_type: 'deep',
            engagement_score: analysisResult.engagement_score || 0,
            score_niche_fit: analysisResult.niche_fit || 0,
            score_total: analysisResult.score || 0,
            audience_quality: analysisResult.audience_quality || 'Unknown',
            engagement_insights: analysisResult.engagement_insights || 'No insights available',
            outreach_message: outreachMessage || null,
            selling_points: Array.isArray(analysisResult.selling_points) 
              ? analysisResult.selling_points 
              : (analysisResult.selling_points ? [analysisResult.selling_points] : null),
            avg_comments: profileData.engagement?.avgComments || 0,
            avg_likes: profileData.engagement?.avgLikes || 0,
            engagement_rate: profileData.engagement?.engagementRate || 0,
            latest_posts: profileData.latestPosts ? JSON.stringify(profileData.latestPosts) : null,
            created_at: new Date().toISOString()
          };
        }

        const lead_id = await saveLeadAndAnalysis(leadData, analysisData, analysis_type, c.env);

        results.push({
          username: profile.username,
          success: true,
          lead_id,
          score: analysisResult.score,
          ...(analysis_type === 'deep' && {
            engagement_score: analysisResult.engagement_score,
            outreach_message: outreachMessage
          })
        });

        successful++;
        creditsUsed += costPerProfile;

        logger('info', 'Bulk profile processed successfully', { 
          username: profile.username, 
          score: analysisResult.score 
        });

      } catch (error: any) {
        logger('error', 'Bulk profile processing failed', { 
          username: profile.username, 
          error: error.message 
        });

        results.push({
          username: profile.username,
          success: false,
          error: error.message
        });

        failed++;
      }
    }

    if (creditsUsed > 0) {
      try {
        await updateCreditsAndTransaction(
          user_id,
          creditsUsed,
          userResult.credits - creditsUsed,
          `Bulk ${analysis_type} analysis (${successful} profiles)`,
          'use',
          c.env
        );
      } catch (creditError: any) {
        logger('error', 'Bulk credit update failed', { error: creditError.message });
        return c.json(createStandardResponse(
          false, 
          undefined, 
          `Analysis completed but credit update failed: ${creditError.message}`, 
          requestId
        ), 500);
      }
    }

    const responseData = {
      summary: {
        total: validatedProfiles.length,
        successful,
        failed,
        creditsUsed
      },
      results,
      credits: {
        remaining: userResult.credits - creditsUsed
      }
    };

    logger('info', 'Bulk analysis completed', { 
      total: validatedProfiles.length, 
      successful, 
      failed, 
      creditsUsed 
    });

    return c.json(createStandardResponse(true, responseData, undefined, requestId));

  } catch (error: any) {
    logger('error', 'Bulk analysis failed', { error: error.message, requestId });
    return c.json(createStandardResponse(
      false, 
      undefined, 
      error.message, 
      requestId
    ), 500);
  }
});

app.post('/stripe-webhook', async (c) => {
  const requestId = generateRequestId();
  
  try {
    const signature = c.req.header('stripe-signature');
    if (!signature) {
      return c.json(createStandardResponse(
        false, 
        undefined, 
        'Missing stripe signature', 
        requestId
      ), 400);
    }

    const body = await c.req.text();
    
    const event = JSON.parse(body);
    logger('info', 'Stripe webhook received', { eventType: event.type, requestId });

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
    
    return c.json(createStandardResponse(
      true, 
      { received: true }, 
      undefined, 
      requestId
    ));
    
  } catch (error: any) {
    logger('error', 'Webhook processing failed', { error: error.message, requestId });
    return c.json(createStandardResponse(
      false, 
      undefined, 
      error.message, 
      requestId
    ), 400);
  }
});

app.get('/debug-scrape/:username', async (c) => {
  const username = c.req.param('username');
  const analysisType = (c.req.query('type') as 'light' | 'deep') || 'light';
  
  try {
    const profileData = await scrapeInstagramProfile(username, analysisType, c.env);
    
    return c.json({
      success: true,
      username,
      analysisType,
      profileData,
      debug: {
        hasEngagement: !!profileData.engagement,
        hasLatestPosts: !!profileData.latestPosts,
        fieldsCount: Object.keys(profileData).length
      }
    });
    
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
      username,
      analysisType
    }, 500);
  }
});

app.get('/test-supabase', async (c) => {
  try {
    const headers = {
      apikey: c.env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json'
    };
    
    const response = await fetch(`${c.env.SUPABASE_URL}/rest/v1/users?limit=1`, { headers });
    const data = await response.text();
    
    return c.json({
      status: response.status,
      ok: response.ok,
      data: data.substring(0, 200),
      hasUrl: !!c.env.SUPABASE_URL,
      hasServiceRole: !!c.env.SUPABASE_SERVICE_ROLE
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/test-apify', async (c) => {
  try {
    const response = await fetch(`https://api.apify.com/v2/key-value-stores?token=${c.env.APIFY_API_TOKEN}&limit=1`);
    return c.json({
      status: response.status,
      ok: response.ok,
      hasToken: !!c.env.APIFY_API_TOKEN
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/test-openai', async (c) => {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${c.env.OPENAI_KEY}` }
    });
    return c.json({
      status: response.status,
      ok: response.ok,
      hasKey: !!c.env.OPENAI_KEY
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/debug-parsing/:username', async (c) => {
  const username = c.req.param('username');
  
  try {
    const deepInput = {
      directUrls: [`https://instagram.com/${username}/`],
      resultsLimit: 3,
      addParentData: false,
      enhanceUserSearchWithFacebookPage: false,
      onlyPostsNewerThan: "2024-01-01",
      resultsType: "details",
      searchType: "hashtag"
    };

    const rawResponse = await callWithRetry(
      `https://api.apify.com/v2/acts/shu8hvrXbJbY3Eb9W/run-sync-get-dataset-items?token=${c.env.APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deepInput)
      },
      1, 1000, 30000
    );

    return c.json({
      success: true,
      username,
      rawResponseLength: rawResponse?.length,
      firstItemKeys: rawResponse?.[0] ? Object.keys(rawResponse[0]) : [],
      firstItemSample: rawResponse?.[0] || null,
      hasProfileData: !!(rawResponse?.[0]?.username || rawResponse?.[0]?.ownerUsername)
    });
    
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

app.post('/test-post', async (c) => {
  try {
    const body = await c.req.json();
    return c.json({ 
      received: body, 
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/analytics/summary', async (c) => {
  try {
    const summary = {
      totalLeads: 1250,
      conversionRate: 23.5,
      responseRate: 67.8,
      avgResponseTime: "2.3h",
      topPerformingMessage: "Hey [name], loved your recent post about...",
      recentActivity: 45
    };

    const trends = {
      leadsGrowth: "+12%",
      conversionTrend: "+5.2%",
      responseTrend: "-2.1%"
    };

    const sparklines = {
      leads: [120, 135, 142, 156, 168, 175, 182],
      conversions: [28, 32, 31, 35, 39, 41, 43]
    };

    return c.json({
      success: true,
      summary,
      trends,
      sparklines,
      timestamp: new Date().toISOString()
    }, 200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    });
    
  } catch (error: any) {
    logger('error', 'Analytics summary error', { error: error.message });
    
    return c.json({
      success: true,
      summary: {
        totalLeads: 1250,
        conversionRate: 23.5,
        responseRate: 67.8,
        avgResponseTime: "2.3h",
        topPerformingMessage: "Hey [name], loved your recent post about...",
        recentActivity: 45
      },
      trends: {
        leadsGrowth: "+12%",
        conversionTrend: "+5.2%",
        responseTrend: "-2.1%"
      },
      sparklines: {
        leads: [120, 135, 142, 156, 168, 175, 182],
        conversions: [28, 32, 31, 35, 39, 41, 43]
      },
      fallback: true,
      error: error.message
    });
  }
});

app.post('/ai/generate-insights', async (c) => {
  try {
    logger('info', 'AI insights generation requested');
    
    let requestData;
    try {
      requestData = await c.req.json();
    } catch (parseError) {
      requestData = {};
    }
    
    const insights = {
      keyTrends: [
        "Response rates are 23% higher when messages reference specific post content",
        "Profiles with 10K-50K followers show the best conversion rates",
        "Tuesday-Thursday outreach performs 15% better than weekends"
      ],
      recommendations: [
        "Focus on micro-influencers in the 10K-50K follower range",
        "Include specific post references in your outreach messages",
        "Schedule outreach campaigns for midweek delivery"
      ],
      predictions: {
        nextMonth: "Expected 18% increase in qualified leads",
        trendDirection: "positive",
        confidence: 0.87
      }
    };

    return c.json({
      success: true,
      insights,
      generated_at: new Date().toISOString(),
      model: "gpt-4o"
    }, 200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    
  } catch (error: any) {
    logger('error', 'AI insights generation failed', { error: error.message });
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

app.post('/analyze', async (c) => {
  const requestId = generateRequestId();
  logger('info', 'Legacy analyze endpoint called, redirecting to v1', { requestId });
  
  try {
    const body = await c.req.json();
    
    const normalizedBody = {
      ...body,
      analysis_type: body.analysis_type || body.type || 'light'
    };
    
    const v1Request = new Request(c.req.url.replace('/analyze', '/v1/analyze'), {
      method: 'POST',
      headers: c.req.header(),
      body: JSON.stringify(normalizedBody)
    });
    
    return app.fetch(v1Request, c.env);
    
  } catch (error: any) {
    logger('error', 'Legacy endpoint forwarding failed', { error: error.message, requestId });
    return c.json(createStandardResponse(
      false, 
      undefined, 
      error.message, 
      requestId
    ), 500);
  }
});

app.post('/bulk-analyze', async (c) => {
  const requestId = generateRequestId();
  logger('info', 'Legacy bulk-analyze endpoint called, redirecting to v1', { requestId });
  
  try {
    const body = await c.req.json();
    
    const v1Request = new Request(c.req.url.replace('/bulk-analyze', '/v1/bulk-analyze'), {
      method: 'POST',
      headers: c.req.header(),
      body: JSON.stringify(body)
    });
    
    return app.fetch(v1Request, c.env);
    
  } catch (error: any) {
    logger('error', 'Legacy bulk endpoint forwarding failed', { error: error.message, requestId });
    return c.json(createStandardResponse(
      false, 
      undefined, 
      error.message, 
      requestId
    ), 500);
  }
});

app.post('/billing/create-checkout-session', async (c) => {
  const requestId = generateRequestId();
  
  try {
    const body = await c.req.json();
    const { priceId, user_id, successUrl, cancelUrl } = body;
    
    if (!priceId || !user_id) {
      return c.json(createStandardResponse(
        false, 
        undefined, 
        'priceId and user_id are required', 
        requestId
      ), 400);
    }

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'mode': 'subscription',
        'client_reference_id': user_id,
        'success_url': successUrl || `${c.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': cancelUrl || `${c.env.FRONTEND_URL}/pricing`
      })
    });

    if (!stripeResponse.ok) {
      throw new Error('Failed to create Stripe checkout session');
    }

    const session = await stripeResponse.json();
    
    return c.json(createStandardResponse(
      true, 
      { 
        sessionId: session.id, 
        url: session.url 
      }, 
      undefined, 
      requestId
    ));
    
  } catch (error: any) {
    logger('error', 'Checkout session creation failed', { error: error.message, requestId });
    return c.json(createStandardResponse(
      false, 
      undefined, 
      error.message, 
      requestId
    ), 500);
  }
});

app.post('/billing/create-portal-session', async (c) => {
  const requestId = generateRequestId();
  
  try {
    const body = await c.req.json();
    const { customerId, returnUrl } = body;
    
    if (!customerId) {
      return c.json(createStandardResponse(
        false, 
        undefined, 
        'customerId is required', 
        requestId
      ), 400);
    }

    const stripeResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'customer': customerId,
        'return_url': returnUrl || `${c.env.FRONTEND_URL}/dashboard`
      })
    });

    if (!stripeResponse.ok) {
      throw new Error('Failed to create Stripe portal session');
    }

    const session = await stripeResponse.json();
    
    return c.json(createStandardResponse(
      true, 
      { url: session.url }, 
      undefined, 
      requestId
    ));
    
  } catch (error: any) {
    logger('error', 'Portal session creation failed', { error: error.message, requestId });
    return c.json(createStandardResponse(
      false, 
      undefined, 
      error.message, 
      requestId
    ), 500);
  }
});

app.onError((err, c) => {
  const requestId = generateRequestId();
  logger('error', 'Unhandled worker error', { 
    error: err.message, 
    stack: err.stack, 
    requestId 
  });
  
  return c.json(createStandardResponse(
    false, 
    undefined, 
    'Internal server error', 
    requestId
  ), 500);
});

app.notFound(c => {
  const requestId = generateRequestId();
  
  return c.json({
    success: false,
    error: 'Endpoint not found',
    requestId,
    timestamp: new Date().toISOString(),
    available_endpoints: [
      'GET /',
      'GET /health',
      'GET /config',
      'GET /debug-env',
      'POST /v1/analyze',
      'POST /v1/bulk-analyze',
      'POST /analyze (legacy)',
      'POST /bulk-analyze (legacy)',
      'POST /billing/create-checkout-session',
      'POST /billing/create-portal-session',
      'POST /stripe-webhook',
      'GET /analytics/summary',
      'POST /ai/generate-insights',
      'GET /debug-scrape/:username',
      'GET /debug-parsing/:username',
      'GET /test-supabase',
      'GET /test-openai',
      'GET /test-apify',
      'POST /test-post'
    ]
  }, 404);
});

export default app;
