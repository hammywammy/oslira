import type { Env } from '../types/interfaces.js';

export interface ScraperConfig {
  name: string;
  endpoint: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  input: (username: string) => any;
  priority: number; // Lower = higher priority
}

export const LIGHT_SCRAPER_CONFIGS: ScraperConfig[] = [
  {
    name: 'light_primary',
    endpoint: 'dSCLg0C3YEZ83HzYX',
    timeout: 30000,
    maxRetries: 2,
    retryDelay: 2000,
    priority: 1,
    input: (username: string) => ({
      usernames: [username],
      resultsType: "details",
      resultsLimit: 1,
      addParentData: false
    })
  },
  {
    name: 'light_secondary',
    endpoint: 'shu8hvrXbJbY3Eb9W',
    timeout: 30000,
    maxRetries: 2,
    retryDelay: 3000,
    priority: 2,
    input: (username: string) => ({
      usernames: [username],
      resultsType: "details",
      resultsLimit: 1,
      addParentData: false
    })
  }
];

export const DEEP_SCRAPER_CONFIGS: ScraperConfig[] = [
{
  name: 'deep_primary',
  endpoint: 'shu8hvrXbJbY3Eb9W',
  timeout: 60000,
  maxRetries: 2,
  retryDelay: 3000,
  priority: 1,
  input: (username: string) => ({
    addParentData: false,
    directUrls: [`https://instagram.com/${username}/`],
    enhanceUserSearchWithFacebookPage: false,
    isUserReelFeedURL: false,
    isUserTaggedFeedURL: false,
    resultsLimit: 12,
    resultsType: "details",
    searchType: "hashtag"
  })
},
    {
    name: 'deep_secondary',
    endpoint: 'dSCLg0C3YEZ83HzYX',
    timeout: 90000,
    maxRetries: 1,
    retryDelay: 8000,
    priority: 2,
    input: (username: string) => ({
      usernames: [username],
      resultsType: "details",
      resultsLimit: 1,
      addParentData: false
    })
  }
];

export const XRAY_SCRAPER_CONFIGS: ScraperConfig[] = [
{
  name: 'xray_primary',
  endpoint: 'shu8hvrXbJbY3Eb9W',
  timeout: 120000,
  maxRetries: 1,
  retryDelay: 10000,
  priority: 1,
  input: (username: string) => ({
    addParentData: false,
    directUrls: [`https://instagram.com/${username}/`],
    enhanceUserSearchWithFacebookPage: false,
    isUserReelFeedURL: false,
    isUserTaggedFeedURL: false,
    resultsLimit: 50,
    resultsType: "details",
    searchType: "hashtag"
  })
},
  {
    name: 'xray_secondary',
    endpoint: 'dSCLg0C3YEZ83HzYX',
    timeout: 90000,
    maxRetries: 1,
    retryDelay: 8000,
    priority: 2,
    input: (username: string) => ({
      usernames: [username],
      resultsType: "details",
      resultsLimit: 1,
      addParentData: false
    })
  }
];

// API Endpoints and Base URLs
export const APIFY_BASE_URL = 'https://api.apify.com/v2/acts';
export const APIFY_RUN_SYNC_ENDPOINT = '/run-sync-get-dataset-items';

export function buildScraperUrl(endpoint: string, token: string): string {
  // Handle different endpoint formats
  if (endpoint.includes('/')) {
    // Full actor path (e.g., 'apidojo/instagram-profile-scraper')
    return `${APIFY_BASE_URL}/${endpoint}${APIFY_RUN_SYNC_ENDPOINT}?token=${token}`;
  } else {
    // Actor ID (e.g., 'dSCLg0C3YEZ83HzYX')
    return `${APIFY_BASE_URL}/${endpoint}${APIFY_RUN_SYNC_ENDPOINT}?token=${token}`;
  }
}

export function getScraperConfigs(analysisType: 'light' | 'deep' | 'xray'): ScraperConfig[] {
  switch (analysisType) {
    case 'light':
      return [LIGHT_SCRAPER_CONFIG];
    case 'deep':
      return DEEP_SCRAPER_CONFIGS.sort((a, b) => a.priority - b.priority);
    case 'xray':
      return [...XRAY_SCRAPER_CONFIGS, ...DEEP_SCRAPER_CONFIGS].sort((a, b) => a.priority - b.priority);
    default:
      return [LIGHT_SCRAPER_CONFIG];
  }
}

// Request Options Builder
export function buildRequestOptions(config: ScraperConfig, username: string): RequestInit {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'InstagramAnalyzer/2.0',
      'Accept': 'application/json'
    },
    body: JSON.stringify(config.input(username)),
    signal: AbortSignal.timeout(config.timeout)
  };
}

// Validation Helpers
export function validateScraperResponse(response: any, expectedType: 'light' | 'deep' | 'xray'): boolean {
  if (!response || !Array.isArray(response) || response.length === 0) {
    return false;
  }

  const firstItem = response[0];
  
  // Basic validation - must have username
  if (!firstItem.username && !firstItem.handle) {
    return false;
  }

  // Type-specific validation
  switch (expectedType) {
    case 'light':
      return true; // Basic response is enough for light
    case 'deep':
      // Should have posts or engagement data
      return firstItem.posts || firstItem.latestPosts || firstItem.postsCount > 0;
    case 'xray':
      // Should have comprehensive data
      return (firstItem.posts || firstItem.latestPosts) && 
             (firstItem.followersCount !== undefined || firstItem.followers !== undefined);
    default:
      return true;
  }
}

// Error Classification
export const SCRAPER_ERROR_PATTERNS = {
  NOT_FOUND: [
    'not found',
    '404',
    'user not found',
    'profile not found',
    'username not found'
  ],
  PRIVATE: [
    'private',
    '403',
    'private profile',
    'private account',
    'access denied'
  ],
  RATE_LIMITED: [
    'rate limit',
    '429',
    'too many requests',
    'temporarily blocked',
    'quota exceeded'
  ],
  TIMEOUT: [
    'timeout',
    'timed out',
    'request timeout',
    'connection timeout'
  ],
  SCRAPER_ERROR: [
    'scraper failed',
    'actor failed',
    'apify error',
    'no data extracted'
  ]
};

export function classifyScraperError(error: any): keyof typeof SCRAPER_ERROR_PATTERNS | 'UNKNOWN' {
  const errorMessage = (error.message || error.toString()).toLowerCase();
  
  for (const [category, patterns] of Object.entries(SCRAPER_ERROR_PATTERNS)) {
    if (patterns.some(pattern => errorMessage.includes(pattern))) {
      return category as keyof typeof SCRAPER_ERROR_PATTERNS;
    }
  }
  
  return 'UNKNOWN';
}

// Cost Calculation (if needed for monitoring)
export const SCRAPER_COSTS = {
  light: { compute_units: 0.1, credits: 1 },
  deep: { compute_units: 0.3, credits: 2 },
  xray: { compute_units: 0.8, credits: 3 }
};

export function calculateScraperCost(analysisType: 'light' | 'deep' | 'xray', scraperUsed: string): number {
  const baseCost = SCRAPER_COSTS[analysisType].compute_units;
  
  // Add cost multiplier for backup scrapers (they're usually less efficient)
  const multiplier = scraperUsed.includes('backup') || scraperUsed.includes('fallback') ? 1.5 : 1.0;
  
  return baseCost * multiplier;
}
