# DATA_CONTRACT.md
**DO NOT CHANGE THESE STRUCTURES WITHOUT UPDATING THIS FILE**

---

## **# SUPABASE DATABASE SCHEMA - UPDATED WITH NEW AUTH SYSTEM**
USERS (RLS ✅) - UPDATED SCHEMA

id (uuid, PK, auth.uid())

email (text, unique, not null)

username (varchar(20), unique, nullable) - NEW

phone (varchar(20), nullable) - NEW

full_name (text, nullable) - NEW

created_via (varchar(20), default: 'email') - NEW

phone_verified (boolean, default: false) - NEW

credits (integer, default: 25)

subscription_plan (text, default: 'free')

subscription_status (text, default: 'active')

stripe_customer_id (text, nullable)

onboarding_completed (boolean, default: false)

is_admin (boolean, default: false)

opt_in_sms (boolean, default: false) - NEW

timezone (text, nullable) - NEW

created_at, updated_at, last_sign_in_at
NEW INDEXES: idx_users_username_lower (LOWER(username)), idx_users_email (email), idx_users_phone (phone), idx_users_created_via (created_via)
NEW FUNCTIONS: validate_username() - Enforces 3–20 chars, alphanumeric + underscore/hyphen; get_user_by_username(text) - Username lookup for login


BUSINESS_PROFILES (RLS ✅) - UPDATED SCHEMA

id (uuid, PK)

user_id (uuid, FK → users.id)

business_name (text, not null)

business_niche (text, not null)

target_audience (text, not null)

target_problems (text, not null)

value_proposition (text, not null)

communication_style (text, not null)

message_example (text, not null)

success_outcome (text, not null)

call_to_action (text, not null)

is_active (boolean, default: true)

primary_objective (text)

summary (text, nullable) - NEW

phone_number (text, nullable) - NEW

opt_in_sms (boolean, default: false) - NEW

created_at, updated_at - NEW



CREDIT_TRANSACTIONS (RLS ✅) - UPDATED SCHEMA

id (uuid, PK)

user_id (uuid, FK → users.id)

lead_id (uuid, FK → leads.id, nullable)

amount (integer, not null)

type (text, not null)

description (text, not null)

created_at (timestamp with time zone, default: now()) - NEW

env (text, nullable) - NEW


PAYMENTS (RLS ✅) - NEW TABLE

id (text, PK)

customer_id (text, not null)

subscription_id (text, not null)

amount (integer, not null)

currency (text, not null)

status (text, not null)

paid_at (timestamp with time zone, nullable)

failed_at (timestamp with time zone, nullable)

failure_reason (text, nullable)

created_at (timestamp with time zone, default: now())


SUBSCRIPTIONS (RLS ✅) - NEW TABLE

id (text, PK)

customer_id (text, not null)

status (text, not null)

current_period_start (timestamp with time zone, not null)

current_period_end (timestamp with time zone, not null)

plan_id (text, not null)

cancelled_at (timestamp with time zone, nullable)

created_at (timestamp with time zone, default: now())

updated_at (timestamp with time zone, default: now())

LEADS Table (Profile Identity)
sql-- Create leads table with clear naming
CREATE TABLE IF NOT EXISTS leads (
    lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL,
    
    -- Instagram profile identity
    username TEXT NOT NULL,
    display_name TEXT,
    profile_picture_url TEXT,
    bio_text TEXT,
    external_website_url TEXT,
    
    -- Profile metrics
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    
    -- Profile attributes
    is_verified_account BOOLEAN DEFAULT FALSE,
    is_private_account BOOLEAN DEFAULT FALSE,
    is_business_account BOOLEAN DEFAULT FALSE,
    
    -- Platform info
    platform_type TEXT DEFAULT 'instagram',
    profile_url TEXT,
    
    -- Timestamps
    first_discovered_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, username, business_id)
);
RUNS Table (Analysis Metadata)
sql-- Create runs table for analysis tracking
CREATE TABLE IF NOT EXISTS runs (
    run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL,
    
    -- Analysis identification
    analysis_type TEXT NOT NULL CHECK (analysis_type IN ('light', 'deep', 'xray')),
    analysis_version TEXT DEFAULT '1.0',
    
    -- Universal scores (present for ALL analysis types)
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    niche_fit_score INTEGER CHECK (niche_fit_score >= 0 AND niche_fit_score <= 100),
    engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 100),
    
    -- Quick reference data
    summary_text TEXT, -- Short 1-2 sentence summary for lists
    confidence_level DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Processing metadata
    run_status TEXT DEFAULT 'completed' CHECK (run_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_duration_ms INTEGER,
    ai_model_used TEXT,
    
    -- Timestamps
    analysis_started_at TIMESTAMPTZ DEFAULT NOW(),
    analysis_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
PAYLOADS Table (Analysis Details)
sql-- Create payloads table for detailed analysis data
CREATE TABLE IF NOT EXISTS payloads (
    payload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
    lead_id UUID NOT NULL, -- Denormalized for direct queries
    user_id UUID NOT NULL, -- Denormalized for RLS
    business_id UUID NOT NULL, -- Denormalized for filtering
    
    -- Analysis type for easy querying
    analysis_type TEXT NOT NULL,
    
    -- The main payload data
    analysis_data JSONB NOT NULL,
    
    -- Metadata
    data_size_bytes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
INDEXES FOR PERFORMANCE
LEADS Table Indexes
sql-- Performance indexes for leads
CREATE INDEX IF NOT EXISTS idx_leads_user_business ON leads(user_id, business_id);
CREATE INDEX IF NOT EXISTS idx_leads_username ON leads(username);
CREATE INDEX IF NOT EXISTS idx_leads_discovered_at ON leads(first_discovered_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_unique_profile ON leads(user_id, username, business_id);
RUNS Table Indexes
sql-- Performance indexes for runs
CREATE INDEX IF NOT EXISTS idx_runs_lead_id ON runs(lead_id);
CREATE INDEX IF NOT EXISTS idx_runs_user_business ON runs(user_id, business_id);
CREATE INDEX IF NOT EXISTS idx_runs_analysis_type ON runs(analysis_type);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_overall_score ON runs(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_runs_niche_fit_score ON runs(niche_fit_score DESC);
CREATE INDEX IF NOT EXISTS idx_runs_engagement_score ON runs(engagement_score DESC);

-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_runs_dashboard ON runs(user_id, business_id, created_at DESC);

-- Index for finding latest runs per lead/type
CREATE INDEX IF NOT EXISTS idx_runs_latest_lookup ON runs(lead_id, analysis_type, created_at DESC);
PAYLOADS Table Indexes
sql-- Performance indexes for payloads
CREATE INDEX IF NOT EXISTS idx_payloads_run_id ON payloads(run_id);
CREATE INDEX IF NOT EXISTS idx_payloads_lead_id ON payloads(lead_id);
CREATE INDEX IF NOT EXISTS idx_payloads_user_business ON payloads(user_id, business_id);
CREATE INDEX IF NOT EXISTS idx_payloads_analysis_type ON payloads(analysis_type);

-- JSONB GIN index for querying analysis_data
CREATE INDEX IF NOT EXISTS idx_payloads_analysis_data ON payloads USING GIN(analysis_data);
ROW LEVEL SECURITY (RLS)
Enable RLS on All Tables
sql-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payloads ENABLE ROW LEVEL SECURITY;
RLS Policies
sql-- LEADS RLS Policies
CREATE POLICY IF NOT EXISTS "Users can view their own leads"
    ON leads FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own leads"
    ON leads FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own leads"
    ON leads FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own leads"
    ON leads FOR DELETE
    USING (auth.uid() = user_id);

-- RUNS RLS Policies
CREATE POLICY IF NOT EXISTS "Users can view their own runs"
    ON runs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own runs"
    ON runs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own runs"
    ON runs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own runs"
    ON runs FOR DELETE
    USING (auth.uid() = user_id);

-- PAYLOADS RLS Policies
CREATE POLICY IF NOT EXISTS "Users can view their own payloads"
    ON payloads FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own payloads"
    ON payloads FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own payloads"
    ON payloads FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own payloads"
    ON payloads FOR DELETE
    USING (auth.uid() = user_id);

---

## **# NEW AUTHENTICATION SYSTEM - MULTI-METHOD AUTH**

### **Supported Authentication Methods**
1. **Google OAuth** - Primary method
2. **Email + Password** - Standard signup/signin  
3. **Username + Password** - Alternative login
4. **Phone SMS OTP** - Optional authentication
5. **Email Confirmation** - For email/password signups

### **Authentication Flow Types**
```typescript
type AuthMethod = 'google' | 'email' | 'username' | 'phone';
type AuthFlow = 'signup' | 'signin' | 'oauth_callback';

interface UserCreationData {
  email: string;
  password?: string;
  full_name?: string;
  username?: string;
  phone?: string;
  created_via: AuthMethod;
}
```

### **OAuth Configuration**
- **Provider:** Google OAuth 2.0
- **Scopes:** `email profile`
- **Callback URL:** Dynamic based on environment
- **Production:** `https://oslira.com/auth/callback`
- **Staging:** `https://oslira.org/auth/callback`
- **Development:** `http://localhost:3000/auth/callback`

### **Username Validation Rules**
- **Length:** 3-20 characters
- **Characters:** Alphanumeric + underscore + hyphen only
- **Case:** Stored as lowercase, case-insensitive lookup
- **Uniqueness:** Enforced at database level

### **Phone Authentication**
- **Format:** E.164 international format
- **Provider:** Twilio via Supabase Auth
- **OTP Length:** 6 digits
- **Expiry:** 5 minutes
- **Rate Limiting:** 5 attempts per 10 minutes

---

## **# ENVIRONMENT & CONFIGURATION SYSTEM - CENTRALIZED**

### **Environment Detection**
```typescript
class OsliraEnvManager {
  domains: {
    production: 'oslira.com',      // Primary production
    staging: 'oslira.org',         // Testing environment  
    netlifyStaging: 'osliratest.netlify.app'
  };
  
  environments: 'production' | 'staging' | 'development';
  workerUrls: {
    production: 'https://api.oslira.com',
    staging: 'https://api-staging.oslira.com'
  };
}
```

### **Dynamic Configuration Loading**
1. **Production/Staging:** Netlify Edge Function (`/api/config`)
2. **Development:** Local `env-config.js` file
3. **Fallback:** Environment variables

### **Configuration Keys - UPDATED**
```typescript
interface OsliraConfig {
  // Core URLs
  BASE_URL: string;           // Dynamic based on environment
  WORKER_URL: string;         // Environment-specific API
  AUTH_CALLBACK_URL: string;  // Dynamic OAuth callback
  
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  
  // Environment
  ENV: 'production' | 'staging' | 'development';
  IS_PRODUCTION: boolean;
  IS_STAGING: boolean;
  
  // Feature Flags
  FEATURES: {
    DEBUG_MODE: boolean;
    ANALYTICS: boolean;
    CAMPAIGNS: boolean;
    BULK_UPLOAD: boolean;
  };
}
```

---

## **# CENTRALIZED SCRIPT LOADING SYSTEM**

### **Loading Order - CRITICAL SEQUENCE**
```typescript
const SCRIPT_LOAD_ORDER = [
  // 1. Pre-core (Environment Detection)
  'env-manager',
  
  // 2. External Libraries  
  'supabase', 'sentry',
  
  // 3. Security & Utilities
  'staging-guard', 'alert-system',
  
  // 4. Core Configuration
  'config-manager',
  
  // 5. Core Systems (Dependency Order)
  'ui-manager', 'data-store', 'form-manager', 
  'api-client', 'auth-manager',
  
  // 6. Application Initializer
  'app-initializer'
];
```

### **Script Dependencies**
```typescript
interface ScriptConfig {
  url: string;
  global?: string;           // Global variable name
  critical: boolean;         // Blocks app if fails
  environments?: string[];   // Load only in specific envs
  dependsOn?: string[];     // Must load after these
  attributes?: object;      // Additional script attributes
}
```

### **Loading States**
- **Pre-core:** Environment detection must complete first
- **Core:** Configuration loaded before auth system
- **Page-specific:** Additional scripts based on current page
- **Error Recovery:** Non-critical scripts can fail without blocking

---

## **# AUTHENTICATION MANAGER API - NEW METHODS**

### **Authentication Methods**
```typescript
class OsliraAuthManager {
  // Google OAuth
  async signInWithGoogle(): Promise<AuthData>;
  
  // Email/Password  
  async signUpWithPassword(email: string, password: string, userData?: UserData): Promise<AuthData>;
  async signInWithPassword(email: string, password: string): Promise<AuthData>;
  
  // Username/Password
  async signInWithUsername(username: string, password: string): Promise<AuthData>;
  
  // Phone Authentication
  async signInWithPhone(phone: string): Promise<void>;
  async verifyPhoneOtp(phone: string, otp: string): Promise<AuthData>;
  
  // Utilities
  async checkUsernameAvailable(username: string): Promise<boolean>;
  formatPhoneE164(phone: string): string;
}
```

### **Session Management**
```typescript
interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;       // 1 hour
  refresh_expires_in: number; // 3 days
  token_type: 'bearer';
  user: UserData;
}
```

### **Auth State Events**
```typescript
// Global events
window.addEventListener('auth:change', (event) => {
  const { event, session, user, businesses } = event.detail;
});

window.addEventListener('auth:business-change', (event) => {
  const { business } = event.detail;
});
```

---

## **# SECURITY & ACCESS CONTROL - UPDATED**

### **Page Classifications**
```typescript
const PAGE_TYPES = {
  PUBLIC: ['home', 'pricing', 'legal'],           // No auth required
  AUTH_ONLY: ['auth', 'auth-callback'],          // Redirect if authenticated  
  AUTH_REQUIRED: ['dashboard', 'settings'],      // Require authentication + onboarding
  ONBOARDING_REQUIRED: ['onboarding'],           // Require auth, redirect if complete
  ADMIN_REQUIRED: ['admin']                      // Require admin privileges
};
```

### **Security Guard Flow**
1. **Page Load:** Detect page type and auth requirements
2. **Auth Check:** Verify authentication state
3. **Access Control:** Enforce business rules
4. **Redirect Logic:** Send to appropriate page based on state

### **RLS Policies - UPDATED**
```sql
-- Users table policies
CREATE POLICY "Users can view own record" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own record" ON users FOR UPDATE USING (auth.uid() = id);

-- Username function with RLS
CREATE OR REPLACE FUNCTION get_user_by_username(lookup_username TEXT)
RETURNS TABLE(user_id UUID, email TEXT, full_name TEXT) 
SECURITY DEFINER;
```

---

## **# API RESPONSE FORMATS - UNCHANGED**

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

### **Authentication Responses**
```typescript
// Successful authentication
{
  success: true,
  data: {
    session: AuthSession,
    user: UserData,
    needsEmailConfirmation?: boolean
  }
}

// OAuth callback success
{
  session: AuthSession,
  redirectTo: '/dashboard' | '/onboarding'
}
```

---

## **# DEPLOYMENT & DOMAIN STRATEGY**

### **Domain Configuration**
- **Production:** `oslira.com` (Primary domain)
- **Staging:** `oslira.org` (Testing environment)
- **Development:** `localhost:3000/8000`

### **Single Supabase Project Strategy**
- **Advantage:** No schema synchronization issues
- **Site URL:** `https://oslira.com` (primary)
- **Additional Redirect URLs:** All domains included
- **Dynamic Callbacks:** Environment-specific redirects

### **OAuth Provider Configuration**
```
Google Console Settings:
- App Name: "Oslira"
- Homepage: "https://oslira.com" 
- Authorized Domains: oslira.com, oslira.org
- JavaScript Origins: All domains
- Redirect URIs: Supabase + custom callbacks
```

---

## **# RATE LIMITS & SECURITY CONSTRAINTS**

### **Authentication Rate Limits**
- **Login Attempts:** 5 per 5 minutes per IP
- **Phone OTP:** 5 requests per 10 minutes per phone
- **Username Checks:** 10 per minute per IP
- **OAuth Attempts:** Standard Google limits

### **Staging Environment Security**
- **Password Protection:** SHA-256 hashed access
- **Rate Limiting:** 5 attempts per 10 minutes
- **Session Timeout:** 24 hours
- **IP-based Blocking:** After failed attempts

---

**⚠️ CRITICAL MIGRATION NOTES:**
1. **Database Migration:** Run username schema update SQL
2. **Google OAuth:** Add Supabase callback URL to Google Console
3. **Environment Variables:** Update Netlify configuration
4. **Auth System:** New auth-manager.js completely replaces magic links
5. **Testing:** Verify all auth flows on staging before production

**⚠️ BREAKING CHANGES:**
- Magic link authentication completely removed
- New user table schema requires migration
- Auth page completely rebuilt with new UI
- OAuth callback handling changed
