import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { allowedDollarPrices, sanitizeEditorialHeadline } from "./core.mjs";
import { isLivePriceTracker, triageArticlesWithLLM } from "./article-triage.mjs";
import { agentSelectPulseArticles, articleLooksMarketRelevant } from "./news-sources.mjs";
import { assertPublicDigestArtifact } from "./public-artifact-guard.mjs";
import { isPulseMarketCandidate } from "./pulse-candidate-filter.mjs";
import { reconcileGeneratedInstrumentPrices, unsupportedInstrumentPrices } from "./public-price-reconcile.mjs";
import { publishCommandEnv } from "./publish-command-env.mjs";
import { titleForDailyLead } from "./public-lead-title.mjs";

test("content guardrails: deterministic triage removes live price trackers without an LLM", async () => {
  const liveblog = { headline: "Example Share Price Live Updates: Current Price and Market Performance" };
  const reportedNews = { headline: "Example Industries reports quarterly earnings growth" };
  assert.equal(isLivePriceTracker(liveblog), true);
  assert.equal(isLivePriceTracker(reportedNews), false);
  assert.deepEqual(await triageArticlesWithLLM([liveblog, reportedNews], { nvidiaApiKey: "" }), [reportedNews]);
});

test("content guardrails: Pulse fallback rejects stock-pick and off-topic headlines", () => {
  assert.equal(articleLooksMarketRelevant({ headline: "Five Stocks To Buy Today: Broker Picks", summary: "Analyst targets" }), false);
  assert.equal(articleLooksMarketRelevant({ headline: "Who Is A Cricketer? FIR Filed After Match", summary: "Sports report" }), false);
  assert.equal(articleLooksMarketRelevant({ headline: "Brent crude rises as supply risk grows", summary: "Oil affects inflation" }), true);
  assert.equal(isPulseMarketCandidate({ headline: "Stock Picks Today: HDFC Bank and More", summary: "Brokerage radar" }), false);
  assert.equal(isPulseMarketCandidate({ headline: "Tech Mahindra Shares in Focus", summary: "HDFC Securities maintains Add" }), false);
  assert.equal(isPulseMarketCandidate({ headline: "Positive Breakout: 8 stocks cross above their 200 DMA", summary: "Nifty shares" }), false);
  assert.equal(isPulseMarketCandidate({ headline: "Oil falls before Iran-US talks", summary: "Brent affects India inflation" }), true);
});

test("content guardrails: dollar prices are scoped to the story instrument", () => {
  const snapshots = [
    { symbol: "BRENT", closeValue: 72.4 },
    { symbol: "DXY", closeValue: 90.1 },
    { symbol: "GOLD", closeValue: 2338.6 }
  ];
  const allowed = allowedDollarPrices(snapshots, "Brent crude falls after supply talks");
  assert.equal(sanitizeEditorialHeadline("Brent Below $90 Lifts Nifty Sentiment", allowed), null);
  assert.equal(sanitizeEditorialHeadline("Brent Near $72 Lifts Nifty Sentiment", allowed), "Brent Near $72 Lifts Nifty Sentiment");
});

test("content guardrails: headline sanitizer removes typographic quotes", () => {
  assert.equal(sanitizeEditorialHeadline("“Brent Relief Supports Nifty Before The Open”"), "Brent Relief Supports Nifty Before The Open");
});

test("content guardrails: deterministic public copy contains no risk-on or risk-off jargon", async () => {
  for (const path of ["tools/news-sources.mjs", "tools/indices-page.mjs", "tools/cockpit-page.mjs"]) {
    assert.doesNotMatch(await readFile(path, "utf8"), /risk-(?:on|off)/i, `${path} still contains banned jargon`);
  }
});

test("content guardrails: committed archive preference selects the latest slot", async () => {
  const source = await readFile("tools/vercel-build-public.mjs", "utf8");
  assert.match(source, /import \{ existsSync, readFileSync, readdirSync \} from "node:fs"/);
  assert.match(source, /for \(const slot of \["0830", "0800", "0715"\]\)/);
  const publisher = await readFile("tools/publish-site.mjs", "utf8");
  assert.match(publisher, /datedPageDigests = digests\.filter/);
  assert.match(publisher, /findIndex\(\(item\) => item\.digestDate === digest\.digestDate\) === index/);
});

test("content guardrails: archived publish forwards its source slot across midnight", () => {
  const env = publishCommandEnv("npm", ["run", "site:publish", "--", "--date", "2026-06-30", "--scheduled-time", "08:30"], { KEEP: "yes" });
  assert.deepEqual(env, {
    KEEP: "yes",
    PUBLISH_SOURCE_DATE: "2026-06-30",
    PUBLISH_SOURCE_TIME: "08:30"
  });
});

test("content guardrails: archived publishes do not regenerate the verified headline", async () => {
  const publisher = await readFile("tools/publish-site.mjs", "utf8");
  assert.match(publisher, /if \(publishTargetDigest && !sourceDigestLoadedFromArchive\)/);
});

test("content guardrails: deterministic crude titles never embed a stale price", () => {
  const title = titleForDailyLead({
    driverType: "crude",
    headline: "Asian markets rise as investors await an Iran deal"
  });
  assert.equal(title, "Iran Deal Hopes Put Brent In Focus");
  assert.doesNotMatch(title, /\$\d/);
});

test("content guardrails: Pulse selection fallback stays bounded", async () => {
  const articles = Array.from({ length: 100 }, (_, index) => ({ headline: `Market article ${index}`, sourceName: `Source ${index}`, summary: "India market context" }));
  const selected = await agentSelectPulseArticles(articles, { nvidiaApiKey: "test", llmFetcher: async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "[]" } }] }) }) });
  assert.equal(selected.length, 12);
});

test("content guardrails: selected public artifact rejects stale commodity prices", () => {
  const digest = {
    title: "Brent Below $90 Lifts Nifty",
    marketSnapshots: [{ symbol: "BRENT", closeValue: 73.53 }],
    news: []
  };
  assert.throws(() => assertPublicDigestArtifact("test", digest), /unsupported instrument price \$90/);
});

test("content guardrails: selected public artifact rejects live-price trackers", () => {
  const digest = {
    title: "Brent Near $74 Shapes Nifty Open",
    marketSnapshots: [{ symbol: "BRENT", closeValue: 73.53 }],
    news: [{ headline: "Example Share Price Live Updates: Current Price" }]
  };
  assert.throws(() => assertPublicDigestArtifact("test", digest), /live-price tracker/);
});

test("content guardrails: generated copy reconciles prices to the nearest instrument", () => {
  const digest = reconcileGeneratedInstrumentPrices({
    marketSnapshots: [{ symbol: "BRENT", closeValue: 74.1 }, { symbol: "GOLD", closeValue: 4033.5 }],
    twoMinuteSummary: "Brent traded near $73 while gold held near $2,020."
  });
  assert.equal(digest.twoMinuteSummary, "Brent traded near $74 while gold held near $4,034.");
  assert.deepEqual(unsupportedInstrumentPrices(digest.twoMinuteSummary, digest.marketSnapshots), []);
});
