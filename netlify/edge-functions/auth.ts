export default async function (request) {
  const url = new URL(request.url);
  
  // Handle different API endpoints
  switch (url.pathname) {
    case '/api/health':
      return new Response(
        JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      
    case '/api/auth/verify':
      return handleAuthVerification(request);
      
    default:
      // For other /api/* routes, require authentication
      return requireAuth(request);
  }
}

async function handleAuthVerification(request) {
  const authHeader = request.headers.get("authorization") || "";
  
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid authorization header" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  
  const token = authHeader.substring(7); // Remove "Bearer "
  
  try {
    // Verify with Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    
    // Verify token with Supabase
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseKey
      }
    });
    
    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const user = await response.json();
    
    return new Response(
      JSON.stringify({ 
        valid: true, 
        user: { 
          id: user.id, 
          email: user.email 
        } 
      }),
      { headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error('Auth verification error:', error);
    return new Response(
      JSON.stringify({ error: "Authentication failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function requireAuth(request) {
  const authHeader = request.headers.get("authorization") || "";
  
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  
  // For now, just check format - implement full verification as needed
  return new Response(
    JSON.stringify({ error: "Endpoint not implemented" }),
    { status: 501, headers: { "Content-Type": "application/json" } }
  );
}
