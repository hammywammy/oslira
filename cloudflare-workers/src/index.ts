export interface Env {}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (request.method === "POST" && pathname === "/analyze") {
      try {
        const { url, analysisType } = await request.json();

        // Simulated result (temporary logic)
        const username = url.split("/").filter(Boolean).pop() || "user";
        const result = {
          username,
          url,
          score: Math.floor(Math.random() * 30) + 70, // 70–100
          message: `Hi ${username}, I help businesses like yours grow with AI-powered outreach.`,
          analysisType,
          analysis: {
            role: "Founder",
            painPoints: ["scale", "leads"],
            timing: "high"
          },
          creditsUsed: analysisType === "detailed" ? 2 : 1
        };

        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
