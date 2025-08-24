# DATA_CONTRACT.md
**DO NOT CHANGE THESE STRUCTURES WITHOUT UPDATING THIS FILE**

---

## **# SUPABASE DATABASE SCHEMA**

### **users** (RLS ✅)
- `id` (uuid, PK, auth.uid())
- `email` (text, unique, not null)
- `credits` (integer, default: 5)
- `subscription_plan` (text, default: 'free')
- `subscription_status` (text, default: 'active')
- `stripe_customer_id` (text, nullable)
- `onboarding_completed` (boolean, default: false)
- `is_admin` (boolean, default: false)
- `created_at`, `updated_at`, `last_sign_in_at`

### **business_profiles** (RLS ✅)
- `id` (uuid, PK)
- `user_id` (uuid, FK → users.id)
- `business_name` (text, not null)
- `business_niche` (text, not null)
- `target_audience` (text, not null)
- `target_problems` (text, not null)
- `value_proposition` (text, not null)
- `communication_style` (text, not null)
- `message_example` (text, not null)
- `success_outcome` (text, not null)
- `call_to_action` (text, not null)
- `is_active` (boolean, default: true)

### **leads** (RLS ✅)
- `id` (uuid, PK)
- `user_id` (uuid, FK → users.id)
- `business_id` (uuid, FK → business_profiles.id)
- `username` (text, not null)
- `full_name` (text, nullable)
- `bio` (text, nullable)
- `followers_count` (integer, default: 0)
- `profile_pic_url` (text, nullable)
- `platform` (text, default: 'instagram')
- `analysis_type` (text, default: 'light')
- `score` (integer, not null)
- `profile_url` (text, nullable)
- `quick_summary` (text, nullable)
- `posts_count`, `following_count`, `is_private`, `is_verified`, `is_business_account`

### **lead_analyses** (RLS ✅)
- `id` (uuid, PK)
- `user_id` (uuid, FK → users.id)
- `business_id` (uuid, FK → business_profiles.id)
- `lead_id` (uuid, FK → leads.id)
- `username` (text, not null)
- `score` (integer, default: 0)
- `deep_summary` (text, nullable)
- `engagement_score` (integer, default: 0)
- `score_niche_fit` (integer, default: 0)
- `score_total` (integer, default: 0)
- `outreach_message` (text, nullable)
- `selling_points` (text[], default: {})
- `latest_posts` (jsonb, default: '[]')
- `engagement_data` (jsonb, default: '{}')
- `avg_likes`, `avg_comments` (integer, nullable)
- `engagement_rate` (numeric, nullable)
- `audience_quality` (text, default: 'Medium')
- `engagement_insights` (text, nullable)

### **credit_transactions** (RLS ✅)
- `id` (uuid, PK)
- `user_id` (uuid, FK → users.id)
- `lead_id` (uuid, FK → leads.id, nullable)
- `amount` (integer, not null)
- `type` (text, not null)
- `description` (text, not null)

---

## **# API RESPONSE FORMATS**

### **Worker → Frontend Standard Response**
```typescript
{
  success: boolean,
  data?: any,
  error?: string,
  requestId: string,
  timestamp: string
}
```

### **Analysis Success Response**
```typescript
{
  success: true,
  data: {
    lead: LeadData,
    analysis?: AnalysisData,  // Only for deep
    creditsRemaining: number,
    processingTime: number
  },
  requestId: string
}
```

### **Error Response Format**
```typescript
{
  success: false,
  error: string,
  requestId: string,
  statusCode?: number
}
```

---

## **# APIFY SCRAPER CONTRACTS**

### **Light Scraper (dSCLg0C3YEZ83HzYX)**
**Input:**
```typescript
{
  usernames: [string],           // Array format required
  resultsType: "details",        // Fixed value
  resultsLimit: 1               // Always 1 for light
}
```

**Output:**
```typescript
{
  username: string,
  displayName: string,
  bio: string,
  followersCount: number,
  followingCount: number,
  postsCount: number,
  isVerified: boolean,
  isPrivate: boolean,
  profilePicUrl: string,
  externalUrl: string,
  isBusinessAccount?: boolean,
  latestPosts: [],              // Empty for light
  scraperUsed?: string,
  dataQuality?: 'medium'
}
```

### **Deep Scraper (shu8hvrXbJbY3Eb9W)**
**Input:**
```typescript
{
  directUrls: [`https://instagram.com/${username}/`],
  resultsLimit: 10-12,          // Number of posts
  addParentData: boolean,
  enhanceUserSearchWithFacebookPage: false,
  onlyPostsNewerThan: "2024-01-01",
  resultsType: "details"
}
```

**Output:**
```typescript
{
  username: string,
  displayName: string,
  bio: string,
  followersCount: number,
  followingCount: number,
  postsCount: number,
  isVerified: boolean,
  isPrivate: boolean,
  profilePicUrl: string,
  externalUrl: string,
  latestPosts: PostData[],      // Populated array
  engagement?: {
    avgLikes: number,
    avgComments: number,
    engagementRate: number,
    totalEngagement: number,
    postsAnalyzed: number
  },
  dataQuality?: 'high' | 'medium' | 'low'
}
```

---

## **# BUSINESS LOGIC CONSTANTS**

### **Credit Costs**
- **Light Analysis:** 1 credit
- **Deep Analysis:** 2 credits
- **Bulk Processing:** Same per-analysis rates

### **Analysis Types**
```typescript
const ANALYSIS_TYPES = {
  LIGHT: {
    cost: 1,
    timeout: 30000,
    scraper: 'dSCLg0C3YEZ83HzYX',
    includes: ['basic_profile', 'quick_summary'],
    excludes: ['engagement_data', 'outreach_messages']
  },
  DEEP: {
    cost: 2,
    timeout: 60000,
    scraper: 'shu8hvrXbJbY3Eb9W',
    includes: ['full_profile', 'posts', 'engagement', 'ai_insights'],
    fallback: 'light_scraper_if_deep_fails'
  }
}
```

### **Subscription Limits**
```typescript
const SUBSCRIPTION_TIERS = {
  STARTER: { credits: 40, bulk: false },
  GROWTH: { credits: 100, bulk_limit: 100 },
  PROFESSIONAL: { credits: 500, bulk_limit: 500 },
  ENTERPRISE: { credits: 2000, bulk_limit: null }
}
```

### **Rate Limits**
- **Bulk Upload Max:** 50 usernames per upload
- **Auth Attempts:** 5 per 5 minutes
- **Staging Access:** 5 per 10 minutes

---

## **# CONFIGURATION KEYS**

### **AWS Secrets Manager Keys**
- **Oslira/OPENAI_API_KEY**
- **Oslira/CLAUDE_API_KEY**
- **Oslira/APIFY_API_TOKEN**
- **Oslira/STRIPE_SECRET_KEY**
- **Oslira/STRIPE_WEBHOOK_SECRET**
- **Oslira/SUPABASE_SERVICE_ROLE**
- **Oslira/SUPABASE_ANON_KEY**

### **Netlify Environment Variables**
- **SUPABASE_URL**
- **SUPABASE_ANON_KEY**
- **WORKER_URL**
- **ADMIN_TOKEN**
- **STAGING_PASSWORD**
- **STRIPE_PUBLISHABLE_KEY**

### **Supabase app_config Table**
- **key_name** (text)
- **key_value** (text, base64 encoded)
- **environment** ('production' | 'staging')

---

## **# ENVIRONMENT ROUTING**

### **Domain → Worker Mapping**
```typescript
const ENVIRONMENT_ROUTING = {
  'oslira.com': {
    worker: 'https://api.oslira.com',
    worker_name: 'ai-outreach-api',
    env: 'production'
  },
  'osliratest.netlify.app': {
    worker: 'https://api-staging.oslira.com',
    worker_name: 'oslira-api-stg',
    env: 'staging'
  }
}
```

### **Feature Flags by Environment**
```typescript
const FEATURES = {
  production: {
    DEBUG_MODE: false,
    CAMPAIGNS: true,
    CONSOLE_LOGS: false
  },
  staging: {
    DEBUG_MODE: true,
    CAMPAIGNS: false,
    CONSOLE_LOGS: false,
    STAGING_PASSWORD: true
  }
}
```

---

## **# FRONTEND DATA STRUCTURES**

### **Window Objects**
- **window.EnvConfig** - Environment configuration class
- **window.OsliraApp** - Main application object
- **window.supabase** - Supabase client instance

### **LocalStorage Keys**
- **supabase.auth.token** - JWT session token
- **stg_auth_[hash]** - Staging authentication
- **stg_attempts_[hash]** - Rate limiting data

### **Dashboard State Management**
```typescript
const DASHBOARD_STATE = {
  currentUser: User | null,
  leads: Lead[],
  businessProfile: BusinessProfile | null,
  analysisQueue: AnalysisRequest[],
  realtimeSubscription: Subscription | null
}
```

---

**⚠️ CRITICAL:** Any changes to these structures require updating this contract and testing all affected components.
