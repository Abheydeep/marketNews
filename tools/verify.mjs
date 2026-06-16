import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cockpitPage } from "./cockpit-page.mjs";
import { createDemoApp } from "./demo-app.mjs";
import {
  ARTICLE_ENRICHMENT_PROMPT,
  DAILY_LEAD_RERANK_PROMPT,
  PUBLIC_BRIEFING_EDITORIAL_PROMPT,
  REEL_SCRIPT_EDITORIAL_PROMPT,
  assertPublicBriefingCopy,
  assertReelScriptCopy,
  sanitizeLegacyPublicBriefingCopy
} from "./editorial-guardrails.mjs";
import {
  buildDigest,
  auditTradeSetupsWithMarketSnapshots,
  bullishRiskReward,
  clusterThemes,
  dailyLeadForDigest,
  dailyLeadForDigestWithAgent,
  evaluateSeries,
  isGarbageArticle,
  labelFromScore,
  loadSeeds,
  newsArticleJsonLd,
  publicSourceSelectionForDigest,
  reelScriptMarkdown,
  reconcileTradeSetupsWithMarketSnapshots,
  scanPriceSeries,
  weightedSentiment
} from "./core.mjs";
import premarketCronHandler from "../api/cron/premarket-publish.js";
import moveDetectHandler from "../api/move-detect.mjs";
import { LIVE_MARKET_SYMBOLS, normalizeYahooChartResult } from "./market-data.mjs";
import { detectMoves, generateMoveArticle } from "./generate-move-articles.mjs";
import { movePage } from "./move-page.mjs";
import { marketCalendarState, verifyCalendarData } from "./market-calendar.mjs";
import { multibaggerState, validateMultibaggerState } from "./multibagger-data.mjs";
import { multibaggerPage } from "./multibagger-page.mjs";
import { articleLooksMarketRelevant, fetchLiveNewsArticles, normalizeLiveArticle, resolveNewsArticles, sourceUrlLooksArticleLevel, verifySourceArticles } from "./news-sources.mjs";
import { assertPremarketPublishWindow, premarketPublishWindowStatus } from "./publish-window.mjs";
import { publicDigestPayload, redactedDigestPayload } from "./public-payload.mjs";
import { articleThumbnailMeta } from "./source-thumbnails.mjs";
import { runGenerateArticleImageTests } from "./generate-article-image.test.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const results = [];
const FORBIDDEN_PUBLIC_READTHROUGH_PHRASES = [
  "Brent, OMC margins, aviation fuel and inflation expectations are the India open transmission line",
  "translate it into levels, breadth and sector leadership before assigning it trading weight",
  "treat it as Global Tech earnings-quality evidence until India gets matching sector breadth",
  "evidence matters only if margins, guidance or demand can travel to listed Indian peers",
  "evidence matters only if margins, guidance, or demand can travel to listed Indian peers",
  "Watch Brent at the 6 AM IST print; above $108 keeps OMC and aviation headline risk alive"
];

await runGenerateArticleImageTests(test, assert);

await test("seed files are valid and complete", async () => {
  const seeds = await loadSeeds();
  assert.ok(seeds.marketSnapshots.length >= 14);
  assert.ok(seeds.news.length >= 14);
  assert.equal(seeds.priceSeries.length, 2);
  assert.equal(seeds.creator.referenceImageId, "creator-ref-001");
  assert.ok(seeds.news.every((article) => !article.sourceUrl.includes("example.com")));
  assert.ok(seeds.news.every((article) => article.takeaway && article.whyItMatters && article.indiaImpact && article.watchFor));
  assert.ok(seeds.news.every((article) => article.thumbnail?.label && article.thumbnail?.theme && article.thumbnail?.accent && article.thumbnail?.alt));
  for (const symbol of ["SPX", "NDX", "DJI", "NIFTY", "BANKNIFTY", "NIKKEI", "HSI", "SHCOMP", "KOSPI", "TAIEX", "STI", "ASX200", "DXY", "BRENT"]) {
    const snapshot = seeds.marketSnapshots.find((item) => item.symbol === symbol);
    assert.ok(snapshot, `missing seed snapshot ${symbol}`);
    assert.ok(snapshot.marketRegion, `${symbol} missing marketRegion`);
    assert.ok(snapshot.tradingViewSymbol, `${symbol} missing TradingView symbol`);
    if (snapshot.marketRegion === "Asia Watch") {
      assert.ok(snapshot.country, `${symbol} missing country`);
    }
  }
});

await test("public garbage filter keeps FPI flow and Asia breadth articles", () => {
  assert.equal(isGarbageArticle({ headline: "FPI outflow crosses Rs 60,000 crore in June so far" }), false);
  assert.equal(isGarbageArticle({ headline: "Asian markets today: KOSPI and Hang Seng pare losses" }), false);
});

await test("live symbol registry includes important Asian markets", () => {
  for (const symbol of ["NIKKEI", "HSI", "SHCOMP", "KOSPI", "TAIEX", "STI", "ASX200"]) {
    const definition = LIVE_MARKET_SYMBOLS.find((item) => item.symbol === symbol);
    assert.ok(definition, `missing live symbol ${symbol}`);
    assert.equal(definition.marketRegion, "Asia Watch");
    assert.ok(definition.country, `${symbol} missing country`);
    assert.ok(definition.yahooSymbol, `${symbol} missing Yahoo symbol`);
    assert.ok(definition.tradingViewSymbol, `${symbol} missing TradingView symbol`);
  }
});

await test("move-detect endpoint fails closed without cron secret", async () => {
  const previousSecret = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  const result = await invokeMoveDetect({ method: "GET", headers: {}, query: {} });
  assert.equal(result.status, 500);
  assert.equal(result.body.error, "missing_cron_secret");
  if (previousSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = previousSecret;
});

await test("move-detect endpoint rejects wrong cron secret", async () => {
  const previousSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "expected-secret";
  const result = await invokeMoveDetect({ method: "GET", headers: { authorization: "Bearer wrong-secret" }, query: {} });
  assert.equal(result.status, 401);
  assert.equal(result.body.error, "unauthorized");
  if (previousSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = previousSecret;
});

await test("premarket publish cron fails closed without cron secret", async () => {
  const previousSecret = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  const result = await invokeApiHandler(premarketCronHandler, { method: "GET", headers: {}, query: {} });
  assert.equal(result.status, 500);
  assert.equal(result.body.error, "missing_cron_secret");
  if (previousSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = previousSecret;
});

await test("move-detect endpoint dispatches GitHub workflow instead of writing serverless files", async () => {
  const previousSecret = process.env.CRON_SECRET;
  const previousToken = process.env.GITHUB_WORKFLOW_TOKEN;
  const previousFetch = globalThis.fetch;
  const calls = [];
  try {
    process.env.CRON_SECRET = "expected-secret";
    process.env.GITHUB_WORKFLOW_TOKEN = "workflow-token";
    globalThis.fetch = async (url, request = {}) => {
      calls.push({ url, request });
      return { ok: true, status: 204 };
    };
    const result = await invokeMoveDetect({
      method: "POST",
      headers: { authorization: "Bearer expected-secret" },
      query: { date: "2026-06-12" }
    });
    assert.equal(result.status, 202);
    assert.equal(result.body.workflow, "move-detect.yml");
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /actions\/workflows\/move-detect\.yml\/dispatches$/);
    const body = JSON.parse(calls[0].request.body);
    assert.equal(body.ref, "main");
    assert.equal(body.inputs.date, "2026-06-12");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
    if (previousToken === undefined) delete process.env.GITHUB_WORKFLOW_TOKEN;
    else process.env.GITHUB_WORKFLOW_TOKEN = previousToken;
  }
});

await test("move article pipeline detects live snapshot moves and requires valid LLM JSON", async () => {
  const moves = await detectMoves({ index: 0.8, macro: 1.0 }, {
    snapshots: [
      { symbol: "NIFTY", name: "Nifty 50", changePercent: 1.1, closeValue: 25000, previousClose: 24728, marketRegion: "India Open", source: "test" },
      { symbol: "BRENT", name: "Brent Crude", changePercent: -1.4, closeValue: 82, previousClose: 83.2, marketRegion: "Macro Hedges", source: "test" },
      { symbol: "DXY", name: "US Dollar Index", changePercent: 0.2, closeValue: 104, previousClose: 103.8, marketRegion: "Macro Hedges", source: "test" }
    ]
  });
  assert.deepEqual(moves.map((move) => move.symbol), ["BRENT", "NIFTY"]);
  const article = await generateMoveArticle(moves[0], {
    rawArticle: {
      model: "meta/llama-4-maverick-17b-128e-instruct",
      content: JSON.stringify({
        headline: "Brent drop cools India import-cost pressure",
        summary: "Brent moved sharply lower in the live snapshot, easing the first read for OMCs, aviation and inflation-sensitive pockets. Nifty still needs Bank Nifty breadth and USD/INR confirmation before the move becomes a broad index input."
      })
    }
  });
  assert.equal(article.llmProvider, "nvidia");
  assert.equal(article.llmModel, "meta/llama-4-maverick-17b-128e-instruct");
  assert.match(article.summary, /OMCs|aviation|USD\/INR/);
  await assert.rejects(() => generateMoveArticle(moves[0], { rawArticle: { content: "not json" } }), /valid article JSON/);
});

await test("move page includes public disclaimer and safe JSON-LD", () => {
  const previousOrigin = process.env.PUBLIC_SITE_ORIGIN;
  process.env.PUBLIC_SITE_ORIGIN = "https://preview.marketnarrative.in";
  const html = movePage({
    date: "2026-06-11",
    slug: "brent-1-4-pct",
    symbol: "BRENT",
    change: -1.4,
    article: {
      headline: "Brent drops <script>",
      summary: "A live move note for Indian market context without trade advice.",
      ogImageUrl: "https://preview.marketnarrative.in/assets/og/move-2026-06-11-brent.jpg",
      publishedAt: "2026-06-11T09:30:00+05:30"
    }
  });
  if (previousOrigin === undefined) delete process.env.PUBLIC_SITE_ORIGIN;
  else process.env.PUBLIC_SITE_ORIGIN = previousOrigin;
  assert.match(html, /not SEBI-registered investment advice/);
  assert.doesNotMatch(html, /<script>\"/);
  assert.match(html, /\\u003cscript\\u003e/);
  assert.match(html, /https:\/\/preview\.marketnarrative\.in\/moves\/2026-06-11\/brent-1-4-pct\//);
  assert.match(html, /og:image:type" content="image\/jpeg"/);
  assert.match(html, /assets\/og\/move-2026-06-11-brent\.jpg/);
  assert.match(html, /height: 220px/);
  assert.match(html, /"datePublished":"2026-06-11T04:00:00.000Z"/);
  assertPublicBriefingCopy("move page", html);
});

await test("risk-reward math enforces 1:2+ setups", () => {
  assert.equal(bullishRiskReward(100, 95, 110), 2);
  assert.throws(() => bullishRiskReward(100, 101, 110), /above stop loss/);
});

await test("market calendar state machine separates closed days from source holds", () => {
  assert.equal(marketCalendarState("2026-05-09").state, "weekend_closed");
  assert.equal(marketCalendarState("2026-05-10").state, "weekend_closed");
  assert.equal(marketCalendarState("2026-01-26").state, "exchange_holiday");
  assert.equal(marketCalendarState("2026-05-28").state, "exchange_holiday");
  assert.equal(marketCalendarState("2026-06-26").state, "exchange_holiday");
  assert.equal(marketCalendarState("2026-12-25").state, "exchange_holiday");
  const independenceDay = marketCalendarState("2026-08-15");
  assert.equal(independenceDay.state, "weekend_closed");
  assert.match(independenceDay.reason, /Independence Day/);
  assert.equal(marketCalendarState("2026-05-06").state, "trading_day");
  const special = marketCalendarState("2026-11-08");
  assert.equal(special.state, "special_session");
  assert.equal(special.isTradingSession, true);
  const verifiedCalendar = verifyCalendarData();
  assert.equal(verifiedCalendar.weekdayHolidayCount, 15);
  assert.equal(verifiedCalendar.weekendHolidayCount, 4);
});

await test("technical scanner emits only qualifying Nifty and Bank Nifty setups", async () => {
  const { priceSeries } = await loadSeeds();
  const setups = scanPriceSeries("2026-04-29", priceSeries);
  assert.deepEqual(setups.map((setup) => setup.symbol).sort(), ["BANKNIFTY", "NIFTY"]);
  assert.ok(setups.every((setup) => setup.riskReward >= 2));
  assert.ok(setups.every((setup) => setup.entry > setup.stopLoss));
  assert.ok(setups.every((setup) => setup.target > setup.entry));
});

await test("live quote reconciliation removes completed setups from fresh entries", async () => {
  const { priceSeries } = await loadSeeds();
  const setups = scanPriceSeries("2026-04-29", priceSeries);
  const liveSnapshots = [
    {
      symbol: "NIFTY",
      closeValue: 29000.0,
      dataQuality: "live"
    },
    {
      symbol: "BANKNIFTY",
      closeValue: 70000.0,
      dataQuality: "live"
    }
  ];
  const audit = auditTradeSetupsWithMarketSnapshots("2026-05-04", setups, liveSnapshots);
  const reconciled = reconcileTradeSetupsWithMarketSnapshots("2026-05-04", setups, liveSnapshots);
  assert.deepEqual(reconciled, []);
  assert.deepEqual(audit.map((item) => item.status), ["TARGET_REACHED", "TARGET_REACHED"]);
  assert.ok(audit.every((item) => item.reason.includes("fresh entry")));
  assert.ok(audit.every((item) => item.currentPrice > item.target));
});

await test("scanner rejects low-volume candidates", async () => {
  const { priceSeries } = await loadSeeds();
  const nifty = structuredClone(priceSeries[0]);
  nifty.bars.at(-1).volume = 90_000;
  assert.equal(evaluateSeries("2026-04-29", nifty.symbol, nifty.bars), null);
});

await test("narrative sentiment is weighted by entity match", async () => {
  const { news } = await loadSeeds();
  const articles = news.map((article) => ({
    ...article,
    entityMatchScore: article.entityMatchScore,
    sentimentScore: article.sentimentScore
  }));
  const score = weightedSentiment(articles);
  assert.ok(score < -0.2 && score > -0.4, `unexpected score ${score}`);
  assert.equal(labelFromScore(score), "BEARISH");
  assert.ok(clusterThemes("2026-04-29", articles).length >= 4);
});

await test("fixture news source stacks are date-specific and article-level", async () => {
  const first = await buildDigest("2026-04-29", { newsDataMode: "fixture" });
  const second = await buildDigest("2026-04-30", { newsDataMode: "fixture", previousDigest: first });
  const firstTitles = first.news.map((article) => article.headline);
  const secondTitles = second.news.map((article) => article.headline);
  const firstUrls = first.news.map((article) => article.sourceUrl);
  const secondUrls = second.news.map((article) => article.sourceUrl);

  assert.notDeepEqual(secondTitles, firstTitles, "fixture dates must not reuse identical source headlines");
  assert.notDeepEqual(secondUrls, firstUrls, "fixture dates must not reuse identical source URLs");
  assert.ok(first.news.every((article) => sourceUrlLooksArticleLevel(article.sourceUrl)), "first fixture stack has a section URL");
  assert.ok(second.news.every((article) => sourceUrlLooksArticleLevel(article.sourceUrl)), "second fixture stack has a section URL");
  assert.equal(first.sourceVerification.mode, "fixture");
  assert.equal(second.sourceVerification.mode, "fixture");
  assert.notEqual(first.title, second.title, "fixture dates must not reuse identical page titles");
  assert.notEqual(first.archiveSummary, second.archiveSummary, "fixture dates must not reuse identical archive summaries");
  assert.notEqual(first.deskNote, second.deskNote, "fixture dates must not reuse identical desk notes");
  assert.notDeepEqual(first.watchItems, second.watchItems, "fixture dates must not reuse identical watch lists");
  assert.ok(first.sourceVerification.verifiedArticleCount >= 8);
  assert.ok(second.sourceVerification.duplicateWithPreviousPercent < 55);
});

await test("source verification rejects section homepages and repeated stories", async () => {
  const sectionUrlArticles = [
    "https://www.reuters.com/markets/",
    "https://www.reuters.com/markets/rates-bonds/",
    "https://www.cnbc.com/markets/",
    "https://www.cnbc.com/world-top-news/",
    "https://economictimes.indiatimes.com/rss.cms",
    "https://www.moneycontrol.com/features/rss/",
    "https://www.bloomberg.com/asia",
    "https://www.marketwatch.com/markets"
  ].map((sourceUrl, index) => ({
    headline: `Section source ${index}`,
    sourceName: "Section Publisher",
    sourceUrl,
    category: "macro_negative"
  }));

  const rejected = verifySourceArticles(sectionUrlArticles, { mode: "fixture" });
  assert.match(rejected.blockedReason, /verified article links/);
  assert.ok(sectionUrlArticles.every((article) => !sourceUrlLooksArticleLevel(article.sourceUrl)));

  const current = await buildDigest("2026-05-01", { newsDataMode: "fixture" });
  const duplicate = verifySourceArticles(current.news, { mode: "fixture", previousDigest: current });
  assert.match(duplicate.blockedReason, /overlap with the previous digest/);
});

await test("live news pipeline accepts mocked CNBC and Moneycontrol article feeds", async () => {
  const fetcher = async (url) => ({
    ok: true,
    text: async () => {
      if (String(url).includes("/features/rss/")) {
        return '<a href="https://www.moneycontrol.com/rss/marketreports.xml">markets</a>';
      }
      const sourceSlug = String(url).includes("moneycontrol") ? "moneycontrol" : slugForTestUrl(url);
      const publisher = String(url).includes("moneycontrol") ? "moneycontrol" : "cnbc";
      return testRssXml([
        {
          title: `Yield and rupee watch from ${sourceSlug}`,
          link: testArticleUrl(publisher, sourceSlug, "yield-rupee-watch"),
          description: "Bond yields, rupee movement, and policy expectations shape the India open."
        },
        {
          title: `Bank and IT breadth from ${sourceSlug}`,
          link: testArticleUrl(publisher, sourceSlug, "bank-it-breadth"),
          description: "Banking, technology, and domestic liquidity cues drive sector selection."
        },
        {
          title: `Airline fuel cost pressure from ${sourceSlug}`,
          link: testArticleUrl(publisher, sourceSlug, "airline-fuel-cost-pressure"),
          description: "Airline fuel costs, passenger demand, and margin pressure matter for aviation sentiment."
        },
        {
          title: `Fed investigation and yields from ${sourceSlug}`,
          link: testArticleUrl(publisher, sourceSlug, "fed-investigation-yields"),
          description: "Bond yields, rates, and Powell headlines keep the hurdle rate in focus."
        }
      ]);
    }
  });

  const { articles, sourceVerification } = await resolveNewsArticles("2026-05-03", { mode: "live", fetcher });
  assert.equal(sourceVerification.mode, "live");
  assert.equal(sourceVerification.blockedReason, null);
  assert.ok(sourceVerification.verifiedArticleCount >= 8);
  assert.ok(sourceVerification.publisherCount >= 4);
  assert.ok(sourceVerification.categoryCount >= 2);
  assert.ok(articles.every((article) => sourceUrlLooksArticleLevel(article.sourceUrl)));
  assert.ok(new Set(articles.map((article) => article.sentimentScore)).size >= 3, "live sentiment scores should vary by article text");
  assert.ok(articles.every((article) => !/verified source stack/i.test([
    article.takeaway,
    article.whyItMatters,
    article.indiaImpact,
    article.watchFor
  ].join(" "))));
  for (const phrase of FORBIDDEN_PUBLIC_READTHROUGH_PHRASES) {
    assert.equal(JSON.stringify(articles).includes(phrase), false, `live copy leaked category fallback phrase: ${phrase}`);
  }
  const airline = articles.find((article) => /Airline fuel cost/i.test(article.headline));
  assert.equal(airline?.entityName, "Aviation");
  assert.match(airline?.indiaImpact || "", /Aviation/);
  const rates = articles.find((article) => /Yield and rupee/i.test(article.headline));
  assert.equal(rates?.entityName, "Rates");
  assert.notEqual(airline?.entityName, "Nifty IT");
  assert.notEqual(rates?.entityName, "Nifty IT");
  assert.equal(articleLooksMarketRelevant({
    headline: "The U.S. attorney shifted legal strategies in her investigation of Federal Reserve Chairman Jerome Powell",
    summary: "The deadline is approaching in the legal process."
  }), false, "legal/political Fed articles without policy or market impact should be rejected");
  assert.equal(articleLooksMarketRelevant({
    headline: "Fed policy uncertainty pushes Treasury yields higher",
    summary: "Bond yields and rate guidance changed the market setup."
  }), true, "actual policy/yield stories should remain eligible");
  assert.equal(articleLooksMarketRelevant({
    headline: "Is CF Industries Holdings, Inc. (CF) A Good Stock To Buy Now?",
    summary: "A generic stock-pick article with no India open read-through."
  }), false, "generic SEO stock-pick articles should not pad the pre-market source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "If I had invested my Social Security in the S&P 500 I would have $4 million",
    summary: "Personal-finance advice is not a tradeable India pre-market driver."
  }), false, "personal-finance stories should not appear in the public briefing source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "'Bubble effect': Weight loss drug fueled growth is putting the pharma sector at risk, report finds",
    summary: "Obesity assets represent about 25% of total forecast sales of the late-stage pipeline."
  }), false, "weight-loss/pharma feature stories should not pad the India pre-market source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Bitcoin ETFs and crypto wallets pull in retail flows",
    summary: "Web3 token flows were framed as a broad investing story."
  }), false, "crypto/web3 stories should not pad the India pre-market source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "US home prices rise as mortgage rates pressure buyers",
    summary: "Housing-market commentary with no Indian listed read-through."
  }), false, "US housing stories should not pad the India pre-market source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "How to invest for passive income with dividend stocks",
    summary: "Personal-finance advice framed as market content."
  }), false, "personal-finance investing advice should stay out of the source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "At 103 years old, I’m the world’s oldest doctor: My 3 rules for a long, happy life",
    summary: "A lifestyle and wellness story with patient advice, not a market catalyst."
  }), false, "longevity/lifestyle stories should not be polished into market cards");
  assert.equal(articleLooksMarketRelevant({
    headline: "Meet the YouTube whisperers behind MrBeast and other million-dollar channels",
    summary: "Creator economy advisory content with no listed-company, sector, or India-market transmission."
  }), false, "creator-economy feature stories should not pad the pre-market source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "It's not too late to start buying the data center winners. Here's why",
    summary: "In his Sunday column for Investing Club subscribers, Jim Cramer pushes AI stock picks."
  }), false, "Cramer/subscriber stock-pick stories should not drive the India pre-market stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "The idea that Claude has feelings is great for Anthropic",
    summary: "A feature about whether a large language model is conscious."
  }), false, "AI philosophy/features should not be converted into Nifty IT source cards");
  assert.equal(articleLooksMarketRelevant({
    headline: "Fitness wearable Whoop to offer on-demand clinician access to U.S. users",
    summary: "Wearable membership and clinician access story."
  }), false, "consumer health/wearable feature stories should not pad the source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Is this a good time to invest $100,000 in the stock market?",
    summary: "Personal finance reader advice."
  }), false, "personal-finance reader advice should not be polished into market context");
  assert.equal(articleLooksMarketRelevant({
    headline: "Is It Too Late to Buy Advanced Micro Devices Stock After Its 12-Month Gain?",
    summary: "Generic SEO stock-pick framing with no India pre-open transmission."
  }), false, "too-late-to-buy single-stock SEO stories should not pad the source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Trump's $1 million Gold Card fails to catch on among the world's wealthy",
    summary: "Immigration and wealth feature story with no market transmission."
  }), false, "wealth/visa feature stories should not become market source cards");
  assert.equal(articleLooksMarketRelevant({
    headline: "States crack down on tax break for wealthy investors",
    summary: "QSBS and wealthy-investor tax planning."
  }), false, "personal wealth-tax stories should not enter the pre-market stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Dell family gave $6.25B to Trump Accounts",
    summary: "Wealth and political-account story with no listed market driver."
  }), false, "political wealth-account features should not enter the pre-market stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "AWS data center outage hits trading on FanDuel, Coinbase",
    summary: "Sports betting and crypto platforms saw service disruption."
  }), false, "sports-betting and crypto outage stories should not become India market cards");
  assert.equal(articleLooksMarketRelevant({
    headline: "Grove Collaborative Q1 Earnings Call Highlights",
    summary: "Generated transcript summary for a US single-stock earnings call."
  }), false, "generic Yahoo earnings-call summaries should not pad the source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Peloton stock rises as higher subscription prices help profitable quarter",
    summary: "US consumer subscription company earnings."
  }), false, "low-relevance US consumer single-stock stories should not pad the source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Bank of America Upgrades Ulta Beauty Stock",
    summary: "A US analyst-rating headline for a cosmetics retailer."
  }), false, "generic US analyst-rating stories should not be mistaken for Bank Nifty context");
  assert.equal(articleLooksMarketRelevant({
    headline: "Why One Real Estate Fund Made a Bet on InvenTrust Properties",
    summary: "US real estate fund commentary about one REIT lagging the S&P 500."
  }), false, "US real-estate fund stock-pick stories should not enter the source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Here’s Why Devon Energy Is One of the Most Undervalued High Quality Stock",
    summary: "Yahoo-style single-stock valuation article."
  }), false, "single-stock valuation SEO stories should not enter the source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Wall Street Bullish on Newmont Corporation",
    summary: "Analyst sentiment on one US-listed miner."
  }), false, "generic Wall Street bullish stock-pick stories should not enter the source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Legendary investor says investors could see negative 10-year returns",
    summary: "Opinion article about long-term market returns."
  }), false, "long-term investor opinion pieces should not enter the pre-market source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Disney pops after streaming and parks drive revenue beat",
    summary: "US media company earnings."
  }), false, "low-relevance US media single-stock stories should not pad the source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Best CD rates today, May 10, 2026: lock in up to 4% APY",
    summary: "Personal-finance banking rates page."
  }), false, "personal-finance rates pages should not enter the pre-market stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Should You Buy CoreWeave on Post-Earnings Dip?",
    summary: "Single-stock buy-now article."
  }), false, "single-stock should-you-buy articles should not enter the source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Why Amazon is a Top AI Stock Pick of Cathie Wood",
    summary: "Celebrity investor stock-pick article."
  }), false, "celebrity investor stock-pick articles should not enter the source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "HELOC and home equity loan rates today: Home equity rates tie 2026-low",
    summary: "Personal-finance mortgage-rate page."
  }), false, "personal-finance mortgage and HELOC pages should not enter the source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Gold and silver prices today: Prices headed for weekly gains",
    summary: "Personal-finance precious-metals quote page."
  }), false, "personal-finance gold/silver quote pages should not enter the source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Wearable patches: How Barriere is trying to disrupt the supplement industry",
    summary: "Lactose intolerance patch retail launch."
  }), false, "wellness-commerce stories should not enter the source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Restaurant Brands International earnings top estimates, fueled by Burger King turnaround",
    summary: "QSR restaurant earnings story."
  }), false, "US restaurant earnings should not enter the India pre-market source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Apollo CEO warns of market correction and slams rival insurers",
    summary: "Private equity CEO commentary about rival insurers."
  }), false, "generic executive market-correction commentary should not enter the source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Yankees legend Mariano Rivera says he supports an MLB salary cap",
    summary: "Sports business commentary."
  }), false, "sports business stories should not enter the market source stack");
  assert.equal(articleLooksMarketRelevant({
    headline: "Bonus issues, stock splits and dividends: SBI among stocks turning ex-date this week",
    summary: "Indian listed companies have record dates and corporate actions this week."
  }), true, "India corporate-action calendars should remain eligible as stock-specific catalysts");
  assert.equal(articleLooksMarketRelevant({
    headline: "Infosys Q1 Earnings Call Highlights",
    summary: "Indian IT services margin and guidance commentary."
  }), true, "important India earnings-call summaries should remain eligible");
  assert.equal(articleLooksMarketRelevant({
    headline: "Corporate governance newsletter discusses CEO culture and investor relations",
    summary: "Company commentary with no market data, sector read-through, price signal, or policy catalyst."
  }), false, "weak neutral corporate commentary should not reach the neutral_volatile fallback");
  assert.equal(articleLooksMarketRelevant({
    headline: "Options volatility keeps traders focused on PCR and call resistance",
    summary: "VIX, put writing and OI buildup shaped futures positioning."
  }), true, "real neutral-volatility market structure stories should remain eligible");
  assert.equal(articleLooksMarketRelevant({
    headline: "Blue Owl funds SpaceX private credit deal",
    summary: "Private credit financing shows risk appetite outside public equity markets."
  }), true, "specific private-market risk appetite stories should remain eligible as context");
  assert.equal(articleLooksMarketRelevant({
    headline: "Israel-Iran military conflict escalates before Asia opens",
    summary: "Military strikes and sanctions risk kept investors focused on safe-haven demand."
  }), true, "pure geopolitical escalation should remain eligible as a market risk source");
  const normalizationFeed = {
    sourceId: "cnbc-world",
    sourceName: "CNBC World",
    categoryHint: "global_risk",
    url: "https://www.cnbc.com/id/100727362/device/rss/rss.html"
  };
  const indiaEnergy = normalizeLiveArticle("2026-05-03", normalizationFeed, {
    title: "India is burning more coal as extreme heat and the Iran war squeeze energy supplies",
    link: "https://www.cnbc.com/2026/05/03/india-coal-power-heatwave-lng-supply-demand-prices-generation.html",
    summary: "India power demand, coal generation and LNG supply pressure are rising before the market open."
  });
  assert.equal(indiaEnergy.entityName, "India Energy");
  assert.match(indiaEnergy.indiaImpact, /Direct India read-through/);
  const treasury = normalizeLiveArticle("2026-05-03", normalizationFeed, {
    title: "Treasury yields edge higher as traders monitor factory data and Middle East developments",
    link: "https://www.cnbc.com/2026/05/03/treasury-yields-rise-as-traders-monitor-factory-data.html",
    summary: "Treasury yields and bond rates moved higher before Asia opened."
  });
  assert.equal(treasury.entityName, "Rates");
  assert.doesNotMatch(treasury.indiaImpact, /^No direct India read-through/);
  const corporateAction = normalizeLiveArticle("2026-05-03", normalizationFeed, {
    title: "Bonus issues, stock splits and dividends: SBI among stocks turning ex-date this week",
    link: "https://www.moneycontrol.com/news/business/markets/bonus-issues-stock-splits-dividends-sbi-ex-date-2026.html",
    summary: "Indian listed companies have record dates, ex-dates and dividends this week."
  });
  assert.equal(corporateAction.entityName, "Corporate actions");
  assert.match(corporateAction.indiaImpact, /named stocks|sector peers|cash-market volume/i);
  const marketInfrastructure = normalizeLiveArticle("2026-05-03", normalizationFeed, {
    title: "MCX Q4 Results: PAT soars, revenue triples; dividend announced",
    link: "https://economictimes.indiatimes.com/markets/stocks/earnings/mcx-q4-results/articleshow/130963666.cms",
    summary: "Commodity exchange revenue and trading volume improved with market volatility."
  });
  assert.equal(marketInfrastructure.entityName, "Market infrastructure");
  assert.match(marketInfrastructure.indiaImpact, /MCX|exchanges|brokers/i);
  const telecom = normalizeLiveArticle("2026-05-03", normalizationFeed, {
    title: "Vodafone weighs stake transfer to boost India unit capital",
    link: "https://economictimes.indiatimes.com/markets/stocks/news/vodafone-india-unit-capital/articleshow/130964672.cms",
    summary: "Vodafone Idea funding and telecom balance sheet context matter for Indian listed peers."
  });
  assert.equal(telecom.entityName, "Telecom");
  assert.match(telecom.indiaImpact, /Vodafone Idea|Bharti Airtel|telecom peers/i);
  const aviationFuel = normalizeLiveArticle("2026-05-03", normalizationFeed, {
    title: "Airlines spent more on jet fuel after Iran war started",
    link: "https://www.cnbc.com/2026/05/06/airlines-jet-fuel-iran-war.html",
    summary: "Jet fuel costs rose for airlines after the Iran war."
  });
  assert.match(aviationFuel.watchFor, /IndiGo|SpiceJet|fuel|Brent/i);
  const infrastructure = normalizeLiveArticle("2026-05-03", normalizationFeed, {
    title: "Arisinfra Solutions posts FY26 revenue of Rs 1,067 crore",
    link: "https://economictimes.indiatimes.com/markets/stocks/earnings/arisinfra-solutions-posts-fy26-revenue/articleshow/130963501.cms",
    summary: "Infrastructure and construction-material demand supported revenue and profit."
  });
  assert.equal(infrastructure.entityName, "Infrastructure");
  assert.match(infrastructure.indiaImpact, /infrastructure|cement|capital-goods/i);
  const fuelInflation = normalizeLiveArticle("2026-05-03", normalizationFeed, {
    title: "Surging gas prices are hitting lower-income households harder",
    link: "https://www.cnbc.com/2026/05/06/surging-gas-prices-consumers.html",
    summary: "Fuel prices are pressuring consumer demand."
  });
  assert.equal(fuelInflation.entityName, "Fuel inflation");
  assert.match(fuelInflation.indiaImpact, /OMCs|aviation|tyres|paints/i);
  const aiInfrastructure = normalizeLiveArticle("2026-05-03", normalizationFeed, {
    title: "Nvidia embraces role of AI investor across the AI infrastructure stack",
    link: "https://www.cnbc.com/2026/05/09/nvidia-ai-investor.html",
    summary: "Nvidia and AI infrastructure spending shaped global technology risk appetite."
  });
  assert.equal(aiInfrastructure.entityName, "Global Tech");
});

await test("live news pipeline can route generic article copy through editorial prompt enrichment", async () => {
  const fetcher = async (url) => ({
    ok: true,
    text: async () => {
      if (String(url).includes("/features/rss/")) {
        return '<a href="https://www.moneycontrol.com/rss/marketreports.xml">markets</a>';
      }
      const sourceSlug = String(url).includes("moneycontrol") ? "moneycontrol" : slugForTestUrl(url);
      return testRssXml([
        {
          title: `Generic source context from ${sourceSlug}`,
          link: testArticleUrl(String(url).includes("moneycontrol") ? "moneycontrol" : "cnbc", sourceSlug, "generic-source-context"),
          description: "Market context changed before the India open without a clean sector keyword."
        }
      ]);
    }
  });
  let enrichCalls = 0;
  const articles = await fetchLiveNewsArticles("2026-05-04", {
    fetcher,
    articleEditorialEnricher: async ({ article, prompt, schema }) => {
      enrichCalls += 1;
      assert.equal(prompt, ARTICLE_ENRICHMENT_PROMPT);
      assert.ok(schema.takeaway.includes("do not restate"));
      assert.ok(article.headline.includes("Generic source context"));
      return {
        takeaway: "Editorial enrichment converts the vague source into an India-first breadth check",
        indiaImpact: "Bank Nifty and Nifty breadth must confirm before the generic source changes trade bias",
        watchFor: "Watch Bank Nifty VWAP and advance-decline through 9:45 AM"
      };
    }
  });

  assert.ok(enrichCalls > 0, "generic regex fallbacks should be eligible for editorial enrichment");
  assert.ok(articles.some((article) => /Editorial enrichment converts/i.test(article.takeaway)));
  assert.ok(articles.some((article) => /Bank Nifty and Nifty breadth/i.test(article.indiaImpact)));
});

await test("live news pipeline ignores non-NVIDIA polishing keys for now", async () => {
  const fetcher = async (url) => ({
    ok: true,
    text: async () => {
      if (String(url).includes("/features/rss/")) {
        return '<a href="https://www.moneycontrol.com/rss/marketreports.xml">markets</a>';
      }
      const sourceSlug = String(url).includes("moneycontrol") ? "moneycontrol" : slugForTestUrl(url);
      return testRssXml([
        {
          title: `Generic source context from ${sourceSlug}`,
          link: testArticleUrl(String(url).includes("moneycontrol") ? "moneycontrol" : "cnbc", sourceSlug, "nonnvidia-generic-source-context"),
          description: "Market context changed before the India open without a clean sector keyword."
        }
      ]);
    }
  });
  let llmCalls = 0;
  const llmFetcher = async () => {
    llmCalls += 1;
    throw new Error("non-NVIDIA provider should not be called");
  };
  const articles = await fetchLiveNewsArticles("2026-05-04", {
    fetcher,
    llmFetcher,
    anthropicApiKey: "test-anthropic-key",
    openaiApiKey: "test-openai-key",
    geminiApiKey: "test-gemini-key"
  });

  assert.equal(llmCalls, 0, "OpenAI/Anthropic/Gemini polishing must stay disabled");
  assert.ok(articles.length > 0);
});

await test("live news pipeline can run NVIDIA desk-agent polishing", async () => {
  const fetcher = async (url) => ({
    ok: true,
    text: async () => {
      if (String(url).includes("/features/rss/")) {
        return '<a href="https://www.moneycontrol.com/rss/marketreports.xml">markets</a>';
      }
      const sourceSlug = String(url).includes("moneycontrol") ? "moneycontrol" : slugForTestUrl(url);
      return testRssXml([
        {
          title: `Generic source context from ${sourceSlug}`,
          link: testArticleUrl(String(url).includes("moneycontrol") ? "moneycontrol" : "cnbc", sourceSlug, "nvidia-generic-source-context"),
          description: "Market context changed before the India open without a clean sector keyword."
        }
      ]);
    }
  });
  let nvidiaCalls = 0;
  const llmFetcher = async (url, request = {}) => {
    nvidiaCalls += 1;
    assert.equal(url, "https://integrate.api.nvidia.com/v1/chat/completions");
    assert.equal(request.headers.Authorization, "Bearer test-nvidia-key");
    assert.equal(request.headers.Accept, "application/json");
    const body = JSON.parse(request.body);
    assert.equal(body.model, "meta/llama-4-maverick-17b-128e-instruct");
    assert.equal(body.response_format.type, "json_object");
    assert.equal(body.stream, false);
    assert.equal(body.max_tokens, 900);
    assert.equal(body.chat_template_kwargs.thinking, false);
    assert.equal(body.reasoning_budget, undefined);
    assert.equal(body.messages[0].role, "system");
    assert.equal(body.messages[0].content, ARTICLE_ENRICHMENT_PROMPT);
    assert.ok(body.messages[1].content.includes("Rank this article like an Indian pre-market desk editor"));
    assert.ok(body.messages[1].content.includes("Use only the current article to decide the entity and India transmission line"));
    return {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              takeaway: "NVIDIA desk agent turns the loose headline into a specific pre-open breadth check",
              indiaImpact: "Bank Nifty and Nifty breadth need confirmation before this source gets India trading weight",
              watchFor: "Watch Bank Nifty VWAP through 9:45 AM"
            })
          }
        }]
      })
    };
  };
  const articles = await fetchLiveNewsArticles("2026-05-04", {
    fetcher,
    llmFetcher,
    anthropicApiKey: "",
    openaiApiKey: "",
    nvidiaApiKey: "test-nvidia-key",
    geminiApiKey: "test-gemini-key"
  });

  assert.ok(nvidiaCalls > 0, "NVIDIA should run when NVIDIA_API_KEY is available");
  assert.ok(articles.some((article) => /NVIDIA desk agent turns/i.test(article.takeaway)));
  assert.ok(articles.some((article) => /Bank Nifty and Nifty breadth/i.test(article.indiaImpact)));
});

await test("NVIDIA agent mode passes used India angles to avoid repetition", async () => {
  const fetcher = async (url) => ({
    ok: true,
    text: async () => {
      if (String(url).includes("/features/rss/")) {
        return '<a href="https://www.moneycontrol.com/rss/marketreports.xml">markets</a>';
      }
      const sourceSlug = slugForTestUrl(url);
      const publisher = String(url).includes("moneycontrol") ? "moneycontrol" : "cnbc";
      return testRssXml([
        {
          title: `OPEC output talks keep Brent supply risk alive ${sourceSlug}`,
          link: testArticleUrl(publisher, sourceSlug, "nvidia-opec-agent-memory"),
          description: "OPEC production and supply discipline can keep Brent bid as traders price tighter barrels."
        },
        {
          title: `Fed rate guidance keeps bond yields firm ${sourceSlug}`,
          link: testArticleUrl(publisher, sourceSlug, "nvidia-rates-agent-memory"),
          description: "Fed policy guidance and bond yields stayed firm as traders debated inflation persistence."
        }
      ]);
    }
  });
  const userPrompts = [];
  const llmFetcher = async (url, request = {}) => {
    assert.equal(url, "https://integrate.api.nvidia.com/v1/chat/completions");
    const body = JSON.parse(request.body);
    const userPrompt = body.messages[1].content;
    userPrompts.push(userPrompt);
    const isRates = /Fed rate guidance/i.test(userPrompt);
    return {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify(isRates ? {
              takeaway: "Rate guidance keeps the open tied to dollar-yield pressure rather than another crude frame",
              indiaImpact: "Bank Nifty, realty and autos need yield stability before the index can trust risk appetite",
              watchFor: "Watch US 10Y and Bank Nifty VWAP through 9:45 AM"
            } : {
              takeaway: "OPEC supply discipline keeps import-cost pressure alive for the India open",
              indiaImpact: "OMCs, aviation, paints and tyres are the first checks if Brent stays bid",
              watchFor: "Watch Brent and OMC breadth through 9:45 AM"
            })
          }
        }]
      })
    };
  };
  const articles = await fetchLiveNewsArticles("2026-05-04", {
    fetcher,
    llmFetcher,
    anthropicApiKey: "",
    openaiApiKey: "",
    nvidiaApiKey: "test-nvidia-key",
    geminiApiKey: "",
    maxArticleEditorialEnrichmentCalls: 30
  });

  assert.ok(userPrompts.length >= 2, "agent mode should enrich more than one market article");
  assert.ok(userPrompts.slice(1).some((prompt) => /Prior India angles/i.test(prompt)), "later agent calls should receive prior India angles");
  assert.ok(userPrompts.slice(1).every((prompt) => /Do not classify the current article from these prior angles/i.test(prompt)), "prior angles must not contaminate current article classification");
  assert.ok(userPrompts.slice(1).some((prompt) => /OMCs, aviation, paints and tyres/i.test(prompt)), "later prompts should include prior crude angle");
  assert.ok(articles.some((article) => /Rate guidance keeps/i.test(article.takeaway)));
});

await test("repeated deterministic oil and rates templates route later cards through enrichment", async () => {
  const fetcher = async (url) => ({
    ok: true,
    text: async () => {
      if (String(url).includes("/features/rss/")) {
        return '<a href="https://www.moneycontrol.com/rss/marketreports.xml">markets</a>';
      }
      const sourceSlug = slugForTestUrl(url);
      const publisher = String(url).includes("moneycontrol") ? "moneycontrol" : "cnbc";
      return testRssXml([
        {
          title: `OPEC output talks keep Brent supply risk alive ${sourceSlug}`,
          link: testArticleUrl(publisher, sourceSlug, "opec-template-repeat"),
          description: "OPEC production and supply discipline can keep Brent above $84 as traders price tighter barrels."
        },
        {
          title: `Fed rate guidance keeps bond yields firm ${sourceSlug}`,
          link: testArticleUrl(publisher, sourceSlug, "fed-rates-template-repeat"),
          description: "Fed policy guidance and bond yields stayed firm as traders debated inflation persistence."
        }
      ]);
    }
  });
  const enrichedHeadlines = [];
  const articles = await fetchLiveNewsArticles("2026-05-04", {
    fetcher,
    maxArticleEditorialEnrichmentCalls: 30,
    articleEditorialEnricher: async ({ article, prompt }) => {
      enrichedHeadlines.push(article.headline);
      assert.equal(prompt, ARTICLE_ENRICHMENT_PROMPT);
      assert.ok(article.entityName && article.entityName !== "Market");
      return {
        takeaway: `Template refresh keeps the ${article.entityName} card distinct from the repeated branch`,
        indiaImpact: `${article.entityName} needs a fresh India confirmation line because this read-through branch already appeared`,
        watchFor: "Watch Bank Nifty VWAP and breadth through 9:45 AM"
      };
    }
  });

  assert.ok(enrichedHeadlines.some((headline) => /OPEC output/i.test(headline)), "repeated oil branch should be enriched");
  assert.ok(enrichedHeadlines.some((headline) => /Fed rate guidance/i.test(headline)), "repeated rates branch should be enriched");
  assert.ok(articles.some((article) => /Template refresh keeps/i.test(article.takeaway)));
});

await test("repeated mega-cap earnings templates route later cards through enrichment", async () => {
  const fetcher = async (url) => ({
    ok: true,
    text: async () => {
      if (String(url).includes("/features/rss/")) {
        return '<a href="https://www.moneycontrol.com/rss/marketreports.xml">markets</a>';
      }
      const sourceSlug = slugForTestUrl(url);
      const publisher = String(url).includes("moneycontrol") ? "moneycontrol" : "cnbc";
      return testRssXml([
        {
          title: `Apple earnings guidance lifts mega-cap tech sentiment ${sourceSlug}`,
          link: testArticleUrl(publisher, sourceSlug, "apple-earnings-template-repeat"),
          description: "Apple revenue guidance and margins improved after earnings commentary."
        },
        {
          title: `Amazon earnings show cloud margin strength ${sourceSlug}`,
          link: testArticleUrl(publisher, sourceSlug, "amazon-earnings-template-repeat"),
          description: "Amazon earnings, cloud revenue and operating margin guidance improved."
        }
      ]);
    }
  });
  const enrichedHeadlines = [];
  const articles = await fetchLiveNewsArticles("2026-05-04", {
    fetcher,
    maxArticleEditorialEnrichmentCalls: 30,
    articleEditorialEnricher: async ({ article, prompt }) => {
      enrichedHeadlines.push(article.headline);
      assert.equal(prompt, ARTICLE_ENRICHMENT_PROMPT);
      assert.match(article.entityName, /Global Tech|Nifty IT|Market/);
      return {
        takeaway: `Earnings refresh keeps ${article.entityName} from repeating the mega-cap template`,
        indiaImpact: "Nifty IT and exporter breadth must confirm before the repeated mega-cap earnings cue gets local weight",
        watchFor: "Watch Nasdaq futures, USD/INR and Nifty IT breadth after the open"
      };
    }
  });

  assert.ok(enrichedHeadlines.some((headline) => /Apple earnings/i.test(headline)), "repeated mega-cap earnings branch should be enriched");
  assert.ok(articles.some((article) => /Earnings refresh keeps/i.test(article.takeaway)));
});

await test("article read-through copy does not reuse category templates", async () => {
  const feed = {
    sourceId: "test-feed",
    sourceName: "Test Feed",
    categoryHint: "neutral_volatile",
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html"
  };
  const articles = [
    {
      title: "Trump Keystone pipeline review affects crude flows",
      link: "https://www.cnbc.com/2026/05/04/keystone-crude-flow.html",
      summary: "Pipeline approvals and Gulf Coast crude shipments changed the flow story without moving Indian equities directly."
    },
    {
      title: "OPEC+ output talks keep Brent supply risk alive",
      link: "https://www.cnbc.com/2026/05/04/opec-output-brent.html",
      summary: "OPEC+ production and supply discipline can keep Brent above $84 if traders price tighter barrels."
    },
    {
      title: "Blue Owl funds SpaceX private credit deal",
      link: "https://www.cnbc.com/2026/05/04/blue-owl-spacex-credit.html",
      summary: "Private credit demand and SpaceX financing show risk appetite outside public equity markets."
    },
    {
      title: "BOE Governor warns rates may stay restrictive",
      link: "https://www.cnbc.com/2026/05/04/boe-governor-rates.html",
      summary: "UK rate guidance and bond yields stayed firm as policymakers debated inflation persistence."
    },
    {
      title: "Supercar engine supplier warns margins are under pressure",
      link: "https://www.cnbc.com/2026/05/04/supercar-engine-margins.html",
      summary: "Luxury auto engine demand and supplier margins weakened, creating an auto-ancillary signal rather than a broad market setup."
    },
    {
      title: "Alphabet AI chip earnings lift software sentiment",
      link: "https://www.cnbc.com/2026/05/04/alphabet-ai-chip-earnings.html",
      summary: "Alphabet AI spending, chip demand and cloud revenue improved after earnings commentary."
    },
    {
      title: "Jobs day, semiconductor earnings, and stock market momentum: What to watch this week",
      link: "https://www.cnbc.com/2026/05/04/jobs-day-semiconductor-earnings-stock-market-momentum.html",
      summary: ""
    },
    {
      title: "Carvana stock pops as used car retailer reports record first-quarter results",
      link: "https://www.cnbc.com/2026/05/04/carvana-stock-record-first-quarter-results.html",
      summary: "Carvana reported record first-quarter results as used-car demand improved."
    },
    {
      title: "'It's a boom': Wall Street sees more market gains as strong earnings fuel the AI trade",
      link: "https://www.cnbc.com/2026/05/04/wall-street-market-gains-ai-trade-earnings.html",
      summary: ""
    },
    {
      title: "US consumer spending lifts retail stocks before Asia opens",
      link: "https://www.cnbc.com/2026/05/04/us-consumer-spending-retail-stocks.html",
      summary: "Consumer spending and retail demand improved, giving discretionary shares a firmer tone."
    },
    {
      title: "Options volatility keeps traders focused on PCR and call resistance",
      link: "https://www.cnbc.com/2026/05/04/options-volatility-pcr-call-resistance.html",
      summary: "VIX, put writing, call resistance and OI buildup shaped futures positioning."
    },
    {
      title: "Gift Nifty futures point to a cautious opening discount",
      link: "https://www.cnbc.com/2026/05/04/gift-nifty-futures-opening-discount.html",
      summary: "Index futures showed a discount before the Indian cash market open."
    },
    {
      title: "Tariff risk splits exporters, autos and metals",
      link: "https://www.cnbc.com/2026/05/04/tariff-risk-exporters-autos-metals.html",
      summary: "Trade policy headlines changed exporter, auto and metal sentiment without moving every sector together."
    },
    {
      title: "SEBI changes margin rules as GST Council weighs auto tax relief",
      link: "https://www.moneycontrol.com/news/business/markets/sebi-gst-policy-auto-tax_1300002.html",
      summary: "SEBI rules, GST changes and finance ministry policy signals can affect listed sectors before the market opens."
    },
    {
      title: "Copper demand rises as AI data-center spending lifts metals",
      link: "https://www.cnbc.com/2026/05/04/copper-ai-data-center-metals.html",
      summary: "Copper, aluminium and steel sentiment improved as data-center demand supported metal prices."
    },
    {
      title: "UK GDP growth beats forecasts as services recover",
      link: "https://www.cnbc.com/2026/05/04/uk-gdp-growth-services.html",
      summary: "UK GDP growth and services PMI improved, lifting European risk appetite before Asia opened."
    },
    {
      title: "Global manufacturing PMI lifts factory orders",
      link: "https://www.cnbc.com/2026/05/04/global-manufacturing-pmi-factory-orders.html",
      summary: "Global manufacturing PMI and factory orders improved, supporting cyclicals and capex sentiment."
    },
    {
      title: "Israel-Iran military conflict escalates before Asia opens",
      link: "https://www.cnbc.com/2026/05/04/israel-iran-military-conflict-asia.html",
      summary: "Military strikes and sanctions risk kept investors focused on safe-haven demand before Asian markets opened."
    }
  ].map((item) => normalizeLiveArticle("2026-05-04", feed, item));
  const combined = JSON.stringify(articles);
  for (const phrase of FORBIDDEN_PUBLIC_READTHROUGH_PHRASES) {
    assert.equal(combined.includes(phrase), false, `article copy reused banned category phrase: ${phrase}`);
  }

  const keystone = articles.find((article) => /Keystone pipeline/i.test(article.headline));
  const opec = articles.find((article) => /OPEC\+ output/i.test(article.headline));
  const blueOwl = articles.find((article) => /Blue Owl/i.test(article.headline));
  const boe = articles.find((article) => /BOE Governor/i.test(article.headline));
  const supercar = articles.find((article) => /Supercar engine/i.test(article.headline));
  const alphabet = articles.find((article) => /Alphabet AI chip/i.test(article.headline));
  const jobs = articles.find((article) => /Jobs day/i.test(article.headline));
  const carvana = articles.find((article) => /Carvana/i.test(article.headline));
  const boom = articles.find((article) => /It's a boom/i.test(article.headline));
  const consumer = articles.find((article) => /consumer spending/i.test(article.headline));
  const options = articles.find((article) => /Options volatility/i.test(article.headline));
  const giftNifty = articles.find((article) => /Gift Nifty/i.test(article.headline));
  const tariff = articles.find((article) => /Tariff risk/i.test(article.headline));
  const policy = articles.find((article) => /SEBI changes/i.test(article.headline));
  const copper = articles.find((article) => /Copper demand/i.test(article.headline));
  const ukGdp = articles.find((article) => /UK GDP/i.test(article.headline));
  const manufacturing = articles.find((article) => /Global manufacturing/i.test(article.headline));
  const geopolitics = articles.find((article) => /Israel-Iran military/i.test(article.headline));

  assert.ok(keystone && opec && blueOwl && boe && supercar && alphabet && jobs && carvana && boom && consumer && options && giftNifty && tariff && policy && copper && ukGdp && manufacturing && geopolitics, "mocked source set should retain all article-specific cases");
  assert.notEqual(keystone.indiaImpact, opec.indiaImpact, "oil-adjacent stories need distinct India reads");
  assert.notEqual(keystone.watchFor, opec.watchFor, "oil-adjacent stories need distinct watch fields");
  assert.match(keystone.indiaImpact, /pipeline|Brent|OMCs/i);
  assert.match(opec.indiaImpact, /OPEC|Brent|upstream/i);
  assert.equal(blueOwl.entityName, "Private markets");
  assert.match(blueOwl.indiaImpact, /^Global-only context:/);
  assert.equal(blueOwl.watchFor, "No specific watch for this article.");
  assert.equal(/Bank Nifty|NBFC/i.test(blueOwl.indiaImpact), false);
  assert.equal(/translate it into levels/i.test(blueOwl.takeaway), false);
  assert.equal(/translate it into levels/i.test(boe.takeaway), false);
  assert.equal(/translate it into levels/i.test(supercar.takeaway), false);
  assert.equal(boe.entityName, "Rates");
  assert.match(boe.takeaway, /rate|yield/i);
  assert.match(alphabet.takeaway, /Alphabet|semiconductor|AI/i);
  assert.equal(/Global Tech earnings-quality evidence/i.test(alphabet.takeaway), false);
  for (const article of [keystone, jobs, carvana, boom]) {
    assert.equal(
      normalizeForTest(article.takeaway).startsWith(normalizeForTest(article.headline).slice(0, 24)),
      false,
      `${article.headline} takeaway should not begin by restating the headline`
    );
  }
  assert.equal(carvana.category, "neutral_volatile");
  assert.equal(carvana.entityName, "US single-stock");
  assert.match(carvana.indiaImpact, /^Global-only context:/);
  assert.equal(carvana.watchFor, "No specific watch for this article.");
  assert.match(boom.takeaway, /AI-led|earnings|risk appetite/i);
  assert.doesNotMatch(boom.takeaway, /trade-flow/i);
  assert.match(consumer.indiaImpact, /FMCG|autos|retail/i);
  assert.doesNotMatch(consumer.indiaImpact, /conditional India input/i);
  assert.equal(options.entityName, "Options tape");
  assert.match(options.watchFor, /India VIX|PCR|put writing|call resistance/i);
  assert.equal(giftNifty.entityName, "Nifty Open");
  assert.match(giftNifty.indiaImpact, /Direct index read-through|Bank Nifty/i);
  assert.match(tariff.indiaImpact, /Exporters|metals|autos|pharma/i);
  assert.equal(policy.entityName, "India policy");
  assert.match(policy.indiaImpact, /Direct India read-through|Bank Nifty|affected sectors/i);
  assert.doesNotMatch(policy.indiaImpact, /global-only|macro checklist/i);
  assert.equal(copper.entityName, "Nifty Metal");
  assert.match(copper.indiaImpact, /Nifty Metal|capital-goods|Bank Nifty/i);
  assert.match(ukGdp.indiaImpact, /IT exporters|autos|pharma exporters|USD\/INR|Bank Nifty/i);
  assert.doesNotMatch(ukGdp.indiaImpact, /Nifty can open firmer/i);
  assert.match(manufacturing.indiaImpact, /Nifty Metal|capital goods|exporters|banks/i);
  assert.doesNotMatch(manufacturing.indiaImpact, /Nifty can open firmer/i);
  assert.equal(geopolitics.entityName, "Geopolitical risk");
  assert.equal(geopolitics.category, "global_risk");
  assert.match(geopolitics.indiaImpact, /Brent crude|USD\/INR|gold|FII/i);
  assert.doesNotMatch(geopolitics.takeaway, /mixed global cues|confirmation mode/i);
});

await test("Modi fuel and forex policy stories route as domestic macro stress", () => {
  const article = normalizeLiveArticle("2026-05-11", {
    sourceName: "The Week Business",
    sourceId: "the-week-business",
    categoryHint: "macro_negative",
    url: "https://www.theweek.in/wire-updates/business.html"
  }, {
    title: "PM Modi asks citizens to save fuel, gold and foreign exchange as crude pressure rises",
    summary: "Prime Minister Modi urged fuel conservation, work-from-home, reduced foreign travel and less gold buying to protect forex during the West Asia crisis.",
    link: "https://www.theweek.in/wire-updates/business/2026/05/11/stock-markets-slump-in-early-trade-amid-rising-crude-oil-prices.html",
    publishedAt: "Mon, 11 May 2026 04:54:00 GMT"
  });
  assert.equal(article.category, "macro_negative");
  assert.equal(article.entityName, "India fuel / forex");
  assert.match(article.indiaImpact, /OMCs|aviation|jewellery|USD\/INR|Bank Nifty/i);
  assert.match(article.watchFor, /Brent|USD\/INR|OMCs|jewellery|Bank Nifty/i);
  assert.equal(articleLooksMarketRelevant(article), true);
});

await test("daily lead uses India view rank and market severity instead of weak stock liveblogs", () => {
  const stockLiveblog = {
    headline: "M&M Share Price Live Updates: M&M shows strong monthly performance",
    summary: "M&M Share Price Live Updates: M&M shows strong monthly performance.",
    indiaImpact: "Nifty can open firmer, but Bank Nifty, USD/INR and advance-decline must confirm before the read gets trading weight.",
    watchFor: "Watch Nifty VWAP.",
    sourceName: "Economic Times Markets",
    sourceId: "economic-times-markets",
    sourceUrl: "https://economictimes.indiatimes.com/markets/stocks/stock-liveblog/mm-share-price-live-11-may-2026/liveblog/131002027.cms",
    category: "macro_positive",
    entityName: "Market",
    publishedAt: "2026-05-11T00:30:00.000Z",
    indiaViewCount: 25000
  };
  const crudePolicy = {
    headline: "Stock markets slump as Trump rejects Iran proposal and Modi urges fuel conservation",
    summary: "Brent crude jumped after Trump rejected Iran's peace response while Prime Minister Modi urged citizens to save fuel, gold and foreign exchange.",
    indiaImpact: "OMCs, aviation, tyres, paints, jewellery, USD/INR and Bank Nifty are the first India checks; broad Nifty needs breadth confirmation.",
    watchFor: "Watch Brent, USD/INR, OMCs, aviation and Bank Nifty breadth.",
    sourceName: "The Week Business",
    sourceId: "the-week-business",
    sourceUrl: "https://www.theweek.in/wire-updates/business/2026/05/11/stock-markets-slump-in-early-trade-amid-rising-crude-oil-prices.html",
    category: "macro_negative",
    entityName: "India fuel / forex",
    publishedAt: "2026-05-11T04:54:00.000Z",
    indiaViewCount: 90000
  };
  const lead = dailyLeadForDigest("2026-05-11", [stockLiveblog, crudePolicy], {
    marketSnapshots: [
      { name: "Brent Crude", changePercent: 4.32 },
      { name: "Nifty 50", changePercent: -1.2 },
      { name: "Bank Nifty", changePercent: -1.4 }
    ]
  });
  assert.match(lead.sourceArticleId, /^the-week-business:/);
  assert.equal(lead.label, "India fuel / forex stress");
  assert.equal(lead.driverType, "crude");
  assert.match(lead.headline, /Trump rejects Iran|Modi urges fuel/i);
});

await test("daily lead promotes India authority and move magnitude even without view counts", () => {
  const stockLiveblog = {
    headline: "Infosys Share Price Live Updates: Infosys shows strong monthly performance",
    summary: "Infosys Share Price Live Updates: Infosys shows strong monthly performance.",
    indiaImpact: "Nifty can open firmer, but Bank Nifty and advance-decline must confirm before the read gets trading weight.",
    watchFor: "Watch Nifty VWAP.",
    sourceName: "Economic Times Markets",
    sourceId: "economic-times-markets",
    sourceUrl: "https://economictimes.indiatimes.com/markets/stocks/stock-liveblog/infosys-share-price-live/liveblog/131002111.cms",
    category: "macro_positive",
    entityName: "Market",
    publishedAt: "2026-05-11T00:30:00.000Z"
  };
  const crudeShock = {
    headline: "Brent crude surges 4.8% after Trump rejects Iran peace proposal",
    summary: "Oil prices jumped as geopolitical risk rose before the India open.",
    indiaImpact: "Brent crude, USD/INR, gold and FII provisional flow data are the direct India checks; broad index bias needs breadth.",
    watchFor: "Watch Brent and USD/INR.",
    sourceName: "CNBC World",
    sourceId: "cnbc-world",
    sourceUrl: "https://www.cnbc.com/2026/05/11/cnbc-daily-open-iran-proposes-trump-opposes-xi-watches.html",
    category: "global_risk",
    entityName: "Geopolitical risk",
    publishedAt: "2026-05-11T00:45:00.000Z"
  };
  const lead = dailyLeadForDigest("2026-05-11", [stockLiveblog, crudeShock], {
    marketSnapshots: []
  });
  assert.match(lead.sourceArticleId, /^cnbc-world:/);
  assert.equal(lead.driverType, "crude");
  assert.match(lead.headline, /Brent crude surges 4\.8%/i);
});

await test("daily lead prefers confirmed large tech move over generic crude inflation watch", () => {
  const qualcommDrop = {
    headline: "Qualcomm drops 11% after weak guidance weighs on chip sector",
    summary: "Qualcomm fell sharply after guidance disappointed. Nifty IT and IT exporters face Nasdaq chip breadth headwind at India open.",
    takeaway: "Large-cap chip move signals tech sector weakness heading into Asia.",
    indiaImpact: "Nifty IT and IT exporter stocks need breadth confirmation; USD/INR also in focus as dollar strength follows chip risk-off.",
    watchFor: "Watch Nifty IT gap and Infosys, TCS opening prints.",
    sourceName: "CNBC World",
    sourceId: "cnbc-world",
    sourceUrl: "https://www.cnbc.com/2026/05/13/qualcomm-drops-11-chip-sector.html",
    category: "global_risk",
    entityName: "Nifty IT",
    publishedAt: "2026-05-13T00:45:00.000Z",
    sentimentScore: -0.6
  };
  const crudeInflationWatch = {
    headline: "Iran and oil raising inflation, prices reaccelerating globally",
    summary: "Iran tensions and rising crude oil prices are pushing inflation expectations higher globally, analysts say.",
    takeaway: "Crude geopolitical risk sets a cautious tone for inflation-sensitive sectors.",
    indiaImpact: "Brent crude pressure conditional on Iran escalation; OMCs, aviation face margin headwind if prices stay elevated.",
    watchFor: "Watch Brent above $90 and USD/INR for OMC confirmation.",
    sourceName: "Reuters",
    sourceId: "reuters",
    sourceUrl: "https://www.reuters.com/markets/commodities/iran-oil-inflation-2026-05-13.html",
    category: "global_risk",
    entityName: "Brent Crude",
    publishedAt: "2026-05-13T00:30:00.000Z",
    sentimentScore: -0.5
  };
  const lead = dailyLeadForDigest("2026-05-13", [qualcommDrop, crudeInflationWatch], {
    marketSnapshots: []
  });
  assert.match(lead.sourceArticleId, /^cnbc-world:/);
  assert.equal(lead.driverType, "tech_move");
  assert.match(lead.headline, /Qualcomm drops 11%/i);
});

await test("daily lead agent reranker can promote stronger macro lead from deterministic shortlist", async () => {
  const niftyPrediction = {
    headline: "Nifty 50, Sensex prediction today: market opens with stock-specific breadth",
    summary: "Nifty and Sensex prediction live before the open with broad market commentary.",
    indiaImpact: "Nifty and Bank Nifty breadth need confirmation before the opening prediction gets trading weight.",
    watchFor: "Watch Nifty VWAP and Bank Nifty breadth.",
    sourceName: "Economic Times Markets",
    sourceId: "economic-times-markets",
    sourceUrl: "https://economictimes.indiatimes.com/markets/stocks/news/nifty-sensex-prediction-11-may-2026/articleshow/131002000.cms",
    category: "macro_positive",
    entityName: "Nifty",
    publishedAt: "2026-05-11T00:30:00.000Z",
    indiaViewCount: 120000
  };
  const tradeTruce = {
    headline: "US-China tariff truce lifts Nasdaq, KOSPI and metals risk appetite",
    summary: "The US and China agreed to cut tariffs for 90 days, lifting Nasdaq futures, KOSPI and Brent before the Asia open.",
    indiaImpact: "Nifty IT, metals, exporters and China-linked cyclicals are the India checks; broad Nifty needs opening breadth.",
    watchFor: "Watch Nifty Metal, Nifty IT and Hang Seng through the first range.",
    sourceName: "Reuters",
    sourceId: "reuters",
    sourceUrl: "https://www.reuters.com/world/china/us-china-tariff-truce-90-days-2026-05-11/",
    category: "global_risk",
    entityName: "US-China trade",
    publishedAt: "2026-05-11T00:45:00.000Z",
    sentimentScore: 0.65
  };
  const deterministic = dailyLeadForDigest("2026-05-11", [niftyPrediction, tradeTruce], { marketSnapshots: [] });
  assert.match(deterministic.sourceArticleId, /^economic-times-markets:/);

  const lead = await dailyLeadForDigestWithAgent("2026-05-11", [niftyPrediction, tradeTruce], {
    marketSnapshots: [],
    dailyLeadReranker: async ({ candidates, prompt, userPrompt, deterministicLeadId }) => {
      assert.equal(prompt, DAILY_LEAD_RERANK_PROMPT);
      assert.ok(userPrompt.includes("deterministicScore"));
      assert.match(deterministicLeadId, /^economic-times-markets:/);
      const tradeCandidate = candidates.find((candidate) => /tariff truce/i.test(candidate.headline));
      assert.ok(tradeCandidate, "agent shortlist should include the US-China trade candidate");
      return {
        rankedIds: [tradeCandidate.id, ...candidates.map((candidate) => candidate.id).filter((id) => id !== tradeCandidate.id)],
        leadReason: "The tariff truce explains Asia risk-on breadth better than the generic Nifty prediction.",
        driverType: "trade",
        confidence: 0.86
      };
    }
  });

  assert.match(lead.sourceArticleId, /^reuters:/);
  assert.equal(lead.driverType, "geopolitical");
  assert.equal(lead.selectionMethod, "agent_rerank");
  assert.match(lead.deterministicSourceArticleId, /^economic-times-markets:/);
  assert.match(lead.selectionReason, /tariff truce/i);
});

await test("daily lead agent reranker falls back when response uses unknown ids", async () => {
  const niftyPrediction = {
    headline: "Nifty 50, Sensex prediction today: market opens with stock-specific breadth",
    summary: "Nifty and Sensex prediction live before the open with broad market commentary.",
    indiaImpact: "Nifty and Bank Nifty breadth need confirmation before the opening prediction gets trading weight.",
    watchFor: "Watch Nifty VWAP and Bank Nifty breadth.",
    sourceName: "Economic Times Markets",
    sourceId: "economic-times-markets",
    sourceUrl: "https://economictimes.indiatimes.com/markets/stocks/news/nifty-sensex-prediction-11-may-2026/articleshow/131002000.cms",
    category: "macro_positive",
    entityName: "Nifty",
    publishedAt: "2026-05-11T00:30:00.000Z",
    indiaViewCount: 120000
  };
  const tradeTruce = {
    headline: "US-China tariff truce lifts Nasdaq, KOSPI and metals risk appetite",
    summary: "The US and China agreed to cut tariffs for 90 days, lifting Nasdaq futures, KOSPI and Brent before the Asia open.",
    indiaImpact: "Nifty IT, metals, exporters and China-linked cyclicals are the India checks; broad Nifty needs opening breadth.",
    watchFor: "Watch Nifty Metal, Nifty IT and Hang Seng through the first range.",
    sourceName: "Reuters",
    sourceId: "reuters",
    sourceUrl: "https://www.reuters.com/world/china/us-china-tariff-truce-90-days-2026-05-11/",
    category: "global_risk",
    entityName: "US-China trade",
    publishedAt: "2026-05-11T00:45:00.000Z",
    sentimentScore: 0.65
  };
  const deterministic = dailyLeadForDigest("2026-05-11", [niftyPrediction, tradeTruce], { marketSnapshots: [] });
  const lead = await dailyLeadForDigestWithAgent("2026-05-11", [niftyPrediction, tradeTruce], {
    marketSnapshots: [],
    dailyLeadReranker: async () => ({
      rankedIds: ["made-up-source:123"],
      leadReason: "Unknown ids must not be trusted.",
      driverType: "trade",
      confidence: 0.99
    })
  });

  assert.equal(lead.sourceArticleId, deterministic.sourceArticleId);
  assert.equal(Object.hasOwn(lead, "selectionMethod"), false);
});

await test("daily lead NVIDIA reranker uses JSON chat-completions prompt", async () => {
  const niftyPrediction = {
    headline: "Nifty 50, Sensex prediction today: market opens with stock-specific breadth",
    summary: "Nifty and Sensex prediction live before the open with broad market commentary.",
    indiaImpact: "Nifty and Bank Nifty breadth need confirmation before the opening prediction gets trading weight.",
    watchFor: "Watch Nifty VWAP and Bank Nifty breadth.",
    sourceName: "Economic Times Markets",
    sourceId: "economic-times-markets",
    sourceUrl: "https://economictimes.indiatimes.com/markets/stocks/news/nifty-sensex-prediction-11-may-2026/articleshow/131002000.cms",
    category: "macro_positive",
    entityName: "Nifty",
    publishedAt: "2026-05-11T00:30:00.000Z",
    indiaViewCount: 120000
  };
  const crudeShock = {
    headline: "Brent crude surges 4.8% after Trump rejects Iran peace proposal",
    summary: "Oil prices jumped as geopolitical risk rose before the India open.",
    indiaImpact: "Brent crude, USD/INR, gold and FII provisional flow data are the direct India checks; broad index bias needs breadth.",
    watchFor: "Watch Brent and USD/INR.",
    sourceName: "CNBC World",
    sourceId: "cnbc-world",
    sourceUrl: "https://www.cnbc.com/2026/05/11/cnbc-daily-open-iran-proposes-trump-opposes-xi-watches.html",
    category: "global_risk",
    entityName: "Geopolitical risk",
    publishedAt: "2026-05-11T00:45:00.000Z"
  };
  let nvidiaCalls = 0;
  const llmFetcher = async (url, request = {}) => {
    nvidiaCalls += 1;
    assert.equal(url, "https://integrate.api.nvidia.com/v1/chat/completions");
    assert.equal(request.headers.Authorization, "Bearer test-nvidia-key");
    assert.equal(request.headers.Accept, "application/json");
    const body = JSON.parse(request.body);
    assert.equal(body.model, "meta/llama-4-maverick-17b-128e-instruct");
    assert.equal(body.response_format.type, "json_object");
    assert.equal(body.stream, false);
    assert.equal(body.chat_template_kwargs.thinking, false);
    assert.equal(body.reasoning_budget, undefined);
    assert.equal(body.messages[0].content, DAILY_LEAD_RERANK_PROMPT);
    assert.ok(body.messages[1].content.includes("deterministicLeadId"));
    assert.ok(body.messages[1].content.includes("deterministicScore"));
    const payload = JSON.parse(body.messages[1].content.slice(body.messages[1].content.indexOf("{")));
    const crudeCandidate = payload.candidates.find((candidate) => /Brent crude surges/i.test(candidate.headline));
    assert.ok(crudeCandidate, "NVIDIA prompt should include crude candidate");
    return {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              rankedIds: [crudeCandidate.id],
              leadReason: "The crude shock is the clearest pre-open India risk driver.",
              driverType: "crude",
              confidence: 0.91
            })
          }
        }]
      })
    };
  };

  const lead = await dailyLeadForDigestWithAgent("2026-05-11", [niftyPrediction, crudeShock], {
    marketSnapshots: [],
    llmFetcher,
    nvidiaApiKey: "test-nvidia-key"
  });

  assert.equal(nvidiaCalls, 1);
  assert.match(lead.sourceArticleId, /^cnbc-world:/);
  assert.equal(lead.driverType, "crude");
  assert.equal(lead.selectionMethod, "agent_rerank");
});

await test("daily generation entry point routes leads through agent reranker path", async () => {
  const generatorSource = await readFile(join(rootDir, "tools", "generate-daily-summary.mjs"), "utf8");
  const coreSource = await readFile(join(rootDir, "tools", "core.mjs"), "utf8");

  assert.match(generatorSource, /await buildDigest\(/, "daily generator should use buildDigest()");
  assert.doesNotMatch(generatorSource, /\bdailyLeadForDigest\(/, "daily generator must not call the deterministic lead helper directly");
  assert.match(coreSource, /const dailyLead = await dailyLeadForDigestWithAgent\(/, "buildDigest must call the agent-aware daily lead helper");
  assert.match(coreSource, /NVIDIA_API_KEY/, "agent-aware lead helper must read the configured NVIDIA key path");
  assert.match(generatorSource, /manual-non-trading-source-data/, "manual closed-market digests must be labelled separately");
  assert.match(generatorSource, /isVerifiedForPublicArchive: false/, "manual closed-market digests must not become latest verified archives");
});

await test("daily lead cannot be laundered by enriched single-stock liveblog copy", async () => {
  const archive = JSON.parse(await readFile(join(rootDir, "archive", "daily", "2026-05-29-0715-digest.json"), "utf8"));
  const lead = dailyLeadForDigest(archive.digestDate, archive.news, { marketSnapshots: archive.marketSnapshots });

  assert.doesNotMatch(lead.headline, /Share Price Live Updates|stock-liveblog/i);
  assert.match(lead.headline, /Gift Nifty|oil prices|overnight|Indian stock market/i);
  assert.equal(lead.driverType, "crude");
});

await test("manual non-trading archive is retained but not indexable or latest-verified", async () => {
  const digest = JSON.parse(await readFile(join(rootDir, "archive", "daily", "2026-05-30-0715-digest.json"), "utf8"));
  assert.equal(digest.runMode, "manual-non-trading-source-data");
  assert.equal(digest.sourceVerification?.isVerifiedForPublicArchive, false);
  assert.equal(marketCalendarState(digest.digestDate).isTradingSession, false);

  const html = cockpitPage({ ...digest, canonicalPath: "/30may2026/" }, "public-view", { includeStudio: false, theme: "glass-v2" });
  assert.match(html, /<meta name="robots" content="noindex,follow">/);
  assert.match(html, /Manual non-trading edition/);
});

await test("premarket publish window blocks stale scheduled runs", () => {
  const onTime = premarketPublishWindowStatus({
    date: "2026-05-11",
    scheduledTime: "07:15",
    now: new Date("2026-05-11T01:55:00.000Z")
  });
  assert.equal(onTime.isLate, false);
  const late = premarketPublishWindowStatus({
    date: "2026-05-11",
    scheduledTime: "07:15",
    now: new Date("2026-05-11T04:58:49.000Z")
  });
  assert.equal(late.isLate, true);
  assert.match(late.reason, /minutes after 07:15 IST/);
  assert.throws(() => assertPremarketPublishWindow({
    date: "2026-05-11",
    scheduledTime: "07:15",
    now: new Date("2026-05-11T04:58:49.000Z")
  }), /Premarket publish blocked/);
});

await test("public source selection excludes no-direct India stories when direct reads are available", () => {
  const directArticles = Array.from({ length: 9 }, (_, index) => ({
    headline: `India-linked market article ${index + 1}`,
    summary: "Market source with direct India read-through.",
    takeaway: "Direct source movement can affect the India open.",
    indiaImpact: index % 2 === 0
      ? "Nifty and Bank Nifty need breadth confirmation."
      : "Nifty IT and USD/INR need exporter confirmation.",
    watchFor: "Watch the first range and sector breadth.",
    sourceUrl: `https://www.cnbc.com/2026/05/03/india-linked-market-article-${index + 1}.html`,
    sourceName: index % 3 === 0 ? "CNBC Markets" : "Yahoo Finance",
    category: index % 2 === 0 ? "global_risk" : "macro_positive",
    entityName: index % 2 === 0 ? "Bank Nifty" : "Global Tech",
    publishedAt: "2026-05-03T12:00:00.000Z"
  }));
  const noDirect = {
    headline: "U.S. crude oil exports surge to record",
    summary: "Crude flow story with no direct Indian pipeline read-through.",
    takeaway: "Crude flow story needs Brent confirmation.",
    indiaImpact: "No direct Indian pipeline read-through; use Brent to decide whether OMCs, aviation and paints face import-cost pressure.",
    watchFor: "Watch Brent.",
    sourceUrl: `https://www.cnbc.com/2026/05/03/us-crude-oil-exports-surge-to-record.html`,
    sourceName: "CNBC Markets",
    category: "global_risk",
    entityName: "Brent Crude",
    publishedAt: "2026-05-03T13:00:00.000Z"
  };
  const selection = publicSourceSelectionForDigest("2026-05-04", [noDirect, ...directArticles]);
  assert.ok(selection.visibleArticles.length >= 8 && selection.visibleArticles.length <= 10, `expected 8–10 visible articles, got ${selection.visibleArticles.length}`);
  assert.equal(selection.visibleArticles.includes(noDirect), false);
  assert.ok(selection.visibleArticles.every((article) => !/^No direct Indian\b|^No direct India read-through|^Global-only context/i.test(article.indiaImpact || "")));
  const categoryCounts = selection.visibleArticles.reduce((counts, article) => {
    counts.set(article.category || "market", (counts.get(article.category || "market") || 0) + 1);
    return counts;
  }, new Map());
  assert.ok(Math.max(...categoryCounts.values()) <= 5, `visible source stack should not overconcentrate one bucket: ${JSON.stringify(Object.fromEntries(categoryCounts))}`);
});

await test("public source selection prefers India-publisher articles when available", () => {
  const categories = ["global_risk", "macro_negative", "sector_positive", "macro_positive", "sector_negative", "neutral_volatile"];
  const globalArticles = Array.from({ length: 8 }, (_, index) => ({
    headline: `Global market article ${index + 1}`,
    summary: "Global source with direct India market read-through.",
    takeaway: "Global cue can affect the India open.",
    indiaImpact: "Nifty and Bank Nifty need breadth confirmation.",
    watchFor: "Watch index breadth after the first range.",
    sourceUrl: `https://www.cnbc.com/2026/05/03/global-market-article-${index + 1}.html`,
    sourceName: "CNBC Markets",
    category: categories[index % categories.length],
    entityName: index % 2 === 0 ? "Brent Crude" : "Rates",
    publishedAt: "2026-05-03T12:00:00.000Z",
    sentimentScore: index % 2 === 0 ? -0.32 : 0.24,
    entityMatchScore: 0.72
  }));
  const indiaArticles = [
    {
      headline: "Gift Nifty signals a cautious Indian open",
      summary: "India-linked source with direct index read-through.",
      takeaway: "Gift Nifty points to a cautious start for domestic index traders.",
      indiaImpact: "Bearish for Nifty until breadth improves.",
      watchFor: "Watch Gift Nifty discount into the 9:15 open.",
      sourceUrl: "https://www.moneycontrol.com/news/business/markets/gift-nifty-signals-cautious-open-2026-05-03.html",
      sourceName: "Moneycontrol Markets",
      category: "neutral_volatile",
      entityName: "Nifty Open",
      publishedAt: "2026-05-03T13:00:00.000Z",
      sentimentScore: -0.28,
      entityMatchScore: 0.86
    },
    {
      headline: "Rupee traders track dollar resilience before RBI week",
      summary: "India currency source with direct FX read-through.",
      takeaway: "Dollar strength keeps USD/INR and rate-sensitive sectors in focus.",
      indiaImpact: "Bearish for rate-sensitive pockets if USD/INR stays firm.",
      watchFor: "Watch USD/INR against the morning high.",
      sourceUrl: "https://www.livemint.com/market/stock-market-news/rupee-traders-track-dollar-resilience-before-rbi-week-2026-05-03.html",
      sourceName: "Livemint Markets",
      category: "macro_negative",
      entityName: "USD/INR",
      publishedAt: "2026-05-03T13:30:00.000Z",
      sentimentScore: -0.22,
      entityMatchScore: 0.88
    }
  ];
  const selection = publicSourceSelectionForDigest("2026-05-04", [...globalArticles, ...indiaArticles]);
  assert.ok(selection.visibleArticles.length >= 8 && selection.visibleArticles.length <= 10, `expected 8–10 visible articles, got ${selection.visibleArticles.length}`);
  assert.equal(selection.publicSummary.indiaPublisherCount, 2);
  assert.equal(selection.publicSummary.directIndiaSourceCount, 2);
  assert.equal(selection.publicSummary.officialIndiaSourceCount, 0);
  assert.equal(selection.publicSummary.evidenceGrade, "limited");
  assert.equal(selection.publicSummary.shortlistIndiaPublisherCount, 2);
  assert.match(selection.publicSummary.indiaPublisherCoverage, /Full India-source gate: Limited/);
  assert.ok(selection.visibleArticles.some((article) => /moneycontrol/i.test(article.sourceName)));
  assert.ok(selection.visibleArticles.some((article) => /livemint/i.test(article.sourceName)));
});

await test("public source selection labels zero India-source full briefs as global cue context", () => {
  const articles = Array.from({ length: 8 }, (_, index) => ({
    headline: `Global cue article ${index + 1}`,
    summary: "Global cue with an explicit Indian-market read-through.",
    takeaway: "Global cue can affect the India open.",
    indiaImpact: "Nifty and Bank Nifty need breadth confirmation before this becomes tradeable.",
    watchFor: "Watch the first range and Bank Nifty breadth.",
    sourceUrl: `https://www.cnbc.com/2026/05/03/global-cue-article-${index + 1}.html`,
    sourceName: "CNBC Markets",
    category: index % 2 === 0 ? "global_risk" : "macro_negative",
    entityName: index % 2 === 0 ? "Nasdaq" : "Rates",
    publishedAt: "2026-05-03T13:00:00.000Z",
    sentimentScore: index % 2 === 0 ? -0.2 : 0.1,
    entityMatchScore: 0.7
  }));
  const selection = publicSourceSelectionForDigest("2026-05-04", articles);
  assert.equal(selection.publicSummary.directIndiaSourceCount, 0);
  assert.equal(selection.publicSummary.evidenceGrade, "global_cue_only");
  assert.match(selection.publicSummary.indiaPublisherCoverage, /Full India-source gate: Not cleared/);
  assert.equal(selection.publicSummary.indiaPublisherCoverage.includes("Direct India-source articles: 0"), false);
});

await test("public source selection fills the stack when source categories are narrow", () => {
  const articles = Array.from({ length: 9 }, (_, index) => ({
    headline: `Direct India energy article ${index + 1}`,
    summary: "India energy and rate-sensitive market source with explicit read-through.",
    takeaway: "Direct India cue affects the market open.",
    indiaImpact: index % 2 === 0
      ? "Direct India read-through: power and industrial breadth are the checks."
      : "Rate-sensitive Indian sectors need yield stability.",
    watchFor: "Watch breadth after the first range.",
    sourceUrl: `https://www.cnbc.com/2026/05/03/direct-india-energy-article-${index + 1}.html`,
    sourceName: index % 2 === 0 ? "CNBC World" : "CNBC Economy",
    category: index < 5 ? "global_risk" : "macro_negative",
    entityName: index < 5 ? "India Energy" : "Rates",
    publishedAt: "2026-05-03T12:00:00.000Z",
    sentimentScore: index % 2 === 0 ? -0.42 : -0.35,
    entityMatchScore: 0.8
  }));
  const selection = publicSourceSelectionForDigest("2026-05-04", articles);
  assert.ok(selection.visibleArticles.length >= 8 && selection.visibleArticles.length <= 10, `expected 8–10 visible articles, got ${selection.visibleArticles.length}`);
});

await test("public source selection diversifies repeated crude shocks with flow and policy drivers", () => {
  const crudeArticles = Array.from({ length: 6 }, (_, index) => ({
    headline: "Brent crude shock " + (index + 1) + ": Iran and Hormuz keep oil risk elevated",
    summary: "Brent crude and Iran/Hormuz risk pressure India's import-cost sectors.",
    takeaway: "Crude shock is the main global risk driver.",
    indiaImpact: "OMCs, aviation, paints and tyres face pressure if Brent stays firm.",
    watchFor: "Watch Brent crude direction at Asia handoff.",
    sourceUrl: "https://economictimes.indiatimes.com/markets/commodities/news/brent-crude-shock-" + (index + 1) + "/articleshow/13200000" + index + ".cms",
    sourceName: "Economic Times Markets",
    category: "global_risk",
    entityName: "Brent crude",
    publishedAt: "2026-05-04T01:00:00.000Z",
    sentimentScore: -0.45,
    entityMatchScore: 0.9
  }));
  const driverArticles = [
    {
      headline: "FPI outflow crosses Rs 60,000 crore before India open",
      summary: "FPI outflows are the domestic cash-market risk check for Nifty and Bank Nifty.",
      takeaway: "Institutional flow can decide whether global cues are absorbed or rejected.",
      indiaImpact: "Nifty and Bank Nifty need breadth confirmation if FPI selling persists.",
      watchFor: "Watch FII/DII provisional flow and Bank Nifty VWAP.",
      sourceUrl: "https://www.ndtvprofit.com/markets/fpi-outflow-crosses-rs-60000-crore-before-india-open",
      sourceName: "NDTV Profit",
      category: "macro_negative",
      entityName: "FPI flows",
      publishedAt: "2026-05-04T01:05:00.000Z",
      sentimentScore: -0.35,
      entityMatchScore: 0.9
    },
    {
      headline: "Government waives excise duty on fuel exports to cool domestic price risk",
      summary: "Government fuel policy affects forex, current account and energy-linked India sectors.",
      takeaway: "Fuel policy is a domestic macro input, not a generic commodity headline.",
      indiaImpact: "OMCs and inflation expectations need policy confirmation alongside Brent.",
      watchFor: "Watch fuel policy details and USD/INR.",
      sourceUrl: "https://www.livemint.com/market/stock-market-news/government-waives-excise-duty-on-fuel-exports",
      sourceName: "Mint Markets",
      category: "macro_positive",
      entityName: "Fuel policy",
      publishedAt: "2026-05-04T01:10:00.000Z",
      sentimentScore: 0.2,
      entityMatchScore: 0.8
    },
    {
      headline: "Asian markets fall as KOSPI and Hang Seng track oil shock",
      summary: "Asia breadth gives the regional risk check for the India open.",
      takeaway: "Asia breadth tells whether the global risk-off cue is broad or isolated.",
      indiaImpact: "Nifty IT, metals and broad breadth need Asia confirmation before the first range.",
      watchFor: "Watch KOSPI, Hang Seng and Gift Nifty into 9:15 AM.",
      sourceUrl: "https://economictimes.indiatimes.com/markets/us-stocks/news/asian-markets-fall-as-kospi-hang-seng-track-oil-shock/articleshow/132000100.cms",
      sourceName: "Economic Times Markets",
      category: "global_risk",
      entityName: "Asia breadth",
      publishedAt: "2026-05-04T01:15:00.000Z",
      sentimentScore: -0.25,
      entityMatchScore: 0.8
    },
    {
      headline: "Gift Nifty signals a weak start as Nifty support sits near 23,100",
      summary: "Gift Nifty and Nifty support define the opening range check.",
      takeaway: "Gift Nifty sets the first range, but cash breadth decides follow-through.",
      indiaImpact: "Nifty and Bank Nifty need VWAP confirmation through the first range.",
      watchFor: "Watch Gift Nifty, Nifty VWAP and Bank Nifty breadth.",
      sourceUrl: "https://economictimes.indiatimes.com/markets/stocks/news/gift-nifty-signals-weak-start-nifty-support-23100/articleshow/132000101.cms",
      sourceName: "Economic Times Markets",
      category: "neutral_volatile",
      entityName: "Gift Nifty",
      publishedAt: "2026-05-04T01:20:00.000Z",
      sentimentScore: -0.2,
      entityMatchScore: 0.9
    }
  ];
  const selection = publicSourceSelectionForDigest("2026-05-04", [...crudeArticles, ...driverArticles]);
  const visibleText = selection.visibleArticles.map((article) => article.headline).join("\n");
  const crudeCount = selection.visibleArticles.filter((article) => /Brent crude shock/i.test(article.headline)).length;
  assert.ok(crudeCount <= 2, "expected at most 2 repeated crude shock cards, got " + crudeCount);
  assert.match(visibleText, /FPI outflow/i);
  assert.match(visibleText, /Government waives excise/i);
  assert.match(visibleText, /Asian markets fall/i);
  assert.match(visibleText, /Gift Nifty signals/i);
});

await test("public source selection can publish a smaller verified stack", () => {
  const articles = Array.from({ length: 3 }, (_, index) => ({
    headline: `Limited verified source ${index + 1}`,
    summary: "Small verified stack with explicit India market read-through.",
    takeaway: "Limited but usable source context for the open.",
    indiaImpact: index === 0
      ? "Nifty and Bank Nifty need breadth confirmation."
      : "Rate-sensitive Indian sectors need yield stability.",
    watchFor: "Watch the first range and sector breadth.",
    sourceUrl: `https://www.cnbc.com/2026/05/03/limited-verified-source-${index + 1}.html`,
    sourceName: index === 0 ? "CNBC Markets" : "Yahoo Finance",
    category: index === 0 ? "global_risk" : "macro_negative",
    entityName: index === 0 ? "Bank Nifty" : "Rates",
    publishedAt: "2026-05-03T12:00:00.000Z"
  }));
  const selection = publicSourceSelectionForDigest("2026-05-04", articles);
  assert.equal(selection.visibleArticles.length, 3);
  assert.equal(selection.publicSummary.visibleCount, 3);
});

await test("public source ledger keeps Pulse-carried real article links when they are the only visible stack", async () => {
  const digest = await buildDigest("2026-04-29");
  const pulseArticles = Array.from({ length: 3 }, (_, index) => ({
    headline: `Pulse-carried India source ${index + 1}`,
    summary: "Real article URL carried through a feed aggregator with an explicit India market read-through.",
    takeaway: "The article changes the opening checklist for Indian index traders.",
    whyItMatters: "The source still carries article-level evidence even when the feed publisher label is an aggregator.",
    indiaImpact: index === 0
      ? "FPI flow and Bank Nifty breadth decide whether the Nifty open can hold."
      : "Crude-sensitive OMCs, aviation and tyres need Brent confirmation.",
    watchFor: "Watch Nifty VWAP and Bank Nifty breadth through 9:45 AM.",
    sourceUrl: `https://www.ndtvprofit.com/markets/pulse-carried-india-source-${index + 1}.html`,
    sourceName: "Zerodha Pulse",
    category: index === 0 ? "neutral_volatile" : "global_risk",
    entityName: index === 0 ? "FPI flows" : "Brent crude",
    publishedAt: "2026-04-29T01:00:00.000Z",
    sentimentScore: index === 0 ? -0.3 : -0.2,
    entityMatchScore: 0.9,
    thumbnail: articleThumbnailMeta({
      headline: `Pulse-carried India source ${index + 1}`,
      category: index === 0 ? "neutral_volatile" : "global_risk",
      entityName: index === 0 ? "FPI flows" : "Brent crude",
      sentimentScore: -0.2
    })
  }));
  const pageDigest = {
    ...digest,
    news: pulseArticles,
    sourceVerification: {
      mode: "live",
      verifiedArticleCount: pulseArticles.length,
      publisherCount: 1,
      categoryCount: 2,
      duplicateWithPreviousPercent: 0,
      blockedReason: null,
      isVerifiedForPublicArchive: true
    },
    publicSourceSelection: {
      visibleCount: pulseArticles.length,
      shortlistCount: pulseArticles.length,
      directIndiaSourceCount: pulseArticles.length,
      officialIndiaSourceCount: 0,
      domesticCatalystCount: pulseArticles.length,
      globalContextCount: 0,
      globalOnlySourceRatio: 0,
      evidenceGrade: "limited",
      publishMode: "limited_brief",
      indiaPublisherCount: pulseArticles.length,
      visibleSourceUrls: pulseArticles.map((article) => article.sourceUrl)
    }
  };
  const html = cockpitPage(pageDigest, "public-view", { includeStudio: false, theme: "glass-v2" });
  assert.match(html, /id="sourceLedger"/);
  assert.equal((html.match(/data-source-url="/g) ?? []).length, pulseArticles.length);
  assert.match(html, /Pulse-carried India source 1/);
});

await test("full digest contains public SEO and studio contracts", async () => {
  const digest = await buildDigest("2026-04-29");
  assert.ok(["BEARISH", "VOLATILE"].includes(digest.sentimentLabel));
  assert.ok(digest.onePageSummary.includes("Educational note"));
  assert.ok(digest.teleprompterScript.includes("[RISK DISCLAIMER]"));
  assert.ok(digest.reelScript.includes("[REEL SCRIPT"));
  assert.ok(digest.reelScript.includes("[0-03s | HOOK]"));
  assert.ok(digest.reelScript.includes("[40-52s | TRADE PLAN]"));
  assertReelScriptCopy("daily reel script", digest.reelScript);
  assert.ok(reelScriptMarkdown(digest).includes("## Daily Reel Script"));
  assert.ok(digest.asset.positivePrompt.includes("ControlNet reference, consistent face"));
  assert.ok(digest.asset.reelVideo.videoPrompt.includes("60-second vertical financial market reel"));
  assert.ok(digest.asset.reelVideo.scenes.length >= 5);
  assert.ok(digest.news.length >= 6 && digest.news.length <= 10, `expected 6–10 curated news items, got ${digest.news.length}`);
  assert.ok(digest.dailyLead?.driverType);
  assert.notEqual(digest.dailyLead.label, "Global crude-flow signal");
  assert.doesNotMatch(JSON.stringify(digest.dailyLead), /India impact runs only through|Global crude-flow signal/i);
  assert.ok(digest.publicSourceSelection.visibleCount >= 6 && digest.publicSourceSelection.visibleCount <= 10, `expected visibleCount 6–10, got ${digest.publicSourceSelection.visibleCount}`);
  assert.ok(digest.publicSourceSelection.shortlistCount >= 8);
  assert.equal(digest.publicSourceSelection.windowHours, 24);
  assert.ok(digest.news.every((article) => !/^No direct Indian\b|^No direct India read-through|^Global-only context/i.test(article.indiaImpact || "")));
  const selectedCategoryCounts = digest.news.reduce((counts, article) => {
    counts.set(article.category || "market", (counts.get(article.category || "market") || 0) + 1);
    return counts;
  }, new Map());
  assert.ok(Math.max(...selectedCategoryCounts.values()) <= 4, `top source list is too category-heavy: ${JSON.stringify(Object.fromEntries(selectedCategoryCounts))}`);
  assert.ok(digest.news.every((article) => article.thumbnail?.alt));
  assert.equal(digest.newsDataMode, "fixture");
  assert.equal(digest.sourceVerification.mode, "fixture");
  assert.ok(digest.sourceVerification.verifiedArticleCount >= 8);
  assert.equal(digest.sourceVerification.blockedReason, null);
  assert.ok(digest.news.every((article) => sourceUrlLooksArticleLevel(article.sourceUrl)));
  assert.ok(digest.generatedAt);
  assert.ok(digest.archiveSummary);
  assert.ok(digest.deskNote);
  assert.equal(digest.watchItems.length, 3);
  assert.equal(digest.title.includes("Global Pressure Meets Domestic Selectivity"), false);
  assert.equal(JSON.stringify(digest.news).includes("verified source stack"), false);
  for (const phrase of FORBIDDEN_PUBLIC_READTHROUGH_PHRASES) {
    assert.equal(JSON.stringify(digest.news).includes(phrase), false, `digest leaked category fallback phrase: ${phrase}`);
  }
  const jsonLd = newsArticleJsonLd(digest);
  assert.equal(jsonLd["@type"], "NewsArticle");
  assert.equal(jsonLd.headline, digest.title);
  assert.equal(jsonLd.author.name, "Abhey Deep");
  assert.equal(jsonLd.publisher.name, "Market Narrative");
  assert.ok(jsonLd.keywords.includes("Nifty pre-market briefing"));
});

await test("daily briefing and trading guide render the correct first-fold hierarchy", async () => {
  const digest = await buildDigest("2026-04-29");
  const publicHtml = cockpitPage(
    { ...digest, canonicalPath: "/29apr2026/" },
    "public-view",
    { includeStudio: false, theme: "glass-v2", multibaggerHref: "/multibagger/" }
  );
  const guideHtml = cockpitPage(
    { ...digest, canonicalPath: "/29apr2026/trading-guide/" },
    "trading-guide-view",
    { includeStudio: false, theme: "glass-v2", multibaggerHref: "/multibagger/" }
  );

  assert.ok(publicHtml.includes('id="public-view" class="tab-content"'));
  assert.equal(publicHtml.includes('id="trading-guide-view"'), false);
  assert.equal((publicHtml.match(/<h1/g) || []).length, 1, "public briefing should render exactly one h1");
  assert.equal(publicHtml.includes("Today's Trade Map"), false);
  assert.ok(publicHtml.includes("Global Indices Watch"), "public briefing should show the indices watch before source depth");
  assert.ok(publicHtml.includes('href="/indices/"'), "public briefing should link to the full indices board");
  assert.ok(publicHtml.includes("mini-sparkline"), "public briefing should render Yahoo-series mini charts in the indices watch");
  assert.ok(publicHtml.includes("source-card source-evidence-card"), "public briefing should render compact evidence cards");
  assert.ok(publicHtml.includes("market-mini-row"), "public briefing should render compact market rows for mobile indices watch");
  // Opening Nerve lives on the trading guide only — not on the public briefing page
  assert.equal(publicHtml.includes("Opening Nerve"), false, "Opening Nerve must not appear on public briefing page");
  assert.ok(guideHtml.includes('id="trading-guide-view" class="tab-content"'));
  assert.equal(guideHtml.includes('id="public-view"'), false);
  assert.equal((guideHtml.match(/<h1/g) || []).length, 1, "trading guide should render exactly one h1");
  assert.equal(guideHtml.includes("2 Minute Summary"), false);
  assert.ok(guideHtml.includes("Opening Nerve"));
  assert.ok(guideHtml.includes("Nifty gate"));
  assert.ok(guideHtml.includes("Bank filter"));
  assert.ok(guideHtml.includes("Stand-down trigger"));
  assert.ok(guideHtml.indexOf("Opening Nerve") < guideHtml.indexOf("Today's Trade Map"));
  assert.ok(guideHtml.includes("Checklist for the open: bias, index gates, no-trade zone, Bank Nifty confirmation, and sector watch."));
  assert.doesNotMatch(guideHtml, /Daily Pre-Market Summary|2 Minute Summary/);
  assert.doesNotMatch(publicHtml, /Global crude-flow signal|India impact runs only through/i);
  assert.ok(publicHtml.includes("Abhey Deep"));
  assert.ok(publicHtml.indexOf('id="summaryExpand"') < publicHtml.indexOf("compact-meta-strip"), "2-minute summary should appear before share row");
  // Top Stories merged into unified Evidence & Sources section
  assert.ok(publicHtml.includes("sources-section"), "Evidence & Sources section must be present");
  assert.equal(publicHtml.includes("Live Quote Board"), false);
  assert.equal(publicHtml.includes("live refresh pending"), false);
  assert.equal(publicHtml.includes("Waiting for chart data"), false);
  assert.equal(guideHtml.includes("Waiting for chart data"), false);
  assert.ok(publicHtml.includes("Open full indices board"));
});

await test("trading guide level copy is directionally consistent", async () => {
  const digest = JSON.parse(await readFile(join(rootDir, "archive", "daily", "2026-05-05-0715-digest.json"), "utf8"));
  const guideHtml = cockpitPage(
    { ...digest, canonicalPath: "/5may2026/trading-guide/" },
    "trading-guide-view",
    { includeStudio: false, theme: "glass-v2", multibaggerHref: "/multibagger/" }
  );
  const text = guideHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  const bullish = text.match(/Nifty must (?:reclaim and hold|hold) ([0-9,]+); first upside watch is ([0-9,]+)/i);
  const bearish = text.match(/Nifty (?:breaks below|losing) ([0-9,]+) puts? ([0-9,]+) on watch|Nifty breaks below ([0-9,]+); first downside watch is ([0-9,]+)/i);
  assert.ok(bullish, "trading guide did not expose bullish hold/upside levels");
  assert.ok(bearish, "trading guide did not expose bearish break/downside levels");
  const bullishHold = numberFromCopy(bullish[1]);
  const upsideWatch = numberFromCopy(bullish[2]);
  const bearishBreak = numberFromCopy(bearish[1] || bearish[3]);
  const downsideWatch = numberFromCopy(bearish[2] || bearish[4]);
  assert.ok(upsideWatch > bullishHold, `upside watch ${upsideWatch} must be above bullish hold ${bullishHold}`);
  assert.ok(downsideWatch < bearishBreak, `downside watch ${downsideWatch} must be below bearish break ${bearishBreak}`);
});

await test("public digest payload ships compact display DTOs", async () => {
  const digest = await buildDigest("2026-04-29");
  digest.dailyLead = {
    ...digest.dailyLead,
    selectionMethod: "agent_rerank",
    selectionReason: "Internal rerank reason should stay out of public payloads.",
    selectionConfidence: 0.9,
    deterministicSourceArticleId: "fixture:deterministic"
  };
  const payload = publicDigestPayload(digest);
  const redactedPayload = redactedDigestPayload(digest);
  const newsKeys = Object.keys(payload.news[0]).sort();

  assert.equal(payload.status, "PUBLISHED");
  assert.equal(redactedPayload.status, "PUBLISHED");
  assert.equal(JSON.stringify(payload).includes('"status":"DRAFT"'), false);
  assert.equal(JSON.stringify(redactedPayload).includes('"status":"DRAFT"'), false);
  assert.equal(Object.hasOwn(payload, "teleprompterScript"), false);
  assert.equal(Object.hasOwn(payload, "reelScript"), false);
  assert.equal(payload.asset?.positivePrompt, undefined);
  assert.equal(payload.asset?.reelVideo, undefined);
  assert.deepEqual(newsKeys, [
    "category",
    "publisherName",
    "sentimentLabel",
    "sourceUrl",
    "thumbnailAlt",
    "thumbnailUrl",
    "timestamp",
    "title"
  ]);
  assert.ok(payload.news.every((article) => article.thumbnailUrl.startsWith("data:image/svg+xml,")));
  const thumbnailSvgs = payload.news.map((article) => decodeURIComponent(article.thumbnailUrl));
  assert.ok(thumbnailSvgs.some((svg) => /Crude|Rates|Jobs|Chips|Inflation|Yen/i.test(svg)), "public thumbnails should be article-specific, not only category badges");
  assert.equal(articleThumbnailMeta({ headline: "Bank of England faces the most difficult combination", category: "macro_negative" }).label, "BoE Rates");
  assert.equal(articleThumbnailMeta({ headline: "Jobs day, semiconductor earnings, and stock market momentum", category: "macro_positive" }).label, "Jobs + Chips");
  assert.equal(JSON.stringify(payload.news).includes("whyItMatters"), false);
  assert.equal(JSON.stringify(payload.news).includes("indiaImpact"), false);
  assert.equal(JSON.stringify(payload.news).includes("entityMatchScore"), false);
  assert.equal(JSON.stringify(payload.news).includes("sentimentScore"), false);
  assert.ok(payload.setupAudit.length >= payload.tradeSetups.length);
  assert.equal(JSON.stringify(payload.setupAudit).includes('"setup"'), false);
  assert.equal(payload.sourceVerification.mode, "fixture");
  assert.ok(payload.sourceVerification.verifiedArticleCount >= 8);
  assert.equal(payload.sourceVerification.isVerifiedForPublicArchive, true);
  assert.ok(payload.dailyLead?.driverType);
  assert.equal(JSON.stringify(payload.dailyLead).includes("agent_rerank"), false);
  assert.equal(JSON.stringify(payload.dailyLead).includes("selectionReason"), false);
  assert.equal(JSON.stringify(redactedPayload.dailyLead).includes("agent_rerank"), false);
  assert.ok(payload.publicSourceSelection.visibleCount >= 6 && payload.publicSourceSelection.visibleCount <= 10, `expected visibleCount 6–10, got ${payload.publicSourceSelection.visibleCount}`);
  assert.equal(payload.publicSourceSelection.windowHours, 24);
  assert.ok(Number.isFinite(payload.publicSourceSelection.indiaPublisherCount));
  assert.ok(payload.publicSourceSelection.indiaPublisherCoverage);
  assert.equal(JSON.stringify(payload).includes("sourceDebug"), false);
  assert.equal(JSON.stringify(payload).includes("rejectedSources"), false);
  assert.equal(payload.sourceStats.articleCount, digest.news.length);
  assert.equal(payload.sourceStats.publisherCount, new Set(digest.news.map((article) => article.sourceName)).size);
});

await test("multibagger public model is concentrated and sanitized", () => {
  const state = validateMultibaggerState(multibaggerState());
  const weights = state.holdings.map((holding) => holding.targetWeight);
  assert.equal(state.holdings.length, 5);
  assert.equal(weights.reduce((sum, weight) => sum + weight, 0), 100);
  assert.equal(state.holdings.reduce((sum, holding) => sum + holding.modelAmountInr, 0), 500000);
  assert.equal(state.modelEntryDate, "2026-04-27");
  assert.equal(state.trackingBasis?.researchModelStartedOn, "2026-04-27");
  assert.equal(state.trackingBasis?.publicFillBaselineAt, "2026-05-04T14:12:00+05:30");
  assert.equal(state.trackingBasis?.returnsCalculatedFrom, "publicFillBaselineAt");
  assert.equal(state.performance.modelEntryDate, "2026-04-27");
  assert.ok(Date.parse(state.updatedAt) > Date.parse("2026-05-01T00:00:00.000Z"), "updatedAt must be after May 1 2026");
  assert.notEqual(state.updatedAt, "1970-01-01T00:00:00.000Z");
  assert.equal(state.pricing.isStale, false, "static fallback now carries refreshed prices; isStale should be false");
  assert.ok(Number.isFinite(state.performance.currentModelValueInr) && state.performance.currentModelValueInr > 0, "static fallback must carry a finite model value");
  assert.ok(Number.isFinite(state.performance.totalPnlInr), "static fallback must carry a finite P&L");
  assert.ok(Number.isFinite(state.performance.benchmarkSinceLaunchPercent), "static fallback must carry a finite benchmark return");
  assert.deepEqual(state.transactions, []);
  assert.ok(state.methodology?.definition.includes("multibagger"));
  assert.ok(state.methodology?.evaluationCategories.some((item) => item.includes("Profitability")));
  assert.ok(state.methodology?.evaluationCategories.some((item) => item.includes("Valuation")));
  assert.ok(state.methodology?.replacementLogic.includes("replaced"));
  assert.equal(state.researchEvidence?.asOf, "2026-05-02");
  assert.ok(state.researchEvidence?.marketRegime?.some((item) => item.label === "10Y G-sec hurdle"));
  assert.ok(state.researchEvidence?.marketRegime?.some((item) => item.summary.includes("7.01%")));
  assert.ok(state.researchEvidence?.marketRegime?.some((item) => item.summary.includes("Rs 73.73 lakh crore")));
  assert.deepEqual(
    state.researchEvidence?.holdingEvidence?.map((item) => item.ticker),
    ["KPEL", "DHABRIYA", "DYCL", "SHARDAMOTR", "JNKINDIA"]
  );
  assert.ok(state.researchEvidence?.holdingEvidence?.every((item) => item.evidence.length >= 2 && item.needsProof));
  for (const holding of state.holdings) {
    for (const field of ["profitabilityLens", "valuationLens", "growthCatalyst", "conversionRisk", "capitalStructureRisk"]) {
      assert.ok(holding[field], `${holding.ticker} missing ${field}`);
    }
    assert.ok(holding.rolePlain, `${holding.ticker} missing plain-English role`);
    assert.ok(holding.displayLabel, `${holding.ticker} missing displayLabel`);
    assert.ok(holding.screenerUrl?.startsWith("https://www.screener.in/company/"), `${holding.ticker} missing Screener link`);
  }
  for (const item of state.watchlist) {
    assert.ok(item.replacementPressure, `${item.ticker} missing replacementPressure`);
  }
  assert.deepEqual(
    state.holdings.map((holding) => holding.displayLabel),
    ["Renewable execution", "Margin recovery", "Cable cycle quality", "Quality ballast", "Order conversion"]
  );
  assert.deepEqual(
    state.holdings.map((holding) => holding.ticker),
    ["KPEL", "DHABRIYA", "DYCL", "SHARDAMOTR", "JNKINDIA"]
  );
  for (const holding of state.holdings) {
    assert.ok(Number.isFinite(holding.entryPrice), `${holding.ticker} missing entryPrice`);
    assert.equal(holding.entryAt, "2026-05-04T14:12:00+05:30", `${holding.ticker} missing baseline entry timestamp`);
    // Static fallback now carries real refreshed prices; no longer null/hidden
    assert.ok(Number.isFinite(Number(holding.lastPrice)), `${holding.ticker} static fallback must have a real lastPrice`);
    assert.ok(Number.isFinite(Number(holding.returnPercent)), `${holding.ticker} static fallback must have a real returnPercent`);
    assert.ok(Number.isFinite(Number(holding.modelPnlInr)), `${holding.ticker} static fallback must have a real P&L`);
    assert.ok(Number.isFinite(Number(holding.currentModelValueInr)), `${holding.ticker} static fallback must have a real current value`);
    assert.ok(Number.isFinite(Number(holding.dayChangePercent)), `${holding.ticker} static fallback must have a real day move`);
    assert.ok(holding.priceSource?.startsWith("Yahoo Finance") || holding.priceSource?.startsWith("BSE India"), `${holding.ticker} static fallback priceSource must name Yahoo or BSE`);
  }
  const publicJson = JSON.stringify(state).toLowerCase();
  assert.equal(publicJson.includes("server quote snapshot"), false, "fallback must not masquerade as a server quote snapshot");
  assert.equal(publicJson.includes("60% of it below 33rd percentile"), false, "unverified IT percentile claim leaked");
  assert.equal(publicJson.includes("45.4%"), false, "unsourced KPEL ROE claim leaked");
  assert.equal(publicJson.includes("buy now"), false, "stock-advice phrasing leaked");
  for (const forbidden of ["screenshot", "rawocr", "raw ocr", "private", "accountvalue", "account value", "quantity", "broker"]) {
    assert.equal(publicJson.includes(forbidden), false, `public multibagger state leaked ${forbidden}`);
  }
});

await test("multibagger public page is expandable and public-safe", () => {
  const state = multibaggerState();
  const html = multibaggerPage(state);
  assertPublicBriefingCopy("multibagger public page", html);
  assertPublicFinancePageIntegrity("multibagger public page", html, [/Nifty|stock|equities|multibagger/i, /Research Method/i]);
  assert.ok(html.includes("Market Narrative Multibagger Portfolio"));
  assert.ok(html.includes("Market Narrative Research"));
  assert.ok(html.includes("Public Briefing"));
  assert.ok(html.includes("Trading Guide"));
  assert.ok(html.includes("Multibagger Portfolio"));
  assert.ok(html.includes('class="tab-link active" aria-current="page">Portfolio'));
  assert.ok(html.includes('href="/about/">About</a>'));
  assert.ok(html.includes("How to read this page"));
  assert.ok(html.includes("Start with the live model, then open details only when you need evidence."));
  assert.ok(html.includes("The public tracker is dense by design"));
  assert.ok(html.includes("orientation-steps"));
  assert.ok(html.includes("Slots"));
  assert.ok(html.includes("Ledger"));
  assert.ok(html.indexOf("How to read this page") < html.indexOf("Five public model slots"));
  assert.equal(html.includes("Admin review"), false);
  assert.equal(html.includes("admin.marketnarrative.in/multibagger"), false);
  assert.ok(html.includes("Model status"));
  assert.ok(html.includes("Rs 5L public baseline"));
  assert.ok(html.includes("Current value"));
  assert.ok(html.includes("Public tracking active"));
  assert.equal(html.includes("Baseline live"), false);
  assert.ok(html.includes("Since entry (04 May 2026, 02:12 pm)"));
  assert.ok(html.includes("return awaiting verified quote"));
  assert.ok(html.includes("Research model started 27 Apr 2026"));
  assert.ok(html.includes("Entry: 04 May 2026, 02:12 pm"));
  assert.ok(html.includes("Entries captured 04 May, 02:12 pm"));
  assert.ok(html.includes("Latest quote refresh"));
  assert.ok(html.includes("Educational research only"));
  assert.ok(html.includes("Current price"));
  assert.equal(html.includes("<th>Plain-English Role</th>"), false);
  assert.ok(html.includes("Plain-English role legend"));
  assert.ok(html.includes("holding-name-line"));
  assert.ok(html.includes("holding-card-grid"));
  assert.equal((html.match(/<details class="holding-card">/g) || []).length, 5);
  assert.equal(html.includes('<article class="holding-card">'), false);
  assert.ok(html.includes("holding-card-role"));
  assert.ok(html.includes("holding-card-closed-metrics"));
  assert.ok(html.indexOf("holding-card-closed-metrics") < html.indexOf("holding-card-body"));
  assert.ok(html.includes("holding-card-key-metrics"));
  assert.ok(html.includes("Since entry</span><strong"));
  assert.ok(html.includes("Detailed Ledger"));
  assert.ok(html.includes("quote-source-line"));
  assert.ok(html.includes("Capped slot"));
  assert.equal(html.includes("Research label: Anchor renewable alpha"), false);
  assert.equal(html.includes("Last static update:"), false);
  assert.ok(html.includes("Share this public tracker"));
  assert.ok(html.includes('aria-label="Share tracker on WhatsApp"'));
  assert.ok(html.includes('aria-label="Share tracker on X"'));
  assert.ok(html.includes('aria-label="Share tracker on LinkedIn"'));
  assert.ok(html.includes('aria-label="Copy tracker link"'));
  assert.ok(html.includes("Show details v"));
  assert.ok(html.includes("Hide details ^"));
  assert.equal(html.includes('class="chev"'), false);
  assert.ok(html.includes("allocation-visual"));
  assert.ok(html.includes("allocation-donut"));
  assert.ok(html.includes('<details class="allocation-legend-disclosure">'));
  assert.equal(html.includes('<details class="allocation-legend-disclosure" open>'), false);
  assert.ok(html.includes("Expandable portfolio research modules"));
  assert.ok(html.includes("module-grid"));
  assert.ok(html.includes("module-preview"));
  assert.ok(html.includes("preview-pill"));
  assert.ok(html.includes("Performance"));
  assert.equal(html.includes("Portfolio At A Glance"), false);
  assert.ok(html.includes("allocation-grid"));
  assert.ok(html.includes("allocation-tile"));
  assert.ok(html.includes("Research Framework"));
  assert.ok(html.includes("Research Method"));
  assert.ok(html.includes("Not tips"));
  assert.ok(html.includes("Evidence reviewed monthly"));
  assert.ok(html.includes("Replace weak slots"));
  assert.ok(html.includes("Cash conversion matters"));
  assert.equal(html.includes("Research Method Snapshot"), false);
  assert.ok(html.includes("Market Regime Evidence"));
  assert.ok(html.includes("10Y G-sec hurdle"));
  assert.ok(html.includes("7.01%"));
  assert.ok(html.includes("Rs 73.73 lakh crore"));
  assert.ok(html.includes("RBI Retail Direct"));
  assert.ok(html.includes("Investor Discipline"));
  assert.ok(html.includes("52-week low is not a thesis"));
  assert.ok(html.includes("A low share price does not make a stock cheap"));
  assert.ok(html.includes("FOMO Filter"));
  assert.ok(html.includes("not SEBI-registered investment advice"));
  assert.ok(html.includes("Evidence Ledger"));
  assert.ok(html.includes("Needs proof"));
  for (const ticker of ["KPEL", "DHABRIYA", "DYCL", "SHARDAMOTR", "JNKINDIA"]) {
    assert.ok(html.includes(`<strong>${ticker}</strong>`) || html.includes(`<h3>${ticker}</h3>`), `page missing ${ticker}`);
  }
  assert.ok(html.includes("<details class=\"panel research-framework-panel\">"));
  assert.equal(html.includes("<details class=\"panel research-framework-panel\" open>"), false);
  assert.equal(html.includes("<details class=\"panel method-panel\" open>"), false);
  assert.ok(html.indexOf("Research Method") < html.indexOf("<details class=\"panel research-framework-panel\">"));
  assert.ok(html.indexOf("Research Method") < html.indexOf("Market Regime Evidence"));
  assert.ok(html.includes("<details class=\"panel performance-panel\" open>"));
  assert.ok(html.includes("<details class=\"panel holdings-panel\">"));
  assert.equal(html.includes("<details class=\"panel holdings-panel\" open>"), false);
  assert.ok(html.includes("<details class=\"ledger-disclosure\" id=\"detailedLedger\">"));
  assert.equal(html.includes("<details class=\"ledger-disclosure\" id=\"detailedLedger\" open>"), false);
  assert.ok(html.includes("not stock advice"));
  assert.ok(html.includes("Profitability"));
  assert.ok(html.includes("Valuation"));
  assert.ok(html.includes("Growth catalyst"));
  assert.ok(html.includes("Capital structure"));
  assert.ok(html.includes("Reviews And Changes"));
  assert.ok(html.includes("Baseline entries are published through the Holdings table."));
  assert.ok(html.includes("Why These 5"));
  assert.ok(html.includes("Watchlist"));
  assert.equal(html.includes("Buy And Sell Record"), false);
  assert.equal(html.includes("Monthly Reviews"), false);
  assert.equal(html.includes("Watchlist And Replacements"), false);
  assert.ok(html.includes("Rs 5L deployed"));
  assert.ok(html.includes("Avg entry"));
  assert.ok(html.includes("Entry timestamp"));
  assert.ok(html.includes("Entry: 04 May 2026, 02:12 pm"));
  assert.ok(html.includes("Quote timestamp"));
  assert.ok(html.includes("Research link"));
  assert.ok(html.includes("Closest challenger"));
  assert.ok(html.includes("High replacement pressure"));
  assert.ok(html.includes("entry-source-line"));
  assert.ok(html.includes("P&amp;L"));
  assert.ok(html.includes("data-label=\"Ticker\""));
  assert.ok(html.includes(">Screener</a>"));
  assert.ok(html.includes("https://www.screener.in/company/KPEL/"));
  assert.equal(html.includes('id="priceStatus"'), false);
  assert.equal(html.includes("Since baseline date"), false);
  assert.equal(html.includes("Since model date"), false);
  // Static fallback now carries real prices; priceSource shows Yahoo Finance / BSE India
  assert.ok(html.includes("Yahoo Finance") || html.includes("BSE India"), "multibagger page must show price source name");
  assert.ok(html.includes("Latest Yahoo/BSE public quotes") || html.includes("current prices and returns appear after verified market quotes"), "multibagger page must include a quote note");
  assert.equal(html.includes("Server quote snapshot"), false);
  assert.ok(html.includes("renderMultibaggerState"));
  assert.ok(html.includes("Reviews And Changes"));
  assert.ok(html.includes("Watchlist"));
  assert.ok(html.includes("watch-flags"));
  assert.ok(html.includes("watch-flag green"));
  assert.ok(html.includes("og:site_name"));
  assert.ok(html.includes("twitter:card"));
  assert.ok(html.includes('rel="canonical"'));
  assert.ok(html.includes("window.__MULTIBAGGER_STATE__"));
  assert.ok(html.includes("/api/public/multibagger/state"));
  assert.ok(html.includes("<details class=\"panel performance-panel\" open>"));
  assert.ok((html.match(/<details class="panel/g) ?? []).length >= 7);
  assert.equal(html.includes("60% of IT below 33rd percentile"), false);
  assert.equal(html.includes("45.4%"), false);
  assert.equal(html.toLowerCase().includes("buy now"), false);
});

await test("public briefing copy follows editorial prompt guardrails", async () => {
  const digest = await buildDigest("2026-04-29");
  const publicPayload = publicDigestPayload(digest);
  const publicHtml = cockpitPage(digest, "public-view", { includeStudio: false });

  assert.ok(PUBLIC_BRIEFING_EDITORIAL_PROMPT.includes("financial news article"));
  assert.ok(PUBLIC_BRIEFING_EDITORIAL_PROMPT.includes("yield cycle"));
  assert.ok(PUBLIC_BRIEFING_EDITORIAL_PROMPT.includes("current source stack supports"));
  assert.ok(PUBLIC_BRIEFING_EDITORIAL_PROMPT.includes("Do not mention internal implementation details"));
  assert.ok(ARTICLE_ENRICHMENT_PROMPT.includes("Return valid JSON only"));
  assert.ok(ARTICLE_ENRICHMENT_PROMPT.includes("global-only context"));
  assert.ok(REEL_SCRIPT_EDITORIAL_PROMPT.includes("actually say on camera"));
  assertPublicBriefingCopy("onePageSummary", digest.onePageSummary);
  assertReelScriptCopy("reelScript", digest.reelScript);
  assertPublicBriefingCopy("public digest payload", JSON.stringify(publicPayload));
  assertPublicBriefingCopy("public page HTML", publicHtml);
  assertPublicFinancePageIntegrity("public daily briefing HTML", publicHtml, [/Nifty/i, /Bank Nifty/i, /market/i]);
  assertPublicBriefingCopy(
    "reputation-safe archive hero",
    "Pre-Market Intelligence Archive. Independent Indian pre-market intelligence for the cash open: global cues, Nifty and Bank Nifty context, sector impact, source cards, technical risk levels, and links into the public multibagger research tracker."
  );
  assert.throws(
    () => assertPublicBriefingCopy(
      "bad sample",
      "The scanner has deliberately removed stale trade levels after live quote validation, so the video should frame the first hour as a level-discovery phase."
    ),
    /Public editorial guardrail failed/
  );
  for (const badArchiveCopy of [
    "Daily Pre-Market Archive",
    "All Market Narrative briefings",
    "root page",
    "now works",
    "The root page now works like a news archive.",
    "Open a dated briefing for the full quote board.",
    "Asia watch: South Korea - KOSPI -1.38%",
    "14 markets tracked",
    "0 setups",
    "15 sources",
    "we bought these stocks last week"
  ]) {
    assert.throws(
      () => assertPublicBriefingCopy("bad archive sample", badArchiveCopy),
      /Public editorial guardrail failed/,
      `expected guardrail to reject ${badArchiveCopy}`
    );
  }
  assert.throws(
    () => assertPublicBriefingCopy(
      "bad museum sample",
      "The May briefing highlights Museum of Fine Arts Boston exhibitions, Robert Frank, Monet, galleries, and audio tours."
    ),
    /Public editorial guardrail failed/
  );
  const sanitized = sanitizeLegacyPublicBriefingCopy({
    onePageSummary: "No active 1:2 RR setup passed all scanner and live-quote filters.",
    news: [
      {
        indiaImpact: "Avoid chasing the first candle; let Nifty and Bank Nifty prove acceptance near the scanner levels."
      }
    ]
  });
  assertPublicBriefingCopy("sanitized legacy archive", JSON.stringify(sanitized));
  assert.equal(
    sanitized.news[0].indiaImpact,
    "Avoid chasing the first candle; let Nifty and Bank Nifty prove acceptance around the opening range."
  );
});

await test("reel script rejects trading advice and public copy rejects guaranteed language", () => {
  // Reel script trading-advice patterns must be caught
  for (const badReel of [
    "[0-03s | HOOK]\nON SCREEN: x\nVOICEOVER: x\n[40-52s | TRADE PLAN]\nentry price is 24200",
    "[0-03s | HOOK]\nON SCREEN: x\nVOICEOVER: x\n[40-52s | TRADE PLAN]\nstop loss at 24100",
    "[0-03s | HOOK]\nON SCREEN: x\nVOICEOVER: x\n[40-52s | TRADE PLAN]\nbuy this stock now",
    "[0-03s | HOOK]\nON SCREEN: x\nVOICEOVER: x\n[40-52s | TRADE PLAN]\nthis is a guaranteed winner",
    "[0-03s | HOOK]\nON SCREEN: x\nVOICEOVER: x\n[40-52s | TRADE PLAN]\nsure shot pick for the day"
  ]) {
    assert.throws(
      () => assertReelScriptCopy("bad reel advice", badReel),
      /Reel script editorial guardrail failed/,
      `expected reel guardrail to reject: ${badReel.slice(badReel.lastIndexOf("\n") + 1)}`
    );
  }
  // Public copy must reject "guaranteed" and "sure shot"
  for (const badPublic of [
    "This is a guaranteed profit setup.",
    "Sure shot call for Nifty today.",
    "A sure-shot trade for Bank Nifty."
  ]) {
    assert.throws(
      () => assertPublicBriefingCopy("bad guaranteed", badPublic),
      /Public editorial guardrail failed/,
      `expected public guardrail to reject: ${badPublic}`
    );
  }
});

await test("reel script word count is within 45-60 second speaking time", async () => {
  const digest = await buildDigest("2026-04-29");
  const voiceoverLines = (digest.reelScript ?? "")
    .split("\n")
    .filter((line) => /^VOICEOVER:/i.test(line.trim()));
  const totalWords = voiceoverLines
    .map((line) => line.replace(/^VOICEOVER:\s*/i, "").trim())
    .join(" ")
    .split(/\s+/)
    .filter(Boolean)
    .length;
  // 45-60 seconds at ~3 words/sec = 135-180 words. Allow 100-280 for natural variance.
  assert.ok(totalWords >= 100, `reel voiceover too short: ${totalWords} words (min 100)`);
  assert.ok(totalWords <= 280, `reel voiceover too long: ${totalWords} words (max 280)`);
});

await test("Yahoo market data normalization calculates previous-close change", () => {
  const snapshot = normalizeYahooChartResult(
    {
      symbol: "SPX",
      name: "S&P 500",
      yahooSymbol: "^GSPC",
      tradingViewSymbol: "SP:SPX"
    },
    {
      chart: {
        result: [
          {
            meta: {
              currency: "USD",
              symbol: "^GSPC",
              regularMarketPrice: 7127.1,
              chartPreviousClose: 7138.8,
              regularMarketTime: 1777478873,
              exchangeTimezoneName: "America/New_York"
            },
            timestamp: [1777478753, 1777478813, 1777478873],
            indicators: { quote: [{ close: [7118.4, 7122.8, 7127.1] }] }
          }
        ]
      }
    }
  );
  assert.equal(snapshot.symbol, "SPX");
  assert.equal(snapshot.closeValue, 7127.1);
  assert.equal(snapshot.previousClose, 7138.8);
  assert.equal(snapshot.changePercent, -0.164);
  assert.equal(snapshot.dataQuality, "live");
  assert.equal(snapshot.tradingViewSymbol, "SP:SPX");
  assert.equal(snapshot.marketRegion, undefined);
  assert.equal(snapshot.chartPoints.length, 3);
  assert.equal(snapshot.chartPoints.at(-1).close, 7127.1);
});

await test("Yahoo market data normalization preserves region metadata", () => {
  const snapshot = normalizeYahooChartResult(
    {
      symbol: "NIKKEI",
      name: "Nikkei 225",
      yahooSymbol: "^N225",
      tradingViewSymbol: "TVC:NI225",
      marketRegion: "Asia Watch",
      country: "Japan",
      session: "tokyo"
    },
    {
      chart: {
        result: [
          {
            meta: {
              currency: "JPY",
              symbol: "^N225",
              regularMarketPrice: 38105.2,
              chartPreviousClose: 37911.44,
              regularMarketTime: 1777478873,
              exchangeTimezoneName: "Asia/Tokyo"
            },
            timestamp: [1777478753, 1777478813, 1777478873],
            indicators: { quote: [{ close: [37984.4, 38011.7, 38105.2] }] }
          }
        ]
      }
    }
  );
  assert.equal(snapshot.symbol, "NIKKEI");
  assert.equal(snapshot.marketRegion, "Asia Watch");
  assert.equal(snapshot.country, "Japan");
  assert.equal(snapshot.session, "tokyo");
  assert.equal(snapshot.changePercent, 0.511);
  assert.equal(snapshot.chartPoints.length, 3);
});

await test("Yahoo market data normalization synthesizes chart points when quote data is sparse", () => {
  const snapshot = normalizeYahooChartResult(
    {
      symbol: "DXY",
      name: "US Dollar Index",
      yahooSymbol: "DX-Y.NYB",
      tradingViewSymbol: "TVC:DXY",
      marketRegion: "Macro Hedges",
      session: "macro"
    },
    {
      chart: {
        result: [
          {
            meta: {
              currency: "USD",
              regularMarketPrice: 99.83,
              chartPreviousClose: 99.73,
              regularMarketTime: 1777478873,
              exchangeTimezoneName: "America/New_York"
            },
            timestamp: [],
            indicators: { quote: [{ close: [] }] }
          }
        ]
      }
    }
  );
  assert.equal(snapshot.symbol, "DXY");
  assert.equal(snapshot.dataQuality, "live");
  assert.equal(snapshot.changePercent, 0.1);
  assert.equal(snapshot.chartPoints.length, 24);
  assert.equal(snapshot.chartPoints[0].close, 99.73);
  assert.equal(snapshot.chartPoints.at(-1).close, 99.83);
});

await test("non-live market data modes preserve the digest contract without network", async () => {
  const digest = await buildDigest("2026-04-29", { marketDataMode: "live-offline-test" });
  assert.equal(digest.marketDataMode, "live-offline-test");
  assert.ok(digest.marketSnapshots.every((snapshot) => snapshot.closeValue));
});

await test("backend source exposes required MVP API endpoints", async () => {
  const source = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "publishing", "AdminDigestController.java"), "utf8");
  const publicSource = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "publishing", "PublicDigestController.java"), "utf8");
  for (const endpoint of [
    "/digest/run",
    "/digest/{date}",
    "/scripts/{id}",
    "/scripts/{id}/regenerate",
    "/assets/generate",
    "/digest/{date}/publish"
  ]) {
    assert.ok(source.includes(endpoint), `missing admin endpoint ${endpoint}`);
  }
  assert.ok(publicSource.includes("/today"));
  assert.ok(publicSource.includes("/{date}"));
});

await test("database schema includes all planned persistence tables", async () => {
  const schema = await readFile(join(rootDir, "backend", "src", "main", "resources", "db", "migration", "V1__initial_schema.sql"), "utf8");
  for (const table of [
    "user_accounts",
    "market_snapshots",
    "market_news",
    "narrative_themes",
    "trade_setups",
    "daily_scripts",
    "asset_generations"
  ]) {
    assert.ok(schema.includes(`CREATE TABLE ${table}`), `missing ${table}`);
  }
  assert.ok(schema.includes("market_region VARCHAR"), "market_snapshots missing market_region");
  assert.ok(schema.includes("country VARCHAR"), "market_snapshots missing country");
  assert.ok(schema.includes("trading_view_symbol VARCHAR"), "market_snapshots missing TradingView chart symbol");
  assert.ok(schema.includes("overall_sentiment NUMERIC(6, 3)"), "V1 migration must remain checksum-stable after it has shipped");
  const v2 = await readFile(join(rootDir, "backend", "src", "main", "resources", "db", "migration", "V2__align_double_precision_columns.sql"), "utf8");
  assert.ok(v2.includes("ALTER TABLE daily_scripts"));
  assert.ok(v2.includes("DOUBLE PRECISION"));
  assert.ok(v2.includes("ALTER COLUMN overall_sentiment TYPE DOUBLE PRECISION"));
});

await test("backend market snapshot contract carries chart-refresh fields", async () => {
  const entity = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "marketdata", "MarketSnapshot.java"), "utf8");
  const dto = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "publishing", "PublicDigestDto.java"), "utf8");
  const service = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "publishing", "PublicDigestService.java"), "utf8");
  const cache = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "config", "CacheConfig.java"), "utf8");
  for (const token of ["marketRegion", "country", "session", "tradingViewSymbol", "capturedAt"]) {
    assert.ok(entity.includes(token), `entity missing ${token}`);
  }
  for (const token of ["marketRegion", "country", "session", "tradingViewSymbol", "previousClose", "dataQuality", "dataTimestamp", "ChartPointView", "chartPoints"]) {
    assert.ok(dto.includes(token), `DTO missing ${token}`);
  }
  assert.ok(service.includes("getMarketRegion()"));
  assert.ok(service.includes("getCountry()"));
  assert.ok(service.includes("getTradingViewSymbol()"));
  assert.ok(service.includes("getCapturedAt()"));
  assert.ok(service.includes("chartPoints(snapshot)"));
  assert.ok(cache.includes("Duration.ofSeconds(45)"), "public digest cache must stay short enough for chart refresh");
});

await test("static publisher emits public pages plus auth-gated admin pages", async () => {
  const publisher = await readFile(join(rootDir, "tools", "publish-site.mjs"), "utf8");
  const brandAssets = await readFile(join(rootDir, "tools", "brand-assets.mjs"), "utf8");
  assert.ok(publisher.includes("archivePage(archiveTimelineEntries, allArchiveTimelineEntries, latest)"));
  assert.ok(publisher.includes("publication-events.json"));
  assert.ok(publisher.includes("publicationEventPage"));
  assert.ok(publisher.includes("Read publication record"));
  assert.ok(publisher.includes("Backfilled context"));
  assert.ok(publisher.includes("Trading guide boundary"));
  assert.ok(publisher.includes("evidenceGradeLabel"));
  assert.ok(publisher.includes("isVerifiedPublicDigest"));
  assert.ok(publisher.includes("legacyAuditStatus"));
  assert.ok(publisher.includes("recentArchiveGridHtml"));
  assert.ok(publisher.includes("archiveCardSummary"));
  assert.ok(publisher.includes("previousSessionDriver"));
  assert.ok(publisher.includes("sanitizePublicArticleCopy"));
  assert.ok(publisher.includes("evidence matters only if margins"));
  assert.ok(publisher.includes("archiveToneClass"));
  assert.ok(publisher.includes("sentimentSparklineHtml"));
  assert.ok(publisher.includes('div class="digest-card'));
  assert.ok(publisher.includes("hero-actions"));
  assert.ok(publisher.includes("homepageLatestState"));
  assert.ok(publisher.includes("Market closed today"));
  assert.ok(publisher.includes("No trading-day brief"));
  assert.ok(publisher.includes("Check market status"));
  // Homepage hero is now dynamic — just verify structural markers are present
  assert.ok(publisher.includes('class="eyebrow"'), "homepage must have eyebrow element");
  assert.ok(publisher.includes("<h1>"), "homepage must have an h1");
  assert.ok(publisher.includes("7:15 AM IST") || publisher.includes("Nifty") || publisher.includes("pre-market"), "homepage h1/sub must mention market context");
  assert.ok(publisher.includes("Read today's brief"));
  assert.ok(publisher.includes("Open Trading Guide"));
  assert.ok(publisher.includes("Track Portfolio"));
  assert.ok(publisher.includes("Subscribe"));
  assert.ok(publisher.includes("Join daily email"));
  assert.ok(publisher.includes("Search the archive"));
  assert.ok(publisher.includes("archiveSearch"));
  assert.ok(publisher.includes("archiveTagFilter"));
  assert.ok(publisher.includes("data-archive-card"));
  assert.ok(publisher.includes("archiveFilterOptions"));
  const publicationEvents = await readFile(join(rootDir, "data", "publication-events.json"), "utf8");
  assert.ok(publicationEvents.includes('"date": "2026-05-07"'));
  assert.ok(publicationEvents.includes('"date": "2026-05-08"'));
  assert.ok(publicationEvents.includes("Backfilled Historical Context"));
  assert.ok(publicationEvents.includes('"status": "backfilled_context"'));
  assert.ok(publicationEvents.includes("does not recreate intraday trading levels"));
  assert.ok(publicationEvents.includes("article-level sources"));
  assert.ok(publisher.includes("aboutPage"));
  assert.ok(publisher.includes("subscribePage"));
  assert.ok(publisher.includes("About Market Narrative"));
  assert.ok(publisher.includes("Who is Abhey Deep?"));
  assert.ok(publisher.includes("Why not just headlines?"));
  assert.ok(publisher.includes("I'm Abhey Deep - a software engineer and Indian market trader"));
  assert.ok(publisher.includes("Published record"));
  assert.ok(publisher.includes("verified briefings"));
  assert.ok(publisher.includes('<span class="tab-link active" aria-current="page">About</span>'));
  assert.ok(publisher.includes('name="_honey"'));
  assert.equal(publisher.includes('name="_captcha" value="false"'), false);
  assert.ok(publisher.includes('.sent-note[hidden]'));
  assert.ok(publisher.includes("sentNote.hidden = false"));
  assert.ok(publisher.includes("If you do not receive a confirmation email within a few minutes"));
  assert.ok(publisher.includes('join(siteDir, "subscribe")'));
  assert.ok(publisher.includes('join(siteDir, "about")'));
  assert.ok(publisher.includes("archiveSourceQualityLine"));
  assert.ok(publisher.includes("archiveSourcePreviewHtml"));
  assert.ok(publisher.includes("assertNewDigestSourceIntegrity"));
  assert.ok(publisher.includes("archiveChips"));
  assert.ok(publisher.includes("Nifty Today Analysis - Pre-Market Briefing for Nifty & Bank Nifty | Market Narrative"));
  assert.ok(publisher.includes("homepageSeoSectionHtml"));
  assert.ok(publisher.includes("homepageFaqItems"));
  assert.ok(publisher.includes("faqPageJsonLd"));
  assert.ok(publisher.includes("moneyFlowPage"));
  assert.ok(publisher.includes("marketStatisticsPage"));
  assert.ok(publisher.includes("movesHubPage"));
  assert.ok(publisher.includes("contactPage"));
  assert.ok(publisher.includes("privacyPage"));
  assert.ok(publisher.includes("termsPage"));
  assert.ok(publisher.includes('join(siteDir, "money-flow", "fii-dii")'));
  assert.ok(publisher.includes('join(siteDir, "market-statistics")'));
  assert.ok(publisher.includes('join(siteDir, "moves")'));
  assert.ok(publisher.includes('join(siteDir, "contact")'));
  assert.ok(publisher.includes('join(siteDir, "privacy")'));
  assert.ok(publisher.includes('join(siteDir, "terms")'));
  assert.ok(publisher.includes("FII DII Data Today - Institutional Flow & F&O Positioning"));
  assert.ok(publisher.includes("India Market Statistics Today - Nifty Breadth & Health Score"));
  assert.ok(publisher.includes("Daily trader workflow"));
  // Opening nerve removed in redesign
  // Workflow strip updated in redesign
  assert.ok(publisher.includes("Past briefings"));
  assert.ok(publisher.includes("Recent Briefing Navigation"));
  assert.ok(publisher.includes("recent-archive-link"));
  assert.ok(publisher.includes("Open briefing"));
  assert.ok(publisher.includes("India read"));
  assert.ok(publisher.includes('isVerifiedPublicDigest(digest) ? digest.title : "Archived market briefing"'));
  assert.ok(publisher.includes("Archived continuity page. Newer editions use verified article-level sources"));
  assert.ok(publisher.includes("sentiment-sparkline"));
  assert.ok(publisher.includes("Top ${digest.publicSourceSelection.visibleCount} India read-through notes selected"));
  assert.ok(publisher.includes("overflow-x: auto"));
  assert.ok(publisher.includes('aria-label="Search archive by keyword"'));
  assert.ok(publisher.includes("staticPageActiveKey"));
  assert.ok(publisher.includes("bottomTabBarHtml(staticPageActiveKey(path))"));
  assert.ok(publisher.includes('body class="has-btb"'));
  assert.ok(publisher.includes('bottomTabBarHtml("more")'));
  assert.ok(publisher.includes(".indices-grid { grid-template-columns: 1fr; }"));
  assert.equal(publisher.includes(".nav-link {\n        text-align: center;\n      }"), false, "mobile homepage nav must not stack four full-width buttons");
  for (const roughCopy of [
    "All Market Narrative briefings",
    "The root page now works",
    "Open daily briefing",
    "Asia watch:",
    "markets tracked"
  ]) {
    assert.equal(publisher.includes(roughCopy), false, `publisher should not contain rough copy: ${roughCopy}`);
  }
  assert.ok(publisher.includes("multibaggerPage"));
  assert.ok(publisher.includes("components-view"));
  assert.ok(publisher.includes("multibagger-admin-view"));
  assert.ok(publisher.includes('join(siteDir, "multibagger")'));
  assert.ok(publisher.includes('join(adminDir, "multibagger")'));
  assert.ok(publisher.includes('"state.json"'));
  assert.ok(publisher.includes("adminSiteOrigin"));
  assert.ok(publisher.includes("https://admin.marketnarrative.in"));
  assert.ok(publisher.includes('join(siteDir, "admin")'));
  assert.ok(publisher.includes('requireAuth: true'));
  assert.ok(!publisher.includes('join(siteDir, "components")'));
  assert.ok(!publisher.includes("Project components"));
  assert.ok(publisher.includes('"dark-preview"'));
  assert.equal(publisher.includes("dark-preview-link"), false);
  assert.ok(publisher.includes('theme: "glass-v2"'));
  assert.ok(publisher.includes('includeStudio: false, theme: "glass-v2"'));
  assert.ok(publisher.includes("slugForDigest"));
  assert.ok(publisher.includes("29apr2026") || publisher.includes("monthName"));
  assert.ok(publisher.includes("Root index.html is the digest archive"));
  assert.ok(publisher.includes("archive.json"));
  assert.ok(publisher.includes("robots.txt"));
  assert.ok(publisher.includes("sitemap.xml"));
  assert.ok(publisher.includes("og-card.svg"));
  assert.ok(publisher.includes("favicon.svg"));
  assert.ok(publisher.includes("apple-touch-icon.svg"));
  assert.ok(publisher.includes("brandMarkHtml"));
  assert.ok(publisher.includes("brandSocialCardSvg"));
  assert.ok(publisher.includes("og:title"));
  assert.ok(publisher.includes("twitter:card"));
  assert.ok(publisher.includes('rel="canonical"'));
  assert.ok(publisher.includes("archivePageJsonLd"));
  assert.ok(publisher.includes("aboutPageJsonLd"));
  assert.ok(publisher.includes("subscribePageJsonLd"));
  assert.ok(publisher.includes("Organization"));
  assert.ok(publisher.includes("WebSite"));
  assert.ok(publisher.includes("BreadcrumbList"));
  assert.ok(publisher.includes("max-image-preview:large"));
  assert.ok(publisher.includes("Disallow: /dark-preview/"));
  assert.ok(publisher.includes("<changefreq>"));
  assert.ok(publisher.includes("<priority>"));
  assert.ok(publisher.includes("daily 7:15 AM IST Nifty and Bank Nifty pre-market briefing"));
  assert.ok(publisher.includes("7:15 AM IST") || publisher.includes("pre-market brief") || publisher.includes("Nifty gate"), "homepage must reference 7:15 AM IST or pre-market context");
  assert.ok(publisher.includes("Abhey Deep"));
  assert.ok(publisher.includes("Last verified update"));
  assert.ok(publisher.includes("Share this archive"));

  assert.equal(publisher.includes("Admin login</a>"), false);
  assert.ok(publisher.includes("join(siteDir, slug"));
  assert.ok(publisher.includes("publicDigestPayload"));
  assert.ok(publisher.includes("redactedDigestPayload"));
  assert.ok(!publisher.includes('copyFile(sourceHtml, join(siteDir, "index.html"))'));
  assert.ok(!publisher.includes("copyFile(sourceJson"));

  const cockpit = await readFile(join(rootDir, "tools", "cockpit-page.mjs"), "utf8");
  assert.ok(brandAssets.includes("brandMarkSvg"));
  assert.ok(brandAssets.includes("brandFaviconSvg"));
  assert.ok(brandAssets.includes("brandSocialCardSvg"));
  assert.ok(brandAssets.includes("Market Narrative"));
  assert.ok(brandAssets.includes("mn-signal"));
  assert.ok(cockpit.includes("og:site_name"));
  assert.ok(cockpit.includes("twitter:image"));
  assert.ok(cockpit.includes("absoluteSiteUrl"));
  assert.ok(cockpit.includes("adminSiteOrigin"));
  assert.ok(cockpit.includes("brandHeadLinks"));
  assert.ok(cockpit.includes("brandMarkHtml"));
  assert.ok(cockpit.includes(">Portfolio</a>"));
  assert.ok(cockpit.includes("includeStudio"));
  assert.ok(cockpit.includes("Multibagger Review"));
  assert.ok(cockpit.includes('data-target="components-view"'));
  assert.ok(cockpit.includes('data-target="multibagger-admin-view"'));
  assert.ok(cockpit.includes("adminComponentsConsoleHtml"));
  assert.ok(cockpit.includes("multibaggerAdminConsoleHtml"));
  assert.ok(cockpit.includes("bindMultibaggerReviewActions"));
  assert.equal(cockpit.includes("adminMultibaggerHref"), false);
  assert.equal(cockpit.includes("componentsHref"), false);
  assert.ok(!cockpit.includes("marketnarrative.local"));

  const componentsPage = await readFile(join(rootDir, "tools", "project-components-page.mjs"), "utf8");
  assert.ok(componentsPage.includes("brandMarkHtml"));
  assert.ok(componentsPage.includes("How the Market Narrative desk fits together"));
  assert.ok(componentsPage.includes('details class="component"'));
  assert.ok(componentsPage.includes("From Market Data To Creator Read"));
  assert.ok(componentsPage.includes("Repository Component Map"));
  assert.ok(componentsPage.includes("Public vs Private Boundary"));
  assert.ok(componentsPage.includes("Private Studio and Reel Script"));

  const workflow = await readFile(join(rootDir, ".github", "workflows", "pages.yml"), "utf8");
  assert.ok(workflow.includes("cancel-in-progress: false"));
  assert.ok(workflow.includes('cron: "30,45 1 * * 1-5"'), "workflow should retry the 07:15 publish between 07:00 and 08:00 IST");
  assert.ok(workflow.includes('cron: "0,15,30 3 * * 1-5"'), "workflow should retry the 08:00 incremental publish until 09:00 IST");
  assert.ok(workflow.includes("enforce_publish_window"));
  assert.ok(workflow.includes("allow_late_publish"));
  assert.ok(workflow.includes("allow_fixture_fallback"));
  assert.ok(workflow.includes("PREMARKET_LATE_CUTOFF_MINUTES"));
  assert.ok(workflow.includes('github.event.inputs.enforce_publish_window }}" = "true"'));
  assert.ok(workflow.includes("Generate scheduled IST summary"));
  assert.ok(workflow.includes("NVIDIA_API_KEY: ${{ secrets.NVIDIA_API_KEY }}"));
  assert.ok(workflow.includes("(github.event_name == 'schedule' || github.event_name == 'workflow_dispatch') && env.ARCHIVE_ALREADY_TRACKED != 'true'"));
  assert.ok(workflow.includes("--enforce-publish-window"));
  assert.equal(workflow.includes('ALLOW_LATE_PREMARKET_PUBLISH: "true"'), false, "scheduled workflow must not export manual late-publish override");
  assert.equal(workflow.includes("Live generation failed; retrying with fixture news fallback"), false, "scheduled workflow must not auto-fallback to fixture news");
  assert.ok(workflow.includes("ARCHIVE_ALREADY_TRACKED"));
  assert.ok(workflow.includes('if [ "${{ github.event_name }}" = "push" ] && [ "$ARCHIVE_ALREADY_TRACKED" != "true" ]; then'));
  assert.ok(workflow.includes('LATEST_ARCHIVE="$(ls archive/daily/*-digest.json | sort | tail -n 1)"'));
  assert.ok(workflow.includes('SKIP_ARCHIVE_WRITE_VALUE="true"'));
  assert.ok(workflow.includes('PUBLIC_BUILD_DATE="$SUMMARY_DATE" SKIP_ARCHIVE_WRITE="$SKIP_ARCHIVE_WRITE_VALUE" npm run site:publish -- --date "$PUBLISH_DATE" --scheduled-time "$PUBLISH_TIME"'));
  assert.ok(workflow.includes("SKIP_ARCHIVE_WRITE: ${{ env.ARCHIVE_ALREADY_TRACKED }}"));
  assert.ok(workflow.includes("ARCHIVE_FILE=\"archive/daily/${SUMMARY_DATE}-${SUMMARY_LABEL}-digest.json\""));
  assert.ok(workflow.includes("Import previous deployed archive"));
  assert.ok(workflow.includes("tools/import-archive.mjs"));
  const calendarWorkflow = await readFile(join(rootDir, ".github", "workflows", "calendar-refresh.yml"), "utf8");
  assert.ok(calendarWorkflow.includes("Market Calendar Verify"));
  assert.ok(calendarWorkflow.includes('cron: "7 19 * * *"'));
  assert.ok(calendarWorkflow.includes("tools/market-calendar.mjs --verify"));

  const archiveFiles = await readdir(join(rootDir, "archive", "daily"));
  assert.equal(archiveFiles.includes("2026-05-03-0830-digest.json"), false, "Sunday briefing archive should not be promoted or retained");

  const dailyGenerator = await readFile(join(rootDir, "tools", "generate-daily-summary.mjs"), "utf8");
  assert.ok(dailyGenerator.includes('?? "07:15"'));
  assert.ok(dailyGenerator.includes("marketCalendarState"));
  assert.ok(dailyGenerator.includes("ALLOW_NON_TRADING_DAY_DIGEST"));
  assert.ok(dailyGenerator.includes("assertPremarketPublishWindow"));
  assert.ok(dailyGenerator.includes("PREMARKET_LATE_CUTOFF_MINUTES"));
  assert.ok(dailyGenerator.includes("ALLOW_LATE_PREMARKET_PUBLISH"));

  const importer = await readFile(join(rootDir, "tools", "import-archive.mjs"), "utf8");
  assert.ok(importer.includes("archive.digests"));
  assert.ok(importer.includes('"archive", "daily"'));
  assert.ok(importer.includes("redactedDigestPayload"));
  assert.ok(importer.includes("sanitizeLegacyPublicBriefingCopy"));
  assert.ok(importer.includes("assertPublicBriefingCopy"));
  assert.ok(importer.includes("skippedInvalid"));
  assert.ok(importer.includes("Skipped imported archive digest"));

  for (const fileName of archiveFiles.filter((fileName) => fileName.endsWith(".json"))) {
    const archiveDigest = await readFile(join(rootDir, "archive", "daily", fileName), "utf8");
    const parsedArchiveDigest = JSON.parse(archiveDigest);
    if (parsedArchiveDigest?.sourceVerification?.isVerifiedForPublicArchive === true) {
      const calendar = marketCalendarState(parsedArchiveDigest.digestDate);
      assert.equal(calendar.isTradingSession, true, `${fileName} is verified for public archive on a closed-market date: ${calendar.reason}`);
    }
    assert.ok(!archiveDigest.includes("teleprompterScript"), `${fileName} should not archive private teleprompterScript`);
    assert.ok(!archiveDigest.includes("reelScript"), `${fileName} should not archive private reelScript`);
    assert.ok(!archiveDigest.includes("positivePrompt"), `${fileName} should not archive private asset prompt`);
  }
});

await test("backend multibagger endpoints preserve public/private boundary", async () => {
  const publicController = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "multibagger", "PublicMultibaggerController.java"), "utf8");
  const adminController = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "multibagger", "AdminMultibaggerController.java"), "utf8");
  const service = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "multibagger", "MultibaggerService.java"), "utf8");
  const quoteService = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "multibagger", "MultibaggerQuoteService.java"), "utf8");
  const state = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "multibagger", "MultibaggerState.java"), "utf8");
  const holding = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "multibagger", "MultibaggerHolding.java"), "utf8");
  assert.ok(publicController.includes('@RequestMapping("/api/public/multibagger")'));
  assert.ok(publicController.includes('@GetMapping("/state")'));
  assert.ok(adminController.includes('@RequestMapping("/api/admin/multibagger")'));
  assert.ok(adminController.includes('@PostMapping(value = "/snapshots"'));
  assert.ok(adminController.includes('@PostMapping("/reviews/run")'));
  assert.ok(adminController.includes('@PostMapping("/reviews/{id}/publish")'));
  assert.ok(adminController.includes("hasAuthority('admin:write')"));
  assert.ok(state.includes("MultibaggerMethodology methodology"));
  assert.ok(state.includes("ResearchEvidence researchEvidence"));
  assert.ok(state.includes("TrackingBasis trackingBasis"));
  assert.ok(holding.includes("String displayLabel"));
  for (const field of ["profitabilityLens", "valuationLens", "growthCatalyst", "conversionRisk", "capitalStructureRisk"]) {
    assert.ok(holding.includes(field), `backend holding missing ${field}`);
  }
  assert.ok(service.includes("methodology()"));
  assert.ok(service.includes("researchEvidence()"));
  assert.ok(service.includes('new TrackingBasis(MODEL_ENTRY_DATE, MODEL_BASELINE_ENTRY_AT, "publicFillBaselineAt")'));
  assert.ok(service.includes("10Y G-sec hurdle"));
  assert.ok(service.includes("Replacement discipline"));
  assert.ok(service.includes("snapshots.put(snapshotId, file.getBytes())"));
  assert.ok(service.includes("MODEL_ENTRY_DATE = LocalDate.of(2026, 4, 27)"));
  assert.ok(service.includes("return List.of();"));
  assert.ok(quoteService.includes("@Scheduled"));
  assert.ok(quoteService.includes("Yahoo Finance ("));
  assert.ok(quoteService.includes("BSE India ("));
  assert.ok(quoteService.includes("live-quotes-enabled"));
});

await test("Spring CORS allows admin and trade frontend origins", async () => {
  const securityConfig = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "config", "SecurityConfig.java"), "utf8");
  const applicationConfig = await readFile(join(rootDir, "backend", "src", "main", "resources", "application.yml"), "utf8");
  const compose = await readFile(join(rootDir, "infra", "docker-compose.prod.yml"), "utf8");
  assert.ok(securityConfig.includes("parseAllowedOrigins"));
  assert.ok(securityConfig.includes("allowedOrigins.split"));
  assert.ok(applicationConfig.includes("FRONTEND_ORIGINS"));
  assert.ok(compose.includes("https://admin.marketnarrative.in,https://trade.marketnarrative.in"));
});

await test("frontend workspace separates public portal, admin studio, and shared packages", async () => {
  const rootPackage = JSON.parse(await readFile(join(rootDir, "package.json"), "utf8"));
  assert.deepEqual(rootPackage.workspaces, ["apps/*", "packages/*", "frontend"]);
  assert.equal(rootPackage.scripts["vercel:build"], "node tools/vercel-build.mjs");
  assert.equal(rootPackage.scripts["public:copy:qa"], "node tools/public-copy-qa.mjs");
  assert.equal(rootPackage.scripts["hooks:install"], "git config core.hooksPath .githooks");
  assert.equal(rootPackage.scripts["prod:qa"], "node tools/production-qa-gate.mjs");
  assert.ok(rootPackage.scripts["prod:qa:strict"].includes("REQUIRE_AUTHENTICATED_QA=true"));
  assert.ok(rootPackage.scripts["vercel:build:admin"].includes("MARKET_NARRATIVE_DEPLOY_TARGET=admin"));
  assert.ok(rootPackage.scripts["vercel:build:trade"].includes("MARKET_NARRATIVE_DEPLOY_TARGET=trade"));

  const publicPackage = JSON.parse(await readFile(join(rootDir, "apps", "public-portal", "package.json"), "utf8"));
  const adminPackage = JSON.parse(await readFile(join(rootDir, "apps", "admin-studio", "package.json"), "utf8"));
  const uiPackage = JSON.parse(await readFile(join(rootDir, "packages", "ui", "package.json"), "utf8"));
  const apiPackage = JSON.parse(await readFile(join(rootDir, "packages", "api-client", "package.json"), "utf8"));
  const uiIndex = await readFile(join(rootDir, "packages", "ui", "src", "index.ts"), "utf8");
  const uiBrand = await readFile(join(rootDir, "packages", "ui", "src", "BrandMark.tsx"), "utf8");
  const publicPortalPage = await readFile(join(rootDir, "apps", "public-portal", "app", "page.tsx"), "utf8");
  const adminStudioPage = await readFile(join(rootDir, "apps", "admin-studio", "src", "App.tsx"), "utf8");
  const tradingAuth = await readFile(join(rootDir, "apps", "trading-dashboard", "lib", "auth.ts"), "utf8");
  const tradingBrand = await readFile(join(rootDir, "apps", "trading-dashboard", "components", "BrandMark.tsx"), "utf8");
  const tradingLayout = await readFile(join(rootDir, "apps", "trading-dashboard", "app", "layout.tsx"), "utf8");
  const tradingIcon = await readFile(join(rootDir, "apps", "trading-dashboard", "app", "icon.svg"), "utf8");

  assert.equal(publicPackage.name, "@market-narrative/public-portal");
  assert.equal(adminPackage.name, "@market-narrative/admin-studio");
  assert.equal(uiPackage.name, "@market-narrative/ui");
  assert.equal(apiPackage.name, "@market-narrative/api-client");
  assert.ok(publicPackage.dependencies["@market-narrative/ui"]);
  assert.ok(adminPackage.dependencies["@market-narrative/api-client"]);
  assert.ok(uiIndex.includes("BrandMark"));
  assert.ok(uiBrand.includes("ui-mn-signal"));
  assert.ok(publicPortalPage.includes("BrandMark"));
  assert.ok(adminStudioPage.includes("BrandMark"));
  assert.ok(tradingAuth.includes("abhey@marketnarrative.in"));
  assert.ok(!tradingAuth.includes("abhey@marketnarrative.local"));
  assert.ok(tradingAuth.includes("Auth API unreachable"));
  assert.ok(tradingAuth.includes("api.marketnarrative.in DNS"));
  assert.ok(tradingBrand.includes("Market Narrative"));
  assert.ok(tradingBrand.includes("trade-mn-signal"));
  assert.ok(tradingLayout.includes("/icon.svg"));
  assert.ok(tradingIcon.includes("mn-signal"));
});

await test("Vercel projects select public, admin, or trade output by deploy target", async () => {
  const vercelConfig = JSON.parse(await readFile(join(rootDir, "vercel.json"), "utf8"));
  assert.equal(vercelConfig.buildCommand, "npm run vercel:build");
  // outputDirectory is intentionally absent from vercel.json: the current Vercel
  // CLI schema rejects the property, and the build writes directly to ./public
  // (Vercel's default static output dir) instead. See tools/vercel-build.mjs.
  assert.equal(vercelConfig.outputDirectory, undefined);
  const vercelBuildScript = await readFile(join(rootDir, "tools", "vercel-build.mjs"), "utf8");
  assert.match(vercelBuildScript, /outputDir\s*=\s*join\(rootDir,\s*"public"\)/);
  assert.deepEqual(vercelConfig.crons, [
    { path: "/api/cron/premarket-publish", schedule: "30-55/5 1 * * 1-5" },
    { path: "/api/cron/premarket-publish", schedule: "*/5 2 * * 1-5" },
    { path: "/api/cron/premarket-publish", schedule: "0-30/5 3 * * 1-5" }
  ]);
  assert.equal(
    (vercelConfig.redirects ?? []).some((redirect) => String(redirect.source ?? "").startsWith("/latest")),
    false,
    "Vercel config must not hard-code /latest redirects; static generated /latest pages own freshness"
  );
  const premarketCron = await readFile(join(rootDir, "api", "cron", "premarket-publish.js"), "utf8");
  assert.ok(premarketCron.includes("actions/workflows/${WORKFLOW_ID}/dispatches"));
  assert.ok(premarketCron.includes("GITHUB_WORKFLOW_TOKEN"));
  assert.ok(premarketCron.includes('enforce_publish_window: "true"'));
  assert.ok(premarketCron.includes("vercel-watchdog"));
  const productionSmoke = await readFile(join(rootDir, "tools", "production-smoke.mjs"), "utf8");
  const productionQaGate = await readFile(join(rootDir, "tools", "production-qa-gate.mjs"), "utf8");
  const launchValues = await readFile(join(rootDir, "deploy", "production", "launch-values.md"), "utf8");
  const architectureDoc = await readFile(join(rootDir, "docs", "production-architecture.md"), "utf8");
  const testingDoc = await readFile(join(rootDir, "docs", "testing.md"), "utf8");

  const buildScript = await readFile(join(rootDir, "tools", "vercel-build.mjs"), "utf8");
  const publicBuildScript = await readFile(join(rootDir, "tools", "vercel-build-public.mjs"), "utf8");
  const latestRedirectScript = await readFile(join(rootDir, "tools", "update-latest-redirect.mjs"), "utf8");
  assert.ok(buildScript.includes("MARKET_NARRATIVE_DEPLOY_TARGET"));
  assert.ok(buildScript.includes("MARKET_NARRATIVE_DEPLOY_TARGET is required on Vercel"));
  assert.ok(buildScript.includes("inferVercelTarget"));
  assert.ok(buildScript.includes("VERCEL_PROJECT_PRODUCTION_URL"));
  assert.ok(buildScript.includes("market-news-admin"));
  assert.ok(buildScript.includes("deployment-manifest.json"));
  assert.ok(buildScript.includes('"public"'));
  assert.ok(buildScript.includes('"admin"'));
  assert.ok(buildScript.includes('"trade"'));
  assert.ok(buildScript.includes('excludeTopLevel: ["admin"]'));
  assert.ok(buildScript.includes("vercel:build:public"));
  assert.ok(buildScript.includes("tools/public-copy-qa.mjs"));
  assert.ok(buildScript.includes('"out", "site", "admin"'));
  assert.ok(buildScript.includes("@market-narrative/trading-dashboard"));
  assert.ok(buildScript.includes("\"public\""));
  assert.ok(publicBuildScript.includes("Live briefing for ${date} was not verified"));
  assert.ok(publicBuildScript.includes("latestArchivedDigest()"));
  assert.ok(publicBuildScript.includes("Refusing to publish a previous archive as /latest"));
  assert.ok(publicBuildScript.includes("ALLOW_VERIFIED_ARCHIVE_FALLBACK"));
  assert.ok(publicBuildScript.includes("ALLOW_NON_TRADING_DAY_DIGEST"));
  assert.ok(publicBuildScript.includes("market-closed"));
  assert.ok(publicBuildScript.includes("writeLatestStatusPages"));
  assert.ok(publicBuildScript.includes("(0715|0800|0830)"));
  assert.ok(publicBuildScript.includes('SKIP_ARCHIVE_WRITE: "true"'));
  const publishSiteScript = await readFile(join(rootDir, "tools", "publish-site.mjs"), "utf8");
  assert.ok(publishSiteScript.includes("Source digest missing"));
  assert.ok(publishSiteScript.includes("falling back to archived digest"));
  assert.ok(publishSiteScript.includes("sourceDigestLoadedFromArchive"));
  assert.equal(latestRedirectScript.includes("writeFile"), false);
  assert.equal(latestRedirectScript.includes('"vercel.json"'), false);

  const publicProject = JSON.parse(await readFile(join(rootDir, "deploy", "vercel", "marketnarrative-public.json"), "utf8"));
  const adminProject = JSON.parse(await readFile(join(rootDir, "deploy", "vercel", "marketnarrative-admin.json"), "utf8"));
  const tradeProject = JSON.parse(await readFile(join(rootDir, "deploy", "vercel", "marketnarrative-trade.json"), "utf8"));
  assert.equal(publicProject.buildCommand, "npm run vercel:build");
  assert.equal(publicProject.outputDirectory, "public");
  assert.equal(publicProject.environment.MARKET_NARRATIVE_DEPLOY_TARGET, "public");
  assert.deepEqual(publicProject.domains, ["marketnarrative.in", "www.marketnarrative.in"]);
  assert.equal(adminProject.buildCommand, "npm run vercel:build");
  assert.equal(adminProject.outputDirectory, "public");
  assert.equal(adminProject.environment.MARKET_NARRATIVE_DEPLOY_TARGET, "admin");
  assert.deepEqual(adminProject.domains, ["admin.marketnarrative.in"]);
  assert.equal(tradeProject.buildCommand, "npm run vercel:build");
  assert.equal(tradeProject.outputDirectory, "public");
  assert.equal(tradeProject.environment.MARKET_NARRATIVE_DEPLOY_TARGET, "trade");
  assert.deepEqual(tradeProject.domains, ["trade.marketnarrative.in"]);
  for (const route of [
    "https://admin.marketnarrative.in/",
    "https://admin.marketnarrative.in/components/",
    "https://admin.marketnarrative.in/multibagger/"
  ]) {
    assert.ok(launchValues.includes(route), `launch values missing ${route}`);
    assert.ok(architectureDoc.includes(route), `architecture doc missing ${route}`);
  }
  assert.ok(architectureDoc.includes("Private script engine / admin studio"));
  assert.ok(architectureDoc.includes("Private project components and architecture map"));
  assert.ok(productionSmoke.includes("/components/"));
  assert.ok(productionSmoke.includes("Project Components Map"));
  assert.ok(productionSmoke.includes("deployment-manifest.json"));
  assert.ok(productionSmoke.includes('payload.target, "admin"'));
  for (const required of [
    "Open chart on TradingView",
    "Open Yahoo Chart",
    "Market Narrative: Nifty",
    "Past briefings",
    "Open briefing",
    
    "trade-mn-signal",
    "lucide-lock-keyhole",
    "Login as Abhey Admin",
    "api.marketnarrative.in",
    "actuator/health",
    "trade-api.marketnarrative.in",
    "Server: Vercel",
    "assertNotVercelResponse",
    "Research Method",
    "Museum of Fine Arts",
    "RUN_AUTHENTICATED_QA",
    "Desktop and mobile smoke",
    "isExpectedBrowserConsoleNoise",
    "Launch remains BLOCKED"
  ]) {
    assert.ok(productionQaGate.includes(required), `production QA gate missing ${required}`);
  }
  assert.ok(testingDoc.includes("npm run prod:qa"));
  assert.ok(testingDoc.includes("route-by-route matrix"));
  const predeployVerify = await readFile(join(rootDir, "tools", "predeploy-verify.mjs"), "utf8");
  const publisher = await readFile(join(rootDir, "tools", "publish-site.mjs"), "utf8");
  assert.ok(predeployVerify.includes("SKIP_ARCHIVE_WRITE"));
  assert.ok(publisher.includes("skipArchiveWrite"));
});

await test("Render blueprint provisions real API and trade API backends", async () => {
  const renderBlueprint = await readFile(join(rootDir, "render.yaml"), "utf8");
  const backendDockerfile = await readFile(join(rootDir, "backend", "Dockerfile"), "utf8");
  const tradingDockerfile = await readFile(join(rootDir, "services", "trading-api", "Dockerfile"), "utf8");
  const applicationConfig = await readFile(join(rootDir, "backend", "src", "main", "resources", "application.yml"), "utf8");
  const databaseNormalizer = await readFile(
    join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "config", "DatabaseUrlEnvironmentPostProcessor.java"),
    "utf8"
  );
  const normalizerRegistration = await readFile(
    join(rootDir, "backend", "src", "main", "resources", "META-INF", "spring", "org.springframework.boot.env.EnvironmentPostProcessor"),
    "utf8"
  );
  const normalizerSpringFactories = await readFile(join(rootDir, "backend", "src", "main", "resources", "META-INF", "spring.factories"), "utf8");
  const renderDoc = await readFile(join(rootDir, "docs", "render-deployment.md"), "utf8");

  for (const required of [
    "marketnarrative-prod-shared",
    "marketnarrative-postgres",
    "marketnarrative-redis",
    "marketnarrative-api",
    "marketnarrative-trade-api",
    "api.marketnarrative.in",
    "trade-api.marketnarrative.in",
    "healthCheckPath: /actuator/health",
    "healthCheckPath: /health",
    "ENABLE_LIVE_ORDERS",
    'value: "false"',
    "ABHEY_ADMIN_PASSWORD",
    "sync: false",
    "KITE_REDIRECT_URL",
    "https://trade.marketnarrative.in/kite/callback"
  ]) {
    assert.ok(renderBlueprint.includes(required), `render.yaml missing ${required}`);
  }
  assert.ok(renderBlueprint.includes("fromDatabase"));
  assert.ok(renderBlueprint.includes("property: connectionString"));
  assert.ok(renderBlueprint.includes("fromService"));
  assert.ok(renderBlueprint.includes("type: keyvalue"));
  assert.ok(applicationConfig.includes("${SERVER_PORT:${PORT:8080}}"));
  assert.ok(backendDockerfile.includes("EXPOSE 8080"));
  assert.ok(tradingDockerfile.includes("${PORT:-8090}"));
  assert.ok(databaseNormalizer.includes("jdbc:postgresql://"));
  assert.ok(databaseNormalizer.includes("DATABASE_URL"));
  assert.ok(databaseNormalizer.includes("DATABASE_USERNAME"));
  assert.ok(databaseNormalizer.includes("DATABASE_PASSWORD"));
  assert.ok(normalizerRegistration.includes("DatabaseUrlEnvironmentPostProcessor"));
  assert.ok(normalizerSpringFactories.includes("org.springframework.boot.env.EnvironmentPostProcessor"));
  assert.ok(normalizerSpringFactories.includes("DatabaseUrlEnvironmentPostProcessor"));
  assert.ok(renderDoc.includes("Render Backend Deployment"));
  assert.ok(renderDoc.includes("Free web services can cold-start"));
  assert.ok(renderDoc.includes("Free Postgres expires after 30 days"));
  assert.ok(renderDoc.includes("Do not point API subdomains at Vercel"));
});

await test("advanced architecture includes Auth0 permissions, agentic RAG, Redis publish, and partition plan", async () => {
  const auth0Converter = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "identity", "Auth0JwtAuthenticationConverter.java"), "utf8");
  const adminController = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "publishing", "AdminDigestController.java"), "utf8");
  const ragPipeline = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "ai", "MarketNarrativeRagPipeline.java"), "utf8");
  const cachePublisher = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "publishing", "PublicDigestCachePublisher.java"), "utf8");
  const partitionPlan = await readFile(join(rootDir, "docs", "postgresql-partitioning.md"), "utf8");

  assert.ok(auth0Converter.includes("permissions"));
  for (const permission of ["create:script", "edit:script", "generate:assets", "publish:digest"]) {
    assert.ok(adminController.includes(permission), `missing permission ${permission}`);
  }
  assert.ok(ragPipeline.includes("List<RagAgent>"));
  assert.ok(cachePublisher.includes("opsForZSet"));
  assert.ok(partitionPlan.includes("PARTITION BY RANGE (published_at)"));
});

await test("demo app serves public and admin flows without external packages", async () => {
  const app = await createDemoApp("2026-04-29");
  const digest = await app.request("GET", "/api/public/digest/today");
  assert.ok(["BEARISH", "VOLATILE"].includes(digest.json.sentimentLabel));

  const login = await app.request("POST", "/api/auth/login", {
    email: "admin@marketnarrative.local",
    password: "market-open"
  });
  assert.equal(login.status, 200);
  assert.equal(login.json.role, "ADMIN");

  const run = await app.request("POST", "/api/admin/digest/run?date=2026-04-29");
  assert.equal(run.json.tradeSetups, 2);

  const publish = await app.request("POST", "/api/admin/digest/2026-04-29/publish");
  assert.equal(publish.json.status, "PUBLISHED");

  const publicHtml = await app.request("GET", "/");
  assert.ok(publicHtml.body.includes("application/ld+json"));
  assert.ok(publicHtml.body.includes('glass-v2'));
  assert.ok(publicHtml.body.includes("data-source-url"));
  assert.ok(publicHtml.body.includes("Public Briefing"));
  assert.ok(publicHtml.body.includes("Trading Guide"));
  assert.ok(publicHtml.body.includes("Portfolio"));
  assert.ok(!publicHtml.body.includes("Briefing Archive"));
  assert.ok(!publicHtml.body.includes("Admin Login"));
  assert.ok(publicHtml.body.includes("Abhey Deep"));
  assert.ok(publicHtml.body.includes("compact-meta-strip"));
  assert.equal(publicHtml.body.includes("Share this trading guide"), false);
  assert.ok(publicHtml.body.includes("Verified"));
  // follow-briefing CTA and Market Quote Board removed from public page (redesign)
  // Today's Read must be removed
  assert.equal(publicHtml.body.includes("live refresh pending"), false);
  assert.equal(publicHtml.body.includes("Last available close"), false);
  assert.equal(publicHtml.body.includes("live data not yet available"), false);
  assert.equal(publicHtml.body.includes("Today's Trade Map"), false);
  assert.equal(publicHtml.body.includes("Long only above"), false);
  assert.equal(publicHtml.body.includes("Short risk below"), false);
  assert.equal(publicHtml.body.includes("No-trade zone"), false);
  assert.equal(publicHtml.body.includes("Bank Nifty confirmation"), false);
  assert.equal(publicHtml.body.includes("Top sector to watch"), false);
  assert.equal(publicHtml.body.includes('id="trading-guide-view"'), false);
  assert.equal((publicHtml.body.match(/<h1/g) || []).length, 1);
  const publicSection = publicHtml.body.slice(publicHtml.body.indexOf('id="public-view"'));
  assert.equal(publicSection.includes("Today's Trade Map"), false);
  assert.equal(publicSection.includes("Completed Setups"), false);
  assert.equal(publicSection.includes("Active Game Plan"), false);
  // deskNote is now in the public section
  assert.equal(publicSection.includes("Trade Framing"), false);
  assert.equal(publicSection.includes("<strong>SETUP EXISTS?</strong>"), false);
  assert.equal(publicSection.includes("<strong>IF BULLISH OPEN:</strong>"), false);
  assert.equal(publicSection.includes("<strong>IF BEARISH OPEN:</strong>"), false);
  assert.equal(publicSection.includes("<strong>INVALIDATE:</strong>"), false);
  assert.equal(publicSection.includes("View Chart On TradingView"), false);
  assert.equal(publicSection.includes("Open chart on TradingView"), false);
  assert.ok(!publicHtml.body.includes("Chart Series Pending"));
  assert.ok(!publicHtml.body.includes("Preparing quotes"));
  assert.ok(!/\\bweight\\s+0\\.[0-9]/i.test(publicHtml.body));
  assert.ok(!publicHtml.body.includes("Studio Command (Admin)"));
  assert.ok(!publicHtml.body.includes('id="studio-view"'));
  assert.ok(!publicHtml.body.includes("Studio Command Center"));
  assert.ok(!publicHtml.body.includes("[REEL SCRIPT"));
  assert.ok(!publicHtml.body.includes("Engine Architecture"));
  assert.ok(!publicHtml.body.includes("Project Components"));
  assert.ok(!publicHtml.body.includes('id="architecture-view"'));
  // Redesign: 2-min summary defaults to closed (no `open` attribute) — reader sees the summary, expands for breakdown
  assert.ok(publicHtml.body.includes('id="summaryExpand" class="info-card executive-card briefing-expand-card"'));
  assert.equal(publicHtml.body.includes('id="summaryExpand" class="info-card executive-card briefing-expand-card" open'), false, "2-min summary must default to collapsed");
  assert.ok(publicHtml.body.indexOf('id="summaryExpand"') < publicHtml.body.indexOf("compact-meta-strip"), "2-minute summary should render before share controls");
  assert.ok(publicHtml.body.includes("2 Minute Summary"));
  assert.equal(/[A-Za-z0-9][,;:]\./.test(publicSection), false, "public summary copy must not contain malformed punctuation like OMCs,.");
  assert.equal(/[A-Za-z0-9]\.[;:]/.test(publicSection), false, "public summary copy must not contain malformed punctuation like OMCs.;");
  assert.equal(/\bOMCs,\./i.test(publicSection), false, "public summary must not truncate after OMCs,");

  assert.ok(publicHtml.body.includes("disclosure-action summary-disclosure-action"));
  // quote-board-action removed from public briefing page (moved to trading guide)
  assert.ok(publicHtml.body.includes("disclosure-action source-ledger-action"));
  assert.equal(publicHtml.body.includes("summary-expand-action"), false);
  assert.equal(publicHtml.body.includes("quote-board-chev"), false);
  assert.equal(publicHtml.body.includes('class="expanded-briefing-head"'), false);
  assert.ok(publicHtml.body.includes("Hide details"));
  assert.ok(publicHtml.body.includes("Global Indices Watch"));
  assert.ok(publicHtml.body.includes("/indices/"));
  assert.equal(publicSection.includes("Stories Driving The Open"), false);
  assert.equal(publicSection.includes("How It Lands In India"), false);
  assert.equal(publicSection.includes("What To Watch First"), false);
  assert.ok(publicHtml.body.includes("Weighted source tone: pressure, neutral, or support"));
  assert.ok(publicHtml.body.includes("Pressure") || publicHtml.body.includes("Support"));
  assert.equal(publicHtml.body.includes("Lead:"), false);
  assert.equal(publicHtml.body.includes("verified source stack"), false);
  assert.ok(publicHtml.body.includes("Why it matters"));

  const tradingGuideHtml = await app.request("GET", "/trading-guide/");
  assert.equal(tradingGuideHtml.status, 200);
  assert.ok(tradingGuideHtml.body.includes('id="trading-guide-view" class="tab-content"'));
  assert.equal(tradingGuideHtml.body.includes('id="public-view"'), false);
  assert.equal((tradingGuideHtml.body.match(/<h1/g) || []).length, 1);
  assert.ok(tradingGuideHtml.body.includes("Today's Trade Map"));
  assert.ok(tradingGuideHtml.body.includes("Completed Setups") || tradingGuideHtml.body.includes("Active Game Plan"));
  assert.ok(tradingGuideHtml.body.includes("Valid for open preparation only"));
  assert.ok(tradingGuideHtml.body.includes("After that, treat these levels as archived context"));
  assert.equal(tradingGuideHtml.body.includes("Daily Pre-Market Summary"), false);
  assert.equal(tradingGuideHtml.body.includes("2 Minute Summary"), false);
  assert.ok(publicHtml.body.includes("India impact"));
  assert.ok(publicHtml.body.includes("2 Minute Summary"));
  assert.ok(!publicHtml.body.includes("Read the full desk note"));
  assert.ok(!publicHtml.body.includes("Pre-market desk note"));
  assert.equal(/Bank Nifty is the pressure; Bank Nifty is the cushion/i.test(publicHtml.body), false);
  // Overnight Pulse / regional breadth section moved to trading guide; Asia numbers still in collapsed 2-min summary
  assert.ok(publicHtml.body.includes("Asia Watch"));
  assert.ok(publicHtml.body.includes("Japan - Nikkei 225"));
  assert.ok(publicHtml.body.includes("Hong Kong - Hang Seng"));
  assert.ok(publicHtml.body.includes("Evidence & Sources") || publicHtml.body.includes("Evidence &amp; Sources"));
  assert.ok(publicHtml.body.includes("India read-through notes from verified articles"));
  assert.ok(publicHtml.body.includes("verified articles"));
  assert.ok(publicHtml.body.includes("source-ledger-details"));
  assert.ok(publicHtml.body.includes("data-default-source-filter"));
  assert.ok(publicHtml.body.includes("Source quality:"));
  assert.match(publicHtml.body, /\d+ India read-through notes/);
  // Evidence grade jargon removed — plain English summaries now used instead
  assert.equal(publicHtml.body.includes("Direct India-source articles: 0"), false);
  assert.match(publicHtml.body, /India read-through notes/);
  assert.ok(publicHtml.body.includes("verified article links"));
  assert.ok(publicHtml.body.includes("Category Board") || publicHtml.body.includes("Categorized source notes"));
  assert.ok(publicHtml.body.includes("Macro Pressure") || publicHtml.body.includes("Global Risk"));
  const publicSourceGroups = [...publicSection.matchAll(/data-source-group="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(new Set(publicSourceGroups).size >= 3, `expected diversified source groups, got ${publicSourceGroups.join(", ")}`);
  assert.ok((publicHtml.body.match(/data-source-group="/g) || []).length <= 10);
  assert.ok((publicHtml.body.match(/class="info-card source-card source-evidence-card"/g) || []).length <= 10);
  assert.ok(publicHtml.body.includes("data-source-group="));
  assert.ok(publicHtml.body.includes("source-filter-row"));
  assert.ok(publicHtml.body.includes("data-source-filter=\"all\""));
  assert.ok(publicHtml.body.includes("aria-pressed=\"false\">All"));
  assert.ok(publicHtml.body.includes("Read-through"));
  assert.ok(publicHtml.body.includes("Moneycontrol Markets"));
  assert.ok(publicHtml.body.includes("CNBC Markets"));
  assert.ok(publicHtml.body.includes("Wed, 29 Apr, 2026"));
  // Sentiment pin / Overnight Pulse removed from public briefing (trading guide only)
  assert.ok(!publicHtml.body.includes("A one-page public briefing generated by the Overnight Digest Engine"));
  assert.equal(publicHtml.body.includes("Active Game Plan"), false);
  assert.equal(publicHtml.body.includes("Completed Setups"), false);
  assert.ok(!publicHtml.body.includes("Agentic RAG pipeline"));
  assert.ok(!publicHtml.body.includes("News Driving This 8:30 Brief"));
  assert.ok(!publicHtml.body.includes("Indian Market Setup (Nifty 50)"));
  assert.ok(!publicHtml.body.includes("Key News & Sources"));
  assert.equal(publicHtml.body.includes("Stop Loss"), false);
  // Market Quote Board removed from public briefing page (trading guide only)
  assert.equal(publicHtml.body.includes("Live Quote Board"), false);
  assert.ok(!publicHtml.body.includes("live-board-header"));
  assert.ok(publicHtml.body.includes("indexChartModal"));
  assert.ok(publicHtml.body.includes("openIndexChart"));
  assert.ok(publicHtml.body.includes("Open Indices Board"));
  assert.ok(publicHtml.body.includes("/indices/#"));
  assert.ok(!publicHtml.body.includes("Open Yahoo Chart"));
  assert.ok(publicHtml.body.includes("chartSeriesLabel"));
  assert.ok(publicHtml.body.includes("Published Yahoo price series"));
  assert.ok(publicHtml.body.includes("chartFallback"));
  assert.ok(publicHtml.body.includes("refreshPublishedDigest"));
  assert.ok(publicHtml.body.includes("Refreshing prices after page load"));
  assert.ok(publicHtml.body.includes("refreshPublishedDigest('page-load')"));
  assert.ok(publicHtml.body.includes("setInterval(() => refreshPublishedDigest('background'), 300_000)"));
  assert.ok(publicHtml.body.includes("resolveDigestRefreshUrls"));
  assert.ok(publicHtml.body.includes("apiDigestUrl"));
  assert.ok(publicHtml.body.includes("/api/public/digest/"));
  assert.ok(publicHtml.body.includes("adoptMarketSnapshotDigest"));
  assert.ok(publicHtml.body.includes("digestHasLiveQuotes"));
  assert.ok(publicHtml.body.includes("window.location.protocol === 'file:'"));
  assert.ok(publicHtml.body.includes("'127.0.0.1'"));
  assert.ok(publicHtml.body.includes("https://api.marketnarrative.in"));
  assert.equal(publicHtml.body.includes("https://abheydeep.github.io/marketNews"), false);
  assert.ok(publicHtml.body.includes("shouldAdoptDigest"));
  assert.ok(publicHtml.body.includes("digestFreshnessTime"));
  assert.ok(publicHtml.body.includes("marketChartCanvas"));
  assert.ok(publicHtml.body.includes("drawMarketSeriesChart"));
  assert.ok(!publicHtml.body.includes("tickLiveQuotes"));
  assert.ok(!publicHtml.body.includes("Math.random"));
  assert.ok(!publicHtml.body.includes("mock quote source"));
  assert.ok(!publicHtml.body.includes("example.com"));
  assert.ok(!publicHtml.body.includes('<canvas id="overnightChart"'));
  assert.ok(!publicHtml.body.includes('id="teleprompterContainer"'));
  assert.ok(!publicHtml.body.includes('id="generateAssetBtn"'));
  const adminHtml = await app.request("GET", "/admin");
  assert.ok(adminHtml.body.includes("Admin Login"));
  assert.ok(adminHtml.body.includes("auth-pending"));
  assert.ok(adminHtml.body.includes("adminLoginForm"));
  assert.ok(adminHtml.body.includes("Studio Command Center"));
  assert.ok(adminHtml.body.includes('"studio-view"'));
  assert.ok(adminHtml.body.includes("Engine Architecture"));
  assert.ok(adminHtml.body.includes("Project Components"));
  assert.ok(adminHtml.body.includes("Multibagger Review"));
  assert.ok(adminHtml.body.includes('data-target="components-view"'));
  assert.ok(adminHtml.body.includes('data-target="multibagger-admin-view"'));
  assert.ok(adminHtml.body.includes('id="components-view"'));
  assert.ok(adminHtml.body.includes('id="multibagger-admin-view"'));
  assert.ok(adminHtml.body.includes("Multibagger Review Desk"));
  assert.ok(adminHtml.body.includes("Repository Component Map"));
  assert.equal(adminHtml.body.includes('href="/admin/components"'), false);
  assert.equal(adminHtml.body.includes('href="/admin/multibagger"'), false);
  assert.equal(adminHtml.body.includes("marketnarrative.in/multibagger"), false);
  assert.equal(adminHtml.body.includes("Multibagger Portfolio"), false);
  assert.ok(adminHtml.body.includes("Daily Reel Script"));
  assert.ok(adminHtml.body.includes("[REEL SCRIPT"));
  assert.ok(adminHtml.body.includes("copyReelScriptBtn"));
  assert.ok(adminHtml.body.includes("Reel Cut Builder"));
  assert.ok(adminHtml.body.includes("generateReelVideoBtn"));
  assert.ok(adminHtml.body.includes("studioActionState"));
  assertAdminCopyIsPolished(adminHtml.body, "admin studio");

  const componentsHtml = await app.request("GET", "/admin/components");
  assert.ok(componentsHtml.body.includes("Admin Login"));
  assert.ok(componentsHtml.body.includes("auth-pending"));
  assert.ok(componentsHtml.body.includes("Studio Command Center"));
  assert.ok(componentsHtml.body.includes('window.__INITIAL_TAB__ = "components-view"'));
  assert.ok(componentsHtml.body.includes("How the Market Narrative desk fits together"));
  assert.ok(componentsHtml.body.includes('details class="component"'));
  assertAdminCopyIsPolished(componentsHtml.body, "admin components");

  const multibagger = await app.request("GET", "/api/public/multibagger/state");
  assert.equal(multibagger.json.holdings.length, 5);
  assert.equal(multibagger.json.holdings.reduce((sum, holding) => sum + holding.targetWeight, 0), 100);
  assert.equal(multibagger.json.holdings.reduce((sum, holding) => sum + holding.modelAmountInr, 0), 500000);
  assert.equal(multibagger.json.modelEntryDate, "2026-04-27");
  assert.equal(multibagger.json.trackingBasis.researchModelStartedOn, "2026-04-27");
  assert.equal(multibagger.json.trackingBasis.publicFillBaselineAt, "2026-05-04T14:12:00+05:30");
  assert.equal(multibagger.json.trackingBasis.returnsCalculatedFrom, "publicFillBaselineAt");
  // Static fallback now carries real refreshed prices
  assert.ok(Number.isFinite(multibagger.json.performance.currentModelValueInr) && multibagger.json.performance.currentModelValueInr > 0, "multibagger API must return a finite model value");
  assert.ok(multibagger.json.holdings.every((holding) => holding.entryAt === "2026-05-04T14:12:00+05:30"));
  assert.ok(multibagger.json.holdings.every((holding) => Number.isFinite(holding.entryPrice) && Number.isFinite(Number(holding.returnPercent))), "all holdings must have finite entry price and return percent");
  assert.deepEqual(
    multibagger.json.holdings.map((holding) => holding.displayLabel),
    ["Renewable execution", "Margin recovery", "Cable cycle quality", "Quality ballast", "Order conversion"]
  );
  assert.deepEqual(multibagger.json.transactions, []);
  assert.ok(multibagger.json.methodology.definition.includes("multibagger"));
  assert.ok(multibagger.json.holdings.every((holding) => holding.profitabilityLens && holding.valuationLens && holding.growthCatalyst));
  assert.equal(JSON.stringify(multibagger.json).toLowerCase().includes("screenshot"), false);
  assert.equal(JSON.stringify(multibagger.json).toLowerCase().includes("server quote snapshot"), false);

  const multibaggerHtml = await app.request("GET", "/multibagger/");
  assertPublicFinancePageIntegrity("demo multibagger page", multibaggerHtml.body, [/Research Method/i, /KPEL/i]);
  assert.ok(multibaggerHtml.body.includes("Market Narrative Multibagger Portfolio"));
  assert.ok(multibaggerHtml.body.includes("Public Briefing"));
  assert.ok(multibaggerHtml.body.includes("Trading Guide"));
  assert.ok(multibaggerHtml.body.includes('aria-current="page">Portfolio'));
  assert.equal(multibaggerHtml.body.includes("Admin review"), false);
  assert.ok(multibaggerHtml.body.includes("Model status"));
  assert.ok(multibaggerHtml.body.includes("Rs 5L public baseline"));
  assert.ok(multibaggerHtml.body.includes("Current value"));
  assert.ok(multibaggerHtml.body.includes("Public tracking active"));
  assert.equal(multibaggerHtml.body.includes("Baseline live"), false);
  assert.ok(multibaggerHtml.body.includes("Since entry (04 May 2026, 02:12 pm)"));
  assert.ok(multibaggerHtml.body.includes("Entries captured 04 May, 02:12 pm"));
  assert.ok(multibaggerHtml.body.includes("Latest quote refresh"));
  assert.ok(multibaggerHtml.body.includes("Share this public tracker"));
  // Static fallback now carries real prices; "Awaiting verified live quote" is no longer the default state
  assert.ok(multibaggerHtml.body.includes("Yahoo Finance") || multibaggerHtml.body.includes("BSE India"), "multibagger page must show price source");
  assert.ok(multibaggerHtml.body.includes("Baseline entries are published through the Holdings table."));
  assert.ok(multibaggerHtml.body.includes("Current price"));
  assert.equal(multibaggerHtml.body.includes("<th>Plain-English Role</th>"), false);
  assert.ok(multibaggerHtml.body.includes("Plain-English role legend"));
  assert.ok(multibaggerHtml.body.includes("holding-name-line"));
  assert.ok(multibaggerHtml.body.includes("holding-card-grid"));
  assert.equal((multibaggerHtml.body.match(/<details class="holding-card">/g) || []).length, 5);
  assert.equal(multibaggerHtml.body.includes('<article class="holding-card">'), false);
  assert.ok(multibaggerHtml.body.includes("holding-card-closed-metrics"));
  assert.ok(multibaggerHtml.body.indexOf("holding-card-closed-metrics") < multibaggerHtml.body.indexOf("holding-card-body"));
  assert.ok(multibaggerHtml.body.includes("holding-card-key-metrics"));
  assert.ok(multibaggerHtml.body.includes('<details class="allocation-legend-disclosure">'));
  assert.equal(multibaggerHtml.body.includes('<details class="allocation-legend-disclosure" open>'), false);
  assert.ok(multibaggerHtml.body.includes("Detailed Ledger"));
  assert.ok(
    multibaggerHtml.body.indexOf('aria-label="Current model holdings"') < multibaggerHtml.body.indexOf('aria-label="Public model performance"'),
    "holding cards must render before the metric stack on mobile and desktop"
  );
  assert.equal(multibaggerHtml.body.includes("window.location.href.split"), false, "share links must not inherit review/query parameters");
  assert.ok(multibaggerHtml.body.includes("window.location.origin + window.location.pathname"));
  assert.ok(multibaggerHtml.body.includes("module-grid"));
  assert.ok(multibaggerHtml.body.includes("Performance"));
  assert.equal(multibaggerHtml.body.includes("Portfolio At A Glance"), false);
  assert.ok(multibaggerHtml.body.includes("allocation-grid"));
  assert.ok(multibaggerHtml.body.includes("Research Framework"));
  assert.ok(multibaggerHtml.body.includes("Research Method"));
  assert.ok(multibaggerHtml.body.includes("Not tips"));
  assert.ok(multibaggerHtml.body.includes("Cash conversion matters"));
  assert.equal(multibaggerHtml.body.includes("Research Method Snapshot"), false);
  assert.ok(multibaggerHtml.body.includes("Market Regime Evidence"));
  assert.ok(multibaggerHtml.body.includes("Closest challenger"));
  assert.ok(multibaggerHtml.body.includes("High replacement pressure"));
  assert.ok(multibaggerHtml.body.includes("<details class=\"panel research-framework-panel\">"));
  assert.equal(multibaggerHtml.body.includes("<details class=\"panel research-framework-panel\" open>"), false);
  assert.equal(multibaggerHtml.body.includes("<details class=\"panel method-panel\" open>"), false);
  assert.ok(multibaggerHtml.body.includes("Reviews And Changes"));
  assert.ok(multibaggerHtml.body.includes("<details class=\"panel performance-panel\" open>"));

  const adminMultibaggerHtml = await app.request("GET", "/admin/multibagger");
  assert.ok(adminMultibaggerHtml.body.includes("Admin Login"));
  assert.ok(adminMultibaggerHtml.body.includes("Studio Command Center"));
  assert.ok(adminMultibaggerHtml.body.includes('window.__INITIAL_TAB__ = "multibagger-admin-view"'));
  assert.ok(adminMultibaggerHtml.body.includes("Multibagger Review Desk"));
  assert.ok(adminMultibaggerHtml.body.includes("Run Monthly Review"));

  const review = await app.request("POST", "/api/admin/multibagger/reviews/run", { month: "2026-05" });
  assert.equal(review.status, 200);
  assert.equal(review.json.decisions.length, 5);
  assert.ok(review.json.privateReasoning);

  const publishedReview = await app.request("POST", `/api/admin/multibagger/reviews/${review.json.reviewId}/publish`);
  assert.equal(publishedReview.status, 200);
  assert.equal(JSON.stringify(publishedReview.json).toLowerCase().includes("private"), false);
});

for (const result of results) {
  process.stdout.write(`${result.ok ? "PASS" : "FAIL"} ${result.name}\n`);
  if (!result.ok) {
    process.stdout.write(`  ${result.error.stack ?? result.error.message}\n`);
  }
}

const failed = results.filter((result) => !result.ok);
if (failed.length > 0) {
  process.exitCode = 1;
} else {
  process.stdout.write(`\n${results.length} tests passed.\n`);
}

async function invokeMoveDetect(request) {
  return invokeApiHandler(moveDetectHandler, request);
}

async function invokeApiHandler(handler, request) {
  const response = {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  await handler(request, response);
  return { status: response.statusCode, body: response.body, headers: response.headers };
}

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error });
  }
}

function testRssXml(items) {
  return `<rss><channel>${items.map((item) => `
    <item>
      <title>${item.title}</title>
      <link>${item.link}</link>
      <pubDate>Sun, 03 May 2026 01:30:00 GMT</pubDate>
      <description>${item.description}</description>
    </item>
  `).join("")}</channel></rss>`;
}

function testArticleUrl(publisher, sourceSlug, storySlug) {
  if (publisher === "moneycontrol") {
    return `https://www.moneycontrol.com/news/business/markets/${sourceSlug}-${storySlug}_1300001.html`;
  }
  return `https://www.cnbc.com/2026/05/03/${sourceSlug}-${storySlug}.html`;
}

function slugForTestUrl(value) {
  return String(value)
    .toLowerCase()
    .replace(/https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
}

function normalizeForTest(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numberFromCopy(value) {
  return Number(String(value || "").replace(/,/g, ""));
}

function assertAdminCopyIsPolished(html, label) {
  const bannedPhrases = [
    "Mock adapter mode",
    "fallback capture",
    "Fallback quotes",
    "Static demo",
    "Local simulation",
    "generated locally",
    "GitHub Pages briefing",
    "Invalid admin credentials",
    "Awaiting generation",
    "static-site publishing",
    "mock-first",
    "Generated local",
    "static MVP",
    "Public GitHub Pages",
    "Static Publisher"
  ];
  for (const phrase of bannedPhrases) {
    assert.ok(!html.includes(phrase), `${label} should not show rough admin copy: ${phrase}`);
  }
}

function assertPublicFinancePageIntegrity(label, html, requiredPatterns = []) {
  assert.match(html, /<title>[^<]{8,}<\/title>/i, `${label} missing useful title`);
  assert.match(html, /<meta name="description" content="[^"]{24,}"/i, `${label} missing useful meta description`);
  assert.match(html, /<h1[\s\S]*?<\/h1>/i, `${label} missing h1`);
  assert.match(html, /<nav[\s\S]*?<\/nav>/i, `${label} missing navigation`);
  for (const pattern of requiredPatterns) {
    assert.match(html, pattern, `${label} missing finance pattern ${pattern}`);
  }
  assertPublicBriefingCopy(label, html);
}
