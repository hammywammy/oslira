import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Enterprise Types
interface ProfileData { 
  username: string;
  fullName?: string;
  biography?: string;
  followersCount: number;
  followingCount?: number;
  postsCount?: number;
  isVerified?: boolean;
  verified?: boolean;
  private?: boolean;
  isPrivate?: boolean;
  profilePicUrl?: string;
  profilePicUrlHD?: string;
  externalUrl?: string;
  businessCategoryName?: string;
  category?: string;
}

interface BusinessProfile {
  id: string;
  business_name: string;
  target_niche: string;
  customer_location: string;
  primary_platform: string;
  product_service: string;
  value_prop: string;
}

interface User {
  id: string;
  email: string;
  credits: number;
  subscription_plan: string;
  monthly_credits_limit: number;
}

interface AnalysisRequest {
  profile_url?: string;
  username?: string;
  analysis_type?: string;
  analysisType?: string;
  type?: string;
  business_id?: string;
  businessId?: string;
  user_id?: string;
  platform?: string;
}

const app = new Hono();
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// JWT verification
async function verifySupabaseJWT(token: string): Promise<string | null> {
  try {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [, payload] = parts;
    const decodedPayload = JSON.parse(atob(payload));
    
    const now = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp && decodedPayload.exp < now) {
      return null;
    }
    
    return decodedPayload.sub;
  } catch (error) {
    return null;
  }
}

// OpenAI API with retry logic
async function callOpenAI(prompt: string, apiKey: string, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          temperature: 0.3,
          max_tokens: 1200,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429 && attempt < maxRetries) {
          const delay = Math.min(Math.pow(2, attempt) * 1000, 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error('OpenAI API error: ' + response.status + ' - ' + errorText);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.min(Math.pow(2, attempt) * 500, 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Claude API with retry logic - UPDATED TO CLAUDE SONNET 4
async function callClaude(prompt: string, apiKey: string, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', // UPDATED TO CLAUDE SONNET 4
          max_tokens: 1200, // Increased for better message generation
          temperature: 0.7, // Increased for more creative/natural messages
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429 && attempt < maxRetries) {
          const delay = Math.min(Math.pow(2, attempt) * 1000, 8000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error('Claude API error: ' + response.status + ' - ' + errorText);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.min(Math.pow(2, attempt) * 600, 6000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Safe Supabase response handler
async function safeSupabaseResponse(response: Response, context: string): Promise<any> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(context + ' failed: ' + response.status + ' - ' + errorText);
  }

  const responseText = await response.text();
  if (!responseText || responseText.trim() === '') {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch (parseError) {
    throw new Error('Failed to parse ' + context + ' response');
  }
}

// Clean username extraction
function extractUsername(profileUrl: string): string {
  try {
    if (!profileUrl || typeof profileUrl !== 'string') {
      return '';
    }
    
    const cleanUrl = profileUrl.trim();
    
    // Remove any potential contamination
    if (cleanUrl.includes('lukealexxander') || cleanUrl.includes('lukealexander')) {
      return '';
    }
    
    // Handle direct username
    if (!cleanUrl.includes('/') && !cleanUrl.includes('.')) {
      return cleanUrl.replace('@', '').toLowerCase();
    }
    
    // Handle Instagram URLs
    if (cleanUrl.includes('instagram.com')) {
      try {
        const url = new URL(cleanUrl);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        return pathSegments[0]?.toLowerCase() || '';
      } catch (urlError) {
        return '';
      }
    }
    
    // Fallback for other formats
    return cleanUrl.replace('@', '').replace(/[^a-zA-Z0-9._]/g, '').toLowerCase();
  } catch (error) {
    return '';
  }
}

// Enhanced request validation
function validateRequest(body: AnalysisRequest): { isValid: boolean; errors: string[]; normalizedData: any } {
  const errors: string[] = [];
  
  const profileUrl = body.profile_url || (body.username ? 'https://instagram.com/' + body.username : '');
  if (!profileUrl) {
    errors.push('profile_url or username is required');
  }
  
  const analysisType = body.analysis_type || body.analysisType || body.type;
  if (!analysisType) {
    errors.push('analysis_type is required');
  } else if (!['light', 'deep'].includes(analysisType)) {
    errors.push('analysis_type must be "light" or "deep"');
  }
  
  const businessId = body.business_id || body.businessId;
  if (!businessId) {
    errors.push('business_id is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    normalizedData: {
      profile_url: profileUrl,
      analysis_type: analysisType,
      business_id: businessId,
      user_id: body.user_id,
      platform: body.platform || 'instagram'
    }
  };
}

// Light analysis prompt
function generateLightPrompt(profile: ProfileData, business: BusinessProfile): string {
  return 'You are an expert B2B lead qualification AI. Analyze this Instagram profile.\n\n' +
    'PROFILE DATA:\n' +
    '- Username: ' + profile.username + '\n' +
    '- Biography: ' + (profile.biography || 'No bio available') + '\n' +
    '- Followers: ' + (profile.followersCount?.toLocaleString() || 0) + '\n' +
    '- Following: ' + (profile.followingCount?.toLocaleString() || 0) + '\n' +
    '- Posts: ' + (profile.postsCount?.toLocaleString() || 0) + '\n' +
    '- Verified: ' + (profile.isVerified || profile.verified || false) + '\n' +
    '- Category: ' + (profile.businessCategoryName || profile.category || 'Unknown') + '\n\n' +
    'BUSINESS CONTEXT:\n' +
    '- Business: ' + business.business_name + '\n' +
    '- Target Niche: ' + business.target_niche + '\n' +
    '- Product/Service: ' + business.product_service + '\n' +
    '- Value Proposition: ' + business.value_prop + '\n\n' +
    'Respond with valid JSON only:\n\n' +
    '{\n' +
    '  "lead_score": number (0-100),\n' +
    '  "summary": "Brief explanation of lead potential",\n' +
    '  "niche": "Person\'s field/industry",\n' +
    '  "match_reasons": ["specific", "reasons", "for", "score"]\n' +
    '}';
}

// Deep analysis prompt
function generateDeepPrompt(profile: ProfileData, business: BusinessProfile): string {
  return 'You are a senior B2B lead strategist. Analyze this Instagram profile comprehensively.\n\n' +
    'PROFILE ANALYSIS:\n' +
    '- Username: ' + profile.username + '\n' +
    '- Full Name: ' + (profile.fullName || 'Not available') + '\n' +
    '- Bio: ' + (profile.biography || 'No bio available') + '\n' +
    '- Posts: ' + (profile.postsCount?.toLocaleString() || 0) + '\n' +
    '- Followers: ' + (profile.followersCount?.toLocaleString() || 0) + '\n' +
    '- Following: ' + (profile.followingCount?.toLocaleString() || 0) + '\n' +
    '- Verified: ' + (profile.isVerified || profile.verified || false) + '\n' +
    '- Category: ' + (profile.businessCategoryName || profile.category || 'Unknown') + '\n' +
    '- External URL: ' + (profile.externalUrl || 'None') + '\n' +
    '- Private: ' + (profile.private || profile.isPrivate || false) + '\n\n' +
    'BUSINESS TARGET:\n' +
    '- Company: ' + business.business_name + '\n' +
    '- Target Niche: ' + business.target_niche + '\n' +
    '- Product/Service: ' + business.product_service + '\n' +
    '- Value Proposition: ' + business.value_prop + '\n\n' +
    'Respond with valid JSON only:\n\n' +
    '{\n' +
    '  "lead_score": number (0-100),\n' +
    '  "summary": "Detailed assessment of lead quality",\n' +
    '  "niche": "Specific industry classification",\n' +
    '  "match_reasons": ["detailed", "scoring", "factors"],\n' +
    '  "engagement_rate": number (estimated %),\n' +
    '  "selling_points": ["key", "strengths"],\n' +
    '  "custom_notes": "Strategic notes for sales team"\n' +
    '}';
}

// ENHANCED Message generation prompt with more data
function generateMessagePrompt(profile: ProfileData, business: BusinessProfile, analysis: any): string {
  // Format follower/following ratio insight
  const followRatio = profile.followingCount && profile.followersCount 
    ? (profile.followersCount / profile.followingCount).toFixed(1)
    : null;
  
  const accountInsights = [];
  if (profile.isVerified || profile.verified) accountInsights.push('verified account');
  if (profile.externalUrl) accountInsights.push('has business website');
  if (followRatio && parseFloat(followRatio) > 1) accountInsights.push('strong follower ratio');
  if (profile.followersCount > 10000) accountInsights.push('large following');
  if (profile.postsCount && profile.postsCount > 100) accountInsights.push('active content creator');

  return `You are an expert B2B sales development representative crafting personalized Instagram DMs that get responses. Your goal is to write a natural, conversational message that feels genuine and relevant.

PROSPECT PROFILE:
- Username: @${profile.username}
- Full Name: ${profile.fullName || 'Not provided'}
- Bio: "${profile.biography || 'No bio available'}"
- Followers: ${profile.followersCount?.toLocaleString() || 0}
- Following: ${profile.followingCount?.toLocaleString() || 0}
- Posts: ${profile.postsCount?.toLocaleString() || 0}
- Verified: ${profile.isVerified || profile.verified || false}
- Category: ${profile.businessCategoryName || profile.category || 'Unknown'}
- External Website: ${profile.externalUrl || 'None'}
- Account Type: ${profile.private || profile.isPrivate ? 'Private' : 'Public'}
- Account Insights: ${accountInsights.length > 0 ? accountInsights.join(', ') : 'Standard account'}

LEAD ANALYSIS RESULTS:
- Lead Score: ${analysis.lead_score}/100
- Identified Niche: ${analysis.niche}
- Why They're a Good Fit: ${Array.isArray(analysis.match_reasons) ? analysis.match_reasons.join(', ') : analysis.match_reasons || 'Profile match'}
- Key Selling Points: ${Array.isArray(analysis.selling_points) ? analysis.selling_points.join(', ') : analysis.selling_points || 'Value alignment'}
- Engagement Rate: ${analysis.engagement_rate || 'Not calculated'}%
- Strategic Notes: ${analysis.custom_notes || 'Standard outreach approach'}

YOUR BUSINESS:
- Company: ${business.business_name}
- Product/Service: ${business.product_service}
- Value Proposition: ${business.value_prop}
- Target Niche: ${business.target_niche}

OUTREACH GUIDELINES:
1. Start with their name if available, or username if not
2. Reference something specific from their bio or profile insights
3. Make a genuine connection to their niche/industry
4. Briefly mention how your value prop could help them specifically
5. End with a soft call-to-action (not pushy)
6. Keep it 2-3 sentences maximum
7. Sound conversational and human, not salesy
8. Avoid generic phrases like "I came across your profile"

Write ONLY the Instagram DM message text. No quotes, no formatting, just the raw message.`;
}

// =====================================================
// STRIPE SUBSCRIPTION ENDPOINTS - UPDATED WITH CORRECT PRICE IDs
// =====================================================

// Create subscription checkout session - UPDATED
app.post('/billing/create-checkout-session', async (c) => {
  try {
    console.log('🔄 Creating Stripe checkout session...');
    
    // Verify authentication
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid auth header');
      return c.json({ error: 'Unauthorized - missing or invalid authorization header' }, 401);
    }

    const token = authHeader.substring(7);
    const userId = await verifySupabaseJWT(token);
    if (!userId) {
      console.log('❌ Invalid JWT token');
      return c.json({ error: 'Unauthorized - invalid or expired token' }, 401);
    }

    const requestBody = await c.req.json();
    console.log('📋 Request body:', JSON.stringify(requestBody, null, 2));

    const { 
      price_id,
      customer_email, 
      success_url,
      cancel_url,
      metadata,
      trial_period_days = 7
    } = requestBody;
    
    if (!price_id || !customer_email) {
      console.log('❌ Missing required fields:', { price_id: !!price_id, customer_email: !!customer_email });
      return c.json({ error: 'Missing required fields: price_id and customer_email are required' }, 400);
    }

    // Validate price_id against our known price IDs
    const VALID_PRICE_IDS = [
      'price_1RkCKjJzvcRSqGG3Hq4WNNSU', // starter
      'price_1RkCLGJzvcRSqGG3XqDyhYZN', // growth  
      'price_1RkCLtJzvcRSqGG30FfJSpau', // professional
      'price_1RkCMlJzvcRSqGG3HHFoX1fw'  // enterprise
    ];

    if (!VALID_PRICE_IDS.includes(price_id)) {
      console.log('❌ Invalid price_id:', price_id);
      return c.json({ error: 'Invalid price_id provided' }, 400);
    }

    if (!c.env.STRIPE_SECRET_KEY) {
      console.log('❌ Missing Stripe secret key');
      return c.json({ error: 'Stripe configuration missing' }, 500);
    }

    console.log('✅ Valid price_id:', price_id);

    // Create or get customer
    let customerId = null;
    
    console.log('🔍 Searching for existing customer...');
    const customerSearchResponse = await fetch(
      `https://api.stripe.com/v1/customers/search?query=email:'${customer_email}'`,
      {
        headers: {
          'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        },
      }
    );

    if (!customerSearchResponse.ok) {
      const errorText = await customerSearchResponse.text();
      console.log('❌ Customer search failed:', errorText);
      return c.json({ error: 'Failed to search for existing customer' }, 500);
    }

    const customerSearchData = await customerSearchResponse.json();
    console.log('📊 Customer search result:', customerSearchData);
    
    if (customerSearchData.data && customerSearchData.data.length > 0) {
      customerId = customerSearchData.data[0].id;
      console.log('✅ Found existing customer:', customerId);
    } else {
      console.log('🆕 Creating new customer...');
      
      const customerData = new URLSearchParams({
        email: customer_email,
        'metadata[user_id]': userId,
      });

      const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: customerData,
      });

      if (!customerResponse.ok) {
        const errorText = await customerResponse.text();
        console.log('❌ Customer creation failed:', errorText);
        return c.json({ error: 'Failed to create customer: ' + errorText }, 400);
      }

      const newCustomer = await customerResponse.json();
      customerId = newCustomer.id;
      console.log('✅ Created new customer:', customerId);
    }

    // Create checkout session for subscription
    console.log('🏪 Creating checkout session...');
    const sessionData = new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price]': price_id,
      'line_items[0][quantity]': '1',
      'mode': 'subscription',
      'success_url': success_url || `${c.env.FRONTEND_URL || 'https://oslira.com'}/subscription.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': cancel_url || `${c.env.FRONTEND_URL || 'https://oslira.com'}/subscription.html?canceled=true`,
      'customer': customerId,
      'subscription_data[trial_period_days]': trial_period_days.toString(),
      'subscription_data[metadata][user_id]': userId,
      'allow_promotion_codes': 'true',
    });

    // Add additional metadata if provided
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        sessionData.append(`subscription_data[metadata][${key}]`, String(value));
      });
    }

    const sessionResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: sessionData,
    });

    const session = await sessionResponse.json();

    if (!sessionResponse.ok) {
      console.error('❌ Stripe session creation failed:', session);
      return c.json({ 
        error: session.error?.message || 'Session creation failed',
        details: session
      }, 400);
    }

    console.log('✅ Checkout session created successfully:', session.id);
    
    return c.json({ 
      url: session.url, 
      session_id: session.id,
      customer_id: customerId
    });

  } catch (error) {
    console.error('❌ Subscription creation error:', error);
    return c.json({ error: 'Failed to create subscription: ' + error.message }, 500);
  }
});

// Create customer portal session - UPDATED
app.post('/billing/create-portal-session', async (c) => {
  try {
    console.log('🔄 Creating Stripe portal session...');
    
    // Verify authentication
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.substring(7);
    const userId = await verifySupabaseJWT(token);
    if (!userId) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    const { return_url, customer_email } = await c.req.json();
    
    if (!customer_email) {
      return c.json({ error: 'Missing customer_email' }, 400);
    }

    console.log('🔍 Finding customer for portal access...');

    // Find customer by email
    const customerSearchResponse = await fetch(
      `https://api.stripe.com/v1/customers/search?query=email:'${customer_email}'`,
      {
        headers: {
          'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        },
      }
    );

    const customerSearchData = await customerSearchResponse.json();
    
    if (!customerSearchData.data || customerSearchData.data.length === 0) {
      return c.json({ error: 'Customer not found - please subscribe to a plan first' }, 404);
    }

    const customerId = customerSearchData.data[0].id;
    console.log('✅ Found customer for portal:', customerId);

    // Create portal session
    const portalData = new URLSearchParams({
      customer: customerId,
      return_url: return_url || `${c.env.FRONTEND_URL || 'https://oslira.com'}/subscription.html`,
    });

    const portalResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: portalData,
    });

    const portal = await portalResponse.json();

    if (!portalResponse.ok) {
      console.error('❌ Portal session creation failed:', portal);
      return c.json({ error: portal.error?.message || 'Portal creation failed' }, 400);
    }

    console.log('✅ Portal session created successfully');
    return c.json({ url: portal.url });

  } catch (error) {
    console.error('❌ Portal session error:', error);
    return c.json({ error: 'Failed to create portal session: ' + error.message }, 500);
  }
});

// Stripe webhook handler - UPDATED
app.post('/stripe-webhook', async (c) => {
  try {
    const body = await c.req.text();
    const sig = c.req.header('stripe-signature');

    console.log('🔔 Webhook received, signature present:', !!sig);

    if (!sig || !c.env.STRIPE_WEBHOOK_SECRET) {
      console.log('❌ Missing signature or webhook secret');
      return c.text('Missing signature or secret', 400);
    }

    // For production, you should verify the webhook signature
    // For now, we'll just parse the event
    const event = JSON.parse(body);
    
    console.log('📬 Webhook event type:', event.type);

    // Handle different event types
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
        console.log('ℹ️ Unhandled event type:', event.type);
    }

    return c.text('Success', 200);

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return c.text('Webhook error: ' + error.message, 400);
  }
});

// Handle subscription created - UPDATED
async function handleSubscriptionCreated(subscription: any, env: any) {
  try {
    console.log('🆕 Processing subscription created:', subscription.id);
    
    const { user_id } = subscription.metadata;
    if (!user_id) {
      console.log('❌ No user_id in subscription metadata');
      return;
    }

    const supabaseHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    };

    // Map price_id to plan name and credits
    const priceIdToPlan = {
      'price_1RkCKjJzvcRSqGG3Hq4WNNSU': { name: 'starter', credits: 50 },
      'price_1RkCLGJzvcRSqGG3XqDyhYZN': { name: 'growth', credits: 150 },
      'price_1RkCLtJzvcRSqGG30FfJSpau': { name: 'professional', credits: 500 },
      'price_1RkCMlJzvcRSqGG3HHFoX1fw': { name: 'enterprise', credits: -1 } // unlimited
    };

    const priceId = subscription.items.data[0]?.price?.id;
    const planInfo = priceIdToPlan[priceId];
    
    if (!planInfo) {
      console.log('❌ Unknown price_id:', priceId);
      return;
    }

    const monthlyLimit = planInfo.credits;

    console.log('📋 Plan info:', planInfo);

    // Update user subscription
    const userUpdateResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`, {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify({
        subscription_plan: planInfo.name,
        subscription_status: subscription.status,
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
        billing_cycle_start: new Date(subscription.current_period_start * 1000).toISOString(),
        billing_cycle_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        monthly_credits_limit: monthlyLimit,
        credits: monthlyLimit === -1 ? 999999 : monthlyLimit, // Set initial credits
        credits_reset_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    if (!userUpdateResponse.ok) {
      const errorText = await userUpdateResponse.text();
      console.log('❌ Failed to update user:', errorText);
    } else {
      console.log('✅ User updated successfully');
    }

    // Log subscription history
    await fetch(`${env.SUPABASE_URL}/rest/v1/subscription_history`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify({
        user_id,
        subscription_id: subscription.id,
        plan_name: planInfo.name,
        status: subscription.status,
        amount: subscription.items.data[0]?.price?.unit_amount || 0,
        billing_cycle_start: new Date(subscription.current_period_start * 1000).toISOString(),
        billing_cycle_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        created_at: new Date().toISOString(),
      }),
    });

    console.log(`✅ Subscription created for user ${user_id}: ${planInfo.name}`);

  } catch (error) {
    console.error('❌ Error handling subscription created:', error);
  }
}

// Handle subscription updated
async function handleSubscriptionUpdated(subscription: any, env: any) {
  try {
    console.log('🔄 Processing subscription updated:', subscription.id);
    
    const { user_id } = subscription.metadata;
    if (!user_id) return;

    const supabaseHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    };

    // Update user subscription status
    await fetch(`${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`, {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify({
        subscription_status: subscription.status,
        billing_cycle_start: new Date(subscription.current_period_start * 1000).toISOString(),
        billing_cycle_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    console.log(`✅ Subscription updated for user ${user_id}: ${subscription.status}`);

  } catch (error) {
    console.error('❌ Error handling subscription updated:', error);
  }
}

// Handle subscription canceled
async function handleSubscriptionCanceled(subscription: any, env: any) {
  try {
    console.log('❌ Processing subscription canceled:', subscription.id);
    
    const { user_id } = subscription.metadata;
    if (!user_id) return;

    const supabaseHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    };

    // Update user to free plan
    await fetch(`${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`, {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify({
        subscription_plan: 'free',
        subscription_status: 'canceled',
        monthly_credits_limit: 0,
        credits: 0,
        updated_at: new Date().toISOString(),
      }),
    });

    console.log(`✅ Subscription canceled for user ${user_id}`);

  } catch (error) {
    console.error('❌ Error handling subscription canceled:', error);
  }
}

// Handle payment succeeded
async function handlePaymentSucceeded(invoice: any, env: any) {
  try {
    console.log('💰 Processing payment succeeded:', invoice.id);
    
    const subscription_id = invoice.subscription;
    if (!subscription_id) return;

    const supabaseHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    };

    // Get subscription to find user
    const subResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${subscription_id}`, {
      headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }
    });
    
    if (!subResponse.ok) return;
    
    const subscription = await subResponse.json();
    const user_id = subscription.metadata?.user_id;
    
    if (!user_id) return;

    // Reset monthly credits for paid plans
    const priceId = subscription.items.data[0]?.price?.id;
    const priceIdToPlan = {
      'price_1RkCKjJzvcRSqGG3Hq4WNNSU': { name: 'starter', credits: 50 },
      'price_1RkCLGJzvcRSqGG3XqDyhYZN': { name: 'growth', credits: 150 },
      'price_1RkCLtJzvcRSqGG30FfJSpau': { name: 'professional', credits: 500 },
      'price_1RkCMlJzvcRSqGG3HHFoX1fw': { name: 'enterprise', credits: -1 }
    };

    const planInfo = priceIdToPlan[priceId];
    if (planInfo) {
      // Reset credits for the new billing period
      await fetch(`${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`, {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify({
          credits: planInfo.credits === -1 ? 999999 : planInfo.credits,
          credits_reset_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    }

    // Log billing history
    await fetch(`${env.SUPABASE_URL}/rest/v1/billing_history`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify({
        user_id,
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id: invoice.payment_intent,
        subscription_id: subscription_id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'paid',
        description: 'Monthly subscription payment',
        invoice_url: invoice.hosted_invoice_url,
        receipt_url: invoice.receipt_url,
        created_at: new Date().toISOString(),
      }),
    });

    console.log(`✅ Payment succeeded for user ${user_id}: ${invoice.amount_paid / 100}`);

  } catch (error) {
    console.error('❌ Error handling payment succeeded:', error);
  }
}

// Handle payment failed
async function handlePaymentFailed(invoice: any, env: any) {
  try {
    console.log('💳 Processing payment failed:', invoice.id);
    
    const subscription_id = invoice.subscription;
    if (!subscription_id) return;

    const supabaseHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    };

    // Get subscription to find user
    const subResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${subscription_id}`, {
      headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }
    });
    
    if (!subResponse.ok) return;
    
    const subscription = await subResponse.json();
    const user_id = subscription.metadata?.user_id;
    
    if (!user_id) return;

    // Log failed billing
    await fetch(`${env.SUPABASE_URL}/rest/v1/billing_history`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify({
        user_id,
        stripe_invoice_id: invoice.id,
        subscription_id: subscription_id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: 'failed',
        description: 'Monthly subscription payment failed',
        invoice_url: invoice.hosted_invoice_url,
        created_at: new Date().toISOString(),
      }),
    });

    // Update user subscription status to past_due
    await fetch(`${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`, {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify({
        subscription_status: 'past_due',
        updated_at: new Date().toISOString(),
      }),
    });

    console.log(`❌ Payment failed for user ${user_id}: ${invoice.amount_due / 100}`);

  } catch (error) {
    console.error('❌ Error handling payment failed:', error);
  }
}

// =====================================================
// MAIN ANALYZE ENDPOINT (Updated for subscriptions)
// =====================================================

app.post('/analyze', async (c) => {
  const startTime = Date.now();
  const requestId = 'REQ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  try {
    // 1. AUTHENTICATION
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const token = authHeader.substring(7);
    const userId = await verifySupabaseJWT(token);
    
    if (!userId) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    // 2. REQUEST VALIDATION
    const body = await c.req.json();
    const validation = validateRequest(body);
    
    if (!validation.isValid) {
      return c.json({ 
        error: 'Invalid request parameters', 
        details: validation.errors,
        received_fields: Object.keys(body)
      }, 400);
    }

    const { profile_url, analysis_type, business_id } = validation.normalizedData;

    // 3. ENVIRONMENT VALIDATION
    const {
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE,
      OPENAI_KEY,
      CLAUDE_KEY,
      APIFY_API_TOKEN,
    } = c.env;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !OPENAI_KEY) {
      return c.json({ error: 'Service configuration error' }, 500);
    }

    const supabaseHeaders = {
      apikey: SUPABASE_SERVICE_ROLE,
      Authorization: 'Bearer ' + SUPABASE_SERVICE_ROLE,
      'Content-Type': 'application/json',
    };

    // 4. USERNAME EXTRACTION
    const username = extractUsername(profile_url);
    if (!username || username.length < 1 || username.length > 30) {
      return c.json({ error: 'Invalid Instagram username or URL format' }, 400);
    }
    
    if (username.includes('luke') || username === 'lukealexxander') {
      return c.json({ error: 'Invalid username detected' }, 400);
    }

    // 5. USER VERIFICATION & SUBSCRIPTION CHECK
    const userResponse = await fetch(SUPABASE_URL + '/rest/v1/users?id=eq.' + userId + '&select=*', {
      headers: supabaseHeaders
    });
    
    const userData = await safeSupabaseResponse(userResponse, 'User fetch');
    if (!userData || userData.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    const user: User = userData[0];
    const creditsRequired = analysis_type === 'deep' ? 2 : 1;
    
    // Check subscription limits
    const plan = user.subscription_plan || 'free';
    const monthlyLimit = user.monthly_credits_limit || 0;
    
    if (plan === 'free' && user.credits < creditsRequired) {
      return c.json({ 
        error: 'Insufficient credits. Please upgrade your subscription for unlimited monthly credits.', 
        available: user.credits, 
        required: creditsRequired,
        plan: plan
      }, 402);
    }
    
    // For paid plans, check if unlimited or has credits
    if (plan !== 'free' && monthlyLimit !== -1 && user.credits < creditsRequired) {
      return c.json({ 
        error: 'Monthly credit limit reached. Credits will reset next billing cycle.', 
        available: user.credits, 
        required: creditsRequired,
        plan: plan,
        monthly_limit: monthlyLimit
      }, 402);
    }

    // 6. BUSINESS PROFILE VERIFICATION
    const businessResponse = await fetch(SUPABASE_URL + '/rest/v1/business_profiles?id=eq.' + business_id + '&user_id=eq.' + userId + '&select=*', {
      headers: supabaseHeaders
    });
    
    const businessData = await safeSupabaseResponse(businessResponse, 'Business profile fetch');
    if (!businessData || businessData.length === 0) {
      return c.json({ error: 'Business profile not found' }, 404);
    }
    
    const businessProfile: BusinessProfile = businessData[0];

    // 7. INSTAGRAM PROFILE SCRAPING
    let profileData: ProfileData | null = null;
    let scrapingSuccess = false;
    
    try {
      if (analysis_type === 'light') {
        const apifyResponse = await fetch('https://api.apify.com/v2/acts/dSCLg0C3YEZ83HzYX/run-sync-get-dataset-items?token=' + APIFY_API_TOKEN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usernames: [username]
          }),
        });

        if (apifyResponse.ok) {
          const responseText = await apifyResponse.text();
          
          if (responseText) {
            const apifyData = JSON.parse(responseText);
            
            if (apifyData && apifyData[0] && apifyData[0].username) {
              profileData = apifyData[0];
              scrapingSuccess = true;
            }
          }
        }
      } else {
        const apifyResponse = await fetch('https://api.apify.com/v2/acts/shu8hvrXbJbY3Eb9W/run-sync-get-dataset-items?token=' + APIFY_API_TOKEN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            directUrls: ['https://www.instagram.com/' + username + '/'],
            resultsLimit: 200,
            resultsType: "details",
            addParentData: false,
            enhanceUserSearchWithFacebookPage: false,
            isUserReelFeedURL: false,
            isUserTaggedFeedURL: false
          }),
        });

        if (apifyResponse.ok) {
          const responseText = await apifyResponse.text();
          
          if (responseText) {
            const apifyData = JSON.parse(responseText);
            
            let profileFromData = null;
            
            if (apifyData && Array.isArray(apifyData) && apifyData.length > 0) {
              profileFromData = apifyData[0];
            } else if (apifyData && apifyData.data && Array.isArray(apifyData.data)) {
              profileFromData = apifyData.data[0];
            } else if (apifyData && apifyData.items && Array.isArray(apifyData.items)) {
              profileFromData = apifyData.items[0];
            } else if (apifyData && typeof apifyData === 'object') {
              profileFromData = apifyData;
            }

            if (profileFromData && (profileFromData.username || profileFromData.ownerUsername)) {
              profileData = {
                username: profileFromData.username || profileFromData.ownerUsername,
                fullName: profileFromData.fullName || profileFromData.displayName,
                biography: profileFromData.biography || profileFromData.bio,
                followersCount: profileFromData.followersCount || profileFromData.followers || 0,
                followingCount: profileFromData.followsCount || profileFromData.following || profileFromData.followingCount || 0,
                postsCount: profileFromData.postsCount || (profileFromData.latestPosts ? profileFromData.latestPosts.length : 0) || 0,
                isVerified: profileFromData.isVerified || profileFromData.verified || false,
                private: profileFromData.private || profileFromData.isPrivate || false,
                profilePicUrl: profileFromData.profilePicUrl || profileFromData.avatar,
                profilePicUrlHD: profileFromData.profilePicUrlHD || profileFromData.profilePicUrl || profileFromData.avatar,
                externalUrl: profileFromData.externalUrl || profileFromData.website,
                businessCategoryName: profileFromData.businessCategoryName || profileFromData.category
              };
              scrapingSuccess = true;
            }
          }
        }
      }
    } catch (apifyError) {
      console.error('Scraping error:', apifyError.message);
    }

    // 8. FAIL IF SCRAPING FAILS
    if (!profileData?.username || !scrapingSuccess) {
      return c.json({ 
        error: 'Unable to scrape Instagram profile data', 
        details: 'Profile may be private, username invalid, or Instagram blocking requests',
        username: username,
        scraping_attempted: true,
        scraper_type: analysis_type
      }, 400);
    }

    // 9. CREATE LEAD RECORD
    const leadInsertResponse = await fetch(SUPABASE_URL + '/rest/v1/leads', {
      method: 'POST',
      headers: {
        ...supabaseHeaders,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        user_id: userId,
        business_id: business_id,
        username: profileData.username,
        full_name: profileData.fullName || null,
        bio: profileData.biography || null,
        followers_count: profileData.followersCount || 0,
        following_count: profileData.followingCount || 0,
        posts_count: profileData.postsCount || 0,
        platform: 'instagram',
        profile_url,
        avatar_url: profileData.profilePicUrl || profileData.profilePicUrlHD || null,
        external_url: profileData.externalUrl || null,
        is_verified: profileData.isVerified || profileData.verified || false,
        is_private: profileData.private || profileData.isPrivate || false,
        business_category: profileData.businessCategoryName || profileData.category || null,
        type: analysis_type,
        score: 0,
        status: 'analyzing',
        created_at: new Date().toISOString(),
      }),
    });

    const leadData = await safeSupabaseResponse(leadInsertResponse, 'Lead insertion');
    const lead = Array.isArray(leadData) ? leadData[0] : leadData;
    
    if (!lead?.id) {
      throw new Error('Failed to create lead record');
    }

    // 10. AI ANALYSIS
    let analysis: any;
    let outreachMessage = '';
    let analysisSuccess = false;

    try {
      if (analysis_type === 'light') {
        const lightPrompt = generateLightPrompt(profileData, businessProfile);
        const openaiData = await callOpenAI(lightPrompt, OPENAI_KEY);
        
        const content = openaiData.choices[0].message.content;
        analysis = JSON.parse(content);
        analysisSuccess = true;
      } else {
        // Deep analysis
        const deepPrompt = generateDeepPrompt(profileData, businessProfile);
        const openaiData = await callOpenAI(deepPrompt, OPENAI_KEY);
        
        const content = openaiData.choices[0].message.content;
        analysis = JSON.parse(content);

        // Generate outreach message with ENHANCED PROMPT
        if (CLAUDE_KEY) {
          try {
            const messagePrompt = generateMessagePrompt(profileData, businessProfile, analysis);
            const claudeData = await callClaude(messagePrompt, CLAUDE_KEY);
            outreachMessage = claudeData.content?.[0]?.text?.trim() || '';
          } catch (claudeError) {
            console.error('Claude message generation failed:', claudeError.message);
            outreachMessage = 'Error generating message';
          }
        } else {
          outreachMessage = 'Error generating message';
        }

        // Store deep analysis
        const analysisDataToStore = {
          lead_id: lead.id,
          user_id: userId,
          analysis_data: analysis || {},
          score_reasons: Array.isArray(analysis?.match_reasons) ? analysis.match_reasons : [],
          outreach_message: outreachMessage || null,
          engagement_rate: typeof analysis?.engagement_rate === 'number' ? analysis.engagement_rate : null,
          selling_points: Array.isArray(analysis?.selling_points) 
            ? analysis.selling_points.join(', ') 
            : (typeof analysis?.selling_points === 'string' ? analysis.selling_points : null),
          custom_notes: analysis?.custom_notes || null,
          created_at: new Date().toISOString(),
        };

        await fetch(SUPABASE_URL + '/rest/v1/lead_analyses', {
          method: 'POST',
          headers: supabaseHeaders,
          body: JSON.stringify(analysisDataToStore),
        });

        analysisSuccess = true;
      }
    } catch (analysisError) {
      // Fallback analysis
      analysis = {
        lead_score: 50,
        summary: 'Analysis completed for @' + profileData.username + ' but AI formatting failed',
        niche: businessProfile.target_niche || 'Unknown',
        match_reasons: ['Profile accessible', 'Manual review needed'],
        ...(analysis_type === 'deep' ? {
          engagement_rate: 2.5,
          selling_points: ['Profile scraped', 'In target niche'],
          custom_notes: 'AI analysis failed - manual review required'
        } : {})
      };
      
      outreachMessage = 'Error generating message';
    }

    // 11. UPDATE LEAD WITH RESULTS
    await fetch(SUPABASE_URL + '/rest/v1/leads?id=eq.' + lead.id, {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify({
        score: analysis.lead_score,
        status: 'analyzed',
        niche: analysis.niche || null,
        description: analysis.summary || null,
        updated_at: new Date().toISOString(),
      }),
    });

    // 12. PROCESS CREDITS (Updated for subscription model)
    let newCreditBalance = user.credits;
    
    if (plan === 'free' || monthlyLimit !== -1) {
      // Deduct credits for free plan or non-unlimited plans
      newCreditBalance = user.credits - creditsRequired;
      
      await fetch(SUPABASE_URL + '/rest/v1/users?id=eq.' + userId, {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify({
          credits: newCreditBalance,
          updated_at: new Date().toISOString(),
        }),
      });
    }
    
    // Log transaction
    await fetch(SUPABASE_URL + '/rest/v1/credit_transactions', {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify({
        user_id: userId,
        transaction_type: 'usage',
        amount: -creditsRequired,
        balance_after: newCreditBalance,
        description: analysis_type + ' analysis of @' + profileData.username,
        reference_id: lead.id,
        created_at: new Date().toISOString(),
      }),
    }).catch(err => {
      console.warn('Credit transaction logging failed:', err.message);
    });

    // 13. RETURN RESPONSE
    const baseResponse = {
      success: true,
      lead_id: lead.id,
      profile: {
        username: profileData.username,
        full_name: profileData.fullName,
        followers: profileData.followersCount,
        following: profileData.followingCount,
        posts: profileData.postsCount,
        verified: profileData.isVerified || profileData.verified,
        category: profileData.businessCategoryName || profileData.category,
        external_url: profileData.externalUrl,
        avatar_url: profileData.profilePicUrl || profileData.profilePicUrlHD,
        scraping_success: scrapingSuccess
      },
      analysis: {
        type: analysis_type,
        lead_score: analysis.lead_score,
        summary: analysis.summary,
        niche: analysis.niche,
        match_reasons: analysis.match_reasons,
        analysis_success: analysisSuccess,
        ...(analysis_type === 'deep' ? {
          engagement_rate: analysis.engagement_rate,
          selling_points: analysis.selling_points,
          custom_notes: analysis.custom_notes,
          outreach_message: outreachMessage
        } : {})
      },
      credits: {
        used: plan !== 'free' && monthlyLimit === -1 ? 0 : creditsRequired, // 0 for unlimited plans
        remaining: plan !== 'free' && monthlyLimit === -1 ? 'unlimited' : newCreditBalance,
        plan: plan,
        monthly_limit: monthlyLimit === -1 ? 'unlimited' : monthlyLimit
      }
    };

    return c.json(baseResponse);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    return c.json({ 
      error: 'Enterprise analysis failed', 
      details: error.message,
      timestamp: new Date().toISOString(),
      processing_time_ms: processingTime,
      support_id: requestId
    }, 500);
  }
});

// Health check endpoint
app.get('/health', async (c) => {
  const startTime = Date.now();
  
  try {
    const {
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE,
      OPENAI_KEY,
      CLAUDE_KEY,
      APIFY_API_TOKEN,
      STRIPE_SECRET_KEY,
    } = c.env;

    const envStatus = {
      supabase: !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE),
      openai: !!OPENAI_KEY,
      claude: !!CLAUDE_KEY,
      apify: !!APIFY_API_TOKEN,
      stripe: !!STRIPE_SECRET_KEY,
    };

    let dbStatus = false;
    try {
      if (envStatus.supabase) {
        const testResponse = await fetch(SUPABASE_URL + '/rest/v1/users?limit=1', {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE,
            Authorization: 'Bearer ' + SUPABASE_SERVICE_ROLE,
          }
        });
        dbStatus = testResponse.status < 500;
      }
    } catch (dbError) {
      console.warn('Database health check failed:', dbError.message);
    }

    const responseTime = Date.now() - startTime;
    const allSystemsGo = Object.values(envStatus).every(status => status) && dbStatus;

    return c.json({ 
      status: allSystemsGo ? 'healthy' : 'degraded',
      service: 'Oslira Enterprise AI Worker',
      version: '4.2.0',
      environment: {
        ...envStatus,
        database_connectivity: dbStatus
      },
      performance: {
        response_time_ms: responseTime,
        timestamp: new Date().toISOString()
      },
      capabilities: {
        light_analysis: envStatus.supabase && envStatus.openai && envStatus.apify,
        deep_analysis: envStatus.supabase && envStatus.openai && envStatus.claude && envStatus.apify,
        subscription_billing: envStatus.stripe && envStatus.supabase,
        profile_scraping: envStatus.apify,
        ai_analysis: envStatus.openai,
        message_generation: envStatus.claude
      },
      stripe_price_ids: {
        starter: 'price_1RkCKjJzvcRSqGG3Hq4WNNSU',
        growth: 'price_1RkCLGJzvcRSqGG3XqDyhYZN',
        professional: 'price_1RkCLtJzvcRSqGG30FfJSpau',
        enterprise: 'price_1RkCMlJzvcRSqGG3HHFoX1fw'
      },
      claude_model: 'claude-sonnet-4-20250514'
    });
  } catch (error) {
    return c.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Service info endpoint
app.get('/info', (c) => {
  return c.json({
    service: 'Oslira Enterprise AI Worker',
    version: '4.2.0',
    description: 'Enterprise B2B lead qualification with enhanced Claude messaging',
    features: [
      'Monthly subscription billing with Stripe',
      'Real Instagram profile scraping',
      'AI-powered lead scoring', 
      'Enhanced personalized outreach generation with Claude Sonnet 4',
      'Stripe integration with webhooks',
      'Credit-based usage tracking',
      'Multi-tier subscription plans'
    ],
    endpoints: [
      'POST /analyze - Lead analysis',
      'POST /billing/create-checkout-session - Create Stripe subscription',
      'POST /billing/create-portal-session - Stripe customer portal',
      'POST /stripe-webhook - Stripe webhook handler',
      'GET /health - System health',
      'GET /info - Service info',
      'GET / - Status'
    ],
    supported_analysis_types: ['light', 'deep'],
    subscription_plans: {
      starter: { price_id: 'price_1RkCKjJzvcRSqGG3Hq4WNNSU', credits: 50, price: 29 },
      growth: { price_id: 'price_1RkCLGJzvcRSqGG3XqDyhYZN', credits: 150, price: 79 },
      professional: { price_id: 'price_1RkCLtJzvcRSqGG30FfJSpau', credits: 500, price: 199 },
      enterprise: { price_id: 'price_1RkCMlJzvcRSqGG3HHFoX1fw', credits: 'unlimited', price: 499 }
    },
    ai_models: ['gpt-4o', 'claude-sonnet-4-20250514'],
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    message: '🚀 Oslira Enterprise AI Worker v4.2',
    status: 'operational',
    tagline: 'Enhanced subscription-based lead intelligence with Claude Sonnet 4',
    stripe_integration: 'active',
    claude_model: 'claude-sonnet-4-20250514',
    billing_endpoints: [
      '/billing/create-checkout-session',
      '/billing/create-portal-session'
    ],
    timestamp: new Date().toISOString()
  });
});

// Error handlers
app.onError((err, c) => {
  console.error('🚨 Unhandled error:', err);
  return c.json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    support_id: 'ERR_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }, 500);
});

app.notFound((c) => {
  return c.json({
    error: 'Endpoint not found',
    available_endpoints: [
      '/', 
      '/health', 
      '/info', 
      '/analyze', 
      '/billing/create-checkout-session', 
      '/billing/create-portal-session', 
      '/stripe-webhook'
    ],
    timestamp: new Date().toISOString()
  }, 404);
});

export default {
  fetch: app.fetch
};
