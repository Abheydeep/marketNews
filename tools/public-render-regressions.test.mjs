import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pageShell } from "./page-shell.mjs";
import { publicSiteOrigin } from "./public-page-registry.mjs";
import { indicesPageHtml } from "./indices-layout.mjs";
import { archivePage, aboutPage, subscribePage, moneyFlowPage, marketStatisticsPage, movesHubPage } from "./publish-site.mjs";
import { cockpitPage } from "./cockpit-page.mjs";

const digest = {
  digestDate: "2026-07-01",
  generatedAt: "2026-07-01T02:00:00Z",
  title: "GIFT Nifty Signals Firm Open",
  twoMinuteSummary: "GIFT Nifty points to a firm open.",
  news: [], tradeSetups: [], fiiDiiFlows: null,
  marketSnapshots: [
    { symbol: "GIFTNIFTY", closeValue: 24064, previousClose: 23866, changePercent: 0.83, dataQuality: "live" },
    { symbol: "NIFTY", closeValue: 23866, previousClose: 23800, changePercent: 0.28, dataQuality: "live" },
    { symbol: "INDIAVIX", closeValue: 13, previousClose: 13.2, changePercent: -1.5, dataQuality: "live" }
  ]
};

function visibleText(html) {
  return html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

test("public rendering: shell owns styles, content width, and focus-only skip link", () => {
  const html = pageShell({ title: "Test", styles: ".probe { color:red; }", main: "<h1>Test</h1>" });
  assert.match(html, /<style>[\s\S]*\.probe \{ color:red; \}[\s\S]*<\/style>/);
  assert.doesNotMatch(visibleText(html), /\.probe|color:red/);
  assert.match(html, /<main id="mn-main" class="site-content-shell">/);
  assert.match(html, /\.mn-skip\s*\{/);
  assert.match(html, /\.mn-skip:focus-visible/);
  assert.match(html, /clip-path:\s*inset\(50%\)/);
  assert.match(html, /@media \(max-width:760px\)[\s\S]*\.site-footer\s*\{[^}]*padding-bottom:\s*calc\(96px \+ env\(safe-area-inset-bottom, 0px\)\)/);
});

test("public rendering: apex origin env normalizes to canonical www host", () => {
  const previous = process.env.PUBLIC_SITE_ORIGIN;
  process.env.PUBLIC_SITE_ORIGIN = "https://marketnarrative.in";
  try {
    assert.equal(publicSiteOrigin(), "https://www.marketnarrative.in");
  } finally {
    if (previous === undefined) delete process.env.PUBLIC_SITE_ORIGIN;
    else process.env.PUBLIC_SITE_ORIGIN = previous;
  }
});

test("public rendering: indices do not redefine shared width and expose status states", async () => {
  const html = indicesPageHtml(digest, "https://www.marketnarrative.in", "2026-07-01 07:30", "");
  assert.match(html, /● Live/);
  assert.match(html, /Closed/);
  assert.match(html, /Delayed/);
  assert.doesNotMatch(await readFile("tools/indices-styles.mjs", "utf8"), /^\s*\.shell\b/m);
});

test("public rendering: market statistics syncs visible values with indices API", () => {
  const html = marketStatisticsPage(digest);
  assert.match(html, /id="market-stats-live-status"/);
  assert.match(html, /data-stat-live="NIFTY"/);
  assert.match(html, /Live values sync with Indices/);
  assert.match(html, /\/api\/live-indices\//);
});

test("public rendering: homepage does not leak CSS text", () => {
  const html = archivePage([digest], [digest], digest);
  assert.doesNotMatch(visibleText(html), /Pro polish|touch-action\s*:/i);
});

test("public rendering: static pages use the shared content container", () => {
  for (const html of [aboutPage(digest, [digest]), subscribePage(digest), moneyFlowPage(digest, [], [])]) {
    assert.match(html, /<main id="mn-main" class="site-content-shell">/);
  }
});

test("public rendering: about starts with its proposition and subscribe hides honeypot", () => {
  const about = aboutPage(digest, [digest]);
  const aboutMain = about.slice(about.indexOf('<main id="mn-main"'));
  assert.ok(aboutMain.indexOf("About Market Narrative") < aboutMain.indexOf("more-hub"));
  const subscribe = subscribePage(digest);
  assert.match(subscribe, /<label class="honey-field"[^>]*\bhidden\b/);
  assert.match(subscribe, /\.subscribe-form \.honey-field\[hidden\]\s*\{[^}]*display:\s*none\s*!important/);
});

test("public rendering: social cards remain metadata-only", () => {
  const html = cockpitPage({ ...digest, ogImageUrl: "https://www.marketnarrative.in/assets/social/briefing-1jul2026.png" }, "public-view", { includeStudio: false });
  assert.match(html, /<meta property="og:image" content="https:\/\/www\.marketnarrative\.in\/assets\/social\/briefing-1jul2026\.png">/);
  assert.doesNotMatch(html, /<img[^>]+assets\/social\/briefing-1jul2026\.png/);
});

test("public rendering: compact summary does not repeat the India read as confirmation", () => {
  const sentence = "Private banks and NBFCs are the direct check";
  const html = cockpitPage({ ...digest, dailyLead: { label: "Bank cue", headline: "Bank earnings guide the open", indiaImpact: sentence, supportSide: sentence } }, "public-view", { includeStudio: false });
  const start = html.indexOf('id="summaryExpand"');
  const summary = html.slice(start, html.indexOf("</summary>", start));
  assert.equal(summary.match(new RegExp(sentence, "g"))?.length, 1);
});

test("public rendering: moves hub uses current verified drivers instead of a dead-end placeholder", () => {
  const html = movesHubPage({ ...digest, news: [{ headline: "Brent falls as supply concerns ease", sourceName: "Reuters", sourceUrl: "https://example.com/brent", indiaImpact: "Lower crude can ease India's import bill." }] });
  assert.match(html, /Brent falls as supply concerns ease/);
  assert.match(html, /Lower crude can ease India/);
  assert.doesNotMatch(html, /No standalone move articles yet/);
});

test("public rendering: Trading Guide first fold explains its levels without desk shorthand", () => {
  const html = cockpitPage({ ...digest, canonicalPath: "/1jul2026/trading-guide/" }, "trading-guide-view", { includeStudio: false });
  const start = html.indexOf('id="trading-guide-view"');
  const firstFold = visibleText(html.slice(start, html.indexOf("Execution Notes", start)));
  assert.match(firstFold, /key index levels/);
  assert.doesNotMatch(firstFold, /index gates?|no-trade zone|first range/i);
});

test("public rendering: FII chart fills the final grid row and client copy is plain", async () => {
  const fiiPage = await readFile("tools/fii-dii-page.mjs", "utf8");
  assert.match(fiiPage, /chartCard\("FII index-futures long %"[^\n]+true\)/);
  const cockpit = await readFile("tools/cockpit-page.mjs", "utf8");
  assert.doesNotMatch(cockpit, /opening-range/i);
});

test("public rendering: Portfolio copy does not claim stale quotes are live", async () => {
  const portfolio = await readFile("tools/multibagger-page.mjs", "utf8");
  assert.doesNotMatch(portfolio, /entries, live prices|Rs 5L/);
  assert.match(portfolio, /latest verified prices|₹5 lakh/);
});

test("local production rehearsal uses the same full news pipeline as production", async () => {
  const runner = await readFile("tools/local-prod-run.mjs", "utf8");
  assert.doesNotMatch(runner, /PULSE_MODE\s*:\s*["']true["']/);
});
