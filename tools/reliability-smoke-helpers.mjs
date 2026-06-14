export async function fetchText(url, { redirect = "manual", timeoutMs = 12_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      redirect,
      signal: controller.signal,
      headers: { "user-agent": "MarketNarrativeReliabilitySmoke/1.0" }
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function getOk(url) {
  const res = await fetchText(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res;
}

export function extractH1(html) {
  const match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (!match) return null;
  return match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function extractJsonLd(html) {
  const scripts = extractMatches(html, /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  return scripts.map((script) => {
    try {
      return JSON.parse(script[1]);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

export function findNewsArticle(nodes) {
  const stack = [...nodes];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if (Array.isArray(node)) {
      stack.push(...node);
      continue;
    }
    if (typeof node !== "object") continue;
    const type = node["@type"];
    if (type === "NewsArticle" || (Array.isArray(type) && type.includes("NewsArticle"))) return node;
    if (Array.isArray(node["@graph"])) stack.push(...node["@graph"]);
  }
  return null;
}

export function samePath(left, right) {
  const leftPath = String(left || "").replace(/^https?:\/\/[^/]+/, "").replace(/\/+$/, "");
  const rightPath = String(right || "").replace(/^https?:\/\/[^/]+/, "").replace(/\/+$/, "");
  return Boolean(leftPath && rightPath && leftPath === rightPath);
}

export function latestHtmlPointsToBrief(html, latestUrl) {
  const latestPath = String(latestUrl || "").replace(/^https?:\/\/[^/]+/, "").replace(/\/+$/, "");
  if (!latestPath) return false;
  const escaped = latestPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:url=|href=|location\\.(?:replace|assign)\\()[\"']?${escaped}/?`, "i").test(html);
}

export async function probeLatestSlugFromSitemap(sitemapXml) {
  const urls = extractMatches(sitemapXml, /<loc>([^<]+)<\/loc>/g).map((match) => match[1]);
  // Accept both compact (3jun2026) and ISO (2026-06-03) slug formats. The Day 7
  // PUBLIC_SLUG_FORMAT=iso flip will repoint sitemap entries to ISO form.
  const briefs = urls.filter((url) =>
    /\/(\d{1,2}(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\d{4})\/?$/.test(url) ||
    /\/(\d{4}-\d{2}-\d{2})\/?$/.test(url)
  );
  if (!briefs.length) return null;
  briefs.sort();
  return briefs.at(-1);
}

export function tradingDateInIst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function tradingWeekdayInIst() {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "short" }).format(new Date());
}

function extractMatches(html, regex) {
  const out = [];
  let match;
  while ((match = regex.exec(html)) !== null) out.push(match);
  return out;
}
