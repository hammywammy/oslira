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

interface AnalysisRequest {
  profile_url?: string;
  username?: string;
  analysis_type?: AnalysisType;
  type?: AnalysisType; // Alternative field name
  business_id?: string;
  user_id?: string;
  platform?: string;
  // REMOVED: timezone, user_local_time, request_timestamp
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

async function callWithRetry(
  url: string,
  init: RequestInit,
  retries = 3,
  baseBackoffMs = 1000,
  timeoutMs = 30000
): Promise<any> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      console.log(`🔄 Attempt ${attempt + 1}/${retries} for ${url} (timeout: ${timeoutMs}ms)`);
      
      const res = await fetch(url, { 
        ...init, 
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        console.log(`✅ Request successful on attempt ${attempt + 1}`);
        return data;
      }
      
      // Handle rate limiting with exponential backoff
      if (res.status === 429 && attempt < retries - 1) {
        const delay = Math.min(baseBackoffMs * Math.pow(2, attempt), 10000);
        console.log(`⏳ Rate limited, retrying in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      
      const text = await res.text();
      lastError = new Error(`HTTP ${res.status}: ${text}`);
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        lastError = new Error(`Request timeout after ${timeoutMs}ms. The profile may be slow to load.`);
      } else {
        lastError = new Error(`Network error: ${error.message}`);
      }
      
      // Retry with longer delay on timeout/network errors
      if (attempt < retries - 1) {
        const delay = Math.min(baseBackoffMs * Math.pow(2, attempt), 5000);
        console.log(`⚠️ Request failed, retrying in ${delay}ms: ${lastError.message}`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }
  }
  
  throw new Error(`Failed after ${retries} attempts: ${lastError.message}`);
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

// Add this function to your Worker index.ts file
// This is the missing saveLeadAndAnalysis function

// Add this function to your Worker index.ts file
// This is the missing saveLeadAndAnalysis function

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
    // STEP 1: Save to leads table (always)
    console.log('💾 Saving to leads table:', leadData.username);
    
    const leadResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify(leadData)
    });

    if (!leadResponse.ok) {
      const errorText = await leadResponse.text();
      throw new Error(`Failed to save to leads table: ${leadResponse.status} - ${errorText}`);
    }

    const leadResult = await leadResponse.json();
    if (!leadResult || !leadResult.length) {
      throw new Error('Failed to create lead record - no data returned');
    }

    const leadId = leadResult[0].id;
    if (!leadId) {
      throw new Error('Failed to get lead ID from database response');
    }

    console.log(`✅ Lead saved to leads table: ${leadId}`);

    // STEP 2: Save to lead_analyses table (only for deep analysis)
    if (analysisType === 'deep' && analysisData) {
      console.log('📊 Saving to lead_analyses table for deep analysis');
      
      const analysisPayload = {
        ...analysisData,
        lead_id: leadId, // Link to the lead record
      };

      const analysisResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/lead_analyses`, {
        method: 'POST',
        headers,
        body: JSON.stringify(analysisPayload)
      });

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        console.error('❌ Failed to save to lead_analyses table:', errorText);
        
        // ROLLBACK: Delete the lead record if analysis save fails
        try {
          await fetch(`${env.SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}`, {
            method: 'DELETE',
            headers
          });
          console.log('🔄 Rolled back lead record due to analysis save failure');
        } catch (rollbackError) {
          console.error('❌ Failed to rollback lead record:', rollbackError);
        }
        
        throw new Error(`Failed to save analysis data: ${analysisResponse.status} - ${errorText}`);
      }

      console.log('✅ Deep analysis data saved to lead_analyses table');
    } else {
      console.log('ℹ️ Light analysis - skipping lead_analyses table (as intended)');
    }

    return leadId;

  } catch (error: any) {
    console.error('❌ saveLeadAndAnalysis failed:', error.message);
    throw new Error(`Database save failed: ${error.message}`);
  }
}

// ALSO: Update your saveAnalysisResults function to properly call saveLeadAndAnalysis
async function saveAnalysisResults(
  profileData: ProfileData,
  analysisResult: AnalysisResult,
  businessId: string,
  userId: string,
  analysisType: string,
  outreachMessage: string,
  env: Env
): Promise<void> {
  
  // Prepare data for leads table with ONLY existing columns
  const leadData = {
    // Core required fields
    user_id: userId,
    business_id: businessId,
    username: profileData.username,
    full_name: profileData.displayName || null,
    bio: profileData.bio || null,
    platform: 'instagram',
    profile_pic_url: profileData.profilePicUrl || null,
    score: Math.round(parseFloat(analysisResult.score) || 0), // 8.5 -> 9
    analysis_type: data.analysis_type,
    followers_count: profileData.followersCount || 0,
    avg_likes: profileData.engagement?.avgLikes || 0,
    avg_comments: profileData.engagement?.avgComments || 0,
    engagement_rate: profileData.engagement?.engagementRate || 0,
    outreach_message: outreachMessage || null,
    created_at: new Date().toISOString()

    
  };

  // Prepare data for lead_analyses table (deep only)
  let analysisData = null;
  if (analysisType === 'deep') {
    analysisData = {
      user_id: userId,
      analysis_type: 'deep',
    engagement_score: Math.round(parseFloat(analysisResult.engagement_score) || 0), // ✅ Fix
    score_niche_fit: Math.round(parseFloat(analysisResult.niche_fit) || 0), // ✅ Fix
    score_total: Math.round(parseFloat(analysisResult.score) || 0), // ✅ Fix
      outreach_message: outreachMessage || null,
      selling_points: Array.isArray(analysisResult.selling_points) 
        ? analysisResult.selling_points.join('|') 
        : (analysisResult.selling_points ? String(analysisResult.selling_points) : null),
      avg_comments: profileData.engagement?.avgComments || 0,
      avg_likes: profileData.engagement?.avgLikes || 0,
      engagement_rate: profileData.engagement?.engagementRate || 0,
      audience_quality: analysisResult.audience_quality || null,
      engagement_insights: Array.isArray(analysisResult.engagement_insights)
        ? analysisResult.engagement_insights.join('|')
        : (analysisResult.engagement_insights ? String(analysisResult.engagement_insights) : null),
      created_at: new Date().toISOString()
    };
  }

  // Use the saveLeadAndAnalysis function
  await saveLeadAndAnalysis(leadData, analysisData, analysisType, env);
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
    const errorText = await updateResponse.text();
    console.error('❌ Failed to update user credits:', errorText);
    throw new Error(`Failed to update credits: ${updateResponse.status} - ${errorText}`);
  }
  
  // ✅ FIXED: Log transaction with correct payload structure
  const transactionPayload = {
    user_id: userId,
    lead_id: null,  // ✅ ADD: Include lead_id (nullable)
    type: transactionType,
    amount: -creditsUsed,  // Negative for deductions
    description,
    // ✅ REMOVE: Don't include balance_after (column doesn't exist)
    // ✅ REMOVE: Don't include created_at (auto-generated)
  };
  
  console.log('💾 Credit transaction payload:', JSON.stringify(transactionPayload, null, 2));
  
  const transactionResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/credit_transactions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(transactionPayload)
  });
  
  if (!transactionResponse.ok) {
    const errorText = await transactionResponse.text();
    console.error('❌ Failed to log credit transaction:', errorText);
    throw new Error(`Failed to log credit transaction: ${transactionResponse.status} - ${errorText}`);
  }
  
  const responseText = await transactionResponse.text();
  console.log('✅ Credit transaction logged successfully:', responseText);
}

// ===============================================================================
// FINAL INSTAGRAM SCRAPING FUNCTION - PRODUCTION READY
// ===============================================================================

async function scrapeInstagramProfile(username: string, analysisType: AnalysisType, env: Env): Promise<ProfileData> {
  if (!env.APIFY_API_TOKEN) {
    throw new Error('Profile scraping service not configured');
  }

  console.log(`🕷️ Scraping @${username} with ${analysisType} analysis`);

  try {
    if (analysisType === 'light') {
      // ==========================================
      // LIGHT ANALYSIS: Basic profile data only
      // ==========================================
      console.log('Using light scraper: dSCLg0C3YEZ83HzYX');
      
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
        3,      // retries
        2000,   // base backoff ms
        30000   // timeout: 30 seconds
      );

      console.log('🔍 LIGHT - Response length:', profileResponse?.length);

      if (!profileResponse || !Array.isArray(profileResponse) || profileResponse.length === 0) {
        throw new Error('Profile not found or private');
      }

      const profile = profileResponse[0];
      console.log('🔍 LIGHT - Available fields:', Object.keys(profile));
      
      // Return standardized ProfileData for light analysis
      return {
        username: profile.username || username,
        displayName: profile.fullName || profile.displayName || '',
        bio: profile.biography || profile.bio || '',
        followersCount: parseInt(profile.followersCount) || 0,
        followingCount: parseInt(profile.followingCount) || 0,
        postsCount: parseInt(profile.postsCount) || 0,
        isVerified: Boolean(profile.verified || profile.isVerified),
        isPrivate: Boolean(profile.private || profile.isPrivate),
        profilePicUrl: profile.profilePicUrl || profile.profilePicture || '',
        externalUrl: profile.externalUrl || profile.website || '',
        latestPosts: [], // Empty for light analysis
        engagement: undefined // No engagement data for light
      };

    } else {
      // ==========================================
      // DEEP ANALYSIS: Profile + Posts + Engagement
      // ==========================================
      console.log('Starting deep analysis with fallback strategy...');
      
      // Strategy: Try deep scraper first, fallback to light + basic engagement if timeout
      let profileData: ProfileData;
      let hasDeepData = false;

      try {
        // ATTEMPT 1: Deep scraper with posts
        console.log('🔍 Attempting deep scraper: shu8hvrXbJbY3Eb9W');
        
        const deepInput = {
          directUrls: [`https://instagram.com/${username}/`],
          resultsLimit: 8, // Reduced from 12 to avoid timeout
          addParentData: false,
          enhanceUserSearchWithFacebookPage: false,
          onlyPostsNewerThan: "2024-01-01" // Limit to recent posts
        };

        const postsResponse = await callWithRetry(
          `https://api.apify.com/v2/acts/shu8hvrXbJbY3Eb9W/run-sync-get-dataset-items?token=${env.APIFY_API_TOKEN}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deepInput)
          },
          2,      // Reduced retries
          3000,   // base backoff ms
          60000   // timeout: 60 seconds (increased)
        );

        console.log('🔍 DEEP - Response length:', postsResponse?.length);

        if (postsResponse && Array.isArray(postsResponse) && postsResponse.length > 0) {
          // SUCCESS: We got posts data from deep scraper
          hasDeepData = true;
          const firstPost = postsResponse[0];
          
          console.log('🔍 DEEP - First post fields:', Object.keys(firstPost));
          
          // Extract username from posts (try multiple fields)
          const extractedUsername = firstPost.ownerUsername || 
                                   firstPost.owner_username || 
                                   firstPost.username || 
                                   firstPost.user?.username ||
                                   firstPost.author?.username ||
                                   username; // fallback

          // Calculate engagement metrics from posts
          const validPosts = postsResponse.filter(post => 
            post && 
            typeof post.likesCount === 'number' && 
            typeof post.commentsCount === 'number'
          );

          let engagement: EngagementData | undefined;
          let estimatedFollowers = 0;

          if (validPosts.length > 0) {
            const totalLikes = validPosts.reduce((sum, post) => sum + (post.likesCount || 0), 0);
            const totalComments = validPosts.reduce((sum, post) => sum + (post.commentsCount || 0), 0);
            const avgLikes = Math.round(totalLikes / validPosts.length);
            const avgComments = Math.round(totalComments / validPosts.length);
            
            // Estimate followers from engagement
            estimatedFollowers = Math.round(avgLikes / 0.02); // Assume 2% like rate
            
            const engagementRate = estimatedFollowers > 0 ?
              Math.round(((avgLikes + avgComments) / estimatedFollowers) * 100 * 100) / 100 : 0;

            engagement = {
              avgLikes,
              avgComments,
              engagementRate,
              topHashtags: [], // Could extract from captions
              postingFrequency: 'regular'
            };

            console.log(`📊 Calculated engagement: ${engagementRate}% (${avgLikes} likes, ${avgComments} comments avg)`);
          }

          // Build profile from posts data
          profileData = {
            username: extractedUsername,
            displayName: firstPost.ownerFullName || firstPost.owner_full_name || '',
            bio: '', // Posts scraper doesn't provide bio
            followersCount: estimatedFollowers,
            followingCount: 0,
            postsCount: postsResponse.length,
            isVerified: false,
            isPrivate: false,
            profilePicUrl: firstPost.ownerProfilePicUrl || firstPost.owner_profile_pic_url || '',
            externalUrl: '',
            latestPosts: postsResponse.map(post => ({
              id: post.id || '',
              caption: post.caption || '',
              likesCount: post.likesCount || 0,
              commentsCount: post.commentsCount || 0,
              timestamp: post.timestamp || '',
              hashtags: [],
              mentions: []
            })),
            engagement
          };

          console.log('✅ Deep scraping successful with engagement data');
          
        } else {
          throw new Error('Deep scraper returned no posts data');
        }

      } catch (deepError: any) {
        // FALLBACK: Use light scraper + estimated engagement
        console.warn('⚠️ Deep scraper failed, falling back to light scraper:', deepError.message);
        hasDeepData = false;
        
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
          3,
          2000,
          30000
        );

        if (!lightResponse || !Array.isArray(lightResponse) || lightResponse.length === 0) {
          throw new Error('Profile not found on both deep and light scrapers');
        }

        const profile = lightResponse[0];
        
        // Estimate engagement for deep analysis even without posts
        const followers = parseInt(profile.followersCount) || 0;
        const estimatedEngagement = followers > 0 ? {
          avgLikes: Math.round(followers * 0.02), // Estimate 2% like rate
          avgComments: Math.round(followers * 0.002), // Estimate 0.2% comment rate
          engagementRate: 2.2, // Default estimate
          topHashtags: [],
          postingFrequency: 'unknown'
        } : undefined;

        profileData = {
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
          latestPosts: [], // No posts from fallback
          engagement: estimatedEngagement
        };

        console.log('✅ Fallback to light scraper with estimated engagement');
      }

      return profileData;
    }

  } catch (error: any) {
    console.error('❌ Scraping error for @' + username + ':', error);
    
    // Enhanced error messages
    if (error.message.includes('AbortError') || error.message.includes('operation was aborted')) {
      throw new Error('Profile scraping timed out. This profile may have many posts. Try again or use light analysis for faster results.');
    } else if (error.message.includes('timeout')) {
      throw new Error('Request timed out. Please try again in a moment.');
    } else if (error.message.includes('404')) {
      throw new Error('Instagram profile not found. Please check the username is correct.');
    } else if (error.message.includes('403')) {
      throw new Error('This Instagram profile is private or access is restricted.');
    } else if (error.message.includes('429')) {
      throw new Error('Instagram rate limited. Please try again in a few minutes.');
    } else if (error.message.includes('not found')) {
      throw new Error('Instagram profile not found or does not exist.');
    } else if (error.message.includes('private')) {
      throw new Error('This Instagram profile is private.');
    }
    
    throw new Error(`Scraping failed: ${error.message}`);
  }
}



// ===============================================================================
// INTERFACE DEFINITIONS (Add these to your types)
// ===============================================================================

interface EngagementData {
  avgLikes: number;
  avgComments: number;
  engagementRate: number;
  topHashtags: string[];
  postingFrequency: string;
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
  latestPosts: any[];
  engagement?: EngagementData;
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

// FIND this section in your /v1/analyze endpoint and REPLACE:

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
    
    // ✅ FIX: Use consistent variable naming throughout
    const body = await c.req.json();
    const { profile_url, analysis_type = 'light', business_id } = body;
    
    // Extract username
    const username = extractUsername(profile_url);
    if (!username || !business_id) {
      return c.json(createStandardResponse(false, undefined, 'Missing required fields', requestId), 400);
    }
    
    if (!['light', 'deep'].includes(analysis_type)) {
      return c.json(createStandardResponse(false, undefined, 'Invalid analysis_type', requestId), 400);
    }
    
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
    
    // Scraping
    const profileData = await scrapeInstagramProfile(username, analysis_type, c.env);
    
    // AI Analysis  
    const analysisResult = await performAIAnalysis(profileData, business, analysis_type, c.env);
    
    // Message generation (deep only)
    let outreachMessage = '';
    if (analysis_type === 'deep') {
      try {
        outreachMessage = await generateOutreachMessage(profileData, business, analysisResult, c.env);
      } catch (messageError: any) {
        console.warn('⚠️ Message generation failed (non-fatal):', messageError.message);
      }
    }
    
    // ✅ FIX: Database save with proper variable names and integer conversion
    const leadData = {
      user_id: userId,
      business_id: business_id,  // ✅ Use business_id from destructuring
      username: profileData.username,
      platform: 'instagram',
      profile_url: profile_url,  // ✅ Use profile_url from destructuring  
      profile_pic_url: profileData.profilePicUrl || null,
      
      // ✅ FIX: Convert score to integer
      score: Math.round(parseFloat(analysisResult.score) || 0),
      
      analysis_type: analysis_type,  // ✅ Use analysis_type from destructuring
      followers_count: profileData.followersCount || 0,
      avg_likes: profileData.engagement?.avgLikes || 0,
      avg_comments: profileData.engagement?.avgComments || 0,
      engagement_rate: profileData.engagement?.engagementRate || 0,
      outreach_message: outreachMessage || null,
      created_at: new Date().toISOString()
    };
    
    // Analysis data for deep analysis
    let analysisData = null;
    if (analysis_type === 'deep') {
      analysisData = {
        user_id: userId,
        analysis_type: 'deep',
        
        // ✅ FIX: Convert all scores to integers
        engagement_score: Math.round(parseFloat(analysisResult.engagement_score) || 0),
        score_niche_fit: Math.round(parseFloat(analysisResult.niche_fit) || 0), 
        score_total: Math.round(parseFloat(analysisResult.score) || 0),
        
        outreach_message: outreachMessage || null,
        selling_points: analysisResult.selling_points || null,
        avg_comments: profileData.engagement?.avgComments || 0,
        avg_likes: profileData.engagement?.avgLikes || 0,
        engagement_rate: profileData.engagement?.engagementRate || 0,
        audience_quality: analysisResult.audience_quality || null,
        engagement_insights: analysisResult.engagement_insights || null
      };
    }
    
    // Save to database
    const leadId = await saveLeadAndAnalysis(leadData, analysisData, analysis_type, c.env);
    
    // Update credits
    await Promise.all([
      updateCreditsAndTransaction(userId, creditCost, userResult.credits - creditCost, 
        `${analysis_type} analysis for @${profileData.username}`, leadId, c.env)
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

// ✅ ALSO ADD this helper function to convert scores safely:
function convertScoreToInteger(score: any): number {
  if (score === null || score === undefined || score === '') return 0;
  const numScore = parseFloat(String(score));
  return isNaN(numScore) ? 0 : Math.round(numScore);
}

// ===============================================================================
// CORRECTED /v1/bulk-analyze ENDPOINT  
// ===============================================================================

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
    
    // Request validation - FIXED: Use consistent variable names  
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
        
        // FIXED: Save to database using correct variable names
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
        `Bulk ${analysis_type} analysis (${successful} profiles)`, // FIXED: Use analysis_type
        'use',
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
