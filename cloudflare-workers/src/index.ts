import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
app.use('*', cors());

// Simplified JWT verify - returns userId or null
async function verifySupabaseJWT(token: string, supabaseUrl: string): Promise<string | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [, payload] = parts;
    const decodedPayload = JSON.parse(atob(payload));
    const now = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp && decodedPayload.exp < now) return null;
    return decodedPayload.sub;
  } catch {
    return null;
  }
}

async function runOpenAIAnalysis(prompt: string, key: string, retries = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (res.ok) return await res.json();
    if (res.status === 429 && attempt < retries) {
      const delay = 500 * attempt ** 2;
      await new Promise((r) => setTimeout(r, delay));
    } else {
      const text = await res.text();
      throw new Error(`OpenAI API failed: ${res.status} - ${text}`);
    }
  }
}

// Utility to extract Instagram username from any profile URL or username input
function extractUsername(profileUrl: string): string {
  try {
    if (!profileUrl) return '';
    // If input is full URL, parse pathname and get first segment
    if (profileUrl.includes('instagram.com')) {
      const url = new URL(profileUrl);
      const segments = url.pathname.split('/').filter(Boolean);
      return segments.length ? segments[0] : '';
    }
    // If just username, return as is
    return profileUrl.trim().toLowerCase();
  } catch {
    return '';
  }
}

app.post('/analyze', async (c) => {
  try {
    // Auth check
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return c.json({ error: 'Unauthorized' }, 401);
    const token = authHeader.substring(7);
    const userId = await verifySupabaseJWT(token, c.env.SUPABASE_URL);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    // Parse body
    const { profile_url, analysisType } = await c.req.json();
    if (!profile_url || !analysisType)
      return c.json({ error: 'Missing fields: profile_url and analysisType required' }, 400);

    const {
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE,
      OPENAI_KEY,
      CLAUDE_KEY,
      APIFY_API_TOKEN,
    } = c.env;

    const headers = {
      apikey: SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    };

    // Fetch active business profile for user
    const businessRes = await fetch(
      `${SUPABASE_URL}/rest/v1/business_profiles?user_id=eq.${userId}&is_active=eq.true&select=*`,
      { headers }
    );
    const business = (await businessRes.json())[0];
    if (!business) return c.json({ error: 'No active business profile found' }, 404);

    // Fetch user credits
    const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=credits`, { headers });
    const user = (await userRes.json())[0];
    const creditsRequired = analysisType === 'deep' ? 2 : 1;
    if (!user || user.credits < creditsRequired) return c.json({ error: 'Insufficient credits' }, 402);

    // Extract username
    const username = extractUsername(profile_url);
    if (!username) return c.json({ error: 'Invalid Instagram username or URL' }, 400);

    // Run correct scraper
    let profileData;
    if (analysisType === 'light') {
      // Use instagram-profile-scraper-task for light scraping
      const apifyInput = {
        usernames: [username],
      };
      const apifyRes = await fetch(
        `https://api.apify.com/v2/actor-tasks/hamzaw~instagram-profile-scraper-task/runs?token=${APIFY_API_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apifyInput),
        }
      );
      const apifyJson = await apifyRes.json();

      if (!apifyJson || !apifyJson[0]) {
        return c.json({ error: 'Failed to retrieve profile from Apify light scraper' }, 500);
      }
      profileData = apifyJson[0];
    } else {
      // Heavy scrape with existing instagram-scraper-task (replace with your actual task id)
      const apifyInput = {
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: 'details',
        resultsLimit: 1,
        isUserReelFeedURL: false,
        isUserTaggedFeedURL: false,
        enhanceUserSearchWithFacebookPage: false,
        addParentData: false,
      };
      const apifyRes = await fetch(
        `https://api.apify.com/v2/actor-tasks/hamzaw~instagram-scraper-task/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: apifyInput }),
        }
      );
      const raw = await apifyRes.text();
      profileData = raw ? JSON.parse(raw)[0] : null;
    }

    // Fallback mock if scraping fails
    if (!profileData?.username) {
      profileData = {
        username,
        fullName: `Mock ${username}`,
        biography: `This is a mock profile for ${username}`,
        followersCount: 1000,
        followingCount: 100,
        postsCount: 50,
        isVerified: false,
        isPrivate: false,
        profilePicUrl: `https://picsum.photos/150/150?random=${username}`,
        externalUrl: `https://example.com/${username}`,
        category: 'Public Figure',
      };
    }

    // Insert lead record
    const leadRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: userId,
        username: profileData.username,
        platform: 'instagram',
        profile_url,
        avatar_url: profileData.profilePicUrl,
        score: 0,
        status: 'analyzed',
        created_at: new Date().toISOString(),
      }),
    });
    const leadData = await leadRes.json();
    const lead = Array.isArray(leadData) ? leadData[0] : leadData;

    // Prepare AI prompt depending on scrape type
    let prompt = '';
    if (analysisType === 'light') {
      // Light prompt, less data
      const lightProfile = {
        username: profileData.username,
        fullName: profileData.fullName,
        biography: profileData.biography,
        followersCount: profileData.followersCount,
        followsCount: profileData.followsCount,
        postsCount: profileData.postsCount,
        verified: profileData.verified,
        private: profileData.private,
        category: profileData.category || 'Unknown',
      };

      prompt = `
You are a senior lead generation strategist for a B2B platform. Your job is to evaluate whether an Instagram profile is a strong fit for outreach based on the provided business goals.

Return ONLY a valid JSON object with the following fields:

- lead_score: integer from 0 to 100 (100 = ideal ICP match)
- summary: a one-sentence summary of this profile's relevance
- niche: best-fit category or niche based on content and bio
- match_reasons: array of 2–4 concise reasons for the score

DO NOT return explanations, markdown, or commentary—ONLY the JSON object.

## Profile Data:
${JSON.stringify(lightProfile, null, 2)}

## Business Context:
- Business Name: ${business.business_name}
- Target Niche: ${business.target_niche}
- Outreach Goals: Identify ideal leads who are aligned with this niche, show signals of being decision-makers or personal brands, and have potential to engage in partnerships, sponsorships, or service offerings.

If the profile is private, fake, empty, or outside the niche, reduce the score accordingly.
      `.trim();
    } else {
      // Deep prompt with heavier profile data
      const deepProfile = {
        username: profileData.username,
        fullName: profileData.fullName,
        biography: profileData.biography,
        followersCount: profileData.followersCount,
        followingCount: profileData.followingCount,
        postsCount: profileData.postsCount,
        isVerified: profileData.isVerified,
        isPrivate: profileData.isPrivate,
        category: profileData.category || 'Unknown',
        // add any other detailed fields from heavy scrape here
      };

      prompt = `
You are a senior lead generation strategist for a B2B platform. Your job is to evaluate whether an Instagram profile is a strong fit for outreach based on the provided business goals.

Return ONLY a valid JSON object with the following fields:

- lead_score: integer from 0 to 100 (100 = ideal ICP match)
- summary: a one-sentence summary of this profile's relevance
- niche: best-fit category or niche based on content and bio
- match_reasons: array of 2–4 concise reasons for the score

DO NOT return explanations, markdown, or commentary—ONLY the JSON object.

## Profile Data:
${JSON.stringify(deepProfile, null, 2)}

## Business Context:
- Business Name: ${business.business_name}
- Target Niche: ${business.target_niche}
- Outreach Goals: Identify ideal leads who are aligned with this niche, show signals of being decision-makers or personal brands, and have potential to engage in partnerships, sponsorships, or service offerings.

If the profile is private, fake, empty, or outside the niche, reduce the score accordingly.
      `.trim();
    }

    // Run OpenAI analysis
    const openaiData = await runOpenAIAnalysis(prompt, OPENAI_KEY);

    // Parse AI output safely
    let analysis;
    try {
      analysis = JSON.parse(openaiData.choices[0].message.content);
    } catch {
      analysis = {
        lead_score: 50,
        summary: 'Invalid AI response format',
        niche: 'Unknown',
        match_reasons: ['Unable to parse AI response'],
      };
    }

    // If deep, run Claude deep analysis
    if (analysisType === 'deep') {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': CLAUDE_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1500,
          temperature: 0.5,
          messages: [
            {
              role: 'user',
              content: `Provide a deep analysis of this Instagram profile:\n\nProfile: ${JSON.stringify(
                profileData
              )}\nBusiness: ${business.business_name}`,
            },
          ],
        }),
      });
      const claudeData = await claudeRes.json();
      analysis.deep_analysis = claudeData.content?.[0]?.text || '';

      // Store deep analysis in lead_analyses table
      await fetch(`${SUPABASE_URL}/rest/v1/lead_analyses`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          lead_id: lead.id,
          analysis_type: 'deep',
          analysis_data: analysis,
          match_score: analysis.lead_score,
          created_at: new Date().toISOString(),
        }),
      });
    }

    // Update lead score
    await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${lead.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        score: analysis.lead_score,
        updated_at: new Date().toISOString(),
      }),
    });

    // Deduct credits
    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ credits: user.credits - creditsRequired }),
    });

    // Log credit transaction
    await fetch(`${SUPABASE_URL}/rest/v1/credit_transactions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: userId,
        amount: -creditsRequired,
        transaction_type: 'analysis',
        description: `${analysisType} analysis of ${profile_url}`,
        created_at: new Date().toISOString(),
      }),
    });

    return c.json({
      success: true,
      lead_id: lead.id,
      profile_url,
      analysisType,
      creditsUsed: creditsRequired,
      analysis: {
        lead_score: analysis.lead_score,
        summary: analysis.summary,
        niche: analysis.niche,
        match_reasons: analysis.match_reasons,
        ...(analysisType === 'deep' ? { deep_analysis: analysis.deep_analysis } : {}),
      },
    });
  } catch (error) {
    return c.json({ error: 'Analysis failed', details: error.message }, 500);
  }
});

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/', (c) => c.text('Oslira AI Worker is running!'));

export default { fetch: app.fetch };
