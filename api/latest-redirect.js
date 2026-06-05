/**
 * /latest/ → server-side 301 redirect to the latest verified daily brief.
 *
 * Slug resolution order:
 *   1. LATEST_DIGEST_SLUG env var (e.g. "5jun2026") — set by the deploy
 *      pipeline whenever a new briefing is published. Zero runtime cost.
 *   2. /digest.json fetch from the deployed origin — fallback for local dev
 *      and for environments where the env var is not configured.
 *   3. Previous in-memory cached slug — soft degrade across requests.
 *   4. 302 to / — last-resort, never 500.
 *
 * In this static+functions project the static meta-refresh fallback at
 * public/latest/index.html is still the primary /latest/ handler (it wins
 * the route). The function remains registered for environments that route
 * the function first, and as a safety net if the meta-refresh page is ever
 * removed.
 */

export const config = {
  runtime: "nodejs",
  regions: ["bom1"], // closest edge to IST primary audience
};

const SLUG_CACHE_MS = 5 * 60 * 1000;
let cachedSlug = null;
let cachedAt = 0;

function slugFromEnv() {
  const raw = String(process.env.LATEST_DIGEST_SLUG || "").trim().toLowerCase();
  if (!raw) return null;
  if (!/^\d{1,2}(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\d{4}$/.test(raw)) {
    console.warn(`latest-redirect: ignoring malformed LATEST_DIGEST_SLUG=${raw}`);
    return null;
  }
  return raw;
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
    if (cachedSlug) return cachedSlug;
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
    return response.redirect(301, `/${slug}/`);
  } catch (err) {
    // Last-resort: send users to the archive homepage so they always land
    // on a working page. Search engines will retry the redirect later.
    return response.redirect(302, "/");
  }
}
