import { ScraperErrorHandler, withScraperRetry } from '../utils/scraper-error-handler.js';
import { LIGHT_SCRAPER_CONFIG, DEEP_SCRAPER_CONFIGS, buildScraperUrl } from './scraper-configs.js';

export async function scrapeInstagramProfile(username: string, analysisType: AnalysisType, env: Env): Promise<ProfileData> {
  const apifyToken = await getApiKey('APIFY_API_TOKEN', env);
  if (!apifyToken) {
    throw new Error('Profile scraping service not configured');
  }

  logger('info', 'Starting profile scraping', { username, analysisType });

  try {
    if (analysisType === 'light') {
      return await scrapeLightProfile(username, apifyToken);
    } 
    
    if (analysisType === 'deep' || analysisType === 'xray') {
      return await scrapeDeepProfile(username, apifyToken);
    }

  } catch (error: any) {
    const transformedError = ScraperErrorHandler.transformError(error, username);
    logger('error', 'All scraping methods failed', { username, error: transformedError.message });
    throw transformedError;
  }
}

async function scrapeLightProfile(username: string, token: string): Promise<ProfileData> {
  const url = buildScraperUrl(LIGHT_SCRAPER_CONFIG.endpoint, token);
  
  const response = await callWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(LIGHT_SCRAPER_CONFIG.input(username))
  }, 3, 2000, 30000);

  if (!response || !Array.isArray(response) || response.length === 0) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  const profileData = validateProfileData(response[0], 'light');
  profileData.scraperUsed = 'light';
  profileData.dataQuality = 'medium';
  
  return profileData;
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
