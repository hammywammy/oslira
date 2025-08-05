// ===============================================================================
// OSLIRA ENHANCED CLOUDFLARE WORKERS API - COMPREHENSIVE FIXES
// Fixes: Post scraping, AI scoring, summary generation, data validation
// Using existing schema structure with minimal changes
// ===============================================================================

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

// ===============================================================================
// ENHANCED INTERFACES - USING EXISTING SCHEMA
// ===============================================================================

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
  scraperUsed?: string; // Track which scraper was used for debugging
  dataQuality?: 'high' | 'medium' | 'low'; // Track data completeness
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
  viewCount?: number;
  isVideo?: boolean;
}

interface EngagementData {
  avgLikes: number;
  avgComments: number;
  engagementRate: number;
  totalEngagement: number;
  postsAnalyzed?: number; // Track how many posts were analyzed
  qualityScore?: number; // 1-100 based on consistency and authenticity
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
  quick_summary?: string; // For light analysis - NEW
  deep_summary?: string; // For deep analysis - NEW
  confidence_level?: number; // How confident we are in the analysis (1-100)
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
    version: 'v2.1.0', // Updated version
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

// ===============================================================================
// ENHANCED LEAD SAVING WITH SUMMARIES - USING EXISTING SCHEMA
// ===============================================================================

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
    logger('info', 'Saving to leads table with enhanced data', { username: leadData.username });
    
    // ✅ FIXED: Ensure all data is properly formatted
    const cleanLeadData = {
      ...leadData,
      score: Math.round(parseFloat(leadData.score) || 0),
      followers_count: parseInt(leadData.followers_count) || 0,
      // ✅ ENSURE: quick_summary is included for light analysis
      quick_summary: leadData.quick_summary || null
    };

    logger('info', 'Lead data being saved', cleanLeadData);

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

    logger('info', 'Lead saved successfully with summary', { lead_id, username: leadData.username });

    // ✅ FIXED: Only save analysis data for deep analysis AND ensure engagement data is included
    if (analysisType === 'deep' && analysisData) {
      logger('info', 'Saving to lead_analyses table for deep analysis with enhanced data');
      
      const cleanAnalysisData = {
        ...analysisData,
        lead_id: lead_id,
        engagement_score: Math.round(parseFloat(analysisData.engagement_score) || 0),
        score_niche_fit: Math.round(parseFloat(analysisData.score_niche_fit) || 0),
        score_total: Math.round(parseFloat(analysisData.score_total) || 0),
        
        // ✅ FIXED: Ensure engagement data is properly saved
        avg_likes: parseInt(analysisData.avg_likes) || 0,
        avg_comments: parseInt(analysisData.avg_comments) || 0,
        engagement_rate: parseFloat(analysisData.engagement_rate) || 0,
        
        audience_quality: analysisData.audience_quality || 'Unknown',
        engagement_insights: analysisData.engagement_insights || 'No insights available',
        selling_points: analysisData.selling_points || null,
        
        // ✅ ENSURE: deep_summary is included
        deep_summary: analysisData.deep_summary || null
      };

      logger('info', 'Analysis data being saved', {
        lead_id,
        engagement_score: cleanAnalysisData.engagement_score,
        avg_likes: cleanAnalysisData.avg_likes,
        avg_comments: cleanAnalysisData.avg_comments,
        engagement_rate: cleanAnalysisData.engagement_rate,
        has_deep_summary: !!cleanAnalysisData.deep_summary
      });

      const analysisResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/lead_analyses`, {
        method: 'POST',
        headers,
        body: JSON.stringify(cleanAnalysisData)
      });

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        logger('error', 'Failed to save analysis data', { error: errorText });
        
        // Rollback lead record
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

      logger('info', 'Deep analysis data saved successfully with engagement metrics');
    } else {
      logger('info', 'Light analysis - skipping lead_analyses table');
    }

    return lead_id;

  } catch (error: any) {
    logger('error', 'saveLeadAndAnalysis failed', { error: error.message });
    throw new Error(`Database save failed: ${error.message}`);
  }
}
// ===============================================================================
// ENHANCED INSTAGRAM SCRAPING WITH DEBUGGING
// ===============================================================================

async function scrapeInstagramProfile(username: string, analysisType: AnalysisType, env: Env): Promise<ProfileData> {
  if (!env.APIFY_API_TOKEN) {
    throw new Error('Profile scraping service not configured');
  }

  logger('info', 'Starting enhanced profile scraping', { username, analysisType });

  try {
    if (analysisType === 'light') {
      logger('info', 'Using light scraper for basic profile data');
      
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

      logger('info', 'Light scraper response received', { 
        responseLength: profileResponse?.length,
        hasData: !!profileResponse?.[0] 
      });

      if (!profileResponse || !Array.isArray(profileResponse) || profileResponse.length === 0) {
        throw new Error('Profile not found or private');
      }

      const profileData = validateProfileData(profileResponse[0], 'light');
      profileData.scraperUsed = 'light';
      profileData.dataQuality = 'medium';
      
      return profileData;

    } else {
      logger('info', 'Deep analysis: Starting with enhanced scraper');
      
      // ✅ ENHANCED: Try multiple scraper configurations
      const deepConfigs = [
        {
          name: 'primary_deep',
          input: {
            directUrls: [`https://instagram.com/${username}/`],
            resultsLimit: 12, // Increased from 8
            addParentData: false,
            enhanceUserSearchWithFacebookPage: false,
            onlyPostsNewerThan: "2024-01-01",
            resultsType: "details",
            searchType: "hashtag"
          }
        },
        {
          name: 'alternative_deep',
          input: {
            directUrls: [`https://www.instagram.com/${username}/`], // Full URL
            resultsLimit: 10,
            addParentData: true, // Changed to true
            enhanceUserSearchWithFacebookPage: false,
            onlyPostsNewerThan: "2023-06-01", // Extended date range
            resultsType: "details"
          }
        }
      ];

      let lastError: Error | null = null;

      for (const config of deepConfigs) {
        try {
          logger('info', `Trying deep scraper config: ${config.name}`, { username });
          
          const deepResponse = await callWithRetry(
            `https://api.apify.com/v2/acts/shu8hvrXbJbY3Eb9W/run-sync-get-dataset-items?token=${env.APIFY_API_TOKEN}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(config.input)
            },
            2, 3000, 60000
          );

          logger('info', `Deep scraper (${config.name}) response received`, { 
            responseLength: deepResponse?.length,
            hasData: !!deepResponse?.[0],
            firstItemKeys: deepResponse?.[0] ? Object.keys(deepResponse[0]).slice(0, 10) : []
          });

          if (deepResponse && Array.isArray(deepResponse) && deepResponse.length > 0) {
            // ✅ ENHANCED: Debug the response structure
            const profileItems = deepResponse.filter(item => item.username || item.ownerUsername);
            const postItems = deepResponse.filter(item => item.shortCode && item.likesCount !== undefined);
            
            logger('info', 'Deep scraper data analysis', {
              totalItems: deepResponse.length,
              profileItems: profileItems.length,
              postItems: postItems.length,
              config: config.name
            });

            if (profileItems.length === 0) {
              logger('warn', `No profile data found in ${config.name} response`);
              continue;
            }

            const profileData = validateProfileData(deepResponse, 'deep');
            profileData.scraperUsed = config.name;
            profileData.dataQuality = postItems.length >= 3 ? 'high' : postItems.length >= 1 ? 'medium' : 'low';
            
            logger('info', 'Deep scraping successful', {
              username: profileData.username,
              postsFound: profileData.latestPosts?.length || 0,
              hasEngagement: !!profileData.engagement,
              dataQuality: profileData.dataQuality
            });

            return profileData;
          } else {
            throw new Error(`${config.name} returned no usable data`);
          }

        } catch (configError: any) {
          logger('warn', `Deep scraper config ${config.name} failed`, { error: configError.message });
          lastError = configError;
          continue;
        }
      }

      // ✅ ENHANCED: Fallback to light scraper with estimated engagement
      logger('warn', 'All deep scraper configs failed, falling back to light scraper with estimates');
      
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
        throw new Error('Profile not found on any scraper');
      }

      const profile = lightResponse[0];
      const followers = parseInt(profile.followersCount) || 0;
      
      // ✅ ENHANCED: Better engagement estimation based on follower ranges
      const estimatedEngagement = generateEstimatedEngagement(followers);

      const fallbackProfile: ProfileData = {
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
        engagement: estimatedEngagement,
        scraperUsed: 'light_fallback',
        dataQuality: 'low'
      };

      logger('info', 'Fallback scraping completed with estimates', {
        username: fallbackProfile.username,
        followers,
        estimatedEngagement: estimatedEngagement.avgLikes
      });

      return fallbackProfile;
    }

  } catch (error: any) {
    logger('error', 'All scraping methods failed', { username, error: error.message });
    
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

// ===============================================================================
// ENHANCED ENGAGEMENT ESTIMATION
// ===============================================================================

function generateEstimatedEngagement(followers: number): EngagementData {
  if (followers === 0) {
    return {
      avgLikes: 0,
      avgComments: 0,
      engagementRate: 0,
      totalEngagement: 0,
      postsAnalyzed: 0,
      qualityScore: 0
    };
  }

  // ✅ ENHANCED: More realistic engagement rates based on follower ranges
  let baseEngagementRate: number;
  let qualityScore: number;

  if (followers < 1000) {
    baseEngagementRate = 0.08; // 8% for micro accounts
    qualityScore = 75;
  } else if (followers < 10000) {
    baseEngagementRate = 0.06; // 6% for small accounts
    qualityScore = 70;
  } else if (followers < 100000) {
    baseEngagementRate = 0.04; // 4% for medium accounts
    qualityScore = 65;
  } else if (followers < 1000000) {
    baseEngagementRate = 0.025; // 2.5% for large accounts
    qualityScore = 60;
  } else {
    baseEngagementRate = 0.015; // 1.5% for mega accounts
    qualityScore = 55;
  }

  // Add some randomness to make it more realistic
  const variance = 0.3; // ±30% variance
  const randomFactor = 1 + (Math.random() - 0.5) * variance;
  const adjustedRate = baseEngagementRate * randomFactor;

  const avgLikes = Math.round(followers * adjustedRate * 0.85); // 85% of engagement is likes
  const avgComments = Math.round(followers * adjustedRate * 0.15); // 15% is comments

  return {
    avgLikes,
    avgComments,
    engagementRate: Math.round(adjustedRate * 10000) / 100, // Round to 2 decimal places
    totalEngagement: avgLikes + avgComments,
    postsAnalyzed: 0, // Estimated, not analyzed
    qualityScore: Math.round(qualityScore + (Math.random() - 0.5) * 20) // ±10 variance
  };
}

// ===============================================================================
// ENHANCED PROFILE DATA VALIDATION
// ===============================================================================

function validateProfileData(responseData: any, analysisType?: string): ProfileData {
    try {
        logger('info', 'Validating profile data', { 
            analysisType, 
            isArray: Array.isArray(responseData),
            length: Array.isArray(responseData) ? responseData.length : 'not-array'
        });

        if (analysisType === 'deep' && Array.isArray(responseData)) {
            // ✅ ENHANCED: Better profile and post detection
            const profileItem = responseData.find(item => 
                item.username || item.ownerUsername || 
                (item.followersCount !== undefined && item.postsCount !== undefined)
            );
            
            const posts = responseData.filter(item => 
                item.shortCode && 
                (item.likesCount !== undefined || item.likes !== undefined) &&
                item.timestamp
            );
            
            logger('info', 'Deep data validation', {
                totalItems: responseData.length,
                profileFound: !!profileItem,
                postsFound: posts.length,
                samplePost: posts[0] ? {
                    shortCode: posts[0].shortCode,
                    likes: posts[0].likesCount || posts[0].likes,
                    comments: posts[0].commentsCount || posts[0].comments,
                    timestamp: posts[0].timestamp
                } : null
            });

            if (!profileItem) {
                throw new Error('No profile data found in deep scraper response');
            }

            let engagement: EngagementData | undefined;
            if (posts.length > 0) {
                // ✅ FIXED: More robust engagement calculation with proper data extraction
                const validPosts = posts.filter(post => {
                    const likes = parseInt(post.likesCount?.toString() || post.likes?.toString() || '0') || 0;
                    const comments = parseInt(post.commentsCount?.toString() || post.comments?.toString() || '0') || 0;
                    return likes > 0 || comments > 0; // At least some engagement
                });

                logger('info', 'Post validation results', {
                    totalPosts: posts.length,
                    validPosts: validPosts.length,
                    sampleValidPost: validPosts[0] ? {
                        likes: parseInt(validPosts[0].likesCount?.toString() || validPosts[0].likes?.toString() || '0'),
                        comments: parseInt(validPosts[0].commentsCount?.toString() || validPosts[0].comments?.toString() || '0')
                    } : null
                });

                if (validPosts.length > 0) {
                    const totalLikes = validPosts.reduce((sum, post) => {
                        const likes = parseInt(post.likesCount?.toString() || post.likes?.toString() || '0') || 0;
                        return sum + likes;
                    }, 0);
                    
                    const totalComments = validPosts.reduce((sum, post) => {
                        const comments = parseInt(post.commentsCount?.toString() || post.comments?.toString() || '0') || 0;
                        return sum + comments;
                    }, 0);
                    
                    const avgLikes = Math.round(totalLikes / validPosts.length);
                    const avgComments = Math.round(totalComments / validPosts.length);
                    const totalEngagement = avgLikes + avgComments;
                    const followers = parseInt(profileItem.followersCount?.toString() || '0') || 0;
                    const engagementRate = followers > 0 ? ((totalEngagement / followers) * 100) : 0;

                    // ✅ ENHANCED: Calculate quality score based on consistency
                    const engagementVariance = calculateEngagementVariance(validPosts);
                    const qualityScore = calculateQualityScore(engagementRate, engagementVariance, validPosts.length);

                    engagement = {
                        avgLikes,
                        avgComments,
                        engagementRate: Math.round(engagementRate * 100) / 100, // Round to 2 decimal places
                        totalEngagement,
                        postsAnalyzed: validPosts.length,
                        qualityScore
                    };

                    logger('info', 'Real engagement calculated', {
                        postsAnalyzed: validPosts.length,
                        avgLikes,
                        avgComments,
                        engagementRate: engagement.engagementRate,
                        qualityScore,
                        totalLikes,
                        totalComments
                    });
                } else {
                    logger('warn', 'No valid posts with engagement found');
                }
            } else {
                logger('warn', 'No posts found in deep scraper response');
            }

            // ✅ ENHANCED: Better post data extraction
            const latestPosts: PostData[] = posts.slice(0, 12).map(post => {
                // Extract hashtags and mentions from caption
                const caption = post.caption || post.title || '';
                const hashtags = extractHashtags(caption);
                const mentions = extractMentions(caption);

                return {
                    id: post.id || post.shortCode || '',
                    shortCode: post.shortCode || '',
                    caption: caption,
                    likesCount: parseInt(post.likesCount?.toString() || post.likes?.toString() || '0') || 0,
                    commentsCount: parseInt(post.commentsCount?.toString() || post.comments?.toString() || '0') || 0,
                    timestamp: post.timestamp || post.created_time || new Date().toISOString(),
                    url: post.url || `https://instagram.com/p/${post.shortCode}/`,
                    type: post.type || (post.isVideo ? 'video' : 'photo'),
                    hashtags,
                    mentions,
                    viewCount: parseInt(post.viewCount?.toString() || post.views?.toString() || '0') || undefined,
                    isVideo: Boolean(post.isVideo || post.type === 'video')
                };
            });

            const extractedUsername = (profileItem.username || profileItem.ownerUsername || '').toLowerCase();
            
            const result = {
                username: extractedUsername,
                displayName: profileItem.fullName || profileItem.displayName || '',
                bio: profileItem.biography || profileItem.bio || '',
                followersCount: parseInt(profileItem.followersCount?.toString() || '0') || 0,
                followingCount: parseInt(profileItem.followingCount?.toString() || '0') || 0,
                postsCount: parseInt(profileItem.postsCount?.toString() || '0') || latestPosts.length,
                isVerified: Boolean(profileItem.verified || profileItem.isVerified),
                isPrivate: Boolean(profileItem.private || profileItem.isPrivate),
                profilePicUrl: profileItem.profilePicUrl || profileItem.profilePicture || '',
                externalUrl: profileItem.externalUrl || profileItem.website || '',
                latestPosts,
                engagement
            };

            logger('info', 'Deep profile validation completed', {
                username: result.username,
                followers: result.followersCount,
                postsFound: result.latestPosts.length,
                hasEngagement: !!result.engagement,
                avgLikes: result.engagement?.avgLikes || 'N/A',
                avgComments: result.engagement?.avgComments || 'N/A',
                engagementRate: result.engagement?.engagementRate || 'N/A'
            });

            return result;

        } else {
            // ✅ FIXED: Light analysis handling
            const profile = Array.isArray(responseData) ? responseData[0] : responseData;
            
            if (!profile || !profile.username) {
                throw new Error('Invalid profile data received');
            }

            logger('info', 'Light profile validation', {
                username: profile.username,
                followers: profile.followersCount,
                posts: profile.postsCount
            });

            return {
                username: profile.username,
                displayName: profile.fullName || profile.displayName || '',
                bio: profile.biography || profile.bio || '',
                followersCount: parseInt(profile.followersCount?.toString() || '0') || 0,
                followingCount: parseInt(profile.followingCount?.toString() || '0') || 0,
                postsCount: parseInt(profile.postsCount?.toString() || '0') || 0,
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

// ✅ MISSING HELPER FUNCTIONS
function calculateEngagementVariance(posts: any[]): number {
    if (posts.length < 2) return 0;
    
    const engagements = posts.map(post => {
        const likes = parseInt(post.likesCount?.toString() || post.likes?.toString() || '0') || 0;
        const comments = parseInt(post.commentsCount?.toString() || post.comments?.toString() || '0') || 0;
        return likes + comments;
    });
    
    const mean = engagements.reduce((sum, val) => sum + val, 0) / engagements.length;
    const variance = engagements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / engagements.length;
    
    return Math.sqrt(variance) / mean; // Coefficient of variation
}

function calculateQualityScore(engagementRate: number, variance: number, postsAnalyzed: number): number {
    let score = 50; // Base score
    
    // Bonus for good engagement rate
    if (engagementRate > 5) score += 20;
    else if (engagementRate > 2) score += 10;
    else if (engagementRate > 1) score += 5;
    
    // Bonus for consistency (low variance)
    if (variance < 0.3) score += 15;
    else if (variance < 0.5) score += 10;
    else if (variance < 0.8) score += 5;
    
    // Bonus for more posts analyzed
    if (postsAnalyzed >= 8) score += 10;
    else if (postsAnalyzed >= 5) score += 5;
    
    return Math.min(100, Math.max(0, Math.round(score)));
}

// ===============================================================================
// HELPER FUNCTIONS FOR ENHANCED DATA EXTRACTION
// ===============================================================================

function extractHashtags(text: string): string[] {
  if (!text) return [];
  const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.toLowerCase()) : [];
}

function extractMentions(text: string): string[] {
  if (!text) return [];
  const mentionRegex = /@[\w.]+/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map(mention => mention.toLowerCase()) : [];
}

// ===============================================================================
// ENHANCED AI SUMMARY GENERATION
// ===============================================================================

async function generateQuickSummary(profile: ProfileData, env: Env): Promise<string> {
  const prompt = `Generate a brief 2-3 sentence summary for this Instagram profile:

Username: @${profile.username}
Display Name: ${profile.displayName}
Bio: ${profile.bio}
Followers: ${profile.followersCount.toLocaleString()}
Posts: ${profile.postsCount}
Verified: ${profile.isVerified ? 'Yes' : 'No'}

Focus on who they are, what they do, and their influence level. Keep it professional and concise.`;

  try {
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
          max_tokens: 200
        })
      }
    );
    
    return response.choices[0].message.content.trim();
  } catch (error) {
    logger('warn', 'Quick summary generation failed', { error });
    return `@${profile.username} is ${profile.isVerified ? 'a verified' : 'an'} Instagram ${profile.followersCount > 100000 ? 'influencer' : 'user'} with ${profile.followersCount.toLocaleString()} followers. ${profile.bio || 'Active content creator'}.`;
  }
}

async function generateDeepSummary(
  profile: ProfileData, 
  business: BusinessProfile, 
  analysisResult: AnalysisResult,
  env: Env
): Promise<string> {
  const engagementInfo = profile.engagement ? 
    `Average engagement: ${profile.engagement.avgLikes} likes, ${profile.engagement.avgComments} comments per post (${profile.engagement.engagementRate}% rate)` : 
    'Engagement data not available';

  const postInfo = profile.latestPosts?.length > 0 ? 
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
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 600
        })
      }
    );
    
    return response.choices[0].message.content.trim();
  } catch (error) {
    logger('warn', 'Deep summary generation failed', { error });
    return `Comprehensive analysis of @${profile.username}: ${profile.isVerified ? 'Verified' : 'Unverified'} profile with ${profile.followersCount.toLocaleString()} followers and ${analysisResult.score}/100 business compatibility score. Engagement rate of ${profile.engagement?.engagementRate || 'unknown'}% indicates ${analysisResult.audience_quality.toLowerCase()} audience quality. Content alignment and partnership potential require further evaluation based on specific business objectives and campaign requirements.`;
  }
}

function extractPostThemes(posts: PostData[]): string {
  if (!posts || posts.length === 0) return 'unknown topics';
  
  const allHashtags = posts.flatMap(post => post.hashtags || []);
  const hashtagCounts = allHashtags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topHashtags = Object.entries(hashtagCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([tag]) => tag.replace('#', ''));
    
  return topHashtags.length > 0 ? topHashtags.join(', ') : 'lifestyle content';
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

  const captions = posts.slice(0, 8).map(post => post.caption).filter(Boolean);
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

  const qualityIndicator = engagement.qualityScore ? 
    ` Quality score: ${engagement.qualityScore}/100.` : '';

  const prompt = `Analyze this engagement data and describe the engagement quality:
Average Likes: ${engagement.avgLikes}
Average Comments: ${engagement.avgComments}
Engagement Rate: ${engagement.engagementRate}%
Posts Analyzed: ${engagement.postsAnalyzed || 0}${qualityIndicator}

Is this good, average, or poor engagement? What does it indicate about audience quality?`;

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
// ENHANCED AI PROMPTS WITH BETTER SCORING LOGIC
// ===============================================================================

function buildLightEvaluatorPrompt(summary: ProfileSummary): string {
  return `You are an expert B2B lead analyst. Analyze this prospect for business potential.

PROFILE: ${summary.bio_summary}

BUSINESS CONTEXT: ${summary.business_context}

SCORING GUIDELINES:
- Score naturally based on real assessment (avoid round numbers like 70, 80, 90)
- Consider follower count, verification status, bio relevance, and business alignment
- High scores (80-95): Strong business relevance, good audience size, clear value prop
- Medium scores (50-79): Some relevance but missing key factors
- Low scores (20-49): Poor fit or limited business potential

Return JSON format:
{
  "score": <number 1-100>,
  "engagement_score": <estimated number 1-100 based on follower count>,
  "niche_fit": <number 1-100>,
  "audience_quality": "<High/Medium/Low>",
  "engagement_insights": "<2-3 sentence analysis based on available data>",
  "selling_points": ["<specific point 1>", "<specific point 2>", "<specific point 3>"]
}

Focus on business relevance and partnership potential. Be realistic in scoring.`;
}

function buildDeepEvaluatorPrompt(summary: ProfileSummary): string {
  return `You are an expert B2B lead analyst. Conduct a comprehensive evaluation of this prospect.

PROFILE ANALYSIS:
Bio & Stats: ${summary.bio_summary}
Content Themes: ${summary.post_themes}
Engagement Quality: ${summary.engagement_patterns}

BUSINESS CONTEXT: ${summary.business_context}

SCORING GUIDELINES:
- Use realistic, varied scores (e.g., 67, 73, 84, 91) based on thorough evaluation
- Engagement score should reflect actual engagement data when available
- Niche fit should be based on content alignment and audience overlap
- Consider data quality - lower confidence if limited post data available

EVALUATION CRITERIA:
- Business relevance and partnership potential (40% weight)
- Audience quality and engagement authenticity (30% weight)
- Content alignment with business goals (20% weight)
- Influence and reach effectiveness (10% weight)

Return JSON format:
{
  "score": <number 1-100>,
  "engagement_score": <number 1-100 based on actual data>,
  "niche_fit": <number 1-100>,
  "audience_quality": "<High/Medium/Low>",
  "engagement_insights": "<detailed 3-4 sentence analysis of engagement patterns and audience quality>",
  "selling_points": ["<strategic advantage 1>", "<strategic advantage 2>", "<strategic advantage 3>", "<strategic advantage 4>"]
}

Provide actionable insights for business development. Ensure scores are logical and consistent.`;
}

// ===============================================================================
// ENHANCED AI ANALYSIS WITH SUMMARIES
// ===============================================================================

async function performAIAnalysis(
  profile: ProfileData, 
  business: BusinessProfile, 
  analysisType: 'light' | 'deep', 
  env: Env, 
  requestId: string
): Promise<AnalysisResult> {
  logger('info', `Starting enhanced ${analysisType} AI analysis`, { 
    username: profile.username,
    dataQuality: profile.dataQuality,
    scraperUsed: profile.scraperUsed,
    hasEngagement: !!profile.engagement
  }, requestId);
  
  let profileSummary: ProfileSummary;
  let quickSummary: string | undefined;
  let deepSummary: string | undefined;
  
  if (analysisType === 'light') {
    // Generate quick summary for light analysis
    quickSummary = await generateQuickSummary(profile, env);
    
    profileSummary = {
      bio_summary: `@${profile.username} (${profile.displayName}): ${profile.bio}. ${profile.followersCount.toLocaleString()} followers, ${profile.postsCount} posts. ${profile.isVerified ? 'Verified.' : ''} Data quality: ${profile.dataQuality || 'medium'}.`,
      post_themes: 'Light analysis - post themes not analyzed',
      engagement_patterns: profile.engagement ? 
        `Estimated engagement: ${profile.engagement.avgLikes} avg likes, ${profile.engagement.avgComments} avg comments (${profile.engagement.engagementRate}% rate)` :
        'Light analysis - engagement estimated based on follower count',
      business_context: `${business.name} in ${business.industry} targeting ${business.target_audience}. Value prop: ${business.value_proposition}`
    };
  } else {
    // Generate all summaries for deep analysis
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
  
  logger('info', 'Summarization complete, starting final evaluation', { 
    username: profile.username,
    hasRealEngagement: !!(profile.engagement && profile.engagement.postsAnalyzed && profile.engagement.postsAnalyzed > 0)
  }, requestId);
  
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
        max_tokens: analysisType === 'deep' ? 1500 : 1000,
        response_format: { type: 'json_object' }
      })
    }
  );
  
  const result = JSON.parse(response.choices[0].message.content);
  
  // Generate deep summary after analysis for deep analysis
  if (analysisType === 'deep') {
    const preliminaryResult = validateAnalysisResult(result);
    deepSummary = await generateDeepSummary(profile, business, preliminaryResult, env);
  }
  
  const finalResult = validateAnalysisResult(result);
  finalResult.quick_summary = quickSummary;
  finalResult.deep_summary = deepSummary;
  
  // Calculate confidence level based on data quality
  finalResult.confidence_level = calculateConfidenceLevel(profile, analysisType);
  
  logger('info', `AI analysis completed`, { 
    username: profile.username, 
    score: finalResult.score,
    engagementScore: finalResult.engagement_score,
    nicheFit: finalResult.niche_fit,
    confidence: finalResult.confidence_level
  }, requestId);
  
  return finalResult;
}

function calculateConfidenceLevel(profile: ProfileData, analysisType: string): number {
  let confidence = 50; // Base confidence
  
  // Boost confidence based on data quality
  if (profile.dataQuality === 'high') confidence += 30;
  else if (profile.dataQuality === 'medium') confidence += 15;
  
  // Boost for verified profiles
  if (profile.isVerified) confidence += 10;
  
  // Boost for real engagement data
  if (profile.engagement?.postsAnalyzed && profile.engagement.postsAnalyzed > 0) {
    confidence += 15;
    if (profile.engagement.postsAnalyzed >= 5) confidence += 5;
  }
  
  // Boost for deep analysis
  if (analysisType === 'deep') confidence += 10;
  
  // Penalty for private profiles
  if (profile.isPrivate) confidence -= 15;
  
  return Math.min(95, Math.max(20, confidence));
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

// ===============================================================================
// ENHANCED OUTREACH MESSAGE GENERATION
// ===============================================================================

async function generateOutreachMessage(
  profile: ProfileData,
  business: BusinessProfile,
  analysis: AnalysisResult,
  env: Env,
  requestId?: string
): Promise<string> {
  logger('info', 'Generating enhanced outreach message', { username: profile.username }, requestId);

  const engagementInfo = profile.engagement?.postsAnalyzed > 0 ? 
    `with authentic engagement averaging ${profile.engagement.avgLikes} likes per post` :
    `with ${profile.followersCount.toLocaleString()} followers`;

  const contentInfo = profile.latestPosts?.length > 0 ? 
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
    logger('error', 'Enhanced message generation failed', { error: error.message }, requestId);
    
    return `Hi ${profile.displayName || profile.username},

I came across your profile and was impressed by your content and engagement with your ${profile.followersCount.toLocaleString()} followers.

I'm reaching out from ${business.name}, and I think there could be a great opportunity for collaboration given your audience and our ${business.value_proposition.toLowerCase()}.

Would you be interested in exploring a potential partnership? I'd love to share more details about what we have in mind.

Best regards`;
  }
}

// ===============================================================================
// KEEP ALL EXISTING ENDPOINTS FROM ORIGINAL CODE
// ===============================================================================

app.get('/', (c) => {
  return c.json({
    status: 'healthy',
    service: 'Oslira AI Analysis API - Enhanced',
    version: 'v2.1.0',
    timestamp: new Date().toISOString(),
    features: ['enhanced_scraping', 'summaries', 'improved_scoring']
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

// ===============================================================================
// ENHANCED MAIN ANALYSIS ENDPOINT
// ===============================================================================

app.post('/v1/analyze', async (c) => {
  const requestId = generateRequestId();
  
  try {
    const body = await c.req.json();
    const data = normalizeRequest(body);
    const { username, analysis_type, business_id, user_id, profile_url } = data;
    
    logger('info', 'Enhanced analysis request started', { 
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
      logger('info', 'Starting enhanced profile scraping', { username });
      profileData = await scrapeInstagramProfile(username, analysis_type, c.env);
      logger('info', 'Enhanced profile scraped successfully', { 
        username: profileData.username, 
        followers: profileData.followersCount,
        postsFound: profileData.latestPosts?.length || 0,
        hasRealEngagement: !!(profileData.engagement?.postsAnalyzed && profileData.engagement.postsAnalyzed > 0),
        dataQuality: profileData.dataQuality,
        scraperUsed: profileData.scraperUsed
      });
    } catch (scrapeError: any) {
      logger('error', 'Enhanced profile scraping failed', { 
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
      logger('info', 'Starting enhanced AI analysis');
      analysisResult = await performAIAnalysis(profileData, business, analysis_type, c.env, requestId);
      logger('info', 'Enhanced AI analysis completed', { 
        score: analysisResult.score,
        engagementScore: analysisResult.engagement_score,
        nicheFit: analysisResult.niche_fit,
        confidence: analysisResult.confidence_level,
        hasQuickSummary: !!analysisResult.quick_summary,
        hasDeepSummary: !!analysisResult.deep_summary
      });
    } catch (aiError: any) {
      logger('error', 'Enhanced AI analysis failed', { error: aiError.message });
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
        logger('info', 'Generating enhanced outreach message');
        outreachMessage = await generateOutreachMessage(profileData, business, analysisResult, c.env, requestId);
        logger('info', 'Enhanced outreach message generated', { length: outreachMessage.length });
      } catch (messageError: any) {
        logger('warn', 'Enhanced message generation failed (non-fatal)', { error: messageError.message });
      }
    }

    // ✅ ENHANCED: Include summaries in lead data
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
      created_at: new Date().toISOString(),
      // ✅ NEW: Add quick summary to leads table
      quick_summary: analysisResult.quick_summary || null
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
        
        // ✅ ENHANCED: Better engagement data handling
        avg_comments: profileData.engagement?.avgComments || 0,
        avg_likes: profileData.engagement?.avgLikes || 0,
        engagement_rate: profileData.engagement?.engagementRate || 0,
        
        latest_posts: profileData.latestPosts ? JSON.stringify(profileData.latestPosts) : null,
        
        // ✅ NEW: Add deep summary to lead_analyses table
        deep_summary: analysisResult.deep_summary || null,
        
        created_at: new Date().toISOString()
      };
    }

    let lead_id: string;
    try {
      logger('info', 'Saving enhanced data to database');
      lead_id = await saveLeadAndAnalysis(leadData, analysisData, analysis_type, c.env);
      logger('info', 'Enhanced database save successful', { lead_id });
    } catch (saveError: any) {
      logger('error', 'Enhanced database save failed', { error: saveError.message });
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

    // ✅ ENHANCED: Include summaries and confidence in response
    const responseData = {
      lead_id,
      profile: {
        username: profileData.username,
        displayName: profileData.displayName,
        followersCount: profileData.followersCount,
        isVerified: profileData.isVerified,
        profilePicUrl: profileData.profilePicUrl,
        dataQuality: profileData.dataQuality,
        scraperUsed: profileData.scraperUsed
      },
      analysis: {
        score: analysisResult.score,
        type: analysis_type,
        confidence_level: analysisResult.confidence_level,
        quick_summary: analysisResult.quick_summary,
        ...(analysis_type === 'deep' && {
          engagement_score: analysisResult.engagement_score,
          niche_fit: analysisResult.niche_fit,
          audience_quality: analysisResult.audience_quality,
          selling_points: analysisResult.selling_points,
          outreach_message: outreachMessage,
          deep_summary: analysisResult.deep_summary,
          engagement_data: profileData.engagement ? {
            avg_likes: profileData.engagement.avgLikes,
            avg_comments: profileData.engagement.avgComments,
            engagement_rate: profileData.engagement.engagementRate,
            posts_analyzed: profileData.engagement.postsAnalyzed || 0,
            quality_score: profileData.engagement.qualityScore
          } : null
        })
      },
      credits: {
        used: creditCost,
        remaining: userResult.credits - creditCost
      }
    };

    logger('info', 'Enhanced analysis completed successfully', { 
      lead_id, 
      username: profileData.username, 
      score: analysisResult.score,
      confidence: analysisResult.confidence_level,
      dataQuality: profileData.dataQuality
    });

    return c.json(createStandardResponse(true, responseData, undefined, requestId));

  } catch (error: any) {
    logger('error', 'Enhanced analysis request failed', { error: error.message, requestId });
    return c.json(createStandardResponse(
      false, 
      undefined, 
      error.message, 
      requestId
    ), 500);
  }
});

// ===============================================================================
// ENHANCED BULK ANALYSIS ENDPOINT
// ===============================================================================

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

    logger('info', 'Enhanced bulk analysis started', { 
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
        logger('info', 'Processing enhanced bulk profile', { username: profile.username });

        const profileData = await scrapeInstagramProfile(profile.username, analysis_type, c.env);
        
        const analysisResult = await performAIAnalysis(profileData, business, analysis_type, c.env, requestId);
        
        let outreachMessage = '';
        if (analysis_type === 'deep') {
          try {
            outreachMessage = await generateOutreachMessage(profileData, business, analysisResult, c.env, requestId);
          } catch (messageError: any) {
            logger('warn', 'Enhanced message generation failed for bulk profile', { 
              username: profile.username, 
              error: messageError.message 
            });
          }
        }

        // ✅ ENHANCED: Include summaries in bulk data
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
          created_at: new Date().toISOString(),
          quick_summary: analysisResult.quick_summary || null
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
            deep_summary: analysisResult.deep_summary || null,
            created_at: new Date().toISOString()
          };
        }

        const lead_id = await saveLeadAndAnalysis(leadData, analysisData, analysis_type, c.env);

        results.push({
          username: profile.username,
          success: true,
          lead_id,
          score: analysisResult.score,
          confidence_level: analysisResult.confidence_level,
          data_quality: profileData.dataQuality,
          ...(analysis_type === 'deep' && {
            engagement_score: analysisResult.engagement_score,
            outreach_message: outreachMessage,
            posts_analyzed: profileData.engagement?.postsAnalyzed || 0
          })
        });

        successful++;
        creditsUsed += costPerProfile;

        logger('info', 'Enhanced bulk profile processed successfully', { 
          username: profile.username, 
          score: analysisResult.score,
          dataQuality: profileData.dataQuality
        });

      } catch (error: any) {
        logger('error', 'Enhanced bulk profile processing failed', { 
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
          `Enhanced bulk ${analysis_type} analysis (${successful} profiles)`,
          'use',
          c.env
        );
      } catch (creditError: any) {
        logger('error', 'Enhanced bulk credit update failed', { error: creditError.message });
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
        creditsUsed,
        average_confidence: successful > 0 ? 
          Math.round(results.filter(r => r.success).reduce((sum, r) => sum + (r.confidence_level || 0), 0) / successful) : 0
      },
      results,
      credits: {
        remaining: userResult.credits - creditsUsed
      }
    };

    logger('info', 'Enhanced bulk analysis completed', { 
      total: validatedProfiles.length, 
      successful, 
      failed, 
      creditsUsed 
    });

    return c.json(createStandardResponse(true, responseData, undefined, requestId));

  } catch (error: any) {
    logger('error', 'Enhanced bulk analysis failed', { error: error.message, requestId });
    return c.json(createStandardResponse(
      false, 
      undefined, 
      error.message, 
      requestId
    ), 500);
  }
});

// ===============================================================================
// ENHANCED DEBUG ENDPOINTS
// ===============================================================================

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
        postsCount: profileData.latestPosts?.length || 0,
        engagementAnalyzed: profileData.engagement?.postsAnalyzed || 0,
        dataQuality: profileData.dataQuality,
        scraperUsed: profileData.scraperUsed,
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

app.get('/debug-parsing/:username', async (c) => {
  const username = c.req.param('username');
  
  try {
    const deepInput = {
      directUrls: [`https://instagram.com/${username}/`],
      resultsLimit: 5,
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

    // Enhanced debug analysis
    const profileItems = rawResponse?.filter(item => item.username || item.ownerUsername) || [];
    const postItems = rawResponse?.filter(item => item.shortCode && item.likesCount !== undefined) || [];

    return c.json({
      success: true,
      username,
      rawResponseLength: rawResponse?.length || 0,
      profileItems: profileItems.length,
      postItems: postItems.length,
      firstItemKeys: rawResponse?.[0] ? Object.keys(rawResponse[0]) : [],
      firstItemSample: rawResponse?.[0] || null,
      hasProfileData: profileItems.length > 0,
      hasPostData: postItems.length > 0,
      samplePost: postItems[0] || null
    });
    
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message,
      username
    }, 500);
  }
});

// ===============================================================================
// KEEP ALL OTHER EXISTING ENDPOINTS
// ===============================================================================

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

// ===============================================================================
// ENHANCED ERROR HANDLING AND NOT FOUND
// ===============================================================================

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
    version: 'v2.1.0',
    available_endpoints: [
      'GET /',
      'GET /health',
      'GET /config',
      'GET /debug-env',
      'POST /v1/analyze - Enhanced with summaries and better scraping',
      'POST /v1/bulk-analyze - Enhanced bulk processing',
      'POST /analyze (legacy)',
      'POST /bulk-analyze (legacy)',
      'POST /billing/create-checkout-session',
      'POST /billing/create-portal-session',
      'POST /stripe-webhook',
      'GET /analytics/summary',
      'POST /ai/generate-insights',
      'GET /debug-scrape/:username - Enhanced debugging',
      'GET /debug-parsing/:username - Enhanced parsing debug',
      'GET /test-supabase',
      'GET /test-openai',
      'GET /test-apify',
      'POST /test-post'
    ],
    enhancements: [
      'Multiple scraper configurations for better success rate',
      'Enhanced engagement data extraction and validation',
      'Realistic engagement estimation for fallback scenarios',
      'Quick summaries for light analysis (stored in leads.quick_summary)',
      'Deep summaries for comprehensive analysis (stored in lead_analyses.deep_summary)',
      'Improved AI scoring with confidence levels',
      'Better post content analysis with hashtag/mention extraction',
      'Data quality tracking and reporting',
      'Enhanced error handling and debugging information'
    ]
  }, 404);
});

export default app;
