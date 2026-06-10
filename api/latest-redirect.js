/**
 * /latest/ → server-side 301 redirect to the latest verified daily brief.
 *
 * Slug resolution order:
 *   1. LATEST_DIGEST_SLUG env var (e.g. "5jun2026") — set by the deploy
 *      pipeline whenever a new briefing is published. Zero runtime cost.
 *   2. /digest.json fetch from the deployed origin — fallback for local dev
 *      and for environments where the env var is not configured.
 *   3. Static ../latest-slug.txt baked into the deployment at build time —
 *      survives cold starts and digest.json fetch failures. This is what
 *      the in-memory cache used to claim to be, but never actually was on
 *      Vercel serverless.
 *   4. Previous in-memory cached slug — soft degrade across requests in
 *      the same warm instance. Best-effort, not load-bearing.
 *   5. 302 to / — last-resort, never 500.
 *
 * In this static+functions project the static meta-refresh fallback at
 * public/latest/index.html is still the primary /latest/ handler (it wins
 * the route). The function remains registered for environments that route
 * the function first, and as a safety net if the meta-refresh page is ever
 * removed.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const config = {
  runtime: "nodejs",
  regions: ["bom1"], // closest edge to IST primary audience
};

const SLUG_CACHE_MS = 5 * 60 * 1000;
const COMPACT_SLUG_RE = /^\d{1,2}(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\d{4}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
let cachedSlug = null;
let cachedAt = 0;

function slugFromEnv() {
  const raw = String(process.env.LATEST_DIGEST_SLUG || "").trim().toLowerCase();
  if (!raw) return null;
  if (!COMPACT_SLUG_RE.test(raw)) {
    console.warn(`latest-redirect: ignoring malformed LATEST_DIGEST_SLUG=${raw}`);
    return null;
  }
  return raw;
}

function slugFromStaticFile() {
  // Project-root file written by tools/vercel-build.mjs at deploy time.
  // In Vercel's runtime, api/*.js sees __dirname under /var/task/api, so
  // ../latest-slug.txt resolves to /var/task/latest-slug.txt. We also try
  // process.cwd() for local dev where __dirname is not relative to root.
  const candidates = [
    join(dirname(fileURLToPath(import.meta.url)), "..", "latest-slug.txt"),
    join(process.cwd(), "latest-slug.txt"),
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      const raw = readFileSync(candidate, "utf8").trim().toLowerCase();
      if (COMPACT_SLUG_RE.test(raw)) return raw;
      if (ISO_DATE_RE.test(raw)) return isoToCompactSlug(raw);
      console.warn(`latest-redirect: ${candidate} contains an unrecognized slug "${raw}"`);
    } catch (err) {
      console.warn(`latest-redirect: failed to read ${candidate}: ${err.message}`);
    }
  }
  return null;
}

function isoToCompactSlug(isoDate) {
  const [year, month, day] = isoDate.split("-");
  const monthName = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"][Number(month) - 1];
  if (!monthName) throw new Error(`bad month=${month}`);
  return `${Number(day)}${monthName}${year}`;
}

async function slugFromDigest() {
  const origin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://marketnarrative.in";
  const res = await fetch(`${origin}/digest.json`, {
    headers: { "user-agent": "MarketNarrativeLatestRedirect/1.0" },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`digest.json status=${res.status}`);
  const json = await res.json();
  const date = String(json.digestDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`bad digestDate=${date}`);
  return dateToSlug(date);
}

async function readLatestSlug() {
  const envSlug = slugFromEnv();
  if (envSlug) {
    cachedSlug = envSlug;
    cachedAt = Date.now();
    return envSlug;
  }

  const now = Date.now();
  if (cachedSlug && now - cachedAt < SLUG_CACHE_MS) return cachedSlug;

  try {
    const slug = await slugFromDigest();
    cachedSlug = slug;
    cachedAt = now;
    return slug;
  } catch (err) {
    // Network/JSON failure. The in-memory cache is empty on a cold start,
    // so it cannot help here. Fall through to the static-file fallback
    // before giving up entirely.
    const fileSlug = slugFromStaticFile();
    if (fileSlug) {
      cachedSlug = fileSlug;
      cachedAt = now;
      return fileSlug;
    }
    throw err;
  }
}

function dateToSlug(isoDate) {
  const [year, month, day] = isoDate.split("-");
  const monthName = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"][Number(month) - 1];
  if (!monthName) throw new Error(`bad month=${month}`);
  return `${Number(day)}${monthName}${year}`;
}

export default async function handler(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    return response.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const slug = await readLatestSlug();
    // Permanent redirect: search engines transfer ranking signals to the
    // dated brief URL, which is the canonical SEO target.
    response.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=86400");
    response.setHeader("X-Robots-Tag", "noindex, follow");
    const proto = request.headers["x-forwarded-proto"] || "https";
    const host = request.headers.host || process.env.VERCEL_URL || "marketnarrative.in";
    const baseUrl = `${proto}://${host}`;
    return response.redirect(301, `${baseUrl}/${slug}/`);
  } catch (err) {
    // Last-resort: send users to the archive homepage so they always land
    // on a working page. Search engines will retry the redirect later.
    const proto = request.headers["x-forwarded-proto"] || "https";
    const host = request.headers.host || process.env.VERCEL_URL || "marketnarrative.in";
    return response.redirect(302, `${proto}://${host}/`);
  }
}
