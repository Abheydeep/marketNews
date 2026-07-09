import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { pageShell } from "./page-shell.mjs";
import { normalizePublicSourceCategory } from "./public-source-category.mjs";
import { indicesPageHtml } from "./indices-layout.mjs";
import { giftNiftyPageHtml } from "./gift-nifty-layout.mjs";
import {
  archivePage,
  aboutPage,
  subscribePage,
  moneyFlowPage,
  marketStatisticsPage,
  movesHubPage,
  contactPage,
  privacyPage,
  termsPage
} from "./publish-site.mjs";
import { cockpitPage } from "./cockpit-page.mjs";
import { multibaggerPage } from "./multibagger-page.mjs";
import { headlineNeedsBackfill } from "./backfill-headlines.mjs";
import { readdir } from "node:fs/promises";
import { bottomTabBarHtml } from "./mobile-shell.mjs";
import { generateSocialCards } from "./social-card.mjs";

function tagCount(html, tag) {
  return (html.match(new RegExp(`<${tag}\\b`, "gi")) || []).length;
}

function duplicateIds(html) {
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]);
  return ids.filter((id, index) => ids.indexOf(id) !== index);
}

function markerCount(html, marker) {
  return html.split(marker).length - 1;
}

function assertSharedShell(html, label) {
  assert.equal(markerCount(html, "/* site-theme v1 */"), 1, `${label} must have one shared theme`);
  assert.equal(markerCount(html, "<!-- site-header v1 -->"), 1, `${label} must have one shared header`);
  assert.equal(markerCount(html, "<!-- site-footer v1 -->"), 1, `${label} must have one shared footer`);
  assert.equal(tagCount(html, "main"), 1, `${label} must have one main landmark`);
  assert.equal((html.match(/<footer\b[^>]*class=["'][^"']*site-footer/gi) || []).length, 1, `${label} must have one canonical site footer`);
  assert.equal((html.match(/<nav\b[^>]*class=["'][^"']*topbar/gi) || []).length, 1, `${label} must have one canonical site header`);
  assert.deepEqual(duplicateIds(html), [], `${label} must have no duplicate DOM IDs`);
  assert.match(html, /<a class="mn-skip" href="#mn-main">/, `${label} must have a skip link`);
  assert.match(html, /<title>[^<]+ \| Market Narrative<\/title>/, `${label} must use the branded title contract`);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.marketnarrative\.in\//, `${label} must use the www canonical host`);
  assert.doesNotMatch(html, /https:\/\/marketnarrative\.in/i, `${label} must not emit the apex host`);
  for (const [href, text] of [["/latest/", "Latest briefing"], ["/latest/trading-guide/", "Trading Guide"], ["/money-flow/fii-dii/", "FII/DII"], ["/multibagger/", "Portfolio"], ["/about/", "About"], ["/subscribe/", "Subscribe"]]) {
    assert.match(html, new RegExp(`<a[^>]+href="${href.replaceAll("/", "\\/")}"[^>]*>${text.replace("/", "\\/")}`), `${label} missing ${text}`);
  }
  assert.doesNotMatch(visibleText(html), /\b(?:VWAP|breadth|opening range|first[- ]hour range|risk appetite|risk-on|risk-off|advance-decline)\b/i, `${label} leaks public jargon`);
  assert.equal((html.match(/<button\b(?![^>]*\btype=)/gi) || []).length, 0, `${label} has buttons without a type`);
}

function visibleText(html) {
  return html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

test("public pages: shared shell has complete metadata and unique ids", () => {
  const html = pageShell({ title: "Indices & Markets", main: "<h1>Indices</h1>" });
  assert.equal(tagCount(html, "title"), 1);
  assert.match(html, /<title>Indices &amp; Markets \| Market Narrative<\/title>/);
  assert.equal(tagCount(html, "main"), 1);
  assert.deepEqual(duplicateIds(html), []);
});

test("public pages: non-tab routes do not falsely mark Home current", () => {
  assert.doesNotMatch(bottomTabBarHtml(""), /aria-current="page"/);
  assert.match(bottomTabBarHtml("fiidii"), /href="\/money-flow\/fii-dii\/" aria-current="page"/);
  assert.match(bottomTabBarHtml("fiidii"), />FII\/DII<\/span>/);
});

test("public pages: deterministic social cards are valid 1200x630 PNG files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mn-social-"));
  try {
    const files = await generateSocialCards(dir, [{ slug: "1jul2026", title: "Nifty Tracks Crude Before the Open", date: "1 July 2026" }]);
    assert.ok(files.includes("indices.png"));
    assert.ok(files.includes("briefing-1jul2026.png"));
    const metadata = await sharp(join(dir, "briefing-1jul2026.png")).metadata();
    assert.deepEqual({ format: metadata.format, width: metadata.width, height: metadata.height }, { format: "png", width: 1200, height: 630 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("public pages: indices modal dependencies and accessibility contract are rendered", () => {
  const digest = { digestDate: "2026-07-01", generatedAt: "2026-07-01T02:00:00Z", marketSnapshots: [] };
  const html = indicesPageHtml(digest, "https://www.marketnarrative.in", "2026-07-01 07:30", "");
  for (const id of ["idx-stat-chg", "idx-ctx", "idx-m", "idx-countdown-clock", "idx-countdown-status"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /Briefing snapshot/);
  assert.doesNotMatch(html, />● Live · updated just now</);
  assert.doesNotMatch(html, /onclick=/i);
});

test("public pages: historical archive titles pass the current title guard", async () => {
  const files = (await readdir("archive/daily")).filter((file) => file.endsWith("-digest.json"));
  const failures = [];
  for (const file of files) {
    const digest = JSON.parse(await readFile(`archive/daily/${file}`, "utf8"));
    if (headlineNeedsBackfill(digest.title)) failures.push(`${file}: ${digest.title}`);
  }
  assert.deepEqual(failures, []);
});

test("public pages: layouts rely on the shell main landmark", async () => {
  for (const path of ["tools/indices-layout.mjs", "tools/gift-nifty-layout.mjs"]) {
    assert.doesNotMatch(await readFile(path, "utf8"), /<main class="idx-layout-shell">/, path);
  }
});

test("public pages: archive consumes the shared shell", async () => {
  const source = await readFile("tools/archive-page.mjs", "utf8");
  assert.match(source, /import \{ pageShell \}/);
  assert.match(source, /mobileActiveKey:\s*"archive"/);
  assert.doesNotMatch(source, /class="top-bar"/);
});

test("public pages: guide refresh never resolves below trading-guide", async () => {
  const source = await readFile("tools/cockpit-page.mjs", "utf8");
  assert.match(source, /guideSuffix = '\/trading-guide\/'/);
  assert.match(source, /briefingPath = path\.endsWith\(guideSuffix\)/);
  assert.doesNotMatch(source, /localPreview && publicUrl/);
});

test("public sources: positive market cues do not collapse into geopolitical risk", () => {
  const corrected = normalizePublicSourceCategory({
    headline: "Global Market Today: Asian stocks climb on tech rally",
    category: "global_risk"
  });
  assert.equal(corrected.category, "macro_positive");
  const preserved = normalizePublicSourceCategory({
    headline: "Asian markets gain as investors await Iran talks",
    category: "global_risk"
  });
  assert.equal(preserved.category, "global_risk");
});

test("public sources: dead and unsupported endpoints are absent", async () => {
  const news = await readFile("tools/news-sources.mjs", "utf8");
  const market = `${await readFile("tools/market-data.mjs", "utf8")}\n${await readFile("tools/http.mjs", "utf8")}`;
  const images = await readFile("tools/generate-article-image.mjs", "utf8");
  assert.doesNotMatch(news, /bqprime\.com\/feeds\/rss-all/);
  assert.doesNotMatch(market, /market-data\/fii-dii-activity/);
  assert.match(market, /reports\/fii-dii/);
  assert.doesNotMatch(images, /qwen-image/);
});

test("public pages: every public renderer consumes the shared shell exactly once", () => {
  const mockDigest = {
    digestDate: "2026-06-30",
    generatedAt: new Date().toISOString(),
    news: [],
    twoMinuteSummary: "Nifty summary",
    fiiDiiFlows: null,
    tradeSetups: [],
    marketSnapshots: [
      { symbol: "GIFTNIFTY", closeValue: 24000, changePercent: 0.1, previousClose: 23980, dataQuality: "live" },
      { symbol: "NIFTY", closeValue: 24000, changePercent: 0.1, previousClose: 23980, dataQuality: "live" },
      { symbol: "INDIAVIX", closeValue: 12.5, changePercent: -0.5, previousClose: 13.0, dataQuality: "live" }
    ]
  };

  const siteOrigin = "https://www.marketnarrative.in";
  const pages = [
    ["Indices", indicesPageHtml(mockDigest, siteOrigin, "2026-06-30 07:15", "")],
    ["GIFT Nifty", giftNiftyPageHtml(mockDigest, [], siteOrigin, "")],
    ["Homepage", archivePage([mockDigest], [mockDigest])],
    ["About", aboutPage(mockDigest, [mockDigest])],
    ["Subscribe", subscribePage(mockDigest, 38)],
    ["FII/DII", moneyFlowPage(mockDigest, [], [])],
    ["Market Statistics", marketStatisticsPage(mockDigest)],
    ["Moves", movesHubPage(mockDigest)],
    ["Contact", contactPage()],
    ["Privacy", privacyPage()],
    ["Terms", termsPage()],
    ["Briefing", cockpitPage(mockDigest, "public-view", { includeStudio: false, theme: "glass-v2" })],
    ["Portfolio", multibaggerPage()]
  ];

  for (const [label, html] of pages) assertSharedShell(html, label);
});
