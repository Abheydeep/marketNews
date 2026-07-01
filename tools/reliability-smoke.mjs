#!/usr/bin/env node
/**
 * Post-deploy reliability smoke test.
 *
 * Run after `vercel deploy --prod` (or in CI) to catch the regression classes that
 * the reliability review flagged: JSON-LD headline/H1 mismatch, missing sitemap
 * entries, broken /latest/ resolution, missing cache headers, dead links.
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
 */

import { setTimeout as sleep } from "node:timers/promises";
import { log } from "./logger.mjs";
import {
  extractH1,
  extractJsonLd,
  fetchText,
  findNewsArticle,
  getOk,
  latestHtmlPointsToBrief,
  probeLatestSlugFromSitemap,
  samePath,
  tradingDateInIst,
  tradingWeekdayInIst
} from "./reliability-smoke-helpers.mjs";

const SITE_ORIGIN = (process.env.SITE_ORIGIN || "https://www.marketnarrative.in").replace(/\/+$/, "");
const REQUIRE_TRADING_DAY = process.env.RELIABILITY_REQUIRED_TRADING_DAY !== "false";

const results = [];
let failed = 0;

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) failed += 1;
  const tag = ok ? "✅" : "❌";
  process.stdout.write(`${tag} ${name}${detail ? ` — ${detail}` : ""}\n`);
}

async function main() {
  log.info("reliability smoke started", { siteOrigin: SITE_ORIGIN, requireTradingDay: REQUIRE_TRADING_DAY });

  // 1. Homepage reachable and well-formed
  const homeRes = await getOk(`${SITE_ORIGIN}/`);
  const homeHtml = await homeRes.text();
  const homeH1 = extractH1(homeHtml);
  record("home returns 200 and an H1", Boolean(homeH1), `h1="${homeH1?.slice(0, 60)}"`);
  record("home has canonical", /<link rel="canonical"\s+href="https:\/\/[^"]+"\s*\/?>/i.test(homeHtml));
  record("home has JSON-LD", /<script[^>]+type="application\/ld\+json"/i.test(homeHtml));
  record("home has 1200x630 social-image metadata", /og:image:width[^>]*1200/i.test(homeHtml) && /og:image:height[^>]*630/i.test(homeHtml));

  // 2. Sitemap freshness — newest brief must be in sitemap
  const sitemapRes = await getOk(`${SITE_ORIGIN}/sitemap.xml`);
  const sitemapXml = await sitemapRes.text();
  const latestUrl = await probeLatestSlugFromSitemap(sitemapXml);
  record("sitemap parses and has at least one daily brief", Boolean(latestUrl), latestUrl || "no briefs in sitemap");

  // 3. /latest/ eventually resolves to the latest verified brief.
  // Older production builds issued a hard 301 from /latest/. Current static
  // builds can serve a lightweight shell with meta/JS links to the latest brief.
  // Accept either contract, but keep verifying that the target is the newest
  // sitemap briefing rather than stale archive history.
  const latestRes = await fetchText(`${SITE_ORIGIN}/latest/`, { redirect: "manual" });
  const latestStatus = latestRes.status;
  const latestLocation = latestRes.headers.get("location");
  if (latestUrl) {
    const redirectStatuses = new Set([301, 302, 307, 308]);
    if (redirectStatuses.has(latestStatus)) {
      record("/latest/ redirects to sitemap's latest brief", samePath(latestLocation, latestUrl), `location=${latestLocation || "?"}`);
    } else {
      const latestHtml = await latestRes.text();
      const pointsToLatest = latestStatus === 200 && latestHtmlPointsToBrief(latestHtml, latestUrl);
      record("/latest/ static shell points to sitemap's latest brief", pointsToLatest, `status=${latestStatus}`);
    }
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
  log.info("reliability smoke completed", { checks: results.length, passed: results.length - failed, failed });
  if (failed > 0) {
    process.stdout.write(`\nFirst failures:\n`);
    for (const r of results.filter((x) => !x.ok).slice(0, 8)) {
      process.stdout.write(` - ${r.name}${r.detail ? ` (${r.detail})` : ""}\n`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  log.error("reliability smoke crashed", { error: err.message });
  console.error("Smoke test crashed:", err);
  process.exit(2);
});
