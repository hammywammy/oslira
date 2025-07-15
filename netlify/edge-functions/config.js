export default async (request, context) => {
  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // ONLY expose frontend-safe values
  const config = {
    supabaseUrl: Netlify.env.get('SUPABASE_URL'),
    supabaseAnonKey: Netlify.env.get('SUPABASE_ANON_KEY'),
    workerUrl: Netlify.env.get('WORKER_URL')
    // DO NOT expose: openAiKey, claudeKey, apifyToken, stripeSecretKey, stripeWebhookSecret
  };

  return new Response(JSON.stringify(config), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'no-cache'
    }
  });
};

export const config = {
  path: "/config"
};
