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
  isBusinessAccount?: boolean;
  latestPosts: PostData[];
  engagement?: EngagementData;
  scraperUsed?: string;
  dataQuality?: 'high' | 'medium' | 'low';
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
  postsAnalyzed: number;
  qualityScore?: number;
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
  reasons: string[];
  quick_summary?: string;
  deep_summary?: string;
  confidence_level?: number;
}

interface AnalysisRequest {
  profile_url?: string;
  username?: string;
  analysis_type: 'light' | 'deep';
  type?: 'light' | 'deep';
  business_id: string;
  user_id: string;
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
