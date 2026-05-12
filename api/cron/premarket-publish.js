const OWNER = "Abheydeep";
const REPO = "marketNews";
const WORKFLOW_ID = "pages.yml";

export default async function handler(request, response) {
  if (request.method !== "GET" && request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const expectedSecret = process.env.CRON_SECRET || "";
  const providedSecret = request.headers["authorization"]?.replace(/^Bearer\s+/i, "") ||
    request.query?.secret ||
    "";
  if (expectedSecret && providedSecret !== expectedSecret) {
    return response.status(401).json({ ok: false, error: "unauthorized" });
  }

  const token = process.env.GITHUB_WORKFLOW_TOKEN || process.env.GH_WORKFLOW_TOKEN || process.env.GITHUB_TOKEN || "";
  if (!token) {
    return response.status(500).json({
      ok: false,
      error: "missing_github_workflow_token",
      message: "Set GITHUB_WORKFLOW_TOKEN in Vercel with repo workflow dispatch permission."
    });
  }

  const dispatchResponse = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_ID}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "MarketNarrativeVercelCron/1.0"
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          enforce_publish_window: "true",
          triggered_by: "vercel-cron"
        }
      })
    }
  );

  if (!dispatchResponse.ok) {
    return response.status(dispatchResponse.status).json({
      ok: false,
      error: "github_dispatch_failed",
      status: dispatchResponse.status,
      body: await dispatchResponse.text()
    });
  }

  return response.status(200).json({
    ok: true,
    workflow: WORKFLOW_ID,
    ref: "main",
    triggeredBy: "vercel-cron"
  });
}
