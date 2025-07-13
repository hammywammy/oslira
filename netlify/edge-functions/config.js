export default async (request, context) => {
  // This edge function provides ONLY the public configuration needed by the browser
  // Secrets stay on the server side
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY'); // This is public by design
  const workerUrl = Deno.env.get('WORKER_URL');

  // Check if required variables are present
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables:', { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!supabaseKey,
      hasWorker: !!workerUrl 
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Configuration not available',
        debug: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          hasWorker: !!workerUrl
        }
      }), 
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }

  // Return public configuration
  const config = {
    supabaseUrl,
    supabaseAnonKey: supabaseKey, // Supabase anon key is designed to be public
    workerUrl: workerUrl || null
  };

  return new Response(JSON.stringify(config), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300'
    }
  });
};
