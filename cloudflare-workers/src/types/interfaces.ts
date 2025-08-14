export interface ProfileIntelligence {
  dataRichness: number;
  analysisValue: number;
  complexityLevel: 'basic' | 'moderate' | 'advanced' | 'executive';
  recommendedModel: string;
  speedTarget: number;
  promptStrategy: 'screening' | 'standard' | 'strategic' | 'executive';
}

export interface AnalysisTier {
  tier: number;
  model: string;
  maxTokens: number;
  targetSpeed: number;
  minDataRichness: number;
  minAnalysisValue: number;
}

export interface Env {
  // Database
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE: string;
  SUPABASE_ANON_KEY: string;
  
  // AI APIs - CONSISTENT NAMING
  OPENAI_API_KEY: string;  // CHANGED FROM OPENAI_KEY
  CLAUDE_API_KEY: string;  // CHANGED FROM CLAUDE_KEY
  APIFY_API_TOKEN: string;
  
  // Payment
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  
  // URLs
  FRONTEND_URL: string;
  WORKER_URL: string;
  
  // Admin
  INTERNAL_API_TOKEN: string;
  
  // Cache & Rate Limiting (NEW)
  CACHE_TTL?: string;
  MAX_CACHE_SIZE_PER_USER?: string;
  MAX_GLOBAL_CACHE_SIZE?: string;
  RATE_LIMIT_ENABLED?: string;
  THROTTLE_THRESHOLD_REQUESTS?: string;
  THROTTLE_THRESHOLD_TOKENS?: string;
}

export interface ProfileData {
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
  isBusinessAccount?: boolean;
  latestPosts: PostData[];
  engagement?: EngagementData;
  scraperUsed?: string;
  dataQuality?: 'high' | 'medium' | 'low';
}

export interface PostData {
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

export interface EngagementData {
  avgLikes: number;
  avgComments: number;
  engagementRate: number;
  totalEngagement: number;
  postsAnalyzed: number;
  qualityScore?: number;
}

export interface BusinessProfile {
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

export interface AnalysisResult {
  score: number;
  engagement_score: number;
  niche_fit: number;
  audience_quality: string;
  engagement_insights: string;
  selling_points: string[];
  reasons: string[];
  quick_summary?: string;
  deep_summary?: string;
  confidence_level?: number;
}

export interface AnalysisRequest {
  profile_url?: string;
  username?: string;
  analysis_type: 'light' | 'deep';
  type?: 'light' | 'deep';
  business_id: string;
  user_id: string;
}

export interface User {
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

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSizePerUser: number;
  maxGlobalSize: number;
}

export interface RateLimitInfo {
  requests_remaining?: number;
  tokens_remaining?: number;
  reset_time?: string;
  provider: 'openai' | 'anthropic';
  lastUpdated: number;
}

export interface EnhancedAnalysisConfig {
  caching: {
    enabled: boolean;
    ttl: number;
    maxSizePerUser: number;
    maxGlobalSize: number;
  };
  rateLimiting: {
    enabled: boolean;
    throttleThresholds: {
      requests: number;
      tokens: number;
    };
    delays: {
      warning: number;
      critical: number;
    };
  };
  performance: {
    maxConcurrentBatch: number;
    timeoutMs: number;
    retries: number;
  };
}

export type AnalysisType = 'light' | 'deep';
