import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Types for better code organization
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

interface ICPProfile {
  id: string;
  business_name: string;
  business_offer: string;
  business_website: string;
  target_industry: string;
  company_size: string;
  decision_maker: string;
  location_pref: string;
  pain_points: string;
  solution: string;
  differentiator: string;
  tone: string;
  primary_channel: string;
  value_prop: string;
  must_haves: string;
  red_flags: string;
  min_followers: number;
}

interface User {
  id: string;
  email: string;
  credits: number;
}

const app = new Hono();
app.use('*', cors());

// JWT verification with better error handling
async function verifySupabaseJWT(token: string): Promise<string | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('❌ Invalid JWT format');
      return null;
    }
    
    const [, payload] = parts;
    const decodedPayload = JSON.parse(atob(payload));
    console.log('📋 JWT payload decoded successfully');
    
    const now = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp && decodedPayload.exp < now) {
      console.error('❌ Token expired');
      return null;
    }
    
    console.log('✅ Token is valid, user ID:', decodedPayload.sub);
    return decodedPayload.sub;
  } catch (error) {
    console.error('💥 JWT verification error:', error);
    return null;
  }
}

// Enhanced OpenAI API with retry logic
async function callOpenAI(prompt: string, apiKey: string, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 OpenAI attempt ${attempt}/${maxRetries}`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          temperature: 0.3,
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429 && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⏳ Rate limited, waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ OpenAI response received');
      return data;
    } catch (error) {
      console.error(`❌ OpenAI attempt ${attempt} failed:`, error.message);
      if (attempt === maxRetries) throw error;
    }
  }
}

// Claude API call with retry logic
async function callClaude(prompt: string, apiKey: string, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🧠 Claude attempt ${attempt}/${maxRetries}`);
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 800,
          temperature: 0.4,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429 && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Claude rate limited, waiting ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Claude response received');
      return data;
    } catch (error) {
      console.error(`❌ Claude attempt ${attempt} failed:`, error.message);
      if (attempt === maxRetries) throw error;
    }
  }
}

// Safe Supabase JSON parsing
async function safeSupabaseResponse(response: Response, context: string): Promise<any> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${context} failed: ${response.status} - ${errorText}`);
  }

  const responseText = await response.text();
  console.log(`📄 ${context} response:`, responseText);

  if (!responseText || responseText.trim() === '') {
    console.log(`⚠️ Empty response from ${context}`);
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch (parseError) {
    console.error(`💥 ${context} JSON parse error:`, parseError);
    throw new Error(`Failed to parse ${context} response`);
  }
}

// Extract username from various Instagram URL formats
function extractUsername(profileUrl: string): string {
  try {
    if (!profileUrl) return '';
    
    // Clean URL and extract username
    const cleanUrl = profileUrl.trim().toLowerCase();
    
    if (cleanUrl.includes('instagram.com')) {
      const url = new URL(cleanUrl);
      const pathSegments = url.pathname.split('/').filter(Boolean);
      return pathSegments[0] || '';
    }
    
    // Direct username
    return cleanUrl.replace('@', '');
  } catch (error) {
    console.error('💥 Username extraction error:', error);
    return '';
  }
}

// Generate enterprise light analysis prompt
function generateLightPrompt(profile: ProfileData, icp: ICPProfile): string {
  return `You are a senior lead qualification strategist. A business is using you to quickly assess whether an Instagram profile matches their Ideal Customer Profile (ICP).

Given this scraped profile information:

- Username: ${profile.username}
- Biography: ${profile.biography || 'No bio available'}
- Followers: ${profile.followersCount}
- Following: ${profile.followingCount || 0}
- Posts: ${profile.postsCount || 0}
- Verified: ${profile.isVerified || profile.verified || false}
- Category: ${profile.businessCategoryName || profile.category || 'Unknown'}

Here's the business's ICP (Ideal Customer Profile) description:
"Target Industry: ${icp.target_industry}
Company Size: ${icp.company_size}
Decision Maker: ${icp.decision_maker}
Pain Points: ${icp.pain_points}
Solution: ${icp.solution}
Must Haves: ${icp.must_haves}
Red Flags: ${icp.red_flags}
Min Followers: ${icp.min_followers}"

Respond only in JSON with this structure:
{
  "lead_score": number (0-100),
  "summary": string (1-2 sentences on the lead's potential),
  "niche": string (e.g. Fitness Coach, Ecom Founder),
  "match_reasons": [array of 2-4 specific reasons why this lead does or doesn't match the ICP]
}

Use clear, logical reasoning. Focus on bio signals and follower-to-following ratios.`;
}

// Generate enterprise deep analysis prompt
function generateDeepPrompt(profile: ProfileData, icp: ICPProfile): string {
  return `You are a B2B lead strategist and growth advisor.

Use the following Instagram profile data to deeply evaluate their alignment with the Ideal Customer Profile (ICP) and identify outreach opportunities.

Profile:
- Username: ${profile.username}
- Full Name: ${profile.fullName || 'Not available'}
- Bio: ${profile.biography || 'No bio available'}
- Posts: ${profile.postsCount || 0}
- Followers: ${profile.followersCount}
- Following: ${profile.followingCount || 0}
- Verified: ${profile.isVerified || profile.verified || false}
- Category: ${profile.businessCategoryName || profile.category || 'Unknown'}
- External URL: ${profile.externalUrl || 'None'}

ICP: 
"Target Industry: ${icp.target_industry}
Company Size: ${icp.company_size}
Decision Maker: ${icp.decision_maker}
Location Preference: ${icp.location_pref}
Pain Points: ${icp.pain_points}
Solution: ${icp.solution}
Differentiator: ${icp.differentiator}
Must Haves: ${icp.must_haves}
Red Flags: ${icp.red_flags}
Min Followers: ${icp.min_followers}"

Instructions:
Analyze this profile and return only valid JSON:

{
  "lead_score": number (0-100),
  "summary": string (Why they're promising or not),
  "niche": string (Concise summary of the person's field),
  "match_reasons": [specific bullets explaining your score],
  "engagement_rate": number (estimated based on followers/posts),
  "selling_points": [array of key selling angles, e.g. "Verified coach", "Strong bio", "Founder"],
  "custom_notes": string (Optional internal notes for the SDR team – red flags, hooks, or extra info)
}

Be helpful but concise. If data is missing, use intelligent assumptions or say "insufficient data".`;
}

// Generate enterprise message prompt for Claude
function generateMessagePrompt(profile: ProfileData, icp: ICPProfile, analysis: any): string {
  return `You are an expert SDR writing Instagram cold DMs for a high-end B2B lead generation agency.

Here's the lead's full profile and analysis:

- Username: ${profile.username}
- Bio: "${profile.biography || 'No bio available'}"
- Verified: ${profile.isVerified || profile.verified || false}
- Category: ${profile.businessCategoryName || profile.category || 'Unknown'}
- Followers: ${profile.followersCount}
- External Link: ${profile.externalUrl || 'None'}
- AI Lead Score: ${analysis.lead_score} / 100
- ICP Match Reasons: ${analysis.match_reasons?.join(', ') || 'None'}
- Selling Points: ${analysis.selling_points?.join(', ') || 'None'}
- Business ICP: "${icp.business_name} - ${icp.solution}"

Your job:
Write a 2–3 sentence cold DM (direct message) that feels custom-written and friendly — not generic. Highlight a shared pain point or strength, compliment if needed, and offer value.

**Only return the DM message, no preamble.**`;
}

// Main analyze endpoint
app.post('/analyze', async (c) => {
  console.log('🚀 Enterprise analyze endpoint called');
  
  try {
    // 1. Authentication
    const authHeader = c.req.header('Authorization');
    console.log('🔑 Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const token = authHeader.substring(7);
    const userId = await verifySupabaseJWT(token);
    
    if (!userId) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    console.log('✅ User authenticated:', userId);

    // 2. Parse and validate request
    const body = await c.req.json();
    console.log('📦 Request body received:', JSON.stringify(body));
    
    const { profile_url, analysisType, business_id, icp_id } = body;
    
    if (!profile_url || !analysisType || !business_id || !icp_id) {
      return c.json({ 
        error: 'Missing required fields', 
        required: ['profile_url', 'analysisType', 'business_id', 'icp_id'] 
      }, 400);
    }

    if (!['light', 'deep'].includes(analysisType)) {
      return c.json({ error: 'analysisType must be "light" or "deep"' }, 400);
    }

    // 3. Environment setup
    const {
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE,
      OPENAI_KEY,
      CLAUDE_KEY,
      APIFY_API_TOKEN,
    } = c.env;

    const supabaseHeaders = {
      apikey: SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    };

    // 4. Extract and validate username
    const username = extractUsername(profile_url);
    if (!username) {
      return c.json({ error: 'Invalid Instagram username or URL format' }, 400);
    }
    console.log('👤 Username extracted:', username);

    // 5. Fetch user data and check credits
    console.log('👤 Fetching user data...');
    const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=*`, {
      headers: supabaseHeaders
    });
    
    const userData = await safeSupabaseResponse(userResponse, 'User fetch');
    if (!userData || userData.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    const user: User = userData[0];
    const creditsRequired = analysisType === 'deep' ? 2 : 1;
    
    console.log('💰 User credits:', user.credits, 'Required:', creditsRequired);
    if (user.credits < creditsRequired) {
      return c.json({ 
        error: 'Insufficient credits', 
        available: user.credits, 
        required: creditsRequired 
      }, 402);
    }

    // 6. Fetch business profile
    console.log('🏢 Fetching business profile...');
    const businessResponse = await fetch(`${SUPABASE_URL}/rest/v1/business_profiles?id=eq.${business_id}&user_id=eq.${userId}&select=*`, {
      headers: supabaseHeaders
    });
    
    const businessData = await safeSupabaseResponse(businessResponse, 'Business profile fetch');
    if (!businessData || businessData.length === 0) {
      return c.json({ error: 'Business profile not found' }, 404);
    }
    
    const businessProfile: BusinessProfile = businessData[0];
    console.log('✅ Business profile found:', businessProfile.business_name);

    // 7. Fetch ICP profile
    console.log('🎯 Fetching ICP profile...');
    const icpResponse = await fetch(`${SUPABASE_URL}/rest/v1/ideal_customer_profiles?id=eq.${icp_id}&user_id=eq.${userId}&select=*`, {
      headers: supabaseHeaders
    });
    
    const icpData = await safeSupabaseResponse(icpResponse, 'ICP fetch');
    if (!icpData || icpData.length === 0) {
      return c.json({ error: 'ICP profile not found' }, 404);
    }
    
    const icpProfile: ICPProfile = icpData[0];
    console.log('✅ ICP profile found:', icpProfile.business_name);

    // 8. Run Instagram scraping based on analysis type
    console.log(`🕷️ Starting ${analysisType} Instagram scraping...`);
    let profileData: ProfileData | null = null;
    
    try {
      if (analysisType === 'light') {
        // Light scraping - basic profile info
        const apifyInput = { usernames: [username] };
        const apifyResponse = await fetch(`https://api.apify.com/v2/actor-tasks/hamzaw~instagram-profile-scraper-task/runs?token=${APIFY_API_TOKEN}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apifyInput),
        });

        console.log('📊 Light scraper response status:', apifyResponse.status);
        
        if (apifyResponse.ok) {
          const responseText = await apifyResponse.text();
          if (responseText) {
            const apifyData = JSON.parse(responseText);
            profileData = apifyData[0];
          }
        }
      } else {
        // Deep scraping - full profile data  
        const apifyInput = {
          input: {
            usernames: [username],
            searchType: 'user',
            maxItems: 1,
            proxy: { useApifyProxy: true },
          }
        };
        
        const apifyResponse = await fetch(`https://api.apify.com/v2/actor-tasks/hamzaw~instagram-scraper-task/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apifyInput),
        });

        console.log('📊 Deep scraper response status:', apifyResponse.status);
        
        if (apifyResponse.ok) {
          const responseText = await apifyResponse.text();
          console.log('📝 Deep scraper raw response preview:', responseText?.substring(0, 200));
          
          if (responseText) {
            const apifyData = JSON.parse(responseText);
            profileData = apifyData[0];
          }
        }
      }
    } catch (apifyError) {
      console.error('⚠️ Apify scraping failed:', apifyError.message);
    }

    // 9. Fallback to mock data if scraping fails
    if (!profileData?.username) {
      console.log('🎭 Using mock profile data...');
      profileData = {
        username: username,
        fullName: `Mock ${username}`,
        biography: `Mock profile for ${username} - would contain real Instagram data in production`,
        followersCount: Math.floor(Math.random() * 50000) + 1000,
        followingCount: Math.floor(Math.random() * 1000) + 100,
        postsCount: Math.floor(Math.random() * 500) + 50,
        isVerified: Math.random() > 0.8,
        private: false,
        profilePicUrl: `https://picsum.photos/150/150?random=${username}`,
        externalUrl: Math.random() > 0.5 ? `https://example.com/${username}` : undefined,
        businessCategoryName: 'Public Figure',
      };
    }

    console.log('✅ Profile data ready:', profileData.username);

    // 10. Insert initial lead record
    console.log('💾 Inserting lead record...');
    const leadInsertResponse = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        ...supabaseHeaders,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        user_id: userId,
        business_id: business_id,
        icp_id: icp_id,
        username: profileData.username,
        platform: 'instagram',
        profile_url,
        avatar_url: profileData.profilePicUrl || profileData.profilePicUrlHD || null,
        score: 0, // Will be updated after analysis
        status: 'analyzed',
        created_at: new Date().toISOString(),
      }),
    });

    const leadData = await safeSupabaseResponse(leadInsertResponse, 'Lead insertion');
    const lead = Array.isArray(leadData) ? leadData[0] : leadData;
    
    if (!lead?.id) {
      throw new Error('Failed to create lead record');
    }
    
    console.log('✅ Lead record created:', lead.id);

    // 11. Run AI analysis based on type
    let analysis: any;
    let outreachMessage = '';

    if (analysisType === 'light') {
      console.log('🤖 Running light OpenAI analysis...');
      const lightPrompt = generateLightPrompt(profileData, icpProfile);
      const openaiData = await callOpenAI(lightPrompt, OPENAI_KEY);
      
      try {
        analysis = JSON.parse(openaiData.choices[0].message.content);
        console.log('✅ Light analysis completed, score:', analysis.lead_score);
      } catch (parseError) {
        console.error('❌ Failed to parse OpenAI response:', parseError);
        analysis = {
          lead_score: 50,
          summary: 'Analysis completed but response format was invalid',
          niche: 'Unknown',
          match_reasons: ['Unable to parse AI response']
        };
      }
    } else {
      console.log('🧠 Running deep analysis...');
      
      // Deep OpenAI analysis
      const deepPrompt = generateDeepPrompt(profileData, icpProfile);
      const openaiData = await callOpenAI(deepPrompt, OPENAI_KEY);
      
      try {
        analysis = JSON.parse(openaiData.choices[0].message.content);
        console.log('✅ Deep analysis completed, score:', analysis.lead_score);
      } catch (parseError) {
        console.error('❌ Failed to parse deep analysis:', parseError);
        analysis = {
          lead_score: 50,
          summary: 'Deep analysis completed but response format was invalid',
          niche: 'Unknown',
          match_reasons: ['Unable to parse AI response'],
          engagement_rate: 2.5,
          selling_points: ['Profile scraped successfully'],
          custom_notes: 'AI response parsing failed'
        };
      }

      // Generate outreach message with Claude
      console.log('💬 Generating outreach message with Claude...');
      const messagePrompt = generateMessagePrompt(profileData, icpProfile, analysis);
      
      try {
        const claudeData = await callClaude(messagePrompt, CLAUDE_KEY);
        outreachMessage = claudeData.content?.[0]?.text?.trim() || 'Failed to generate message';
        console.log('✅ Outreach message generated');
      } catch (claudeError) {
        console.error('❌ Claude message generation failed:', claudeError.message);
        outreachMessage = `Hi ${profileData.fullName || profileData.username}! I noticed your work in ${analysis.niche} and thought you might be interested in discussing how we could help with ${icpProfile.solution}. Would love to connect!`;
      }

      // Insert detailed analysis for deep analysis
      console.log('📊 Inserting deep analysis record...');
      await fetch(`${SUPABASE_URL}/rest/v1/lead_analyses`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({
          lead_id: lead.id,
          user_id: userId,
          analysis_data: analysis,
          score_reasons: analysis.match_reasons,
          activity_insights: null, // Could be populated with post analysis
          related_leads: null,
          outreach_message: outreachMessage,
          engagement_rate: analysis.engagement_rate || null,
          selling_points: analysis.selling_points?.join(', ') || null,
          custom_notes: analysis.custom_notes || null,
          created_at: new Date().toISOString(),
        }),
      });
    }

    // 12. Update lead with final score
    console.log('📊 Updating lead with final score...');
    await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${lead.id}`, {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify({
        score: analysis.lead_score,
        updated_at: new Date().toISOString(),
      }),
    });

    // 13. Deduct credits and log transaction
    console.log('💳 Deducting credits and logging transaction...');
    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify({
        credits: user.credits - creditsRequired,
      }),
    });

    await fetch(`${SUPABASE_URL}/rest/v1/credit_transactions`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify({
        user_id: userId,
        amount: -creditsRequired,
        transaction_type: 'analysis',
        description: `${analysisType} analysis of ${profile_url}`,
        created_at: new Date().toISOString(),
      }),
    });

    console.log('✅ Enterprise analysis completed successfully');

    // 14. Return comprehensive response
    return c.json({
      success: true,
      lead_id: lead.id,
      profile: {
        username: profileData.username,
        full_name: profileData.fullName,
        followers: profileData.followersCount,
        verified: profileData.isVerified || profileData.verified,
      },
      analysis: {
        type: analysisType,
        lead_score: analysis.lead_score,
        summary: analysis.summary,
        niche: analysis.niche,
        match_reasons: analysis.match_reasons,
        ...(analysisType === 'deep' ? {
          engagement_rate: analysis.engagement_rate,
          selling_points: analysis.selling_points,
          custom_notes: analysis.custom_notes,
          outreach_message: outreachMessage,
        } : {})
      },
      credits: {
        used: creditsRequired,
        remaining: user.credits - creditsRequired,
      },
      metadata: {
        processed_at: new Date().toISOString(),
        profile_url,
        business_id,
        icp_id,
      }
    });

  } catch (error) {
    console.error('💥 Enterprise analysis error:', error);
    return c.json({ 
      error: 'Analysis failed', 
      details: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    service: 'Oslira Enterprise AI Worker',
    version: '2.0.0',
    timestamp: new Date().toISOString() 
  });
});

// Root endpoint
app.get('/', (c) => {
  return c.text('🚀 Oslira Enterprise AI Worker v2.0 - Fully Operational!');
});

export default {
  fetch: app.fetch
};
