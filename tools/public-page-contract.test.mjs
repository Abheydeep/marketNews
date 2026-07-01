import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
}

test("public pages: shared shell has complete metadata and unique ids", () => {
  const html = pageShell({ title: "Indices & Markets", main: "<h1>Indices</h1>" });
  assert.equal(tagCount(html, "title"), 1);
  assert.match(html, /<title>Indices &amp; Markets<\/title>/);
  assert.equal(tagCount(html, "main"), 1);
  assert.deepEqual(duplicateIds(html), []);
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
