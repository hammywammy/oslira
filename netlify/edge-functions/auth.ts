export default async function (request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Normally verify token here

  return new Response(
    JSON.stringify({ message: "Authorized" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
