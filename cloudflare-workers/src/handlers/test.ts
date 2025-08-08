import type { Context } from 'hono';
import { fetchJson } from '../utils/helpers.js';

export async function handleTestSupabase(c: Context): Promise<Response> {
  try {
    const headers = {
      apikey: c.env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json'
    };
    
    const response = await fetch(`${c.env.SUPABASE_URL}/rest/v1/users?limit=1`, { headers });
    const data = await response.text();
    
    return c.json({
      status: response.status,
      ok: response.ok,
      data: data.substring(0, 200),
      hasUrl: !!c.env.SUPABASE_URL,
      hasServiceRole: !!c.env.SUPABASE_SERVICE_ROLE
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function handleTestApify(c: Context): Promise<Response> {
  try {
    const response = await fetch(`https://api.apify.com/v2/key-value-stores?token=${c.env.APIFY_API_TOKEN}&limit=1`);
    return c.json({
      status: response.status,
      ok: response.ok,
      hasToken: !!c.env.APIFY_API_TOKEN
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function handleTestOpenAI(c: Context): Promise<Response> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${c.env.OPENAI_KEY}` }
    });
    return c.json({
      status: response.status,
      ok: response.ok,
      hasKey: !!c.env.OPENAI_KEY
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function handleTestPost(c: Context): Promise<Response> {
  try {
    const body = await c.req.json();
    return c.json({ 
      received: body, 
      timestamp: new Date().toISOString(),
      enterprise: true
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function handleDebugEnv(c: Context): Promise<Response> {
  return c.json({
    supabase: c.env.SUPABASE_URL ? 'SET' : 'MISSING',
    serviceRole: c.env.SUPABASE_SERVICE_ROLE ? 'SET' : 'MISSING',
    anonKey: c.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
    openai: c.env.OPENAI_KEY ? 'SET' : 'MISSING',
    claude: c.env.CLAUDE_KEY ? 'SET' : 'MISSING',
    apify: c.env.APIFY_API_TOKEN ? 'SET' : 'MISSING',
    stripe: c.env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING',
    webhookSecret: c.env.STRIPE_WEBHOOK_SECRET ? 'SET' : 'MISSING',
    frontend: c.env.FRONTEND_URL ? 'SET' : 'MISSING',
    enterprise: true,
    version: 'v3.0.0-enterprise-perfect'
  });
}
