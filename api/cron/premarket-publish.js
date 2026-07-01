import { log } from "../../tools/logger.mjs";
import { isGeneralEditionDate } from "../../tools/market-calendar.mjs";
import { fetchWithRetry } from "../../tools/http.mjs";
import { publicSiteOrigin } from "../../tools/public-page-registry.mjs";

const OWNER = "Abheydeep";
const REPO = "marketNews";
const WORKFLOW_ID = "pages.yml";
const DISPATCH_TIMEOUT_MS = Number(process.env.GITHUB_DISPATCH_TIMEOUT_MS ?? 10000);
const SITE_ORIGIN = publicSiteOrigin();
const ALERT_MINUTES = { "07:15": 450, "08:00": 510 };
// Past these IST minutes the on-time publish window has closed (scheduled time +
// 60-min cutoff), so a catch-up dispatch must explicitly allow a late publish or
// the run is rejected by the premarket window guard.
const WINDOW_CUTOFF_MINUTES = { "07:15": 495, "08:00": 540 };

export default async function handler(request, response) {
  if (request.method !== "GET" && request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    log.error("premarket cron missing secret");
    return response.status(500).json({ ok: false, error: "missing_cron_secret" });
  }
  const providedSecret = request.headers["authorization"]?.replace(/^Bearer\s+/i, "") ||
    request.query?.secret ||
    "";
  if (providedSecret !== expectedSecret) {
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

  const now = new Date();
  const { date, minutes } = istDateParts(now);

  // Only edition days (trading days, exchange holidays, Sundays) get a briefing.
  // Saturdays and other genuinely-closed days are skipped so we never dispatch a
  // run the generator will (correctly) reject.
  if (!isGeneralEditionDate(date) && request.query?.force !== "1") {
    log.info("premarket watchdog skipped non-edition day", { date });
    return response.status(200).json({ ok: true, skipped: true, reason: "non_edition_day", date });
  }

  const summaryTime = minutes >= 480 ? "08:00" : "07:15";
  const summaryLabel = summaryTime.replace(":", "");
  // An edition for today counts whether it published in the 07:15 OR 08:00 slot —
  // checking only the current slot's label would re-dispatch over an existing edition.
  const archivePath = `archive/daily/${date}-${summaryLabel}-digest.json`;
  const archiveTracked = (await githubArchiveExists(token, `archive/daily/${date}-0715-digest.json`)) ||
    (await githubArchiveExists(token, `archive/daily/${date}-0800-digest.json`));
  const latestCurrent = await latestPageMatchesDate(date);
  const shouldDispatch = request.query?.force === "1" || !archiveTracked || latestCurrent === false;
  const alertAfter = ALERT_MINUTES[summaryTime] ?? 450;
  const alert = shouldDispatch && minutes >= alertAfter;
  // Past the on-time window the dispatched run would be blocked by the premarket
  // window guard, so a late catch-up must allow a late publish — otherwise the
  // recovery silently fails (the exact bug that left editions unpublished).
  const lateRecovery = minutes >= (WINDOW_CUTOFF_MINUTES[summaryTime] ?? 495);

  log[alert ? "error" : "info"]("premarket watchdog checked latest state", {
    date,
    summaryTime,
    archiveTracked,
    latestCurrent,
    shouldDispatch,
    alert,
    archivePath
  });

  if (!shouldDispatch) {
    return response.status(200).json({
      ok: true,
      skipped: true,
      reason: "archive_and_latest_current",
      date,
      summaryTime,
      archiveTracked,
      latestCurrent
    });
  }

  if (await workflowAlreadyActive(token)) {
    log.warn("premarket watchdog found active publish workflow", { date, summaryTime, archivePath, alert });
    return response.status(202).json({
      ok: true,
      skipped: true,
      reason: "workflow_already_active",
      date,
      summaryTime,
      alert
    });
  }

  let dispatchResponse;
  try {
    dispatchResponse = await fetchWithRetry(
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
            enforce_publish_window: lateRecovery ? "false" : "true",
            allow_late_publish: lateRecovery ? "true" : "false",
            allow_fixture_fallback: "false",
            allow_non_trading_day: "false",
            summary_time: summaryTime,
            triggered_by: lateRecovery ? "vercel-watchdog-late-recovery" : (alert ? "vercel-watchdog-alert" : "vercel-watchdog")
          }
        }),
        retries: 0,
        signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS)
      }
    );
  } catch (error) {
    const timedOut = error?.name === "AbortError" || error?.name === "TimeoutError";
    log.error("premarket workflow dispatch failed", { workflow: WORKFLOW_ID, timedOut, error: error.message });
    return response.status(timedOut ? 504 : 502).json({
      ok: false,
      error: timedOut ? "github_dispatch_timeout" : "github_dispatch_request_failed"
    });
  }

  if (!dispatchResponse.ok) {
    log.warn("premarket workflow dispatch rejected", { workflow: WORKFLOW_ID, status: dispatchResponse.status });
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
    triggeredBy: lateRecovery ? "vercel-watchdog-late-recovery" : (alert ? "vercel-watchdog-alert" : "vercel-watchdog"),
    date,
    summaryTime,
    archiveTracked,
    latestCurrent,
    alert,
    lateRecovery
  });
}

function istDateParts(now) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(now);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${byType.year}-${byType.month}-${byType.day}`,
    minutes: Number(byType.hour) * 60 + Number(byType.minute)
  };
}

async function githubArchiveExists(token, archivePath) {
  const result = await githubJson(token, `contents/${archivePath}?ref=main`);
  if (result.status === 404) return false;
  if (result.ok) return true;
  log.warn("premarket watchdog archive check inconclusive", { status: result.status, archivePath });
  return false;
}

async function workflowAlreadyActive(token) {
  const statuses = ["queued", "in_progress"];
  for (const status of statuses) {
    const result = await githubJson(token, `actions/workflows/${WORKFLOW_ID}/runs?branch=main&status=${status}&per_page=10`);
    if (!result.ok) {
      log.warn("premarket watchdog workflow status check inconclusive", { status, githubStatus: result.status });
      continue;
    }
    if ((result.body?.workflow_runs ?? []).some((run) => run.status === status)) {
      return true;
    }
  }
  return false;
}

async function githubJson(token, path) {
  try {
    const res = await fetchWithRetry(`https://api.github.com/repos/${OWNER}/${REPO}/${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "MarketNarrativeVercelCron/1.0"
      },
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS)
    });
    const body = res.status === 204 ? null : await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  } catch (error) {
    log.warn("premarket watchdog github request failed", { path, error: error.message });
    return { ok: false, status: 0, body: null };
  }
}

async function latestPageMatchesDate(date) {
  try {
    const res = await fetchWithRetry(`${SITE_ORIGIN.replace(/\/$/, "")}/latest/?watchdog=${Date.now()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS)
    });
    const body = await res.text();
    const slug = compactSlugForDate(date);
    return res.url.includes(`/${slug}/`) || body.includes(`/${slug}/`) || body.includes(date);
  } catch (error) {
    log.warn("premarket watchdog latest check inconclusive", { error: error.message });
    return null;
  }
}

function compactSlugForDate(date) {
  const [year, month, day] = date.split("-");
  const mon = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"][Number(month) - 1] || "";
  return `${Number(day)}${mon}${year}`;
}
