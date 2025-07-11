import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
app.use('*', cors());

// JWT verification function (simplified for now)
async function verifySupabaseJWT(token: string, supabaseUrl: string): Promise<string | null> {
  try {
    console.log('🔍 Verifying JWT token...');
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
      await new Promise(res => setTimeout(res, delay));
    } else {
      const text = await res.text();
      throw new Error(`OpenAI API failed: ${res.status} - ${text}`);
    }
  }
}

app.post('/analyze', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
    const token = authHeader.substring(7);
    const userId = await verifySupabaseJWT(token, c.env.SUPABASE_URL);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const body = await c.req.json();
    const { profile_url, analysisType } = body;
    if (!profile_url || !analysisType) return c.json({ error: 'Missing fields' }, 400);

    const {
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE,
      OPENAI_KEY,
      CLAUDE_KEY,
      APIFY_API_TOKEN
    } = c.env;

    const headers = {
      apikey: SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    };

    const businessRes = await fetch(`${SUPABASE_URL}/rest/v1/business_profiles?user_id=eq.${userId}&is_active=eq.true&select=*`, { headers });
    const business = (await businessRes.json())[0];
    if (!business) return c.json({ error: 'No business profile' }, 404);

    const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=credits`, { headers });
    const user = (await userRes.json())[0];
    const creditsRequired = analysisType === 'deep' ? 2 : 1;
    if (!user || user.credits < creditsRequired) return c.json({ error: 'Insufficient credits' }, 402);

    const username = profile_url.split('/').filter(Boolean).pop();
    let profileData;
    try {
      const apifyRes = await fetch(`https://api.apify.com/v2/actor-tasks/hamzaw~instagram-scraper-task/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`, {
        method: 'POST',
        body: JSON.stringify({ input: { usernames: [username], searchType: 'user', maxItems: 1, proxy: { useApifyProxy: true } } }),
        headers: { 'Content-Type': 'application/json' },
      });
      const raw = await apifyRes.text();
      profileData = raw ? JSON.parse(raw)[0] : null;
    } catch {}

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
        category: 'Public Figure'
      };
    }

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

    const { biography, followersCount, followingCount, postsCount, isVerified, category } = profileData;
    const trimmedProfile = { username, biography, followersCount, followingCount, postsCount, isVerified, category };

    const prompt = `
You are a senior lead generation strategist for a B2B platform. Your job is to evaluate whether an Instagram profile is a strong fit for outreach based on the provided business goals.

Return ONLY a valid JSON object with the following fields:

- lead_score: integer from 0 to 100 (100 = ideal ICP match)
- summary: a one-sentence summary of this profile's relevance
- niche: best-fit category or niche based on content and bio
- match_reasons: array of 2–4 concise reasons for the score

DO NOT return explanations, markdown, or commentary—ONLY the JSON object.

## Profile Data:
${JSON.stringify(trimmedProfile, null, 2)}

## Business Context:
- Business Name: ${business.business_name}
- Target Niche: ${business.target_niche}
- Outreach Goals: Identify ideal leads who are aligned with this niche, show signals of being decision-makers or personal brands, and have potential to engage in partnerships, sponsorships, or service offerings.

If the profile is private, fake, empty, or outside the niche, reduce the score accordingly.
`.trim();

    const openaiData = await runOpenAIAnalysis(prompt, OPENAI_KEY);

    let analysis;
try {
  const raw = openaiData.choices[0].message.content;

  // Extract first JSON object from AI response, even if wrapped in text
  const match = raw.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error('No JSON object found in AI response');

  const parsed = JSON.parse(match[0]);

  // Validate structure
  if (
    typeof parsed.lead_score !== 'number' ||
    typeof parsed.summary !== 'string' ||
    typeof parsed.niche !== 'string' ||
    !Array.isArray(parsed.match_reasons)
  ) throw new Error('JSON missing required fields');

  analysis = parsed;
} catch (err) {
  console.warn("⚠️ Failed to parse or validate AI response:", err);
  analysis = {
    lead_score: 50,
    summary: "Invalid AI response format",
    niche: "Unknown",
    match_reasons: ["Unable to parse or validate AI response"]
  };
}

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
              content: `Provide a deep analysis of this Instagram profile:\n\nProfile: ${JSON.stringify(profileData)}\nBusiness: ${business.business_name}`,
            },
          ],
        }),
      });
      const claudeData = await claudeRes.json();
      analysis.deep_analysis = claudeData.content?.[0]?.text || '';

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

    await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${lead.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        score: analysis.lead_score,
        updated_at: new Date().toISOString(),
      }),
    });

    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ credits: user.credits - creditsRequired }),
    });

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
        ...(analysisType === 'deep' ? { deep_analysis: analysis.deep_analysis } : {})
      }
    });
  } catch (error) {
    return c.json({ error: 'Analysis failed', details: error.message }, 500);
  }
});

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/', (c) => c.text('Oslira AI Worker is running!'));

export default { fetch: app.fetch };
