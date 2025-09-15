import { ScraperErrorHandler, withScraperRetry } from '../utils/scraper-error-handler.js';
import { LIGHT_SCRAPER_CONFIGS, DEEP_SCRAPER_CONFIGS, buildScraperUrl } from './scraper-configs.js';
import { callWithRetry } from '../utils/helpers.js';
import { validateProfileData } from '../utils/validation.js';
import { getApiKey } from './enhanced-config-manager.js';
import { logger } from '../utils/logger.js';
import type { AnalysisType, Env, ProfileData } from '../types/interfaces.js';

export async function scrapeInstagramProfile(username: string, analysisType: AnalysisType, env: Env): Promise<ProfileData> {
  // Check R2 cache first for profile data
  const cacheKey = `profile:${username}:${analysisType}`;
  
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
  } catch (error) {
    logger('warn', 'Cache read failed, continuing with scraping', { error: error.message });
  }

  const apifyToken = await getApiKey('APIFY_API_TOKEN', env);
  if (!apifyToken) {
    throw new Error('Profile scraping service not configured');
  }

  logger('info', 'Starting profile scraping', { username, analysisType });
  try {
if (analysisType === 'light') {
  return await scrapeWithConfigs(username, apifyToken, LIGHT_SCRAPER_CONFIGS);
}
    
    if (analysisType === 'deep' || analysisType === 'xray') {
      return await scrapeDeepProfile(username, apifyToken);
    }

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

  const profileData = await withScraperRetry(scraperAttempts, username);

  try {
    // Cache profile for 2-6 hours based on analysis type
    const cacheTTL = analysisType === 'light' ? 6 * 60 * 60 * 1000 : // 6 hours
                     analysisType === 'deep' ? 4 * 60 * 60 * 1000 :  // 4 hours  
                     2 * 60 * 60 * 1000; // 2 hours for xray
    
    if (env.R2_CACHE_BUCKET) {
      const cacheData = {
        profile: profileData,
        expires: Date.now() + cacheTTL,
        cached_at: new Date().toISOString()
      };
      
      await env.R2_CACHE_BUCKET.put(cacheKey, JSON.stringify(cacheData));
      logger('info', 'Profile cached successfully', { username, analysisType, ttl_hours: cacheTTL / (60 * 60 * 1000) });
    }
  } catch (error) {
    logger('warn', 'Profile caching failed', { error: error.message });
  }

  return profileData;
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
