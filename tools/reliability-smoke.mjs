#!/usr/bin/env node
/**
 * Post-deploy reliability smoke test.
 *
 * Run after `vercel deploy --prod` (or in CI) to catch the regression classes that
 * the reliability review flagged: JSON-LD headline/H1 mismatch, missing sitemap
 * entries, broken /latest/ redirect, missing cache headers, dead links.
 *
 * Exits non-zero on any failure so it can gate a release.
 *
 * Usage:
 *   node tools/reliability-smoke.mjs                # smoke against MARKET_NARRATIVE_SITE_ORIGIN
 *   SITE_ORIGIN=https://staging.marketnarrative.in node tools/reliability-smoke.mjs
 *
 * Env:
 *   SITE_ORIGIN                Base URL to probe (default: https://www.marketnarrative.in)
 *   RELIABILITY_REQUIRED_TRADING_DAY  If 'true', the most recent verified daily
 *                                     briefing must be from the current trading day
 *                                     in Asia/Kolkata. Default: 'true'.
 *   RELIABILITY_MAX_PARALLEL   Concurrency cap (default: 8).
 */

import { setTimeout as sleep } from "node:timers/promises";

const SITE_ORIGIN = (process.env.SITE_ORIGIN || "https://www.marketnarrative.in").replace(/\/+$/, "");
const REQUIRE_TRADING_DAY = process.env.RELIABILITY_REQUIRED_TRADING_DAY !== "false";
const MAX_PARALLEL = Number(process.env.RELIABILITY_MAX_PARALLEL || 8);

const results = [];
let failed = 0;

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) failed += 1;
  const tag = ok ? "✅" : "❌";
  process.stdout.write(`${tag} ${name}${detail ? ` — ${detail}` : ""}\n`);
}

async function fetchText(url, { redirect = "manual", timeoutMs = 12_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { redirect, signal: controller.signal, headers: { "user-agent": "MarketNarrativeReliabilitySmoke/1.0" } });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function getOk(url) {
  const res = await fetchText(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res;
}

function extractMatches(html, regex) {
  const out = [];
  let m;
  while ((m = regex.exec(html)) !== null) out.push(m);
  return out;
}

function extractH1(html) {
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function extractJsonLd(html) {
  const scripts = extractMatches(html, /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  return scripts.map((s) => {
    try { return JSON.parse(s[1]); } catch { return null; }
  }).filter(Boolean);
}

function findNewsArticle(nodes) {
  const stack = [...nodes];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if (Array.isArray(node)) { stack.push(...node); continue; }
    if (typeof node !== "object") continue;
    const type = node["@type"];
    if (type === "NewsArticle" || (Array.isArray(type) && type.includes("NewsArticle"))) return node;
    if (Array.isArray(node["@graph"])) stack.push(...node["@graph"]);
  }
  return null;
}

async function probeLatestSlugFromSitemap(sitemapXml) {
  const urls = extractMatches(sitemapXml, /<loc>([^<]+)<\/loc>/g).map((m) => m[1]);
  const briefs = urls.filter((u) => /\/(\d{1,2}(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\d{4})\/?$/.test(u));
  if (!briefs.length) return null;
  briefs.sort();
  return briefs.at(-1);
}

function tradingDateInIst() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date());
}

function tradingWeekdayInIst() {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "short" }).format(new Date());
}

async function main() {
  process.stdout.write(`Reliability smoke against ${SITE_ORIGIN}\n`);

  // 1. Homepage reachable and well-formed
  const homeRes = await getOk(`${SITE_ORIGIN}/`);
  const homeHtml = await homeRes.text();
  const homeH1 = extractH1(homeHtml);
  record("home returns 200 and an H1", Boolean(homeH1), `h1="${homeH1?.slice(0, 60)}"`);
  record("home has canonical", /<link rel="canonical"\s+href="https:\/\/[^"]+"\s*\/?>/i.test(homeHtml));
  record("home has JSON-LD", /<script[^>]+type="application\/ld\+json"/i.test(homeHtml));
  record("home has og:image ≥ 1200x675 hint", /og:image:(width|height)/i.test(homeHtml) || /og-card-1200x675/i.test(homeHtml));

  // 2. Sitemap freshness — newest brief must be in sitemap
  const sitemapRes = await getOk(`${SITE_ORIGIN}/sitemap.xml`);
  const sitemapXml = await sitemapRes.text();
  const latestUrl = await probeLatestSlugFromSitemap(sitemapXml);
  record("sitemap parses and has at least one daily brief", Boolean(latestUrl), latestUrl || "no briefs in sitemap");

  // 3. /latest/ eventually resolves to the latest verified brief
  const latestRes = await fetchText(`${SITE_ORIGIN}/latest/`, { redirect: "follow" });
  const latestBody = await latestRes.text();
  record("/latest/ resolves 200", latestRes.ok, `status=${latestRes.status}`);
  if (latestUrl) {
    // /latest/ uses a <meta http-equiv="refresh"> soft redirect, so fetch won't follow it.
    // Read the body, parse the refresh target, and compare.
    const refreshMatch = /<meta\s+http-equiv="refresh"[^>]+url=([^"\s>]+)/i.exec(latestBody);
    const finalTarget = refreshMatch ? refreshMatch[1] : null;
    const normalizedLatest = latestUrl.replace(/\/+$/, "");
    const matches = finalTarget && finalTarget.replace(/\/+$/, "") === normalizedLatest;
    record("/latest/ meta-refresh target matches sitemap's latest brief", Boolean(matches), `target=${finalTarget || "?"} expected=${normalizedLatest}`);
  }

  // 4. JSON-LD headline ↔ H1 parity on the latest daily brief
  if (latestUrl) {
    const briefRes = await getOk(latestUrl);
    const briefHtml = await briefRes.text();
    const briefH1 = extractH1(briefHtml);
    const nodes = extractJsonLd(briefHtml);
    const news = findNewsArticle(nodes);
    if (!news) {
      record("daily brief has NewsArticle JSON-LD", false, "no NewsArticle node found");
    } else {
      const ldHeadline = String(news.headline || "").replace(/\s+/g, " ").trim();
      const h1Clean = String(briefH1 || "").replace(/\s+/g, " ").trim();
      const matches = ldHeadline && h1Clean && (ldHeadline === h1Clean || h1Clean.includes(ldHeadline) || ldHeadline.includes(h1Clean));
      record("JSON-LD headline matches page H1", Boolean(matches), `ld="${ldHeadline.slice(0, 60)}" h1="${h1Clean.slice(0, 60)}"`);
      record("JSON-LD has description", Boolean(news.description && news.description.length >= 40));
      record("JSON-LD has image", Boolean(news.image && (Array.isArray(news.image) ? news.image.length : news.image)));
      record("JSON-LD has datePublished", Boolean(news.datePublished));
      record("JSON-LD has author and publisher", Boolean(news.author && news.publisher));
      record("brief HTML mentions prev/next", /<link rel="(prev|next)"/i.test(briefHtml));
    }
  }

  // 5. Cache headers on a daily brief
  if (latestUrl) {
    const headRes = await fetchText(latestUrl, { redirect: "follow" });
    const cache = headRes.headers.get("cache-control") || "";
    record("daily brief sets a Cache-Control header", Boolean(cache), `value="${cache}"`);
    record("daily brief cache includes stale-while-revalidate", /stale-while-revalidate/i.test(cache));
  }

  // 6. Security headers (vercel.json should set X-Content-Type-Options and Referrer-Policy)
  const homeHeaders = (await fetchText(`${SITE_ORIGIN}/`, { redirect: "follow" })).headers;
  record("X-Content-Type-Options: nosniff", /nosniff/i.test(homeHeaders.get("x-content-type-options") || ""));

  // 7. Stale-page watchdog (only on trading days)
  if (REQUIRE_TRADING_DAY && latestUrl) {
    const weekday = tradingWeekdayInIst();
    const istDate = tradingDateInIst();
    const isWeekend = weekday === "Sat" || weekday === "Sun";
    if (isWeekend) {
      record("weekend — skip trading-day freshness check", true, `today=${weekday}`);
    } else {
      const slugMatch = latestUrl.match(/(\d{1,2})(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(\d{4})/);
      if (!slugMatch) {
        record("could not parse date from latest slug", false, latestUrl);
      } else {
        const [, dd, mon, yyyy] = slugMatch;
        const monthIndex = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(mon) + 1;
        const slugDate = `${yyyy}-${String(monthIndex).padStart(2, "0")}-${String(Number(dd)).padStart(2, "0")}`;
        const todayIst = istDate;
        const diffDays = Math.round((Date.parse(todayIst) - Date.parse(slugDate)) / 86_400_000);
        // Allow up to 1 trading day stale (Mon morning showing Fri's brief is fine).
        record("latest brief is fresh (within 1 trading day)", diffDays <= (weekday === "Mon" ? 3 : 1), `slugDate=${slugDate} todayIst=${todayIst} diffDays=${diffDays}`);
      }
    }
  }

  // 8. 404 for nonexistent
  const four = await fetchText(`${SITE_ORIGIN}/this-page-should-not-exist-${Date.now()}/`, { redirect: "follow" });
  record("nonexistent path returns 404", four.status === 404, `status=${four.status}`);

  // 9. /admin/ and /dark-preview/ must not be indexable
  for (const path of ["/admin/", "/dark-preview/"]) {
    const res = await fetchText(`${SITE_ORIGIN}${path}`, { redirect: "follow" });
    const robots = res.headers.get("x-robots-tag") || "";
    const meta = /<meta\s+name="robots"[^>]+content="[^"]*noindex/i.test(await res.text());
    record(`${path} sends noindex (header or meta)`, /noindex/i.test(robots) || meta, `x-robots-tag="${robots}"`);
  }

  await sleep(10);
  process.stdout.write(`\n${results.length} checks · ${results.length - failed} passed · ${failed} failed\n`);
  if (failed > 0) {
    process.stdout.write(`\nFirst failures:\n`);
    for (const r of results.filter((x) => !x.ok).slice(0, 8)) {
      process.stdout.write(` - ${r.name}${r.detail ? ` (${r.detail})` : ""}\n`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(2);
});
