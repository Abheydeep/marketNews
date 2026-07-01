import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pageShell } from "./page-shell.mjs";
import { archivePage, aboutPage, subscribePage, moneyFlowPage } from "./publish-site.mjs";
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
  assert.match(html, /\.mn-skip:focus/);
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

test("public rendering: FII chart fills the final grid row and client copy is plain", async () => {
  const fiiPage = await readFile("tools/fii-dii-page.mjs", "utf8");
  assert.match(fiiPage, /chartCard\("FII index-futures long %"[^\n]+true\)/);
  const cockpit = await readFile("tools/cockpit-page.mjs", "utf8");
  assert.doesNotMatch(cockpit, /opening-range/i);
});
