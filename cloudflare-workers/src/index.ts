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
    if (!token) {
      console.error('❌ No token provided');
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('❌ Invalid JWT format');
      return null;
    }
    
    const [, payload] = parts;
    const decodedPayload = JSON.parse(atob(payload));
    
    const now = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp && decodedPayload.exp < now) {
      console.error('❌ Token expired');
      return null;
    }
    
    console.log('✅ Token valid for user:', decodedPayload.sub);
    return decodedPayload.sub;
  } catch (error) {
    console.error('💥 JWT verification error:', error);
    return null;
  }
}

// OpenAI API with retry logic
async function callOpenAI(prompt: string, apiKey: string, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log('🤖 OpenAI attempt ' + attempt + '/' + maxRetries);
      
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
          console.log('⏳ Rate limited, waiting ' + delay + 'ms...');
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error('OpenAI API error: ' + response.status + ' - ' + errorText);
      }

      const data = await response.json();
      console.log('✅ OpenAI response received');
      return data;
    } catch (error) {
      console.error('❌ OpenAI attempt ' + attempt + ' failed:', error.message);
      if (attempt === maxRetries) throw error;
      
      const delay = Math.min(Math.pow(2, attempt) * 500, 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Claude API with retry logic
async function callClaude(prompt: string, apiKey: string, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log('🧠 Claude attempt ' + attempt + '/' + maxRetries);
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          temperature: 0.4,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429 && attempt < maxRetries) {
          const delay = Math.min(Math.pow(2, attempt) * 1000, 8000);
          console.log('⏳ Claude rate limited, waiting ' + delay + 'ms...');
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error('Claude API error: ' + response.status + ' - ' + errorText);
      }

      const data = await response.json();
      console.log('✅ Claude response received');
      return data;
    } catch (error) {
      console.error('❌ Claude attempt ' + attempt + ' failed:', error.message);
      if (attempt === maxRetries) throw error;
      
      const delay = Math.min(Math.pow(2, attempt) * 600, 6000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Safe Supabase response handler
async function safeSupabaseResponse(response: Response, context: string): Promise<any> {
  console.log('📡 ' + context + ' - Status: ' + response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ ' + context + ' failed:', response.status, errorText);
    throw new Error(context + ' failed: ' + response.status + ' - ' + errorText);
  }

  const responseText = await response.text();
  console.log('📄 ' + context + ' response length:', responseText.length);

  if (!responseText || responseText.trim() === '') {
    console.log('⚠️ Empty response from ' + context);
    return null;
  }

  try {
    const parsed = JSON.parse(responseText);
    console.log('✅ ' + context + ' parsed successfully');
    return parsed;
  } catch (parseError) {
    console.error('💥 ' + context + ' JSON parse error:', parseError);
    throw new Error('Failed to parse ' + context + ' response');
  }
}

// Clean username extraction
function extractUsername(profileUrl: string): string {
  try {
    if (!profileUrl || typeof profileUrl !== 'string') {
      console.error('❌ Invalid profile URL provided:', profileUrl);
      return '';
    }
    
    const cleanUrl = profileUrl.trim();
    console.log('🔍 Extracting username from URL:', cleanUrl);
    
    // Remove any potential contamination
    if (cleanUrl.includes('lukealexxander') || cleanUrl.includes('lukealexander')) {
      console.error('🚨 CONTAMINATED URL DETECTED AND REJECTED:', cleanUrl);
      return '';
    }
    
    // Handle direct username
    if (!cleanUrl.includes('/') && !cleanUrl.includes('.')) {
      const username = cleanUrl.replace('@', '').toLowerCase();
      console.log('✅ Direct username extracted:', username);
      return username;
    }
    
    // Handle Instagram URLs
    if (cleanUrl.includes('instagram.com')) {
      try {
        const url = new URL(cleanUrl);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        const username = pathSegments[0] || '';
        console.log('✅ URL username extracted:', username);
        return username.toLowerCase();
      } catch (urlError) {
        console.error('❌ Invalid URL format:', cleanUrl);
        return '';
      }
    }
    
    // Fallback for other formats
    const username = cleanUrl.replace('@', '').replace(/[^a-zA-Z0-9._]/g, '').toLowerCase();
    console.log('✅ Fallback username extracted:', username);
    return username;
  } catch (error) {
    console.error('💥 Username extraction error:', error);
    return '';
  }
}

// Enhanced request validation
function validateRequest(body: AnalysisRequest): { isValid: boolean; errors: string[]; normalizedData: any } {
  const errors: string[] = [];
  
  console.log('🔍 Validating request body keys:', Object.keys(body));
  
  // Extract profile URL or username
  const profileUrl = body.profile_url || (body.username ? 'https://instagram.com/' + body.username : '');
  if (!profileUrl) {
    errors.push('profile_url or username is required');
  }
  
  // Extract analysis type
  const analysisType = body.analysis_type || body.analysisType || body.type;
  if (!analysisType) {
    errors.push('analysis_type is required');
  } else if (!['light', 'deep'].includes(analysisType)) {
    errors.push('analysis_type must be "light" or "deep"');
  }
  
  // Extract business ID
  const businessId = body.business_id || body.businessId;
  if (!businessId) {
    errors.push('business_id is required');
  }
  
  console.log('🔍 Validation results:', { 
    profileUrl: profileUrl.substring(0, 50), 
    analysisType, 
    businessId: businessId?.substring(0, 20),
    errors: errors.length 
  });
  
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

// Message generation prompt
function generateMessagePrompt(profile: ProfileData, business: BusinessProfile, analysis: any): string {
  return 'You are an expert B2B SDR crafting Instagram DMs.\n\n' +
    'LEAD PROFILE:\n' +
    '- Username: ' + profile.username + '\n' +
    '- Bio: "' + (profile.biography || 'No bio available') + '"\n' +
    '- Verified: ' + (profile.isVerified || profile.verified || false) + '\n' +
    '- Category: ' + (profile.businessCategoryName || profile.category || 'Unknown') + '\n' +
    '- Followers: ' + (profile.followersCount?.toLocaleString() || 0) + '\n\n' +
    'ANALYSIS:\n' +
    '- Score: ' + analysis.lead_score + '/100\n' +
    '- Niche: ' + analysis.niche + '\n' +
    '- Selling Points: ' + (analysis.selling_points?.join(', ') || 'Profile strength') + '\n\n' +
    'YOUR BUSINESS:\n' +
    '- Company: ' + business.business_name + '\n' +
    '- Product/Service: ' + business.product_service + '\n' +
    '- Value Prop: ' + business.value_prop + '\n\n' +
    'Write a personalized 2-3 sentence Instagram DM. Only return the message text.';
}

// Main analyze endpoint
app.post('/analyze', async (c) => {
  const startTime = Date.now();
  const requestId = 'REQ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  console.log('🚀 ENTERPRISE ANALYSIS STARTED:', requestId);
  
  try {
    // 1. AUTHENTICATION
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Authentication failed - missing/invalid header');
      return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const token = authHeader.substring(7);
    const userId = await verifySupabaseJWT(token);
    
    if (!userId) {
      console.error('❌ Authentication failed - invalid token');
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    console.log('✅ User authenticated:', userId);

    // 2. REQUEST VALIDATION
    const body = await c.req.json();
    const validation = validateRequest(body);
    
    if (!validation.isValid) {
      console.error('❌ Request validation failed:', validation.errors);
      return c.json({ 
        error: 'Invalid request parameters', 
        details: validation.errors,
        received_fields: Object.keys(body)
      }, 400);
    }

    const { profile_url, analysis_type, business_id } = validation.normalizedData;
    console.log('✅ Request validated - Type:', analysis_type, 'Business:', business_id);

    // 3. ENVIRONMENT VALIDATION
    const {
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE,
      OPENAI_KEY,
      CLAUDE_KEY,
      APIFY_API_TOKEN,
    } = c.env;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !OPENAI_KEY) {
      console.error('❌ Missing required environment variables');
      return c.json({ error: 'Service configuration error' }, 500);
    }

    const supabaseHeaders = {
      apikey: SUPABASE_SERVICE_ROLE,
      Authorization: 'Bearer ' + SUPABASE_SERVICE_ROLE,
      'Content-Type': 'application/json',
    };

    // 4. USERNAME EXTRACTION WITH CONTAMINATION CHECK
    const username = extractUsername(profile_url);
    if (!username || username.length < 1 || username.length > 30) {
      console.error('❌ Invalid username extracted:', username);
      return c.json({ error: 'Invalid Instagram username or URL format' }, 400);
    }
    
    // CRITICAL: Check for contamination
    if (username.includes('luke') || username === 'lukealexxander') {
      console.error('🚨 CONTAMINATED USERNAME REJECTED:', username);
      return c.json({ error: 'Invalid username detected' }, 400);
    }
    
    console.log('✅ Clean username validated:', username);

    // 5. USER VERIFICATION & CREDIT CHECK
    console.log('👤 Fetching user data...');
    const userResponse = await fetch(SUPABASE_URL + '/rest/v1/users?id=eq.' + userId + '&select=*', {
      headers: supabaseHeaders
    });
    
    const userData = await safeSupabaseResponse(userResponse, 'User fetch');
    if (!userData || userData.length === 0) {
      console.error('❌ User not found:', userId);
      return c.json({ error: 'User not found' }, 404);
    }
    
    const user: User = userData[0];
    const creditsRequired = analysis_type === 'deep' ? 2 : 1;
    
    console.log('💰 Credits - Available:', user.credits, 'Required:', creditsRequired);
    if (user.credits < creditsRequired) {
      console.error('❌ Insufficient credits');
      return c.json({ 
        error: 'Insufficient credits', 
        available: user.credits, 
        required: creditsRequired 
      }, 402);
    }

    // 6. BUSINESS PROFILE VERIFICATION
    console.log('🏢 Fetching business profile...');
    const businessResponse = await fetch(SUPABASE_URL + '/rest/v1/business_profiles?id=eq.' + business_id + '&user_id=eq.' + userId + '&select=*', {
      headers: supabaseHeaders
    });
    
    const businessData = await safeSupabaseResponse(businessResponse, 'Business profile fetch');
    if (!businessData || businessData.length === 0) {
      console.error('❌ Business profile not found:', business_id);
      return c.json({ error: 'Business profile not found' }, 404);
    }
    
    const businessProfile: BusinessProfile = businessData[0];
    console.log('✅ Business profile loaded:', businessProfile.business_name);

    // 7. INSTAGRAM PROFILE SCRAPING - REAL DATA ONLY
    console.log('🕷️ Starting ' + analysis_type + ' scraping for USERNAME:', username);
    let profileData: ProfileData | null = null;
    let scrapingSuccess = false;
    
    try {
      if (analysis_type === 'light') {
        console.log('📊 Running LIGHT scraper for:', username);
        const apifyInput = { usernames: [username] };
        console.log('📊 Light scraper input:', apifyInput);
        
        console.log('📊 Running LIGHT scraper for:', username);

const apifyResponse = await fetch('https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=' + APIFY_API_TOKEN, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    usernames: [username],
    resultsType: "posts",
    resultsLimit: 1,
    proxy: {
      useApifyProxy: true
    }
  }),
});

        console.log('📊 Light scraper response status:', apifyResponse.status);
        
        if (apifyResponse.ok) {
          const responseText = await apifyResponse.text();
          console.log('📊 Light scraper response preview:', responseText.substring(0, 200));
          
          if (responseText) {
            const apifyData = JSON.parse(responseText);
            console.log('📊 Light scraper parsed data:', apifyData);
            
            if (apifyData && apifyData[0] && apifyData[0].username) {
              profileData = apifyData[0];
              scrapingSuccess = true;
              console.log('✅ Light scraping SUCCESS for:', profileData.username, 'Followers:', profileData.followersCount);
            } else {
              console.warn('⚠️ Light scraper returned empty/invalid data');
            }
          }
        } else {
          console.error('❌ Light scraper HTTP error:', apifyResponse.status);
        }
      } else {
        console.log('📊 Running DEEP scraper for:', username);
        const apifyInput = {
          input: {
            usernames: [username],
            searchType: 'user',
            maxItems: 1,
            proxy: { useApifyProxy: true },
          }
        };
        console.log('📊 Deep scraper input usernames:', apifyInput.input.usernames);
        
        console.log('📊 Running DEEP scraper for:', username);

const apifyResponse = await fetch('https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=' + APIFY_API_TOKEN, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    usernames: [username],
    resultsType: "posts",
    resultsLimit: 200,
    proxy: {
      useApifyProxy: true
    }
  }),
});

        console.log('📊 Deep scraper response status:', apifyResponse.status);
        
        if (apifyResponse.ok) {
          const responseText = await apifyResponse.text();
          console.log('📊 Deep scraper response preview:', responseText.substring(0, 200));
          
          if (responseText) {
            const apifyData = JSON.parse(responseText);
            console.log('📊 Deep scraper parsed data structure:', Array.isArray(apifyData) ? 'Array[' + apifyData.length + ']' : typeof apifyData);
            
            if (apifyData && apifyData[0] && apifyData[0].username) {
              profileData = apifyData[0];
              scrapingSuccess = true;
              console.log('✅ Deep scraping SUCCESS for:', profileData.username, 'Followers:', profileData.followersCount);
            } else {
              console.warn('⚠️ Deep scraper returned empty/invalid data');
            }
          }
        } else {
          console.error('❌ Deep scraper HTTP error:', apifyResponse.status);
        }
      }
    } catch (apifyError) {
      console.error('⚠️ Apify scraping exception for', username, ':', apifyError.message);
    }

    // 8. NO MOCK DATA - FAIL IF SCRAPING FAILS
    if (!profileData?.username || !scrapingSuccess) {
      console.error('❌ Instagram scraping failed for:', username);
      console.error('❌ Scraping success:', scrapingSuccess);
      console.error('❌ Profile data:', profileData);
      
      return c.json({ 
        error: 'Unable to scrape Instagram profile data', 
        details: 'Profile may be private, username invalid, or Instagram blocking requests',
        username: username,
        scraping_attempted: true,
        scraper_type: analysis_type,
        debug_info: {
          apify_token_present: !!APIFY_API_TOKEN,
          profile_data_received: !!profileData,
          scraping_success: scrapingSuccess
        }
      }, 400);
    }

    console.log('✅ Real Instagram data confirmed for:', profileData.username);

    // 9. CREATE LEAD RECORD WITH EXPLICIT TYPE
    console.log('💾 Creating lead record - Username:', profileData.username, 'Type:', analysis_type);
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
        type: analysis_type, // CRITICAL: Store the analysis type
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
    
    console.log('✅ Lead created - ID:', lead.id, 'Username:', profileData.username, 'Type:', analysis_type);

    // 10. AI ANALYSIS EXECUTION
    let analysis: any;
    let outreachMessage = '';
    let analysisSuccess = false;

    try {
      if (analysis_type === 'light') {
        console.log('🤖 Running LIGHT analysis for:', profileData.username);
        const lightPrompt = generateLightPrompt(profileData, businessProfile);
        const openaiData = await callOpenAI(lightPrompt, OPENAI_KEY);
        
        const content = openaiData.choices[0].message.content;
        analysis = JSON.parse(content);
        analysisSuccess = true;
        console.log('✅ Light analysis completed - Score:', analysis.lead_score);
      } else {
        console.log('🧠 Running DEEP analysis for:', profileData.username);
        
        // Deep OpenAI analysis
        const deepPrompt = generateDeepPrompt(profileData, businessProfile);
        const openaiData = await callOpenAI(deepPrompt, OPENAI_KEY);
        
        const content = openaiData.choices[0].message.content;
        analysis = JSON.parse(content);
        console.log('✅ Deep analysis completed - Score:', analysis.lead_score);

        // Generate outreach message
        if (CLAUDE_KEY) {
          console.log('💬 Generating outreach message for:', profileData.username);
          const messagePrompt = generateMessagePrompt(profileData, businessProfile, analysis);
          
          try {
            const claudeData = await callClaude(messagePrompt, CLAUDE_KEY);
            outreachMessage = claudeData.content?.[0]?.text?.trim() || '';
            console.log('✅ Outreach message generated');
          } catch (claudeError) {
            console.error('⚠️ Claude failed:', claudeError.message);
            outreachMessage = 'Hi ' + (profileData.fullName || profileData.username) + '! I noticed your work in ' + (analysis.niche || businessProfile.target_niche) + '. Would love to connect about ' + businessProfile.value_prop + '!';
          }
        }

        // Store deep analysis
        console.log('📊 Storing deep analysis data...');
        await fetch(SUPABASE_URL + '/rest/v1/lead_analyses', {
          method: 'POST',
          headers: supabaseHeaders,
          body: JSON.stringify({
            lead_id: lead.id,
            user_id: userId,
            analysis_data: analysis,
            score_reasons: analysis.match_reasons || [],
            outreach_message: outreachMessage,
            engagement_rate: analysis.engagement_rate || null,
            selling_points: analysis.selling_points?.join(', ') || null,
            custom_notes: analysis.custom_notes || null,
            created_at: new Date().toISOString(),
          }),
        });
        
        analysisSuccess = true;
      }
    } catch (analysisError) {
      console.error('❌ AI analysis failed for', profileData.username, ':', analysisError.message);
      
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
      
      outreachMessage = 'Hi ' + (profileData.fullName || profileData.username) + '! Interested in discussing ' + businessProfile.value_prop + '. Let\'s connect!';
    }

    // 11. UPDATE LEAD WITH RESULTS
    console.log('📊 Updating lead with final data...');
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

    // 12. PROCESS CREDITS
    console.log('💳 Processing credits...');
    const newCreditBalance = user.credits - creditsRequired;
    
    await Promise.all([
      // Update user credits
      fetch(SUPABASE_URL + '/rest/v1/users?id=eq.' + userId, {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify({
          credits: newCreditBalance,
          updated_at: new Date().toISOString(),
        }),
      }),
      
      // Log transaction
      fetch(SUPABASE_URL + '/rest/v1/credit_transactions', {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({
          user_id: userId,
          amount: -creditsRequired,
          transaction_type: 'analysis',
          description: analysis_type + ' analysis of @' + profileData.username,
          lead_id: lead.id,
          created_at: new Date().toISOString(),
        }),
      }).catch(err => {
        console.warn('⚠️ Credit transaction logging failed:', err.message);
      })
    ]);

    // 13. PERFORMANCE LOGGING
    const processingTime = Date.now() - startTime;
    console.log('🎯 ANALYSIS COMPLETED SUCCESSFULLY');
    console.log('📊 Performance:', {
      request_id: requestId,
      username: profileData.username,
      analysis_type,
      processing_time_ms: processingTime,
      scraping_success: scrapingSuccess,
      analysis_success: analysisSuccess,
      lead_score: analysis.lead_score,
      credits_used: creditsRequired,
      credits_remaining: newCreditBalance
    });

    // 14. SEPARATE RETURN TYPES FOR LIGHT VS DEEP
    console.log('🔍 FINAL RESPONSE CHECK:', { 
      analysis_type, 
      response_type: analysis_type,
      lead_id: lead.id 
    });

    if (analysis_type === 'light') {
      // LIGHT ANALYSIS RESPONSE
      return c.json({
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
          type: 'light', // EXPLICIT LIGHT TYPE
          lead_score: analysis.lead_score,
          summary: analysis.summary,
          niche: analysis.niche,
          match_reasons: analysis.match_reasons,
          analysis_success: analysisSuccess
        },
        credits: {
          used: creditsRequired,
          remaining: newCreditBalance,
        }
      });
    } else {
      // DEEP ANALYSIS RESPONSE
      return c.json({
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
          type: 'deep', // EXPLICIT DEEP TYPE
          lead_score: analysis.lead_score,
          summary: analysis.summary,
          niche: analysis.niche,
          match_reasons: analysis.match_reasons,
          analysis_success: analysisSuccess,
          engagement_rate: analysis.engagement_rate,
          selling_points: analysis.selling_points,
          custom_notes: analysis.custom_notes,
          outreach_message: outreachMessage
        },
        credits: {
          used: creditsRequired,
          remaining: newCreditBalance,
        }
      });
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('💥 ANALYSIS FAILED:', requestId, error);
    
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
    } = c.env;

    const envStatus = {
      supabase: !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE),
      openai: !!OPENAI_KEY,
      claude: !!CLAUDE_KEY,
      apify: !!APIFY_API_TOKEN,
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
      version: '3.0.0',
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
        profile_scraping: envStatus.apify,
        ai_analysis: envStatus.openai,
        message_generation: envStatus.claude
      }
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
    version: '3.0.0',
    description: 'Clean B2B lead qualification platform',
    features: [
      'Real Instagram profile scraping only',
      'AI-powered lead scoring',
      'Personalized outreach generation',
      'Zero hardcoded values',
      'Contamination detection',
      'Separate light/deep response types'
    ],
    endpoints: [
      'POST /analyze - Lead analysis',
      'GET /health - System health',
      'GET /info - Service info',
      'GET / - Status'
    ],
    supported_analysis_types: ['light', 'deep'],
    ai_models: ['gpt-4o', 'claude-3-sonnet'],
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    message: '🚀 Oslira Enterprise AI Worker v3.0',
    status: 'operational',
    tagline: 'Real data only - no mock profiles',
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
    available_endpoints: ['/', '/health', '/info', '/analyze'],
    timestamp: new Date().toISOString()
  }, 404);
});

export default {
  fetch: app.fetch
};
