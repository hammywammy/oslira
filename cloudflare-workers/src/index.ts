async function handleAnalysis(request: Request): Promise<Response> {
  console.log('🚀 handleAnalysis called');
  
  try {
    // 1. Extract and verify JWT token
    const authHeader = request.headers.get('Authorization');
    console.log('🔑 Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    console.log('📦 Request body received:', JSON.stringify(body));
    
    const { profile_url, analysisType } = body;
    console.log('🔍 Extracted fields:', { profile_url, analysisType });

    if (!profile_url || !analysisType) {
      console.log('❌ Missing required fields - profile_url:', !!profile_url, 'analysisType:', !!analysisType);
      return new Response(
        JSON.stringify({ error: 'Missing profile_url or analysisType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Rest of your function...import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
app.use('*', cors());

app.post('/analyze', async (c) => {
  const {
    profile_url,
    analysisType,
    user_id,
    business_id,
    icp_id,
    test = false,
  } = await c.req.json();

  if (!profile_url || !user_id || !business_id || !icp_id || !analysisType)
    return c.json({ error: 'Missing required fields' }, 400);

  const SUPABASE_URL = c.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = c.env.SUPABASE_SERVICE_ROLE;
  const OPENAI_KEY = c.env.OPENAI_KEY;
  const CLAUDE_KEY = c.env.CLAUDE_KEY;
  const APIFY_API_TOKEN = c.env.APIFY_API_TOKEN;

  const supabaseHeaders = {
    apikey: SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json',
  };

  const username = profile_url.split('/').filter(Boolean).pop();

  // 1. Run Apify actor
  const apifyResponse = await fetch(`https://api.apify.com/v2/acts/hamzaw~instagram-scraper-task/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`, {
    method: 'POST',
    body: JSON.stringify({
      input: {
        usernames: [username],
        searchType: 'user',
        maxItems: 1,
        proxy: { useApifyProxy: true },
      },
    }),
    headers: { 'Content-Type': 'application/json' },
  });

  const [profileData] = await apifyResponse.json();
  if (!profileData?.username) return c.json({ error: 'No profile data' }, 404);

  // 2. Insert lead into Supabase
  const insertLeadRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: JSON.stringify({
      user_id,
      profile_url,
      username: profileData.username,
      avatar_url: profileData.profilePicUrlHD || profileData.profilePicUrl,
      bio_snippet: profileData.biography?.slice(0, 250) || null,
      platform: 'instagram',
      score: null,
      status: 'new',
      created_at: new Date().toISOString(),
    }),
  });

  const [lead] = await insertLeadRes.json();
  if (!lead?.id) return c.json({ error: 'Failed to insert lead' }, 500);

  // 3. Run GPT for lightweight or Claude+GPT for deep analysis
  let scoreResult: any = null;
  let analysis: any = null;

  const openaiResult = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `Analyze this Instagram profile JSON and return:
1. A one-sentence quick summary
2. A numeric lead_score from 0–100 (based on follower count, business intent, credibility)
3. A suggested category (e.g. SaaS, content creator, coach, etc.)
Return only this JSON: { "summary": "...", "lead_score": ..., "niche": "..." }

DATA: ${JSON.stringify(profileData)}`,
        },
      ],
    }),
  });

  scoreResult = await openaiResult.json();
  const parsed = JSON.parse(scoreResult.choices[0].message.content);

  if (analysisType === 'deep') {
    const claudeDeep = await fetch('https://api.anthropic.com/v1/messages', {
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
            content: `You're an AI analyst. Review this Instagram profile JSON and return a deep analysis, brand personality, and quick outreach message based on who this is and how they'd respond best. JSON: ${JSON.stringify(profileData)}`,
          },
        ],
      }),
    });

    const claudeResult = await claudeDeep.json();
    analysis = claudeResult.content[0].text;
  }

  // 4. Update lead score and insert analysis
  const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${lead.id}`, {
    method: 'PATCH',
    headers: supabaseHeaders,
    body: JSON.stringify({
      score: parsed.lead_score,
      updated_at: new Date().toISOString(),
    }),
  });

  if (analysisType === 'deep') {
    await fetch(`${SUPABASE_URL}/rest/v1/lead_analyses`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify({
        lead_id: lead.id,
        user_id,
        analysis: { ...parsed, deep: analysis },
        ai_model_used: 'claude-3 + gpt-4o',
        created_at: new Date().toISOString(),
      }),
    });
  }

  // 5. Credit deduction
  const creditCost = analysisType === 'deep' ? -2 : -1;
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_user_credits`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: JSON.stringify({
      user_id,
      amount: creditCost,
      type: 'usage',
      description: `Lead analysis (${analysisType})`,
      metadata: { profile_url },
    }),
  });

  return c.json({
    lead_id: lead.id,
    lead_score: parsed.lead_score,
    summary: parsed.summary,
    niche: parsed.niche,
    ...(analysisType === 'deep' ? { analysis } : {}),
  });
});

export default app;
