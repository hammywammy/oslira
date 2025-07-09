import type { HandlerContext } from "@netlify/functions";

export const handler = async (event: any, context: HandlerContext) => {
  // Example Edge Function: simple auth check (stub)
  const authHeader = event.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  // Normally verify token here

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Authorized" }),
  };
};
