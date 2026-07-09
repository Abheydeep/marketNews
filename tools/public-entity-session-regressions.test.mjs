import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { archivePage, movesHubPage } from "./publish-site.mjs";
import { giftNiftyPageHtml } from "./gift-nifty-layout.mjs";
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

test("public entity/session regressions: moves hub and archive search decode hex entities", () => {
  const hexDigest = {
    ...digest,
    news: [{
      headline: "Trump blasts &#x2018;hostile&#x2019; Fed and says Warsh &#x2018;has to do something&#x2019;",
      sourceName: "Reuters",
      sourceUrl: "https://example.com/fed",
      indiaImpact: "Japan&amp;#x2019;s currency cue matters for India."
    }]
  };
  const moves = movesHubPage(hexDigest);
  const archive = archivePage([hexDigest], [hexDigest], hexDigest);
  assert.match(visibleText(moves), /Trump blasts ‘hostile’ Fed/);
  assert.match(visibleText(moves), /Japan’s currency cue/);
  assert.doesNotMatch(moves, /&amp;#x2018;|&amp;#x2019;|&amp;amp;#x2019;/);
  assert.doesNotMatch(archive, /data-archive-search="[^"]*&amp;#x2019;/);
});

test("public entity/session regressions: source cards decode entities before escaping", async () => {
  const publisher = await readFile("tools/publish-site.mjs", "utf8");
  assert.match(publisher, /escapeDecoded\(source\.headline\)/);
  assert.match(publisher, /escapeDecoded\(source\.indiaImpact/);
  assert.match(publisher, /escapeDecoded\(source\.watchFor/);
});

test("public entity/session regressions: briefing source cards decode hex entities", () => {
  const html = cockpitPage({
    ...digest,
    news: [{
      headline: "Trump blasts &#x2018;hostile&#x2019; Fed",
      summary: "Fed&#x2019;s policy pressure matters.",
      sourceUrl: "https://example.com/fed",
      sourceName: "MarketWatch",
      publishedAt: "2026-07-03T01:00:00Z",
      category: "macro_negative",
      sentimentScore: -0.2
    }]
  }, "public-view", { includeStudio: false });
  assert.match(visibleText(html), /Trump blasts ‘hostile’ Fed/);
  assert.match(visibleText(html), /Fed’s policy pressure matters/);
  assert.doesNotMatch(visibleText(html), /&amp;#x20(?:18|19);|&amp;amp;#x2019;/);
  assert.doesNotMatch(html, /Open source article: [^"]*&amp;#x2018;/);
  assert.doesNotMatch(html, /<h3>[^<]*&amp;#x2018;/);
});

test("public entity/session regressions: Gift Nifty session heading is state-aware", async () => {
  const html = giftNiftyPageHtml(digest, [], "https://www.marketnarrative.in", "");
  const script = await readFile("tools/market-session-client.mjs", "utf8");
  assert.match(html, /id="nse-session-label"[^>]*>NSE Cash Market Status<\/h3>/);
  assert.match(html, /document\.getElementById\("nse-session-label"\)/);
  assert.match(script, /label\.textContent = "NSE Cash Market Closed"/);
  assert.match(script, /label\.textContent = "NSE Cash Market Open"/);
  assert.match(script, /label\.textContent = "NSE Cash Market Countdown"/);
});
