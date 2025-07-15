// netlify/edge-functions/config.js
export default async (request, context) => {
  return new Response(
    JSON.stringify({
      supabaseUrl:        process.env.SUPABASE_URL,
      supabaseAnonKey:    process.env.SUPABASE_ANON_KEY,
      workerUrl:          process.env.WORKER_URL,
      openAiKey:          process.env.OPENAI_KEY,
      claudeKey:          process.env.CLAUDE_KEY ?? null,
      apifyToken:         process.env.APIFY_API_TOKEN,
      stripeSecretKey:    process.env.STRIPE_SECRET_KEY,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? null,
      frontendUrl:        process.env.FRONTEND_URL ?? null
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
