/**
 * /latest/ → server-side 301 redirect to the latest verified daily brief.
 *
 * Reads the build's out/site/digest.json (a static artifact present in
 * the Vercel deployment at /digest.json) to discover today's slug, then
 * redirects with a permanent 301 so search engines transfer equity.
 *
 * Falls back gracefully if digest.json is missing or malformed:
 * - 5 minute edge cache to absorb traffic spikes
 * - Returns 302 to / on parse error (degrades to homepage, never 500)
 */

export const config = {
  runtime: "nodejs20.x",
  regions: ["bom1"], // closest edge to IST primary audience
};

const SLUG_CACHE_MS = 5 * 60 * 1000;
let cachedSlug = null;
let cachedAt = 0;

async function readLatestSlug() {
  const now = Date.now();
  if (cachedSlug && now - cachedAt < SLUG_CACHE_MS) return cachedSlug;

  // digest.json is emitted as a static asset at the site root.
  // On Vercel we fetch the deployed copy via the request's own origin.
  const origin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://marketnarrative.in";
  try {
    const res = await fetch(`${origin}/digest.json`, {
      headers: { "user-agent": "MarketNarrativeLatestRedirect/1.0" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`digest.json status=${res.status}`);
    const json = await res.json();
    const date = String(json.digestDate || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`bad digestDate=${date}`);
    cachedSlug = dateToSlug(date);
    cachedAt = now;
    return cachedSlug;
  } catch (err) {
    // Soft degrade: keep serving the previous cached slug if we had one,
    // otherwise bubble up so the caller can 302 to /.
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
