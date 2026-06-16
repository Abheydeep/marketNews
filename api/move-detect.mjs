import { log } from "../tools/logger.mjs";

const OWNER = "Abheydeep";
const REPO = "marketNews";
const WORKFLOW_ID = "move-detect.yml";
const DISPATCH_TIMEOUT_MS = Number(process.env.GITHUB_DISPATCH_TIMEOUT_MS ?? 10000);

export default async function handler(request, response) {
  if (request.method !== "GET" && request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ ok: false, error: "method_not_allowed" });
  }

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

  const token = process.env.GITHUB_WORKFLOW_TOKEN || process.env.GH_WORKFLOW_TOKEN || process.env.GITHUB_TOKEN || "";
  if (!token) {
    return response.status(500).json({ ok: false, error: "missing_github_workflow_token" });
  }

  const date = request.query?.date || "";
  try {
    const dispatch = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_ID}/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "MarketNarrativeMoveDetect/1.0"
        },
        body: JSON.stringify({ ref: "main", inputs: { date, triggered_by: "vercel-move-detect" } }),
        signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS)
      }
    );
    if (!dispatch.ok) {
      log.warn("move-detect workflow dispatch rejected", { workflow: WORKFLOW_ID, status: dispatch.status });
      return response.status(dispatch.status).json({ ok: false, error: "github_dispatch_failed", status: dispatch.status });
    }
  } catch (error) {
    const timedOut = error?.name === "AbortError" || error?.name === "TimeoutError";
    log.error("move-detect workflow dispatch failed", { workflow: WORKFLOW_ID, timedOut, error: error.message });
    return response.status(timedOut ? 504 : 502).json({
      ok: false,
      error: timedOut ? "github_dispatch_timeout" : "github_dispatch_request_failed"
    });
  }

  return response.status(202).json({ ok: true, workflow: WORKFLOW_ID, queued: true, date: date || null });
}
