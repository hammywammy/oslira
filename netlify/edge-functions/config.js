// netlify/edge-functions/config.js
export default async (request, context) => {
  return new Response(
    JSON.stringify({
      supabaseUrl:     process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      workerUrl:       process.env.WORKER_URL,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
