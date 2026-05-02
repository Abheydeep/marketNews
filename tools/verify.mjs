import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cockpitPage } from "./cockpit-page.mjs";
import { createDemoApp } from "./demo-app.mjs";
import {
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
  evaluateSeries,
  labelFromScore,
  loadSeeds,
  newsArticleJsonLd,
  reelScriptMarkdown,
  reconcileTradeSetupsWithMarketSnapshots,
  scanPriceSeries,
  weightedSentiment
} from "./core.mjs";
import { LIVE_MARKET_SYMBOLS, normalizeYahooChartResult } from "./market-data.mjs";
import { multibaggerState, validateMultibaggerState } from "./multibagger-data.mjs";
import { multibaggerPage } from "./multibagger-page.mjs";
import { publicDigestPayload } from "./public-payload.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const results = [];

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

await test("risk-reward math enforces 1:2+ setups", () => {
  assert.equal(bullishRiskReward(100, 95, 110), 2);
  assert.throws(() => bullishRiskReward(100, 101, 110), /above stop loss/);
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
      closeValue: 24177.65,
      dataQuality: "live"
    },
    {
      symbol: "BANKNIFTY",
      closeValue: 55403.6,
      dataQuality: "live"
    }
  ];
  const audit = auditTradeSetupsWithMarketSnapshots(setups, liveSnapshots);
  const reconciled = reconcileTradeSetupsWithMarketSnapshots(setups, liveSnapshots);
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

await test("full digest contains public SEO and studio contracts", async () => {
  const digest = await buildDigest("2026-04-29");
  assert.equal(digest.sentimentLabel, "BEARISH");
  assert.ok(digest.onePageSummary.includes("Educational note"));
  assert.ok(digest.teleprompterScript.includes("[RISK DISCLAIMER]"));
  assert.ok(digest.reelScript.includes("[REEL SCRIPT"));
  assert.ok(digest.reelScript.includes("[0-03s | HOOK]"));
  assert.ok(digest.reelScript.includes("[40-52s | TRADE PLAN]"));
  assertReelScriptCopy("daily reel script", digest.reelScript);
  assert.ok(reelScriptMarkdown(digest).includes("## Daily Reel Script"));
  assert.ok(digest.asset.positivePrompt.includes("identity-locked creator portrait"));
  assert.ok(digest.asset.reelVideo.videoPrompt.includes("60-second vertical financial market reel"));
  assert.ok(digest.asset.reelVideo.scenes.length >= 5);
  assert.ok(digest.news.length >= 14);
  assert.ok(digest.news.every((article) => article.thumbnail?.alt));
  const jsonLd = newsArticleJsonLd(digest);
  assert.equal(jsonLd["@type"], "NewsArticle");
  assert.equal(jsonLd.headline, digest.title);
});

await test("public digest payload ships compact display DTOs", async () => {
  const digest = await buildDigest("2026-04-29");
  const payload = publicDigestPayload(digest);
  const newsKeys = Object.keys(payload.news[0]).sort();

  assert.equal(Object.hasOwn(payload, "teleprompterScript"), false);
  assert.equal(Object.hasOwn(payload, "reelScript"), false);
  assert.equal(payload.asset?.positivePrompt, undefined);
  assert.equal(payload.asset?.reelVideo, undefined);
  assert.deepEqual(newsKeys, [
    "category",
    "publisherName",
    "sentimentLabel",
    "sentimentScore",
    "sourceUrl",
    "thumbnailAlt",
    "thumbnailUrl",
    "timestamp",
    "title"
  ]);
  assert.ok(payload.news.every((article) => article.thumbnailUrl.startsWith("data:image/svg+xml,")));
  assert.equal(JSON.stringify(payload.news).includes("whyItMatters"), false);
  assert.equal(JSON.stringify(payload.news).includes("indiaImpact"), false);
  assert.equal(JSON.stringify(payload.news).includes("entityMatchScore"), false);
  assert.ok(payload.setupAudit.length >= payload.tradeSetups.length);
  assert.equal(JSON.stringify(payload.setupAudit).includes('"setup"'), false);
  assert.equal(payload.sourceStats.articleCount, digest.news.length);
  assert.equal(payload.sourceStats.publisherCount, new Set(digest.news.map((article) => article.sourceName)).size);
});

await test("multibagger public model is concentrated and sanitized", () => {
  const state = validateMultibaggerState(multibaggerState());
  const weights = state.holdings.map((holding) => holding.targetWeight);
  assert.equal(state.holdings.length, 6);
  assert.equal(weights.reduce((sum, weight) => sum + weight, 0), 100);
  assert.equal(state.modelEntryDate, "2026-04-27");
  assert.equal(state.performance.modelEntryDate, "2026-04-27");
  assert.ok(Number.isFinite(state.performance.currentModelValueInr));
  assert.ok(Number.isFinite(state.performance.totalPnlInr));
  assert.ok(Number.isFinite(state.performance.benchmarkSinceLaunchPercent));
  assert.deepEqual(
    state.holdings.map((holding) => holding.ticker),
    ["KPEL", "DHABRIYA", "PIGL", "JNKINDIA", "DYCL", "TEMBO"]
  );
  assert.ok(state.holdings.some((holding) => holding.returnPercent > 0));
  assert.ok(state.holdings.some((holding) => holding.returnPercent < 0));
  for (const holding of state.holdings) {
    for (const field of ["entryPrice", "lastPrice", "returnPercent", "modelPnlInr", "currentModelValueInr", "dayChangePercent"]) {
      assert.ok(Number.isFinite(holding[field]), `${holding.ticker} missing ${field}`);
    }
    const expectedReturn = Math.round((((holding.lastPrice - holding.entryPrice) / holding.entryPrice) * 100) * 100) / 100;
    assert.ok(Math.abs(expectedReturn - holding.returnPercent) <= 0.01, `${holding.ticker} return math mismatch`);
  }
  const expectedCurrentValue = Math.round(state.holdings.reduce((sum, holding) => sum + holding.currentModelValueInr, 0) * 100) / 100;
  assert.ok(Math.abs(expectedCurrentValue - state.performance.currentModelValueInr) <= 0.01);
  const publicJson = JSON.stringify(state).toLowerCase();
  for (const forbidden of ["screenshot", "rawocr", "private", "accountvalue", "quantity", "broker"]) {
    assert.equal(publicJson.includes(forbidden), false, `public multibagger state leaked ${forbidden}`);
  }
});

await test("multibagger public page is expandable and public-safe", () => {
  const state = multibaggerState();
  const html = multibaggerPage(state);
  assertPublicBriefingCopy("multibagger public page", html);
  assert.ok(html.includes("5x Multibagger Portfolio"));
  assert.ok(html.includes("Since Apr 27, 2026"));
  assert.ok(html.includes("Current value"));
  assert.ok(html.includes("Model P&L"));
  assert.ok(html.includes("Model performance is calculated from the public model start date and model allocation weights."));
  assert.ok(html.includes("Portfolio At A Glance"));
  assert.ok(html.includes("Buy And Sell Record"));
  assert.ok(html.includes("MODEL_BUY"));
  assert.ok(html.includes("Reference"));
  assert.ok(html.includes("Entry"));
  assert.ok(html.includes("Current"));
  assert.ok(html.includes("Return"));
  assert.ok(html.includes("price-status"));
  assert.ok(html.includes("renderMultibaggerState"));
  assert.ok(html.includes("Monthly Reviews"));
  assert.ok(html.includes("Watchlist And Replacements"));
  assert.ok(html.includes("og:site_name"));
  assert.ok(html.includes("twitter:card"));
  assert.ok(html.includes('rel="canonical"'));
  assert.ok(html.includes("window.__MULTIBAGGER_STATE__"));
  assert.ok(html.includes("/api/public/multibagger/state"));
  assert.ok(html.includes("<details class=\"panel\" open>"));
  assert.ok((html.match(/<details class="panel"/g) ?? []).length >= 7);
});

await test("public briefing copy follows editorial prompt guardrails", async () => {
  const digest = await buildDigest("2026-04-29");
  const publicPayload = publicDigestPayload(digest);
  const publicHtml = cockpitPage(digest, "public-view", { includeStudio: false });

  assert.ok(PUBLIC_BRIEFING_EDITORIAL_PROMPT.includes("financial news article"));
  assert.ok(PUBLIC_BRIEFING_EDITORIAL_PROMPT.includes("Do not mention internal implementation details"));
  assert.ok(REEL_SCRIPT_EDITORIAL_PROMPT.includes("actually say on camera"));
  assertPublicBriefingCopy("onePageSummary", digest.onePageSummary);
  assertReelScriptCopy("reelScript", digest.reelScript);
  assertPublicBriefingCopy("public digest payload", JSON.stringify(publicPayload));
  assertPublicBriefingCopy("public page HTML", publicHtml);
  assertPublicBriefingCopy(
    "reputation-safe archive hero",
    "Pre-Market Intelligence Archive. Independent pre-market intelligence for India's trading day, combining global cues, index levels, sector context, source-led developments, and disciplined technical setups."
  );
  assert.throws(
    () => assertPublicBriefingCopy(
      "bad sample",
      "The scanner has deliberately removed stale trade levels after live quote validation, so the video should frame the first hour as a level-discovery phase."
    ),
    /Public editorial guardrail failed/
  );
  for (const badArchiveCopy of [
    "All Market Narrative briefings",
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
});

await test("backend market snapshot contract carries quote regions, countries, and chart symbols", async () => {
  const entity = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "marketdata", "MarketSnapshot.java"), "utf8");
  const dto = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "publishing", "PublicDigestDto.java"), "utf8");
  const service = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "publishing", "PublicDigestService.java"), "utf8");
  for (const token of ["marketRegion", "country", "session", "tradingViewSymbol"]) {
    assert.ok(entity.includes(token), `entity missing ${token}`);
    assert.ok(dto.includes(token), `DTO missing ${token}`);
  }
  assert.ok(service.includes("getMarketRegion()"));
  assert.ok(service.includes("getCountry()"));
  assert.ok(service.includes("getTradingViewSymbol()"));
});

await test("static publisher emits public pages plus auth-gated admin pages", async () => {
  const publisher = await readFile(join(rootDir, "tools", "publish-site.mjs"), "utf8");
  const brandAssets = await readFile(join(rootDir, "tools", "brand-assets.mjs"), "utf8");
  assert.ok(publisher.includes("archivePage(digests)"));
  assert.ok(publisher.includes("archiveCardSummary"));
  assert.ok(publisher.includes("previousSessionDriver"));
  assert.ok(publisher.includes("archiveToneClass"));
  assert.ok(publisher.includes("sentimentSparklineHtml"));
  assert.ok(publisher.includes("archiveChips"));
  assert.ok(publisher.includes("Pre-Market Intelligence Archive"));
  assert.ok(publisher.includes("Latest Market Briefings"));
  assert.ok(publisher.includes("Read market briefing"));
  assert.ok(publisher.includes("Previous session driver"));
  assert.ok(publisher.includes("sentiment-sparkline"));
  for (const roughCopy of [
    "All Market Narrative briefings",
    "The root page now works",
    "Open daily briefing",
    "Asia watch:",
    "markets tracked"
  ]) {
    assert.equal(publisher.includes(roughCopy), false, `publisher should not contain rough copy: ${roughCopy}`);
  }
  assert.ok(publisher.includes("projectComponentsPage"));
  assert.ok(publisher.includes("multibaggerPage"));
  assert.ok(publisher.includes("multibaggerAdminPage"));
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
  assert.ok(cockpit.includes("Multibagger Portfolio"));
  assert.ok(cockpit.includes("Multibagger Review"));
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
  assert.ok(workflow.includes("cancel-in-progress: true"));
  assert.ok(workflow.includes('cron: "*/5 3-21 * * 1-5"'), "workflow should refresh market data every 5 minutes during market windows");
  assert.ok(workflow.includes("Import previous deployed archive"));
  assert.ok(workflow.includes("tools/import-archive.mjs"));

  const importer = await readFile(join(rootDir, "tools", "import-archive.mjs"), "utf8");
  assert.ok(importer.includes("archive.digests"));
  assert.ok(importer.includes('"archive", "daily"'));
  assert.ok(importer.includes("redactedDigestPayload"));
  assert.ok(importer.includes("sanitizeLegacyPublicBriefingCopy"));
  assert.ok(importer.includes("assertPublicBriefingCopy"));

  const archiveFiles = await readdir(join(rootDir, "archive", "daily"));
  for (const fileName of archiveFiles.filter((fileName) => fileName.endsWith(".json"))) {
    const archiveDigest = await readFile(join(rootDir, "archive", "daily", fileName), "utf8");
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
  assert.ok(publicController.includes('@RequestMapping("/api/public/multibagger")'));
  assert.ok(publicController.includes('@GetMapping("/state")'));
  assert.ok(adminController.includes('@RequestMapping("/api/admin/multibagger")'));
  assert.ok(adminController.includes('@PostMapping(value = "/snapshots"'));
  assert.ok(adminController.includes('@PostMapping("/reviews/run")'));
  assert.ok(adminController.includes('@PostMapping("/reviews/{id}/publish")'));
  assert.ok(adminController.includes("hasAuthority('admin:write')"));
  assert.ok(service.includes("snapshots.put(snapshotId, file.getBytes())"));
  assert.ok(service.includes("MODEL_ENTRY_DATE = LocalDate.of(2026, 4, 27)"));
  assert.ok(service.includes('"MODEL_BUY"'));
  assert.ok(quoteService.includes("@Scheduled"));
  assert.ok(quoteService.includes("Yahoo Finance chart API"));
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
  assert.equal(vercelConfig.outputDirectory, "out/vercel");
  const productionSmoke = await readFile(join(rootDir, "tools", "production-smoke.mjs"), "utf8");
  const productionQaGate = await readFile(join(rootDir, "tools", "production-qa-gate.mjs"), "utf8");
  const launchValues = await readFile(join(rootDir, "deploy", "production", "launch-values.md"), "utf8");
  const architectureDoc = await readFile(join(rootDir, "docs", "production-architecture.md"), "utf8");
  const testingDoc = await readFile(join(rootDir, "docs", "testing.md"), "utf8");

  const buildScript = await readFile(join(rootDir, "tools", "vercel-build.mjs"), "utf8");
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
  assert.ok(buildScript.includes("out\", \"vercel"));

  const publicProject = JSON.parse(await readFile(join(rootDir, "deploy", "vercel", "marketnarrative-public.json"), "utf8"));
  const adminProject = JSON.parse(await readFile(join(rootDir, "deploy", "vercel", "marketnarrative-admin.json"), "utf8"));
  const tradeProject = JSON.parse(await readFile(join(rootDir, "deploy", "vercel", "marketnarrative-trade.json"), "utf8"));
  assert.equal(publicProject.buildCommand, "npm run vercel:build");
  assert.equal(publicProject.outputDirectory, "out/vercel");
  assert.equal(publicProject.environment.MARKET_NARRATIVE_DEPLOY_TARGET, "public");
  assert.deepEqual(publicProject.domains, ["marketnarrative.in", "www.marketnarrative.in"]);
  assert.equal(adminProject.buildCommand, "npm run vercel:build");
  assert.equal(adminProject.outputDirectory, "out/vercel");
  assert.equal(adminProject.environment.MARKET_NARRATIVE_DEPLOY_TARGET, "admin");
  assert.deepEqual(adminProject.domains, ["admin.marketnarrative.in"]);
  assert.equal(tradeProject.buildCommand, "npm run vercel:build");
  assert.equal(tradeProject.outputDirectory, "out/vercel");
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
    "Open TradingView Chart",
    "Open Yahoo Chart",
    "Pre-Market Intelligence Archive",
    "Latest Market Briefings",
    "Read market briefing",
    "Previous session driver",
    "trade-mn-signal",
    "lucide-lock-keyhole",
    "Auth API:",
    "api.marketnarrative.in",
    "actuator/health",
    "trade-api.marketnarrative.in",
    "RUN_AUTHENTICATED_QA",
    "Desktop and mobile smoke",
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
  assert.equal(digest.json.sentimentLabel, "BEARISH");

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
  assert.ok(publicHtml.body.includes('class="glass-v2"'));
  assert.ok(publicHtml.body.includes("data-source-url"));
  assert.ok(publicHtml.body.includes("Public Briefing"));
  assert.ok(publicHtml.body.includes("Multibagger Portfolio"));
  assert.ok(publicHtml.body.includes("Admin Login"));
  assert.ok(!publicHtml.body.includes("Studio Command (Admin)"));
  assert.ok(!publicHtml.body.includes('id="studio-view"'));
  assert.ok(!publicHtml.body.includes("Studio Command Center"));
  assert.ok(!publicHtml.body.includes("[REEL SCRIPT"));
  assert.ok(!publicHtml.body.includes("Engine Architecture"));
  assert.ok(!publicHtml.body.includes("Project Components"));
  assert.ok(!publicHtml.body.includes('id="architecture-view"'));
  assert.ok(publicHtml.body.includes("Read the full desk note"));
  assert.ok(publicHtml.body.includes("Market Map"));
  assert.ok(publicHtml.body.includes("Stories Driving The Open"));
  assert.ok(publicHtml.body.includes("How It Lands In India"));
  assert.ok(publicHtml.body.includes("What To Watch First"));
  assert.ok(publicHtml.body.includes("Why it matters"));
  assert.ok(publicHtml.body.includes("India impact"));
  assert.ok(publicHtml.body.includes("2 min read"));
  assert.ok(publicHtml.body.includes("Read the full desk note"));
  assert.ok(publicHtml.body.includes("Pre-market desk note"));
  assert.ok(publicHtml.body.includes("The Overnight Pulse"));
  assert.ok(publicHtml.body.includes("Asia Watch"));
  assert.ok(publicHtml.body.includes("Japan - Nikkei 225"));
  assert.ok(publicHtml.body.includes("Hong Kong - Hang Seng"));
  assert.ok(publicHtml.body.includes("Mainland China - Shanghai Composite"));
  assert.ok(publicHtml.body.includes("South Korea - KOSPI"));
  assert.ok(publicHtml.body.includes("Taiwan - Taiwan Weighted"));
  assert.ok(publicHtml.body.includes("Top 5 countries"));
  assert.ok(publicHtml.body.includes("up <em>/"));
  assert.ok(publicHtml.body.includes("Avg move"));
  assert.ok(publicHtml.body.includes("Source Notes & Attribution"));
  assert.ok(publicHtml.body.includes("Evidence ledger behind the briefing"));
  assert.ok(publicHtml.body.includes("Open categorized source ledger"));
  assert.ok(publicHtml.body.includes("source-ledger-details"));
  assert.ok(publicHtml.body.includes("data-default-source-filter"));
  assert.ok(publicHtml.body.includes("Evidence Map"));
  assert.ok(publicHtml.body.includes("Lead evidence"));
  assert.ok(publicHtml.body.includes("Category Board") || publicHtml.body.includes("Categorized source notes"));
  assert.ok(publicHtml.body.includes("Macro Pressure"));
  assert.ok(publicHtml.body.includes("Global Risk"));
  assert.ok(publicHtml.body.includes("Asia &amp; Volatility"));
  assert.ok(publicHtml.body.includes("Sector Support"));
  assert.ok(publicHtml.body.includes("Domestic Macro Support"));
  assert.ok(publicHtml.body.includes("data-source-group=\"macro_negative\""));
  assert.ok(publicHtml.body.includes("source-filter-row"));
  assert.ok(publicHtml.body.includes("data-source-filter=\"all\""));
  assert.ok(publicHtml.body.includes("aria-pressed=\"false\">All"));
  assert.ok(publicHtml.body.includes("Read-through"));
  assert.ok(publicHtml.body.includes("Moneycontrol Markets"));
  assert.ok(publicHtml.body.includes("Economic Times Markets"));
  assert.ok(publicHtml.body.includes("Wed, 29 Apr, 2026"));
  assert.ok(publicHtml.body.includes("sentiment-pin"));
  assert.ok(!publicHtml.body.includes("A one-page public briefing generated by the Overnight Digest Engine"));
  assert.ok(publicHtml.body.includes("Nifty 50 Game Plan"));
  assert.ok(publicHtml.body.includes("Creator read"));
  assert.ok(!publicHtml.body.includes("Agentic RAG pipeline"));
  assert.ok(!publicHtml.body.includes("News Driving This 8:30 Brief"));
  assert.ok(!publicHtml.body.includes("Indian Market Setup (Nifty 50)"));
  assert.ok(!publicHtml.body.includes("Key News & Sources"));
  assert.ok(publicHtml.body.includes("Stop Loss"));
  assert.ok(publicHtml.body.includes("Live Quote Board"));
  assert.ok(publicHtml.body.includes('id="quoteBoardToggle"'));
  assert.ok(publicHtml.body.includes('aria-expanded="false"'));
  assert.ok(publicHtml.body.includes('id="quoteBoardBody" class="quote-board-body" hidden'));
  assert.ok(publicHtml.body.includes("bindQuoteBoardToggle"));
  assert.ok(publicHtml.body.includes("window.__QUOTE_BOARD_EXPANDED__"));
  assert.ok(!publicHtml.body.includes("live-board-header"));
  assert.ok(publicHtml.body.includes("indexChartModal"));
  assert.ok(publicHtml.body.includes("openIndexChart"));
  assert.ok(publicHtml.body.includes("Open TradingView Chart"));
  assert.ok(publicHtml.body.includes("https://www.tradingview.com/chart/?symbol="));
  assert.ok(!publicHtml.body.includes("Open Yahoo Chart"));
  assert.ok(publicHtml.body.includes("chartSeriesLabel"));
  assert.ok(!publicHtml.body.includes("Yahoo Finance intraday price chart"));
  assert.ok(!publicHtml.body.includes("Yahoo Finance price series"));
  assert.ok(publicHtml.body.includes("chartFallback"));
  assert.ok(publicHtml.body.includes("refreshPublishedDigest"));
  assert.ok(publicHtml.body.includes("Refreshing prices after page load"));
  assert.ok(publicHtml.body.includes("refreshPublishedDigest('page-load')"));
  assert.ok(publicHtml.body.includes("setInterval(() => refreshPublishedDigest('background'), 60_000)"));
  assert.ok(publicHtml.body.includes("resolveDigestRefreshUrls"));
  assert.ok(publicHtml.body.includes("window.location.protocol === 'file:'"));
  assert.ok(publicHtml.body.includes("'127.0.0.1'"));
  assert.ok(publicHtml.body.includes("https://abheydeep.github.io/marketNews"));
  assert.ok(publicHtml.body.includes("shouldAdoptDigest"));
  assert.ok(publicHtml.body.includes("digestFreshnessTime"));
  assert.ok(publicHtml.body.includes("marketChartCanvas"));
  assert.ok(publicHtml.body.includes("drawMarketSeriesChart"));
  assert.ok(!publicHtml.body.includes("tickLiveQuotes"));
  assert.ok(!publicHtml.body.includes("Math.random"));
  assert.ok(!publicHtml.body.includes("mock quote source"));
  assert.ok(!publicHtml.body.includes("example.com"));
  assert.ok(publicHtml.body.includes("overnightChart"));
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
  assert.ok(componentsHtml.body.includes("How the Market Narrative desk fits together"));
  assert.ok(componentsHtml.body.includes('details class="component"'));
  assertAdminCopyIsPolished(componentsHtml.body, "admin components");

  const multibagger = await app.request("GET", "/api/public/multibagger/state");
  assert.equal(multibagger.json.holdings.length, 6);
  assert.equal(multibagger.json.holdings.reduce((sum, holding) => sum + holding.targetWeight, 0), 100);
  assert.equal(multibagger.json.modelEntryDate, "2026-04-27");
  assert.ok(Number.isFinite(multibagger.json.performance.currentModelValueInr));
  assert.ok(multibagger.json.holdings.every((holding) => Number.isFinite(holding.entryPrice) && Number.isFinite(holding.returnPercent)));
  assert.equal(JSON.stringify(multibagger.json).toLowerCase().includes("screenshot"), false);

  const multibaggerHtml = await app.request("GET", "/multibagger/");
  assert.ok(multibaggerHtml.body.includes("5x Multibagger Portfolio"));
  assert.ok(multibaggerHtml.body.includes("Since Apr 27, 2026"));
  assert.ok(multibaggerHtml.body.includes("Current value"));
  assert.ok(multibaggerHtml.body.includes("Model P&L"));
  assert.ok(multibaggerHtml.body.includes("Portfolio At A Glance"));
  assert.ok(multibaggerHtml.body.includes("Buy And Sell Record"));
  assert.ok(multibaggerHtml.body.includes("<details class=\"panel\" open>"));

  const adminMultibaggerHtml = await app.request("GET", "/admin/multibagger");
  assert.ok(adminMultibaggerHtml.body.includes("Admin Login"));
  assert.ok(adminMultibaggerHtml.body.includes("Multibagger Review Desk"));
  assert.ok(adminMultibaggerHtml.body.includes("Run Monthly Review"));

  const review = await app.request("POST", "/api/admin/multibagger/reviews/run", { month: "2026-05" });
  assert.equal(review.status, 200);
  assert.equal(review.json.decisions.length, 6);
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

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error });
  }
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
