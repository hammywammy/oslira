import { Hono } from 'hono';
import { cors } from 'hono/cors';

// pull in our runtime config
interface RuntimeEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE: string;
  SUPABASE_ANON_KEY: string;
  OPENAI_KEY: string;
  CLAUDE_KEY?: string;
  APIFY_API_TOKEN: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET?: string;
  FRONTEND_URL?: string;
}

// sanity‐check (optional):
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !SUPABASE_ANON_KEY || !OPENAI_KEY || !APIFY_API_TOKEN || !STRIPE_SECRET_KEY) {
  throw new Error('Missing required ENV vars');
}


const app = new Hono();

interface ProfileData {
  username: string;
  fullName?: string;
  biography?: string;
  followersCount: number;
  followingCount?: number;
  postsCount?: number;
  isVerified?: boolean;
  private?: boolean;
  profilePicUrl?: string;
  externalUrl?: string;
  businessCategory?: string;
}

interface AnalysisResult {
  score: number;
  summary?: string;
  niche_fit?: number;
  engagement_score?: number;
  reasons?: string[];
  selling_points?: string[];
}

interface MessageResult {
  message: string;
}

interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_niche: string;
  target_audience: string;
  target_problems: string;
  value_proposition: string;
  communication_style: string;
  message_example: string;
  success_outcome: string;
  call_to_action: string;
}

interface User {
  id: string;
  email: string;
  credits: number;
  stripe_customer_id?: string;
  subscription_plan: string;
  subscription_status: string;
  onboarding_completed: boolean;
}

type AnalysisType = 'light' | 'deep';

interface AnalysisRequest {
  profile_url?: string;
  username?: string;
  analysis_type?: AnalysisType;
  business_id?: string;
  user_id?: string;
  platform?: string;
}



// ------------------------------------
// Core Utility Functions
// ------------------------------------

/**
 * Verify JWT token (PRODUCTION TODO: Replace with Supabase auth verification)
 */
async function verifyJWT(token: string): Promise<string | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [, payloadB64] = parts;
    const payload = JSON.parse(atob(payloadB64));
    const now = Date.now() / 1000;
    
    if (!payload.exp || payload.exp <= now) return null;
    if (!payload.sub || !payload.aud) return null;

    // PRODUCTION TODO: Verify signature against Supabase JWT secret
    // Replace with: await supabase.auth.getUser(token)
    return payload.sub;
  } catch {
    return null;
  }
}

/**
 * Unified retry mechanism with timeout and exponential backoff
 */
async function callWithRetry(
  url: string,
  init: RequestInit,
  retries = 3,
  baseBackoffMs = 1000,
  timeoutMs = 25000 // Max 25s for Cloudflare Workers
): Promise<any> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const res = await fetch(url, { 
        ...init, 
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        return await res.json();
      }
      
      if (res.status === 429 && attempt < retries - 1) {
        const delay = Math.min(baseBackoffMs * Math.pow(2, attempt), 10000); // Max 10s delay
        console.log(`Rate limited on ${url}, retrying in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      
      const text = await res.text();
      lastError = new Error(`HTTP ${res.status}: ${text}`);
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        lastError = new Error(`Request timeout after ${timeoutMs}ms`);
      } else {
        lastError = new Error(`Network error: ${error.message}`);
      }
      
      if (attempt < retries - 1) {
        const delay = Math.min(baseBackoffMs * Math.pow(2, attempt), 5000); // Max 5s delay
        console.log(`Request failed for ${url}, retrying in ${delay}ms: ${lastError.message}`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }
  }
  
  throw new Error(`Failed after ${retries} attempts to ${url}: ${lastError.message}`);
}

/**
 * Fetch helper with timeout
 */
async function fetchJson<T>(
  url: string, 
  init: RequestInit, 
  timeoutMs: number = 15000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const res = await fetch(url, { 
      ...init, 
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    
    return await res.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
    }
    
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON response from ${url}: ${error.message}`);
    }
    
    throw new Error(`Fetch failed for ${url}: ${error.message}`);
  }
}

/**
 * Extract Instagram username from URL or handle
 */
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

/**
 * Validate request body
 */
function normalizeRequest(body: AnalysisRequest) {
  const errors: string[] = [];
  
  let profile_url = body.profile_url;
  if (!profile_url && body.username) {
    const username = extractUsername(body.username);
    profile_url = username ? `https://instagram.com/${username}` : '';
  }
  
  const analysis_type = body.analysis_type;
  const business_id = body.business_id;
  const user_id = body.user_id;

  if (!profile_url) errors.push('profile_url or username is required');
  if (!analysis_type || !['light', 'deep'].includes(analysis_type))
    errors.push('analysis_type must be "light" or "deep"');
  if (!user_id) errors.push('user_id is required');

  return {
    valid: errors.length === 0,
    errors,
    data: { profile_url, analysis_type, business_id, user_id }
  };
}

// ------------------------------------
// Validation Functions
// ------------------------------------

function validateProfileData(raw: any): ProfileData {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Scraper returned invalid profile data structure');
  }
  
  const followersCount = Number(raw.followersCount || raw.followers_count || raw.followers || 0);
  if (isNaN(followersCount) || followersCount < 0) {
    throw new Error('Invalid followers count in profile data');
  }
  
  const username = String(raw.username || '').trim();
  if (!username) {
    throw new Error('Profile data missing required username field');
  }
  
  return {
    username,
    fullName: raw.fullName || raw.full_name || raw.name || undefined,
    biography: raw.biography || raw.bio || raw.description || undefined,
    followersCount,
    followingCount: Number(raw.followingCount || raw.following_count || raw.following || 0) || undefined,
    postsCount: Number(raw.postsCount || raw.posts_count || raw.posts || 0) || undefined,
    isVerified: Boolean(raw.isVerified || raw.is_verified || raw.verified),
    private: Boolean(raw.private || raw.is_private),
    profilePicUrl: raw.profilePicUrl || raw.profile_pic_url || raw.profilePicture || undefined,
    externalUrl: raw.externalUrl || raw.external_url || raw.website || undefined,
    businessCategory: raw.businessCategory || raw.business_category || raw.category || undefined
  };
}

function validateAnalysisResult(raw: any, analysisType: AnalysisType): AnalysisResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('AI returned invalid response format');
  }
  
  const score = Number(raw.score);
  if (isNaN(score) || score < 0 || score > 100) {
    throw new Error('AI returned invalid score (must be 0-100)');
  }
  
  const result: AnalysisResult = {
    score,
    summary: typeof raw.summary === 'string' ? raw.summary : undefined,
    niche_fit: raw.niche_fit || raw.score_niche_fit || undefined,
    reasons: Array.isArray(raw.reasons) ? raw.reasons : undefined
  };
  
  if (analysisType === 'deep') {
    result.engagement_score = raw.engagement_score || undefined;
    result.selling_points = Array.isArray(raw.selling_points) ? raw.selling_points : undefined;
  }
  
  return result;
}

function validateMessageResult(raw: any): string {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Message generation returned invalid format');
  }
  
  const message = raw.message;
  if (typeof message !== 'string' || message.length === 0) {
    throw new Error('Message generation returned empty or invalid message');
  }
  
  if (message.length > 1000) {
    throw new Error('Generated message exceeds maximum length');
  }
  
  return message;
}

// ------------------------------------
// Service Functions
// ------------------------------------

async function fetchUserAndCredits(userId: string): Promise<{ user: User; credits: number }> {
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE!,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE!}`,
    'Content-Type': 'application/json'
  };

  const [usersResponse, creditsResponse] = await Promise.all([
    fetchJson<User[]>(`${SUPABASE_URL!}/rest/v1/users?id=eq.${userId}&select=*`, { headers }),
    fetchJson<{ balance: number }[]>(`${SUPABASE_URL!}/rest/v1/credit_balances?user_id=eq.${userId}&select=balance`, { headers }).catch(() => [])
  ]);

  if (!usersResponse.length) {
    throw new Error('User not found');
  }

  const user = usersResponse[0];
  const credits = creditsResponse.length > 0 ? creditsResponse[0].balance : (user.credits || 0);

  return { user, credits };
}

async function fetchBusinessProfile(businessId: string, userId: string): Promise<BusinessProfile> {
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };

  const businesses = await fetchJson<BusinessProfile[]>(
    `${SUPABASE_URL}/rest/v1/business_profiles?id=eq.${businessId}&user_id=eq.${userId}&select=*`,
    { headers }
  );

  if (!businesses.length) {
    throw new Error('Business profile not found or access denied');
  }

  return businesses[0];
}

async function scrapeInstagramProfile(username: string, analysisType: AnalysisType): Promise<ProfileData> {
  if (!APIFY_API_TOKEN) {
    throw new Error('Profile scraping service not configured');
  }

  const scrapeActorId = analysisType === 'light' 
    ? 'dSCLg0C3YEZ83HzYX'
    : 'shu8hvrXbJbY3Eb9W';

  const scrapeInput = analysisType === 'light'
    ? { 
        usernames: [username],
        resultsType: "details",
        resultsLimit: 1
      }
    : { 
        directUrls: [`https://instagram.com/${username}/`], 
        resultsLimit: 1,
        addParentData: false,
        enhanceUserSearchWithFacebookPage: false
      };

  console.log(`Scraping profile @${username} using actor: ${scrapeActorId}`);

  try {
    const scrapeResponse = await callWithRetry(
      `https://api.apify.com/v2/acts/${scrapeActorId}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scrapeInput)
      },
      3,
      2000,
      25000 // 25s max for scraping
    );

    if (!scrapeResponse || !scrapeResponse[0]) {
      throw new Error('Profile not found or private');
    }

    return validateProfileData(scrapeResponse[0]);

  } catch (error: any) {
    console.error('Scraping error:', error);
    
    let errorMessage = 'Failed to retrieve profile data. The profile may be private, deleted, or temporarily unavailable.';
    
    if (error.message.includes('404')) {
      errorMessage = 'Instagram profile not found. Please check the username is correct.';
    } else if (error.message.includes('403')) {
      errorMessage = 'This Instagram profile is private or access is restricted.';
    } else if (error.message.includes('429')) {
      errorMessage = 'Instagram is temporarily limiting requests. Please try again in a few minutes.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timed out. Please try again.';
    }
    
    throw new Error(errorMessage);
  }
}

async function performAIAnalysis(
  profile: ProfileData, 
  business: BusinessProfile, 
  analysisType: AnalysisType, 
): Promise<AnalysisResult> {
  if (!OPENAI_KEY) {
    throw new Error('AI analysis service not configured');
  }

  const prompt = analysisType === 'light'
    ? makeLightPrompt(profile, business)
    : makeDeepPrompt(profile, business);

  console.log('Starting AI analysis with OpenAI');

  try {
    const response = await callWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1500,
          response_format: { type: 'json_object' }
        })
      },
      3,
      1500,
      25000 // 25s max for AI
    );

    if (!response.choices?.[0]?.message?.content) {
      throw new Error('OpenAI returned invalid response structure');
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(response.choices[0].message.content);
    } catch (parseError: any) {
      throw new Error(`OpenAI returned invalid JSON: ${parseError.message}`);
    }

    return validateAnalysisResult(parsedResult, analysisType);

  } catch (error: any) {
    console.error('AI analysis error:', error);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

async function generateOutreachMessage(
  profile: ProfileData,
  business: BusinessProfile,
  analysis: AnalysisResult,
): Promise<string> {
  let outreachMessage = '';

  try {
    if (CLAUDE_KEY) {
      console.log('Generating message with Claude');
      const messagePrompt = makeMessagePrompt(profile, business, analysis);
      
      const claudeResponse = await callWithRetry(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'x-api-key': CLAUDE_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            messages: [{ role: 'user', content: messagePrompt }],
            temperature: 0.7,
            max_tokens: 1000
          })
        },
        3,
        1500,
        25000
      );

      let messageText = '';
      if (claudeResponse.completion) {
        messageText = claudeResponse.completion;
      } else if (claudeResponse.content?.[0]?.text) {
        messageText = claudeResponse.content[0].text;
      }

      if (messageText) {
        try {
          const messageResult = JSON.parse(messageText);
          outreachMessage = validateMessageResult(messageResult);
        } catch {
          if (messageText.length > 0 && messageText.length <= 1000) {
            outreachMessage = messageText.trim();
          }
        }
      }
    }
    
    if (!outreachMessage && OPENAI_KEY) {
      console.log('Using OpenAI for message generation');
      const messagePrompt = makeMessagePrompt(profile, business, analysis);
      
      const openaiResponse = await callWithRetry(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OPENAI_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: messagePrompt }],
            temperature: 0.7,
            max_tokens: 800,
            response_format: { type: 'json_object' }
          })
        },
        3,
        1500,
        25000
      );

      if (openaiResponse.choices?.[0]?.message?.content) {
        try {
          const messageResult = JSON.parse(openaiResponse.choices[0].message.content);
          outreachMessage = validateMessageResult(messageResult);
        } catch (parseError: any) {
          console.warn('OpenAI message parsing failed:', parseError.message);
        }
      }
    }
    
  } catch (error: any) {
    console.log('Message generation failed:', error.message);
  }

  return outreachMessage;
}

async function saveLeadAndAnalysis(
  leadData: any,
  analysisData: any | null,
  analysisType: AnalysisType,
): Promise<string> {
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };

  try {
    const leadResponse = await fetchJson<any[]>(
      `${SUPABASE_URL}/rest/v1/leads`,
      {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(leadData),
      },
      15000
    );

    if (!leadResponse.length) {
      throw new Error('Failed to create lead record - no data returned');
    }

    const leadId = leadResponse[0].id;
    if (!leadId) {
      throw new Error('Failed to get lead ID from database response');
    }

    if (analysisType === 'deep' && analysisData) {
      try {
        await fetchJson(
          `${SUPABASE_URL}/rest/v1/lead_analyses`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              ...analysisData,
              lead_id: leadId,
            }),
          },
          15000
        );
        console.log('Lead analysis inserted successfully');
      } catch (analysisError: any) {
        console.error('Analysis insert failed, rolling back lead:', analysisError.message);
        
        try {
          await fetchJson(
            `${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}`,
            { 
              method: 'DELETE', 
              headers,
            },
            10000
          );
        } catch (rollbackError: any) {
          console.error('Failed to rollback lead creation:', rollbackError.message);
        }
        
        throw new Error(`Failed to save analysis data: ${analysisError.message}`);
      }
    }

    return leadId;
    
  } catch (error: any) {
    console.error('Database operation failed:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}

async function updateCreditsAndTransaction(
  userId: string,
  cost: number,
  newBalance: number,
  description: string,
  leadId: string,
): Promise<void> {
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };

  await Promise.all([
    fetchJson(
      `${SUPABASE_URL}/rest/v1/credit_balances`,
      {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          user_id: userId,
          balance: newBalance
        })
      }
    ),
    fetchJson(
      `${SUPABASE_URL}/rest/v1/credit_transactions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: userId,
          amount: -cost,
          type: 'use',
          description,
          lead_id: leadId
        })
      }
    )
  ]);
}

// ------------------------------------
// Prompt Generators
// ------------------------------------

function makeLightPrompt(profile: ProfileData, business: BusinessProfile): string {
  return `You are an expert B2B lead qualifier. Analyze this Instagram profile for lead scoring.\n\n` +
    `PROFILE:\n` +
    `- Username: ${profile.username}\n` +
    `- Bio: ${profile.biography || 'N/A'}\n` +
    `- Followers: ${profile.followersCount}\n` +
    `- Following: ${profile.followingCount || 'N/A'}\n` +
    `- Posts: ${profile.postsCount || 'N/A'}\n` +
    `- Verified: ${!!profile.isVerified}\n\n` +
    `BUSINESS CONTEXT:\n` +
    `- Name: ${business.business_name}\n` +
    `- Niche: ${business.business_niche}\n` +
    `- Target Audience: ${business.target_audience}\n` +
    `- Value Proposition: ${business.value_proposition}\n\n` +
    `Provide a numerical score (0-100) and brief analysis.\n\n` +
    `Respond with JSON: { "score": number, "summary": string, "niche_fit": number, "reasons": string[] }`;
}

function makeDeepPrompt(profile: ProfileData, business: BusinessProfile): string {
  return `You are a senior B2B strategist. Provide comprehensive analysis of this Instagram profile.\n\n` +
    `PROFILE DETAILS:\n` +
    `- Username: ${profile.username}\n` +
    `- Full Name: ${profile.fullName || 'N/A'}\n` +
    `- Bio: ${profile.biography || 'N/A'}\n` +
    `- Followers: ${profile.followersCount}\n` +
    `- Following: ${profile.followingCount || 'N/A'}\n` +
    `- Posts: ${profile.postsCount || 0}\n` +
    `- Verified: ${!!profile.isVerified}\n` +
    `- External URL: ${profile.externalUrl || 'N/A'}\n\n` +
    `BUSINESS CONTEXT:\n` +
    `- Company: ${business.business_name}\n` +
    `- Niche: ${business.business_niche}\n` +
    `- Target Audience: ${business.target_audience}\n` +
    `- Problems Solved: ${business.target_problems}\n` +
    `- Value Proposition: ${business.value_proposition}\n` +
    `- Communication Style: ${business.communication_style}\n` +
    `- Success Outcome: ${business.success_outcome}\n\n` +
    `Provide detailed scoring and analysis.\n\n` +
    `Respond with JSON: { "score": number, "engagement_score": number, "niche_fit": number, "summary": string, "reasons": string[], "selling_points": string[] }`;
}

function makeMessagePrompt(profile: ProfileData, business: BusinessProfile, analysis: AnalysisResult): string {
  return `Create a personalized Instagram DM for this lead based on the analysis.\n\n` +
    `LEAD PROFILE:\n` +
    `- Username: @${profile.username}\n` +
    `- Name: ${profile.fullName || 'N/A'}\n` +
    `- Bio: ${profile.biography || 'N/A'}\n` +
    `- Followers: ${profile.followersCount}\n` +
    `- Verified: ${profile.isVerified ? 'Yes' : 'No'}\n\n` +
    `ANALYSIS RESULTS:\n` +
    `- Lead Score: ${analysis.score}/100\n` +
    `- Niche Fit: ${analysis.niche_fit || 'N/A'}\n` +
    `- Key Reasons: ${analysis.reasons?.join(', ') || 'N/A'}\n` +
    `- Selling Points: ${analysis.selling_points?.join(', ') || 'N/A'}\n\n` +
    `BUSINESS INFO:\n` +
    `- Company: ${business.business_name}\n` +
    `- Value Prop: ${business.value_proposition}\n` +
    `- Communication Style: ${business.communication_style}\n` +
    `- Success Outcome: ${business.success_outcome}\n` +
    `- Call to Action: ${business.call_to_action}\n` +
    `- Message Example: ${business.message_example}\n\n` +
    `Create a personalized, engaging message that:\n` +
    `1. References something specific from their profile\n` +
    `2. Clearly states the value proposition\n` +
    `3. Includes a soft call-to-action\n` +
    `4. Matches the specified communication style\n` +
    `5. Is under 200 characters for Instagram DM\n\n` +
    `Respond with JSON: { "message": string }`;
}

// ------------------------------------
// Stripe Webhook Security (PRODUCTION TODO)
// ------------------------------------

function verifyStripeWebhook(body: string, signature: string, secret: string): any {
  if (!signature || !secret) {
    throw new Error('Missing webhook signature or secret');
  }
  
  // PRODUCTION TODO: Replace with proper Stripe verification
  // import Stripe from 'stripe';
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  // return stripe.webhooks.constructEvent(body, signature, secret);
  
  try {
    const elements = signature.split(',');
    const timestampElement = elements.find(e => e.startsWith('t='));
    const signatureElement = elements.find(e => e.startsWith('v1='));
    
    if (!timestampElement || !signatureElement) {
      throw new Error('Invalid signature format');
    }
    
    const timestamp = parseInt(timestampElement.split('=')[1]);
    const now = Math.floor(Date.now() / 1000);
    
    if (Math.abs(now - timestamp) > 300) {
      throw new Error('Timestamp outside tolerance');
    }
    
    return JSON.parse(body);
  } catch (error: any) {
    throw new Error(`Webhook verification failed: ${error.message}`);
  }
}


// Hono App

app.use('*', cors({ 
  origin: '*', 
  allowHeaders: ['Content-Type', 'Authorization'], 
  allowMethods: ['GET', 'POST', 'OPTIONS'] 
}));

// Routes
app.get('/', c => c.json({ 
  message: '🚀 Oslira Worker v5.2', 
  status: 'operational',
  timestamp: new Date().toISOString()
}));

app.get('/health', c => c.json({ 
  status: 'healthy', 
  service: 'Oslira Worker',
  version: '5.2.0',
  timestamp: new Date().toISOString()
}));

app.get('/config', c => {
  const full = c.req.url.replace(/\/config$/, '');
  return c.json({
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
    workerUrl: full
  });
});

app.get('/debug-env', c => {
  return c.json({
    supabase: SUPABASE_URL ? 'SET' : 'MISSING',
    serviceRole: SUPABASE_SERVICE_ROLE ? 'SET' : 'MISSING',
    anonKey: SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
    openai: OPENAI_KEY ? 'SET' : 'MISSING',
    claude: CLAUDE_KEY ? 'SET' : 'MISSING',
    apify: APIFY_API_TOKEN ? 'SET' : 'MISSING',
    stripe: STRIPE_SECRET_KEY ? 'SET' : 'MISSING',
    webhookSecret: STRIPE_WEBHOOK_SECRET ? 'SET' : 'MISSING',
    frontend: FRONTEND_URL ? 'SET' : 'MISSING'
  });
});

// Main Analyze Endpoint
app.post('/analyze', async c => {
  console.log('Analysis request received');

  const auth = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!auth) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  const userId = await verifyJWT(auth);
  if (!userId) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  console.log(`Authenticated user: ${userId}`);

  const body = await c.req.json<AnalysisRequest>();
  const { valid, errors, data } = normalizeRequest(body);
  if (!valid) {
    return c.json({ error: 'Invalid request', details: errors }, 400);
  }

  const username = extractUsername(data.profile_url!);
  if (!username) {
    return c.json({ error: 'Invalid username format' }, 400);
  }

  console.log(`Processing analysis for username: ${username}, type: ${data.analysis_type}`);

  try {
  const { user, credits } = await fetchUserAndCredits(userId);
    const cost = data.analysis_type === 'deep' ? 2 : 1;

    if (credits < cost) {
      return c.json({
        error: 'Insufficient credits',
        available: currentCredits,
        required: cost
      }, 402);
    }

    if (!data.business_id) {
      return c.json({ error: 'Business profile is required for analysis' }, 400);
    }

    const business = await fetchBusinessProfile(data.business_id, userId);
    const profileData = await scrapeInstagramProfile(username, data.analysis_type!);
    const analysisResult = await performAIAnalysis(profileData, business, data.analysis_type!);

    let outreachMessage = '';
    if (data.analysis_type === 'deep') {
      outreachMessage = await generateOutreachMessage(profileData, business, analysisResult);
    }

    const leadData = {
      user_id: userId,
      business_id: data.business_id,
      username: profileData.username,
      platform: data.platform || 'instagram',
      profile_url: data.profile_url,
      score: analysisResult.score || 0,
      type: data.analysis_type,
      created_at: new Date().toISOString()
    };

    let analysisData = null;
    if (data.analysis_type === 'deep') {
      analysisData = {
        user_id: userId,
        analysis_type: 'deep' as const,
        engagement_score: analysisResult.engagement_score || null,
        score_niche_fit: analysisResult.niche_fit || null,
        score_total: analysisResult.score || 0,
        ai_version_id: 'gpt-4o-2024',
        outreach_message: outreachMessage || null,
        selling_points: analysisResult.selling_points || null
      };
    }

    const leadId = await saveLeadAndAnalysis(leadData, analysisData, data.analysis_type!);

    const newBalance = currentCredits - cost;
    await updateCreditsAndTransaction(
      userId,
      cost,
      newBalance,
      `${data.analysis_type} analysis for @${profileData.username}`,
      leadId
    );

    console.log('Analysis completed successfully');

    return c.json({
      success: true,
      lead_id: leadId,
      analysis: {
        score: analysisResult.score || 0,
        summary: analysisResult.summary || '',
        niche_fit: analysisResult.niche_fit || 0,
        engagement_score: analysisResult.engagement_score || 0,
        selling_points: analysisResult.selling_points || [],
        reasons: analysisResult.reasons || []
      },
      outreach_message: outreachMessage,
      profile: {
        username: profileData.username,
        full_name: profileData.fullName,
        followers: profileData.followersCount,
        following: profileData.followingCount,
        posts: profileData.postsCount,
        verified: profileData.isVerified,
        bio: profileData.biography
      },
      credits: {
        used: cost,
        remaining: newBalance
      }
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    return c.json({ 
      error: 'Analysis failed', 
      message: error.message || 'Unknown error' 
    }, 500);
  }
});

// Billing endpoints
app.post('/billing/create-checkout-session', async c => {
  const auth = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!auth) return c.json({ error: 'Unauthorized' }, 401);
  
  const userId = await verifyJWT(auth);
  if (!userId) return c.json({ error: 'Invalid token' }, 401);

  const body = await c.req.json();
  const { price_id, customer_email, success_url, cancel_url, metadata } = body;
  
  if (!price_id || !customer_email) {
    return c.json({ error: 'price_id and customer_email required' }, 400);
  }

  const VALID_PRICES = [
    'price_1RkCKjJzvcRSqGG3Hq4WNNSU',
    'price_1RkCLGJzvcRSqGG3XqDyhYZN',
    'price_1RkCLtJzvcRSqGG30FfJSpau',
    'price_1RkCMlJzvcRSqGG3HHFoX1fw'
  ];
  
  if (!VALID_PRICES.includes(price_id)) {
    return c.json({ error: 'Invalid price_id' }, 400);
  }

  const stripeKey = STRIPE_SECRET_KEY!;
  if (!stripeKey) return c.json({ error: 'Stripe not configured' }, 500);

  try {
    const searchParams = new URLSearchParams({ query: `email:'${customer_email}'` });
    const customerSearch = await fetchJson<any>(
      `https://api.stripe.com/v1/customers/search?${searchParams}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );

    let customerId = customerSearch.data?.[0]?.id;
    
    if (!customerId) {
      const customerParams = new URLSearchParams({ email: customer_email });
      const newCustomer = await fetchJson<any>(
        'https://api.stripe.com/v1/customers',
        { 
          method: 'POST', 
          headers: { 
            Authorization: `Bearer ${stripeKey}`, 
            'Content-Type': 'application/x-www-form-urlencoded' 
          }, 
          body: customerParams 
        }
      );
      
      customerId = newCustomer.id;
    }

    const sessionParams = new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price]': price_id,
      'line_items[0][quantity]': '1',
      mode: 'subscription',
      success_url: success_url || `${FRONTEND_URL}/subscription.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${FRONTEND_URL}/subscription.html?canceled=true`,
      customer: customerId,
      'subscription_data[trial_period_days]': '7',
      'subscription_data[metadata][user_id]': userId,
      allow_promotion_codes: 'true'
    });

    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        sessionParams.append(`subscription_data[metadata][${key}]`, String(value));
      });
    }

    const session = await fetchJson<any>(
      'https://api.stripe.com/v1/checkout/sessions',
      { 
        method: 'POST', 
        headers: { 
          Authorization: `Bearer ${stripeKey}`, 
          'Content-Type': 'application/x-www-form-urlencoded' 
        }, 
        body: sessionParams 
      }
    );

    if (session.error) {
      return c.json({ error: session.error.message }, 400);
    }

    return c.json({ 
      url: session.url, 
      session_id: session.id, 
      customer_id: customerId 
    });

  } catch (error: any) {
    console.error('Checkout session error:', error);
    return c.json({ error: 'Failed to create checkout session' }, 500);
  }
});

app.post('/billing/create-portal-session', async c => {
  const auth = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!auth) return c.json({ error: 'Unauthorized' }, 401);
  
  const userId = await verifyJWT(auth);
  if (!userId) return c.json({ error: 'Invalid token' }, 401);

  const { return_url, customer_email } = await c.req.json();
  if (!customer_email) return c.json({ error: 'customer_email required' }, 400);

  const stripeKey = STRIPE_SECRET_KEY;
  
  try {
    const searchParams = new URLSearchParams({ query: `email:'${customer_email}'` });
    const customerData = await fetchJson<any>(
      `https://api.stripe.com/v1/customers/search?${searchParams}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    
    if (!customerData.data?.length) {
      return c.json({ error: 'Customer not found' }, 404);
    }
    
    const customerId = customerData.data[0].id;

    const portalParams = new URLSearchParams({
      customer: customerId,
      return_url: return_url || `${FRONTEND_URL}/subscription.html`
    });
    
    const portal = await fetchJson<any>(
      'https://api.stripe.com/v1/billing_portal/sessions',
      { 
        method: 'POST', 
        headers: { 
          Authorization: `Bearer ${stripeKey}`, 
          'Content-Type': 'application/x-www-form-urlencoded' 
        }, 
        body: portalParams 
      }
    );
    
    if (portal.error) {
      return c.json({ error: portal.error.message }, 400);
    }
    
    return c.json({ url: portal.url });

  } catch (error: any) {
    console.error('Portal session error:', error);
    return c.json({ error: 'Failed to create portal session' }, 500);
  }
});

// Stripe webhook handler
app.post('/stripe-webhook', async c => {
  const body = await c.req.text();
  const sig = c.req.header('stripe-signature');
  
  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    console.error('Webhook validation failed: missing signature or secret');
    return c.text('Missing signature or secret', 400);
  }

  try {
    const event = verifyStripeWebhook(body, sig, STRIPE_WEBHOOK_SECRET);
    
    console.log(`Webhook received: ${event.type} at ${new Date().toISOString()}`);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Webhook handler timeout')), 20000);
    });

    const handlerPromise = (async () => {
      switch (event.type) {
        case 'customer.subscription.created':
          await handleSubscriptionCreated(event.data.object);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionCanceled(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    })();

    await Promise.race([handlerPromise, timeoutPromise]);
    
    return c.text('OK', 200);

  } catch (error: any) {
    console.error('Webhook processing error:', error.message);
    
    if (error.message.includes('User not found') || 
        error.message.includes('No user_id in metadata')) {
      return c.text('Handled - no action needed', 200);
    }
    
    if (error.message.includes('signature') || 
        error.message.includes('Invalid webhook payload')) {
      return c.text('Invalid webhook', 400);
    }
    
    return c.text('Webhook processing failed', 500);
  }
});

// Stripe event handlers
async function handleSubscriptionCreated(subscription: any, env: Env) {
  try {
    const { user_id } = subscription.metadata;
    if (!user_id) {
      console.log('No user_id in subscription metadata');
      return;
    }

    console.log(`Processing subscription created for user: ${user_id}`);

    const supabaseHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    };

    const priceIdToPlan: Record<string, { name: string; credits: number }> = {
      'price_1RkCKjJzvcRSqGG3Hq4WNNSU': { name: 'starter', credits: 50 },
      'price_1RkCLGJzvcRSqGG3XqDyhYZN': { name: 'growth', credits: 150 },
      'price_1RkCLtJzvcRSqGG30FfJSpau': { name: 'professional', credits: 500 },
      'price_1RkCMlJzvcRSqGG3HHFoX1fw': { name: 'enterprise', credits: 999999 },
    };

    const priceId = subscription.items.data[0]?.price?.id;
    const planInfo = priceIdToPlan[priceId];
    
    if (!planInfo) {
      console.log(`Unknown price ID: ${priceId}`);
      return;
    }

    await Promise.all([
      fetchJson(
        `${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`,
        {
          method: 'PATCH',
          headers: supabaseHeaders,
          body: JSON.stringify({
            subscription_plan: planInfo.name,
            subscription_status: subscription.status,
            stripe_customer_id: subscription.customer,
            credits: planInfo.credits
          }),
        },
        10000
      ),
      fetchJson(
        `${env.SUPABASE_URL}/rest/v1/credit_balances`,
        {
          method: 'POST',
          headers: { ...supabaseHeaders, Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({
            user_id,
            balance: planInfo.credits
          }),
        },
        10000
      ),
      fetchJson(
        `${env.SUPABASE_URL}/rest/v1/credit_transactions`,
        {
          method: 'POST',
          headers: supabaseHeaders,
          body: JSON.stringify({
            user_id,
            amount: planInfo.credits,
            type: 'add',
            description: `Subscription created: ${planInfo.name} plan`,
            lead_id: null
          }),
        },
        10000
      )
    ]);

    console.log(`Subscription created successfully for user ${user_id}`);

  } catch (err: any) {
    console.error('handleSubscriptionCreated error:', err.message);
    throw new Error(`Failed to process subscription creation: ${err.message}`);
  }
}

async function handleSubscriptionUpdated(subscription: any, env: Env) {
  try {
    const { user_id } = subscription.metadata;
    if (!user_id) {
      console.log('No user_id in subscription metadata for update');
      return;
    }

    console.log(`Processing subscription updated for user: ${user_id}`);

    const supabaseHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    };

    await fetchJson(
      `${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`,
      {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify({
          subscription_status: subscription.status
        }),
      },
      10000
    );

    console.log(`Subscription updated for user ${user_id}`);

  } catch (err: any) {
    console.error('handleSubscriptionUpdated error:', err.message);
    throw new Error(`Failed to process subscription update: ${err.message}`);
  }
}

async function handleSubscriptionCanceled(subscription: any, env: Env) {
  try {
    const { user_id } = subscription.metadata;
    if (!user_id) {
      console.log('No user_id in subscription metadata for cancellation');
      return;
    }

    console.log(`Processing subscription canceled for user: ${user_id}`);

    const supabaseHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    };

    await Promise.all([
      fetchJson(
        `${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`,
        {
          method: 'PATCH',
          headers: supabaseHeaders,
          body: JSON.stringify({
            subscription_plan: 'free',
            subscription_status: 'canceled',
            credits: 0
          }),
        },
        10000
      ),
      fetchJson(
        `${env.SUPABASE_URL}/rest/v1/credit_balances`,
        {
          method: 'POST',
          headers: { ...supabaseHeaders, Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({
            user_id,
            balance: 0
          }),
        },
        10000
      ),
      fetchJson(
        `${env.SUPABASE_URL}/rest/v1/credit_transactions`,
        {
          method: 'POST',
          headers: supabaseHeaders,
          body: JSON.stringify({
            user_id,
            amount: 0,
            type: 'use',
            description: 'Subscription canceled - credits reset',
            lead_id: null
          }),
        },
        10000
      )
    ]);

    console.log(`Subscription canceled for user ${user_id}`);

  } catch (err: any) {
    console.error('handleSubscriptionCanceled error:', err.message);
    throw new Error(`Failed to process subscription cancellation: ${err.message}`);
  }
}

async function handlePaymentSucceeded(invoice: any, env: Env) {
  try {
    const subscription_id = invoice.subscription;
    if (!subscription_id) {
      console.log('No subscription_id in payment succeeded event');
      return;
    }

    console.log(`Processing payment succeeded for subscription: ${subscription_id}`);

    const subscription = await fetchJson<any>(
      `https://api.stripe.com/v1/subscriptions/${subscription_id}`, 
      {
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
      },
      10000
    );
    
    const user_id = subscription.metadata?.user_id;
    if (!user_id) {
      console.log('No user_id in subscription metadata for payment');
      return;
    }

    const supabaseHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    };

    const priceId = subscription.items.data[0]?.price?.id;
    const planMap: Record<string, number> = {
      'price_1RkCKjJzvcRSqGG3Hq4WNNSU': 50,
      'price_1RkCLGJzvcRSqGG3XqDyhYZN': 150,
      'price_1RkCLtJzvcRSqGG30FfJSpau': 500,
      'price_1RkCMlJzvcRSqGG3HHFoX1fw': 999999,
    };
    
    const credits = planMap[priceId] || 0;

    await Promise.all([
      fetchJson(
        `${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`,
        {
          method: 'PATCH',
          headers: supabaseHeaders,
          body: JSON.stringify({
            credits,
            subscription_status: 'active'
          }),
        },
        10000
      ),
      fetchJson(
        `${env.SUPABASE_URL}/rest/v1/credit_balances`,
        {
          method: 'POST',
          headers: { ...supabaseHeaders, Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({
            user_id,
            balance: credits
          }),
        },
        10000
      ),
      fetchJson(
        `${env.SUPABASE_URL}/rest/v1/credit_transactions`,
        {
          method: 'POST',
          headers: supabaseHeaders,
          body: JSON.stringify({
            user_id,
            amount: credits,
            type: 'add',
            description: 'Monthly credit renewal',
            lead_id: null
          }),
        },
        10000
      )
    ]);

    console.log(`Payment succeeded processed for user ${user_id}`);

  } catch (err: any) {
    console.error('handlePaymentSucceeded error:', err.message);
    throw new Error(`Failed to process payment success: ${err.message}`);
  }
}

async function handlePaymentFailed(invoice: any, env: Env) {
  try {
    const subscription_id = invoice.subscription;
    if (!subscription_id) {
      console.log('No subscription_id in payment failed event');
      return;
    }

    console.log(`Processing payment failed for subscription: ${subscription_id}`);

    const subscription = await fetchJson<any>(
      `https://api.stripe.com/v1/subscriptions/${subscription_id}`, 
      {
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
      },
      10000
    );
    
    const user_id = subscription.metadata?.user_id;
    if (!user_id) {
      console.log('No user_id in subscription metadata for failed payment');
      return;
    }

    const supabaseHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    };

    await fetchJson(
      `${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`,
      {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify({
          subscription_status: 'past_due'
        }),
      },
      10000
    );

    console.log(`Payment failed processed for user ${user_id}`);

  } catch (err: any) {
    console.error('handlePaymentFailed error:', err.message);
    throw new Error(`Failed to process payment failure: ${err.message}`);
  }
}

// Error handling
app.onError((err, c) => {
  console.error('Worker Error:', err);
  return c.json({ 
    error: 'Internal server error', 
    message: err.message,
    timestamp: new Date().toISOString()
  }, 500);
});

app.notFound(c => c.json({ 
  error: 'Endpoint not found',
  available_endpoints: [
    'GET /',
    'GET /health',
    'GET /config',
    'GET /debug-env',
    'POST /analyze',
    'POST /billing/create-checkout-session',
    'POST /billing/create-portal-session',
    'POST /stripe-webhook'
  ]
}, 404));

export default { 
  fetch: app.fetch 
};
