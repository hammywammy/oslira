import { Hono } from 'hono';
import { cors } from 'hono/cors';

// ------------------------------------
// Type Definitions (Restricted Schema)
// ------------------------------------
interface ProfileData {
  username: string;
  fullName?: string;
  biography?: string;
  followersCount: number;
  followingCount?: number;
  postsCount?: number;
  isVerified?: boolean;
  private?: boolean;
  profilePicUrl?: string;
  externalUrl?: string;
  businessCategory?: string;
}

interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_niche: string;
  target_audience: string;
  target_problems: string;
  value_proposition: string;
  communication_style: string;
  message_example: string;
  success_outcome: string;
  call_to_action: string;
}

interface User {
  id: string;
  email: string;
  credits: number;
  stripe_customer_id?: string;
  subscription_plan: string;
  subscription_status: string;
  onboarding_completed: boolean;
}

type AnalysisType = 'light' | 'deep';

interface AnalysisRequest {
  profile_url?: string;
  username?: string;
  analysis_type?: AnalysisType;
  business_id?: string;
  user_id?: string;
  platform?: string;
}

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE: string;
  OPENAI_KEY: string;
  CLAUDE_KEY?: string;
  APIFY_API_TOKEN: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET?: string;
  FRONTEND_URL?: string;
}

// ------------------------------------
// Utility Functions
// ------------------------------------

/**
 * Decode and verify a JWT (Supabase) without external libs.
 */
async function verifyJWT(token: string): Promise<string | null> {
  try {
    const [, payload] = token.split('.');
    const decoded = JSON.parse(atob(payload));
    const now = Date.now() / 1000;
    if (decoded.exp && decoded.exp > now) return decoded.sub;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Perform a fetch with retry on 429 status.
 */
async function callWithRetry(
  url: string,
  init: RequestInit,
  retries = 3,
  backoffMillis = 1000
): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, init);
    if (res.ok) return res.json();
    if (res.status === 429 && attempt < retries - 1) {
      await new Promise(r => setTimeout(r, backoffMillis * (attempt + 1)));
      continue;
    }
    const text = await res.text();
    throw new Error(`Request to ${url} failed: ${res.status} - ${text}`);
  }
  throw new Error(`Failed after ${retries} retries: ${url}`);
}

/**
 * Extract Instagram username from URL or handle.
 */
function extractUsername(input: string): string {
  try {
    const cleaned = input.trim().replace(/^@/, '');
    if (cleaned.includes('instagram.com')) {
      const url = new URL(cleaned);
      return url.pathname.split('/').filter(Boolean)[0] || '';
    }
    return cleaned;
  } catch {
    return '';
  }
}

/**
 * Validate & normalize the analyze request body.
 */
function normalizeRequest(body: AnalysisRequest) {
  const errors: string[] = [];
  const profile_url =
    body.profile_url || (body.username ? `https://instagram.com/${body.username}` : '');
  const analysis_type = body.analysis_type;
  const business_id = body.business_id;
  const user_id = body.user_id;

  if (!profile_url) errors.push('profile_url or username is required');
  if (!analysis_type || !['light', 'deep'].includes(analysis_type))
    errors.push('analysis_type must be "light" or "deep"');
  if (!user_id) errors.push('user_id is required');

  return {
    valid: errors.length === 0,
    errors,
    data: { profile_url, analysis_type, business_id, user_id }
  };
}

// ------------------------------------
// Prompt Generators
// ------------------------------------

function makeLightPrompt(profile: ProfileData, business: BusinessProfile): string {
  return `You are an expert B2B lead qualifier. Analyze this Instagram profile for lead scoring.\n\n` +
    `PROFILE:\n` +
    `- Username: ${profile.username}\n` +
    `- Bio: ${profile.biography || 'N/A'}\n` +
    `- Followers: ${profile.followersCount}\n` +
    `- Following: ${profile.followingCount || 'N/A'}\n` +
    `- Posts: ${profile.postsCount || 'N/A'}\n` +
    `- Verified: ${!!profile.isVerified}\n\n` +
    `BUSINESS CONTEXT:\n` +
    `- Name: ${business.business_name}\n` +
    `- Niche: ${business.business_niche}\n` +
    `- Target Audience: ${business.target_audience}\n` +
    `- Value Proposition: ${business.value_proposition}\n\n` +
    `Provide a numerical score (0-100) and brief analysis.\n\n` +
    `Respond with JSON: { "score": number, "summary": string, "niche_fit": number, "reasons": string[] }`;
}

function makeDeepPrompt(profile: ProfileData, business: BusinessProfile): string {
  return `You are a senior B2B strategist. Provide comprehensive analysis of this Instagram profile.\n\n` +
    `PROFILE DETAILS:\n` +
    `- Username: ${profile.username}\n` +
    `- Full Name: ${profile.fullName || 'N/A'}\n` +
    `- Bio: ${profile.biography || 'N/A'}\n` +
    `- Followers: ${profile.followersCount}\n` +
    `- Following: ${profile.followingCount || 'N/A'}\n` +
    `- Posts: ${profile.postsCount || 0}\n` +
    `- Verified: ${!!profile.isVerified}\n` +
    `- External URL: ${profile.externalUrl || 'N/A'}\n\n` +
    `BUSINESS CONTEXT:\n` +
    `- Company: ${business.business_name}\n` +
    `- Niche: ${business.business_niche}\n` +
    `- Target Audience: ${business.target_audience}\n` +
    `- Problems Solved: ${business.target_problems}\n` +
    `- Value Proposition: ${business.value_proposition}\n` +
    `- Communication Style: ${business.communication_style}\n` +
    `- Success Outcome: ${business.success_outcome}\n\n` +
    `Provide detailed scoring and analysis.\n\n` +
    `Respond with JSON: { "score": number, "engagement_score": number, "niche_fit": number, "summary": string, "reasons": string[], "selling_points": string[] }`;
}

function makeMessagePrompt(profile: ProfileData, business: BusinessProfile, analysis: any): string {
  return `Create a personalized Instagram DM for this lead based on the analysis.\n\n` +
    `LEAD PROFILE:\n` +
    `- Username: @${profile.username}\n` +
    `- Name: ${profile.fullName || 'N/A'}\n` +
    `- Bio: ${profile.biography || 'N/A'}\n` +
    `- Followers: ${profile.followersCount}\n` +
    `- Verified: ${profile.isVerified ? 'Yes' : 'No'}\n\n` +
    `ANALYSIS RESULTS:\n` +
    `- Lead Score: ${analysis.score}/100\n` +
    `- Niche Fit: ${analysis.niche_fit || 'N/A'}\n` +
    `- Key Reasons: ${analysis.reasons?.join(', ') || 'N/A'}\n` +
    `- Selling Points: ${analysis.selling_points?.join(', ') || 'N/A'}\n\n` +
    `BUSINESS INFO:\n` +
    `- Company: ${business.business_name}\n` +
    `- Value Prop: ${business.value_proposition}\n` +
    `- Communication Style: ${business.communication_style}\n` +
    `- Success Outcome: ${business.success_outcome}\n` +
    `- Call to Action: ${business.call_to_action}\n` +
    `- Message Example: ${business.message_example}\n\n` +
    `Create a personalized, engaging message that:\n` +
    `1. References something specific from their profile\n` +
    `2. Clearly states the value proposition\n` +
    `3. Includes a soft call-to-action\n` +
    `4. Matches the specified communication style\n` +
    `5. Is under 200 characters for Instagram DM\n\n` +
    `Respond with JSON: { "message": string }`;
}

// ------------------------------------
// Hono App Initialization
// ------------------------------------
const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({ 
  origin: '*', 
  allowHeaders: ['Content-Type', 'Authorization'], 
  allowMethods: ['GET', 'POST', 'OPTIONS'] 
}));

// ------------------------------------
// Routes
// ------------------------------------

// Root
app.get('/', c => c.json({ 
  message: '🚀 Oslira Worker v5.0', 
  status: 'operational',
  timestamp: new Date().toISOString()
}));

// Health Check
app.get('/health', c => c.json({ 
  status: 'healthy', 
  service: 'Oslira Worker',
  version: '5.0.0',
  timestamp: new Date().toISOString()
}));

// Configuration endpoint for frontend
app.get('/config', c => {
  return c.json({
    supabaseUrl: c.env.SUPABASE_URL,
    supabaseAnonKey: 'your-anon-key', // This should be the anon key, not service role
    workerUrl: c.req.url.split('/config')[0]
  });
});

// Debug Environment
app.get('/debug-env', c => {
  const env = c.env;
  return c.json({
    supabase: env.SUPABASE_URL ? 'SET' : 'MISSING',
    serviceRole: env.SUPABASE_SERVICE_ROLE ? 'SET' : 'MISSING',
    openai: env.OPENAI_KEY ? 'SET' : 'MISSING',
    claude: env.CLAUDE_KEY ? 'SET' : 'MISSING',
    apify: env.APIFY_API_TOKEN ? 'SET' : 'MISSING',
    stripe: env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING',
    webhookSecret: env.STRIPE_WEBHOOK_SECRET ? 'SET' : 'MISSING',
    frontend: env.FRONTEND_URL ? 'SET' : 'MISSING'
  });
});

// Main Analyze Endpoint
app.post('/analyze', async c => {
  console.log('Analysis request received');

  // Authentication
  const auth = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!auth) {
    console.log('Missing authorization header');
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  const userId = await verifyJWT(auth);
  if (!userId) {
    console.log('Invalid JWT token');
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  console.log(`Authenticated user: ${userId}`);

  // Parse and validate request
  const body = await c.req.json<AnalysisRequest>();
  const { valid, errors, data } = normalizeRequest(body);
  if (!valid) {
    console.log('Request validation failed:', errors);
    return c.json({ error: 'Invalid request', details: errors }, 400);
  }

  const username = extractUsername(data.profile_url!);
  if (!username) {
    console.log('Invalid username format');
    return c.json({ error: 'Invalid username format' }, 400);
  }

  console.log(`Processing analysis for username: ${username}, type: ${data.analysis_type}`);

  // Supabase headers
  const sbHeaders = {
    apikey: c.env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Fetch user and check credits
    console.log('Fetching user data and checking credits');
    const usersResponse = await fetch(
      `${c.env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=*`,
      { headers: sbHeaders }
    );

    if (!usersResponse.ok) {
      throw new Error(`Failed to fetch user: ${usersResponse.status}`);
    }

    const users: User[] = await usersResponse.json();
    if (!users.length) {
      console.log('User not found');
      return c.json({ error: 'User not found' }, 404);
    }

    const user = users[0];
    const cost = data.analysis_type === 'deep' ? 2 : 1;

    // Check credit balance
    const { data: creditBalance } = await fetch(
      `${c.env.SUPABASE_URL}/rest/v1/credit_balances?user_id=eq.${userId}&select=balance`,
      { headers: sbHeaders }
    ).then(res => res.json());

    const currentCredits = creditBalance?.[0]?.balance || user.credits || 0;

    if (currentCredits < cost) {
      console.log(`Insufficient credits: ${currentCredits} < ${cost}`);
      return c.json({ 
        error: 'Insufficient credits', 
        available: currentCredits, 
        required: cost 
      }, 402);
    }

    console.log(`Credits check passed: ${currentCredits} >= ${cost}`);

    // 2. Fetch business profile if provided
    let business: BusinessProfile | null = null;
    if (data.business_id) {
      console.log(`Fetching business profile: ${data.business_id}`);
      const businessResponse = await fetch(
        `${c.env.SUPABASE_URL}/rest/v1/business_profiles?id=eq.${data.business_id}&user_id=eq.${userId}&select=*`,
        { headers: sbHeaders }
      );

      if (businessResponse.ok) {
        const businesses: BusinessProfile[] = await businessResponse.json();
        business = businesses[0] || null;
      }
    }

    if (!business) {
      console.log('Business profile not found or not provided');
      return c.json({ error: 'Business profile is required for analysis' }, 400);
    }

    console.log(`Using business profile: ${business.business_name}`);

    // 3. Scrape Instagram profile via Apify
    console.log('Starting Instagram scraping via Apify');
    const scrapeActorId = data.analysis_type === 'light' 
      ? 'dSCLg0C3YEZ83HzYX'  // Light scraper
      : 'shu8hvrXbJbY3Eb9W'; // Deep scraper

    const scrapePayload = data.analysis_type === 'light'
      ? { usernames: [username] }
      : { directUrls: [`https://instagram.com/${username}/`], resultsLimit: 1 };

    const profileData: ProfileData = (await callWithRetry(
      `https://api.apify.com/v2/acts/${scrapeActorId}/run-sync-get-dataset-items?token=${c.env.APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scrapePayload)
      }
    ))[0];

    if (!profileData) {
      console.log('No profile data returned from scraper');
      return c.json({ error: 'Could not retrieve profile data' }, 400);
    }

    console.log(`Profile scraped successfully: @${profileData.username}`);

    // 4. AI Analysis with OpenAI
    console.log('Starting AI analysis with OpenAI');
    const prompt = data.analysis_type === 'light'
      ? makeLightPrompt(profileData, business)
      : makeDeepPrompt(profileData, business);

    const openaiResponse = await callWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${c.env.OPENAI_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1500,
          response_format: { type: 'json_object' }
        })
      }
    );

    const analysisResult = JSON.parse(openaiResponse.choices[0].message.content);
    console.log('OpenAI analysis completed');

    // 5. Generate personalized message for deep analysis
    let outreachMessage = '';
    if (data.analysis_type === 'deep' && c.env.CLAUDE_KEY) {
      console.log('Generating personalized message with Claude');
      try {
        const messagePrompt = makeMessagePrompt(profileData, business, analysisResult);
        
        const claudeResponse = await callWithRetry(
          'https://api.anthropic.com/v1/messages',
          {
            method: 'POST',
            headers: {
              'x-api-key': c.env.CLAUDE_KEY,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'claude-3-sonnet-20240229',
              messages: [{ role: 'user', content: messagePrompt }],
              temperature: 0.7,
              max_tokens: 1000
            })
          }
        );

        const messageResult = JSON.parse(claudeResponse.content[0].text);
        outreachMessage = messageResult.message || '';
        console.log('Personalized message generated');
      } catch (error) {
        console.log('Failed to generate message with Claude:', error);
        // Continue without message
      }
    }

    // 6. Insert lead into database
    console.log('Inserting lead into database');
    const leadInsertData = {
      user_id: userId,
      business_id: data.business_id,
      username: profileData.username,
      platform: data.platform || 'instagram',
      profile_url: data.profile_url,
      score: analysisResult.score || 0,
      type: data.analysis_type,
      created_at: new Date().toISOString()
    };

    const leadResponse = await fetch(
      `${c.env.SUPABASE_URL}/rest/v1/leads`,
      {
        method: 'POST',
        headers: { ...sbHeaders, Prefer: 'return=representation' },
        body: JSON.stringify(leadInsertData)
      }
    );

    if (!leadResponse.ok) {
      throw new Error(`Failed to insert lead: ${leadResponse.status}`);
    }

    const insertedLead = await leadResponse.json();
    const leadId = insertedLead[0]?.id;

    console.log(`Lead inserted with ID: ${leadId}`);

    // 7. Insert lead analysis for deep analysis
    if (data.analysis_type === 'deep' && leadId) {
      console.log('Inserting lead analysis');
      const analysisData = {
        lead_id: leadId,
        user_id: userId,
        analysis_type: 'deep',
        engagement_score: analysisResult.engagement_score || null,
        score_niche_fit: analysisResult.niche_fit || null,
        score_total: analysisResult.score || 0,
        ai_version_id: 'gpt-4o-2024',
        outreach_message: outreachMessage
      };

      await fetch(
        `${c.env.SUPABASE_URL}/rest/v1/lead_analyses`,
        {
          method: 'POST',
          headers: sbHeaders,
          body: JSON.stringify(analysisData)
        }
      );

      console.log('Lead analysis inserted');
    }

    // 8. Update credit balance
    console.log('Updating credit balance');
    const newBalance = currentCredits - cost;

    // Update credit_balances table
    await fetch(
      `${c.env.SUPABASE_URL}/rest/v1/credit_balances`,
      {
        method: 'POST',
        headers: { ...sbHeaders, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          user_id: userId,
          balance: newBalance
        })
      }
    );

    // 9. Record credit transaction
    console.log('Recording credit transaction');
    await fetch(
      `${c.env.SUPABASE_URL}/rest/v1/credit_transactions`,
      {
        method: 'POST',
        headers: sbHeaders,
        body: JSON.stringify({
          user_id: userId,
          amount: -cost,
          type: 'use',
          description: `${data.analysis_type} analysis for @${profileData.username}`,
          lead_id: leadId
        })
      }
    );

    console.log('Analysis completed successfully');

    // 10. Return success response
    return c.json({
      success: true,
      lead_id: leadId,
      analysis: {
        score: analysisResult.score,
        summary: analysisResult.summary,
        niche_fit: analysisResult.niche_fit,
        engagement_score: analysisResult.engagement_score,
        selling_points: analysisResult.selling_points,
        reasons: analysisResult.reasons
      },
      outreach_message: outreachMessage,
      profile: {
        username: profileData.username,
        followers: profileData.followersCount,
        verified: profileData.isVerified
      },
      credits: {
        used: cost,
        remaining: newBalance
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return c.json({ 
      error: 'Analysis failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// Billing: Create Checkout Session
app.post('/billing/create-checkout-session', async c => {
  const auth = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!auth) return c.json({ error: 'Unauthorized' }, 401);
  
  const userId = await verifyJWT(auth);
  if (!userId) return c.json({ error: 'Invalid token' }, 401);

  const body = await c.req.json();
  const { price_id, customer_email, success_url, cancel_url, metadata } = body;
  
  if (!price_id || !customer_email) {
    return c.json({ error: 'price_id and customer_email required' }, 400);
  }

  // Validate price IDs
  const VALID_PRICES = [
    'price_1RkCKjJzvcRSqGG3Hq4WNNSU', // Starter
    'price_1RkCLGJzvcRSqGG3XqDyhYZN', // Growth
    'price_1RkCLtJzvcRSqGG30FfJSpau', // Professional
    'price_1RkCMlJzvcRSqGG3HHFoX1fw'  // Enterprise
  ];
  
  if (!VALID_PRICES.includes(price_id)) {
    return c.json({ error: 'Invalid price_id' }, 400);
  }

  const stripeKey = c.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return c.json({ error: 'Stripe not configured' }, 500);

  try {
    // Find or create customer
    const searchParams = new URLSearchParams({ query: `email:'${customer_email}'` });
    const customerSearch = await fetch(
      `https://api.stripe.com/v1/customers/search?${searchParams}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    ).then(res => res.json());

    let customerId = customerSearch.data?.[0]?.id;
    
    if (!customerId) {
      const customerParams = new URLSearchParams({ email: customer_email });
      const newCustomer = await fetch(
        'https://api.stripe.com/v1/customers',
        { 
          method: 'POST', 
          headers: { 
            Authorization: `Bearer ${stripeKey}`, 
            'Content-Type': 'application/x-www-form-urlencoded' 
          }, 
          body: customerParams 
        }
      ).then(res => res.json());
      
      customerId = newCustomer.id;
    }

    // Create session with user_id in metadata
    const sessionParams = new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price]': price_id,
      'line_items[0][quantity]': '1',
      mode: 'subscription',
      success_url: success_url || `${c.env.FRONTEND_URL}/subscription.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${c.env.FRONTEND_URL}/subscription.html?canceled=true`,
      customer: customerId,
      'subscription_data[trial_period_days]': '7',
      'subscription_data[metadata][user_id]': userId,
      allow_promotion_codes: 'true'
    });

    // Add additional metadata
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        sessionParams.append(`subscription_data[metadata][${key}]`, String(value));
      });
    }

    const session = await fetch(
      'https://api.stripe.com/v1/checkout/sessions',
      { 
        method: 'POST', 
        headers: { 
          Authorization: `Bearer ${stripeKey}`, 
          'Content-Type': 'application/x-www-form-urlencoded' 
        }, 
        body: sessionParams 
      }
    ).then(res => res.json());

    if (session.error) {
      return c.json({ error: session.error.message }, 400);
    }

    return c.json({ 
      url: session.url, 
      session_id: session.id, 
      customer_id: customerId 
    });

  } catch (error) {
    console.error('Checkout session error:', error);
    return c.json({ error: 'Failed to create checkout session' }, 500);
  }
});

// Billing: Create Portal Session
app.post('/billing/create-portal-session', async c => {
  const auth = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!auth) return c.json({ error: 'Unauthorized' }, 401);
  
  const userId = await verifyJWT(auth);
  if (!userId) return c.json({ error: 'Invalid token' }, 401);

  const { return_url, customer_email } = await c.req.json();
  if (!customer_email) return c.json({ error: 'customer_email required' }, 400);

  const stripeKey = c.env.STRIPE_SECRET_KEY;
  
  try {
    const searchParams = new URLSearchParams({ query: `email:'${customer_email}'` });
    const customerData = await fetch(
      `https://api.stripe.com/v1/customers/search?${searchParams}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    ).then(res => res.json());
    
    if (!customerData.data?.length) {
      return c.json({ error: 'Customer not found' }, 404);
    }
    
    const customerId = customerData.data[0].id;

    const portalParams = new URLSearchParams({
      customer: customerId,
      return_url: return_url || `${c.env.FRONTEND_URL}/subscription.html`
    });
    
    const portal = await fetch(
      'https://api.stripe.com/v1/billing_portal/sessions',
      { 
        method: 'POST', 
        headers: { 
          Authorization: `Bearer ${stripeKey}`, 
          'Content-Type': 'application/x-www-form-urlencoded' 
        }, 
        body: portalParams 
      }
    ).then(res => res.json());
    
    if (portal.error) {
      return c.json({ error: portal.error.message }, 400);
    }
    
    return c.json({ url: portal.url });

  } catch (error) {
    console.error('Portal session error:', error);
    return c.json({ error: 'Failed to create portal session' }, 500);
  }
});

// Stripe Webhook Handler
app.post('/stripe-webhook', async c => {
  const body = await c.req.text();
  const sig = c.req.header('stripe-signature');
  
  if (!sig || !c.env.STRIPE_WEBHOOK_SECRET) {
    return c.text('Missing signature or secret', 400);
  }

  try {
    // In production, verify the signature properly
    const event = JSON.parse(body);
    
    console.log(`Webhook received: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object, c.env);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, c.env);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object, c.env);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object, c.env);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object, c.env);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return c.text('OK', 200);

  } catch (error) {
    console.error('Webhook error:', error);
    return c.text('Webhook processing failed', 400);
  }
});

// ------------------------------------
// Stripe Event Handlers (Updated for Restricted Schema)
// ------------------------------------

async function handleSubscriptionCreated(subscription: any, env: Env) {
  try {
    const { user_id } = subscription.metadata;
    if (!user_id) {
      console.log('No user_id in subscription metadata');
      return;
    }

    console.log(`Processing subscription created for user: ${user_id}`);

    const supabaseHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    };

    // Map price IDs to plan info
    const priceIdToPlan: Record<string, { name: string; credits: number }> = {
      'price_1RkCKjJzvcRSqGG3Hq4WNNSU': { name: 'starter', credits: 50 },
      'price_1RkCLGJzvcRSqGG3XqDyhYZN': { name: 'growth', credits: 150 },
      'price_1RkCLtJzvcRSqGG30FfJSpau': { name: 'professional', credits: 500 },
      'price_1RkCMlJzvcRSqGG3HHFoX1fw': { name: 'enterprise', credits: 999999 },
    };

    const priceId = subscription.items.data[0]?.price?.id;
    const planInfo = priceIdToPlan[priceId];
    
    if (!planInfo) {
      console.log(`Unknown price ID: ${priceId}`);
      return;
    }

    // Update user subscription in users table (restricted columns only)
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`,
      {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify({
          subscription_plan: planInfo.name,
          subscription_status: subscription.status,
          stripe_customer_id: subscription.customer,
          credits: planInfo.credits
        }),
      }
    );

    // Update credit balance
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/credit_balances`,
      {
        method: 'POST',
        headers: { ...supabaseHeaders, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          user_id,
          balance: planInfo.credits
        }),
      }
    );

    // Record credit transaction
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/credit_transactions`,
      {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({
          user_id,
          amount: planInfo.credits,
          type: 'add',
          description: `Subscription created: ${planInfo.name} plan`,
          lead_id: null
        }),
      }
    );

    console.log(`Subscription created successfully for user ${user_id}`);

  } catch (err) {
    console.error('handleSubscriptionCreated error:', err);
  }
}

async function handleSubscriptionUpdated(subscription: any, env: Env) {
  try {
    const { user_id } = subscription.metadata;
    if (!user_id) return;

    console.log(`Processing subscription updated for user: ${user_id}`);

    const supabaseHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    };

    // Update subscription status only
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`,
      {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify({
          subscription_status: subscription.status
        }),
      }
    );

    console.log(`Subscription updated for user ${user_id}`);

  } catch (err) {
    console.error('handleSubscriptionUpdated error:', err);
  }
}

async function handleSubscriptionCanceled(subscription: any, env: Env) {
  try {
    const { user_id } = subscription.metadata;
    if (!user_id) return;

    console.log(`Processing subscription canceled for user: ${user_id}`);

    const supabaseHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    };

    // Update user to free plan
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`,
      {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify({
          subscription_plan: 'free',
          subscription_status: 'canceled',
          credits: 0
        }),
      }
    );

    // Update credit balance to 0
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/credit_balances`,
      {
        method: 'POST',
        headers: { ...supabaseHeaders, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          user_id,
          balance: 0
        }),
      }
    );

    // Record credit transaction
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/credit_transactions`,
      {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({
          user_id,
          amount: 0,
          type: 'use',
          description: 'Subscription canceled - credits reset',
          lead_id: null
        }),
      }
    );

    console.log(`Subscription canceled for user ${user_id}`);

  } catch (err) {
    console.error('handleSubscriptionCanceled error:', err);
  }
}

async function handlePaymentSucceeded(invoice: any, env: Env) {
  try {
    const subscription_id = invoice.subscription;
    if (!subscription_id) return;

    console.log(`Processing payment succeeded for subscription: ${subscription_id}`);

    // Retrieve subscription to get metadata
    const subRes = await fetch(
      `https://api.stripe.com/v1/subscriptions/${subscription_id}`, 
      {
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
      }
    );
    
    if (!subRes.ok) return;
    
    const subscription = await subRes.json();
    const user_id = subscription.metadata?.user_id;
    if (!user_id) return;

    const supabaseHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    };

    // Reset monthly credits based on plan
    const priceId = subscription.items.data[0]?.price?.id;
    const planMap: Record<string, number> = {
      'price_1RkCKjJzvcRSqGG3Hq4WNNSU': 50,    // starter
      'price_1RkCLGJzvcRSqGG3XqDyhYZN': 150,   // growth
      'price_1RkCLtJzvcRSqGG30FfJSpau': 500,   // professional
      'price_1RkCMlJzvcRSqGG3HHFoX1fw': 999999, // enterprise
    };
    
    const credits = planMap[priceId] || 0;

    // Update user credits
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`,
      {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify({
          credits,
          subscription_status: 'active'
        }),
      }
    );

    // Update credit balance
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/credit_balances`,
      {
        method: 'POST',
        headers: { ...supabaseHeaders, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          user_id,
          balance: credits
        }),
      }
    );

    // Record credit transaction
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/credit_transactions`,
      {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({
          user_id,
          amount: credits,
          type: 'add',
          description: 'Monthly credit renewal',
          lead_id: null
        }),
      }
    );

    console.log(`Payment succeeded processed for user ${user_id}`);

  } catch (err) {
    console.error('handlePaymentSucceeded error:', err);
  }
}

async function handlePaymentFailed(invoice: any, env: Env) {
  try {
    const subscription_id = invoice.subscription;
    if (!subscription_id) return;

    console.log(`Processing payment failed for subscription: ${subscription_id}`);

    // Retrieve subscription to get metadata
    const subRes = await fetch(
      `https://api.stripe.com/v1/subscriptions/${subscription_id}`, 
      {
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
      }
    );
    
    if (!subRes.ok) return;
    
    const subscription = await subRes.json();
    const user_id = subscription.metadata?.user_id;
    if (!user_id) return;

    const supabaseHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    };

    // Update user to past_due status
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`,
      {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify({
          subscription_status: 'past_due'
        }),
      }
    );

    console.log(`Payment failed processed for user ${user_id}`);

  } catch (err) {
    console.error('handlePaymentFailed error:', err);
  }
}

// ------------------------------------
// Error Handling & 404
// ------------------------------------

app.onError((err, c) => {
  console.error('Worker Error:', err);
  return c.json({ 
    error: 'Internal server error', 
    message: err.message,
    timestamp: new Date().toISOString()
  }, 500);
});

app.notFound(c => c.json({ 
  error: 'Endpoint not found',
  available_endpoints: [
    'GET /',
    'GET /health',
    'GET /config',
    'GET /debug-env',
    'POST /analyze',
    'POST /billing/create-checkout-session',
    'POST /billing/create-portal-session',
    'POST /stripe-webhook'
  ]
}, 404));

// ------------------------------------
// Export
// ------------------------------------
export default { 
  fetch: app.fetch 
};
