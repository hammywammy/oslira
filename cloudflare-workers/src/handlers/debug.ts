import type { Context } from 'hono';
import { generateRequestId, logger } from '../utils/logger.js';
import { callWithRetry } from '../utils/helpers.js';
import { scrapeInstagramProfile } from '../services/instagram-scraper.js';
import { validateProfileData } from '../utils/validation.js';
import { getApiKey } from '../services/enhanced-config-manager.js';
import type { Env } from '../types/interfaces.js';

export async function handleDebugEngagement(c: Context): Promise<Response> {
  const username = c.req.param('username');
  
  try {
    logger('info', 'Starting engagement calculation debug test', { username });
    
    // GET APIFY TOKEN FROM AWS INTEGRATION
    const apifyToken = await getApiKey('APIFY_API_TOKEN', c.env);
    
    if (!apifyToken) {
      return c.json({
        success: false,
        error: 'Apify token not configured',
        username
      });
    }
    
    const deepInput = {
      directUrls: [`https://instagram.com/${username}/`],
      resultsLimit: 10,
      addParentData: false,
      enhanceUserSearchWithFacebookPage: false,
      onlyPostsNewerThan: "2024-01-01",
      resultsType: "details",
      searchType: "hashtag"
    };

    const rawResponse = await callWithRetry(
      `https://api.apify.com/v2/acts/shu8hvrXbJbY3Eb9W/run-sync-get-dataset-items?token=${apifyToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deepInput)
      },
      1, 1000, 30000
    );

    if (!rawResponse || !Array.isArray(rawResponse)) {
      return c.json({
        success: false,
        error: 'No response or invalid response format',
        username
      });
    }

    // Detailed analysis of the raw response
    const analysisResults = {
      totalItems: rawResponse.length,
      itemTypes: {},
      profileItems: [],
      postItems: [],
      fieldAnalysis: {},
      engagementFieldAnalysis: {}
    };

    // Analyze each item in the response
    rawResponse.forEach((item, index) => {
      const itemType = item.type || item.__typename || 'unknown';
      analysisResults.itemTypes[itemType] = (analysisResults.itemTypes[itemType] || 0) + 1;

      // Profile items analysis
      if (item.username || item.ownerUsername) {
        analysisResults.profileItems.push({
          index,
          username: item.username || item.ownerUsername,
          followersCount: item.followersCount,
          followingCount: item.followingCount,
          postsCount: item.postsCount,
          isPrivate: item.isPrivate,
          isVerified: item.isVerified
        });
      }

      // Post items analysis
      if (item.shortCode && item.likesCount !== undefined) {
        analysisResults.postItems.push({
          index,
          shortCode: item.shortCode,
          likesCount: item.likesCount,
          commentsCount: item.commentsCount,
          caption: item.caption?.length || 0,
          timestamp: item.timestamp
        });
      }

      // Field analysis for debugging
      Object.keys(item).forEach(field => {
        if (!analysisResults.fieldAnalysis[field]) {
          analysisResults.fieldAnalysis[field] = {
            count: 0,
            sampleValue: item[field],
            type: typeof item[field]
          };
        }
        analysisResults.fieldAnalysis[field].count++;
      });

      // Engagement field analysis
      ['likesCount', 'commentsCount', 'viewsCount', 'playsCount'].forEach(field => {
        if (item[field] !== undefined) {
          if (!analysisResults.engagementFieldAnalysis[field]) {
            analysisResults.engagementFieldAnalysis[field] = {
              count: 0,
              total: 0,
              max: 0,
              min: Infinity
            };
          }
          const value = parseInt(item[field]) || 0;
          analysisResults.engagementFieldAnalysis[field].count++;
          analysisResults.engagementFieldAnalysis[field].total += value;
          analysisResults.engagementFieldAnalysis[field].max = Math.max(analysisResults.engagementFieldAnalysis[field].max, value);
          analysisResults.engagementFieldAnalysis[field].min = Math.min(analysisResults.engagementFieldAnalysis[field].min, value);
        }
      });
    });

    // Calculate averages
    Object.keys(analysisResults.engagementFieldAnalysis).forEach(field => {
      const fieldData = analysisResults.engagementFieldAnalysis[field];
      fieldData.average = fieldData.count > 0 ? Math.round(fieldData.total / fieldData.count) : 0;
    });

    return c.json({
      success: true,
      username,
      analysis: analysisResults,
      recommendations: [
        `Found ${analysisResults.profileItems.length} profile items and ${analysisResults.postItems.length} post items`,
        analysisResults.postItems.length >= 3 ? 'Good: Sufficient posts for analysis' : 'Warning: Low post count may affect analysis quality',
        Object.keys(analysisResults.engagementFieldAnalysis).length > 0 ? 'Good: Engagement data available' : 'Warning: No engagement data found'
      ]
    });

  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
      username,
      stack: error.stack
    }, 500);
  }
}

export async function handleDebugProfile(c: Context): Promise<Response> {
  const username = c.req.param('username');
  const analysisType = (c.req.query('type') || 'light') as 'light' | 'deep';
  
  try {
    logger('info', 'Starting debug profile scraping', { username, analysisType });
    
    const profileData = await scrapeInstagramProfile(username, analysisType, c.env);
    
    return c.json({
      success: true,
      username,
      analysisType,
      profileData: {
        username: profileData.username,
        followersCount: profileData.followersCount,
        followingCount: profileData.followingCount,
        postsCount: profileData.postsCount,
        isPrivate: profileData.isPrivate,
        isVerified: profileData.isVerified,
        biography: profileData.biography?.length || 0,
        hasProfilePicture: !!profileData.profilePicUrl,
        hasLatestPosts: !profileData.latestPosts,
        dataQuality: profileData.dataQuality,
        scraperUsed: profileData.scraperUsed,
        noFakeData: true,
        manualCalculation: true
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
}

export async function handleDebugParsing(c: Context): Promise<Response> {
  const username = c.req.param('username');
  
  try {
    // GET APIFY TOKEN FROM AWS INTEGRATION
    const apifyToken = await getApiKey('APIFY_API_TOKEN', c.env);
    
    if (!apifyToken) {
      return c.json({
        success: false,
        error: 'Apify token not configured',
        username
      });
    }
    
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
      `https://api.apify.com/v2/acts/shu8hvrXbJbY3Eb9W/run-sync-get-dataset-items?token=${apifyToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deepInput)
      },
      1, 1000, 30000
    );

    const profileItems = rawResponse?.filter(item => item.username || item.ownerUsername) || [];
    const postItems = rawResponse?.filter(item => item.shortCode && item.likesCount !== undefined) || [];

    // Manual engagement calculation test
    let engagementTest = null;
    if (postItems.length > 0) {
      const validPosts = postItems.filter(post => {
        const likes = parseInt(post.likesCount) || 0;
        const comments = parseInt(post.commentsCount) || 0;
        return likes > 0 || comments > 0;
      });

      if (validPosts.length > 0) {
        const totalLikes = validPosts.reduce((sum, post) => sum + (parseInt(post.likesCount) || 0), 0);
        const totalComments = validPosts.reduce((sum, post) => sum + (parseInt(post.commentsCount) || 0), 0);
        const avgLikes = Math.round(totalLikes / validPosts.length);
        const avgComments = Math.round(totalComments / validPosts.length);
        const totalEngagement = avgLikes + avgComments;

        engagementTest = {
          postsAnalyzed: validPosts.length,
          totalLikes,
          totalComments,
          avgLikes,
          avgComments,
          totalEngagement,
          calculation: 'manual_as_specified'
        };
      }
    }

    return c.json({
      success: true,
      username,
      rawResponseLength: rawResponse?.length || 0,
      profileItems: profileItems.length,
      postItems: postItems.length,
      firstItemKeys: rawResponse?.[0] ? Object.keys(rawResponse[0]) : [],
      sampleProfileItem: profileItems[0] || null,
      samplePostItem: postItems[0] || null,
      engagementTest,
      debugInfo: {
        apifyTokenConfigured: !!apifyToken,
        rawResponseType: typeof rawResponse,
        hasData: !!rawResponse && rawResponse.length > 0
      }
    });

  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
      username,
      stack: error.stack
    }, 500);
  }
}
