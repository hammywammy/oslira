import { ScraperErrorHandler, withScraperRetry } from '../utils/scraper-error-handler.js';
import { LIGHT_SCRAPER_CONFIGS, DEEP_SCRAPER_CONFIGS, buildScraperUrl } from './scraper-configs.js';
import { callWithRetry } from '../utils/helpers.js';
import { validateProfileData } from '../utils/validation.js';
import { getApiKey } from './enhanced-config-manager.js';
import { logger } from '../utils/logger.js';
import type { AnalysisType, Env, ProfileData } from '../types/interfaces.js';

export async function scrapeInstagramProfile(username: string, analysisType: AnalysisType, env: Env): Promise<ProfileData> {
  // Check R2 cache first for profile data
// Use username-only cache key - profile data is same regardless of analysis type
const cacheKey = `profile:${username}`;
  
  try {
    if (env.R2_CACHE_BUCKET) {
      const cached = await env.R2_CACHE_BUCKET.get(cacheKey);
      if (cached) {
        const cacheData = await cached.json();
        if (cacheData.expires > Date.now()) {
          logger('info', 'Profile cache hit', { username, analysisType });
          return cacheData.profile;
        }
      }
    }
  } catch (error: any) {
    logger('warn', 'Cache read failed, continuing with scraping', { error: error.message });
  }

  const apifyToken = await getApiKey('APIFY_API_TOKEN', env);
  if (!apifyToken) {
    throw new Error('Profile scraping service not configured');
  }

  logger('info', 'Starting profile scraping', { username, analysisType });
let profileData: ProfileData;

try {
  if (analysisType === 'light') {
    profileData = await scrapeWithConfigs(username, apifyToken, LIGHT_SCRAPER_CONFIGS);
  } else if (analysisType === 'deep' || analysisType === 'xray') {
    profileData = await scrapeDeepProfile(username, apifyToken);
  } else {
    throw new Error(`Unsupported analysis type: ${analysisType}`);
  }

  // Cache profile for ALL analysis types
  try {
// Use longer TTL for higher-quality data
const cacheTTL = analysisType === 'xray' ? 8 * 60 * 60 * 1000 : // 8 hours - highest quality
                 analysisType === 'deep' ? 6 * 60 * 60 * 1000 :  // 6 hours - medium quality
                 4 * 60 * 60 * 1000; // 4 hours - basic quality
    
if (env.R2_CACHE_BUCKET) {
  // Check if we already have cached data for this profile
  let existingCache = null;
  try {
    const existing = await env.R2_CACHE_BUCKET.get(cacheKey);
    if (existing) {
      existingCache = await existing.json();
    }
  } catch (e) {
    // Ignore cache read errors
  }

  // Use longest TTL if we're upgrading the cache (e.g., light -> deep -> xray)
  const analysisLevel = analysisType === 'xray' ? 3 : analysisType === 'deep' ? 2 : 1;
  const existingLevel = existingCache?.analysis_level || 0;
  const useNewTTL = analysisLevel >= existingLevel;

const cacheData = {
  profile: profileData,
  expires: Date.now() + cacheTTL,
  cached_at: new Date().toISOString(),
  analysis_type: analysisType,
  username: profileData.username,
  followers: profileData.followersCount,
  data_quality: profileData.dataQuality,
  scraper_used: profileData.scraperUsed
};

// Debug what we're caching
logger('info', 'Preparing to cache profile data', {
  username,
  profileDataKeys: Object.keys(profileData),
  profileDataSize: JSON.stringify(profileData).length,
  cacheDataSize: JSON.stringify(cacheData).length,
  hasProfile: !!profileData,
  profileUsername: profileData?.username,
  profileFollowers: profileData?.followersCount
});

const cachePayload = JSON.stringify(cacheData);
logger('info', 'Cache payload prepared', {
  payloadSize: cachePayload.length,
  payloadPreview: cachePayload.substring(0, 200)
});

await env.R2_CACHE_BUCKET.put(cacheKey, cachePayload);
      logger('info', 'Profile cached successfully', { 
        username, 
        analysisType, 
        ttl_hours: cacheTTL / (60 * 60 * 1000),
        cache_key: cacheKey
      });
    }
  } catch (cacheError: any) {
    logger('warn', 'Profile caching failed', { 
      username,
      analysisType,
      error: cacheError.message 
    });
  }

  return profileData;

} catch (error: any) {
  const transformedError = ScraperErrorHandler.transformError(error, username);
  logger('error', 'All scraping methods failed', { username, error: transformedError.message });
  throw transformedError;
}

  throw new Error(`Unsupported analysis type: ${analysisType}`);
}

async function scrapeWithConfigs(username: string, token: string, configs: ScraperConfig[]): Promise<ProfileData> {
  const scraperAttempts = configs.map(config => 
    async () => {
      const url = buildScraperUrl(config.endpoint, token);
      const response = await callWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.input(username))
      }, config.maxRetries, config.retryDelay, config.timeout);

      if (!response || !Array.isArray(response) || response.length === 0) {
        throw new Error(`${config.name} returned no usable data`);
      }

      const profileData = validateProfileData(response[0], 'light');
      profileData.scraperUsed = config.name;
      profileData.dataQuality = 'medium';
      
      return profileData;
    }
  );

  return await withScraperRetry(scraperAttempts, username);
}

async function scrapeDeepProfile(username: string, token: string): Promise<ProfileData> {
  // Create retry attempts for each deep scraper config
  const scraperAttempts = DEEP_SCRAPER_CONFIGS.map(config => 
    async () => {
      const url = buildScraperUrl(config.endpoint, token);
      const response = await callWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.input(username))
      }, 2, 3000, 60000);

      if (!response || !Array.isArray(response) || response.length === 0) {
        throw new Error(`${config.name} returned no usable data`);
      }

      const profileData = validateProfileData(response, 'deep');
      profileData.scraperUsed = config.name;
      profileData.dataQuality = response.filter(item => item.shortCode).length >= 3 ? 'high' : 'medium';
      
      return profileData;
    }
  );

// Add light scraper fallback
  scraperAttempts.push(async () => {
    logger('warn', 'All deep scrapers failed, using light fallback with NO ENGAGEMENT DATA');
    const lightProfile = await scrapeLightProfile(username, token);
    return {
      ...lightProfile,
      engagement: undefined, // Explicitly no fake data
      scraperUsed: 'light_fallback',
      dataQuality: 'low'
    };
  });

  return await withScraperRetry(scraperAttempts, username);
}

async function scrapeLightProfile(username: string, token: string): Promise<ProfileData> {
  const scraperAttempts = LIGHT_SCRAPER_CONFIGS.map(config => 
    async () => {
      const url = buildScraperUrl(config.endpoint, token);
      const response = await callWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.input(username))
      }, config.maxRetries, config.retryDelay, config.timeout);

      if (!response || !Array.isArray(response) || response.length === 0) {
        throw new Error(`${config.name} returned no usable data`);
      }

      const profileData = validateProfileData(response[0], 'light');
      profileData.scraperUsed = config.name;
      profileData.dataQuality = 'medium';
      
      return profileData;
    }
  );

  return await withScraperRetry(scraperAttempts, username);
}
