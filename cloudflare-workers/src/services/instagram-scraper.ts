import type { ProfileData, AnalysisType, Env, PostData, EngagementData } from '../types/interfaces.js';
import { logger } from '../utils/logger.js';
import { callWithRetry } from '../utils/helpers.js';
import { validateProfileData, extractHashtags, extractMentions } from '../utils/validation.js';
import { getApiKey } from './enhanced-config-manager.js';

export async function scrapeInstagramProfile(username: string, analysisType: AnalysisType, env: Env): Promise<ProfileData> {
  // Get Apify API token from centralized config
  const apifyToken = await getApiKey('APIFY_API_TOKEN', env);
  
  if (!apifyToken) {
    throw new Error('Profile scraping service not configured');
  }

  logger('info', 'Starting profile scraping', { username, analysisType });

  try {
    if (analysisType === 'light') {
      logger('info', 'Using light scraper for basic profile data');
      
      const lightInput = {
        usernames: [username],
        resultsType: "details",
        resultsLimit: 1
      };

const profileResponse = await callWithRetry(
        `https://api.apify.com/v2/acts/dSCLg0C3YEZ83HzYX/run-sync-get-dataset-items?token=${apifyToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lightInput)
        },
        3, 2000, 30000
      );

      logger('info', 'Light scraper raw response', { 
        isArray: Array.isArray(profileResponse),
        length: profileResponse?.length,
        firstItem: profileResponse?.[0] ? Object.keys(profileResponse[0]).slice(0, 10) : 'undefined',
        responseType: typeof profileResponse
      });

      if (!profileResponse || !Array.isArray(profileResponse) || profileResponse.length === 0) {
        throw new Error('Profile not found or private');
      }

      const profileData = validateProfileData(profileResponse[0], 'light');
      profileData.scraperUsed = 'light';
      profileData.dataQuality = 'medium';
      
      return profileData;

    } else if (analysisType === 'deep') {
      logger('info', 'Deep analysis: Starting with deep scraper configurations');
      
      const deepConfigs = [
        {
          name: 'primary_deep',
          input: {
            directUrls: [`https://instagram.com/${username}/`],
            resultsLimit: 12,
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
            directUrls: [`https://www.instagram.com/${username}/`],
            resultsLimit: 10,
            addParentData: true,
            enhanceUserSearchWithFacebookPage: false,
            onlyPostsNewerThan: "2023-06-01",
            resultsType: "details"
          }
        }
      ];

      let lastError: Error | null = null;

      for (const config of deepConfigs) {
        try {
          logger('info', `Trying deep scraper config: ${config.name}`, { username });
          
          const deepResponse = await callWithRetry(
            `https://api.apify.com/v2/acts/shu8hvrXbJbY3Eb9W/run-sync-get-dataset-items?token=${apifyToken}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(config.input)
            },
            2, 3000, 60000
          );

          logger('info', `Deep scraper (${config.name}) response received`, { 
            responseLength: deepResponse?.length,
            hasData: !!deepResponse?.[0]
          });

          if (deepResponse && Array.isArray(deepResponse) && deepResponse.length > 0) {
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
              hasRealEngagement: !!profileData.engagement,
              avgLikes: profileData.engagement?.avgLikes || 'N/A',
              avgComments: profileData.engagement?.avgComments || 'N/A',
              engagementRate: profileData.engagement?.engagementRate || 'N/A',
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

      // Fallback to light scraper with NO fake engagement data
      logger('warn', 'All deep scraper configs failed, falling back to light scraper - NO ENGAGEMENT DATA');
      
      const lightInput = {
        usernames: [username],
        resultsType: "details",
        resultsLimit: 1
      };

      const lightResponse = await callWithRetry(
        `https://api.apify.com/v2/acts/dSCLg0C3YEZ83HzYX/run-sync-get-dataset-items?token=${apifyToken}`,
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
      
      const fallbackProfile: ProfileData = {
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
        isBusinessAccount: Boolean(profile.isBusinessAccount),
        latestPosts: [],
        engagement: undefined, // NO FAKE DATA - explicitly undefined
        scraperUsed: 'light_fallback',
        dataQuality: 'low'
      };

      logger('info', 'Fallback scraping completed - NO ENGAGEMENT DATA AVAILABLE', {
        username: fallbackProfile.username,
        followers: fallbackProfile.followersCount,
        dataNote: 'Real engagement data could not be scraped'
      });

      return fallbackProfile;

} else if (analysisType === 'xray') {
      logger('info', 'X-Ray analysis: Using deep scraper for comprehensive data');
      // X-ray uses same scraping as deep but different AI analysis
      return scrapeInstagramProfile(username, 'deep', env);
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
