// api/move-detect.mjs
// Serverless endpoint to detect market moves and publish auto‑move pages.
// This uses the generate‑move‑articles pipeline which now calls `nimCall`
// for real LLM article generation.

import { main as generateMoves } from "../tools/generate-move-articles.mjs";

export default async function handler(request, response) {
  // Only allow GET (cron) or POST triggers.
  if (request.method !== "GET" && request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  // Fail closed. If Vercel is missing CRON_SECRET this endpoint must not be public.
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return response.status(500).json({ ok: false, error: "missing_cron_secret" });
  }
  const providedSecret =
    request.headers["authorization"]?.replace(/^Bearer\s+/i, "") ||
    request.query?.secret ||
    "";
  if (providedSecret !== expectedSecret) {
    return response.status(401).json({ ok: false, error: "unauthorized" });
  }

  try {
    const result = await generateMoves({ date: request.query?.date });
    return response.status(200).json({ ok: true, message: "Move articles generated", ...result });
  } catch (e) {
    console.error("Error in move‑detect handler:", e);
    return response.status(500).json({ ok: false, error: "generation_failed", details: e.message });
  }
}
