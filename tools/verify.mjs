import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDemoApp } from "./demo-app.mjs";
import {
  buildDigest,
  bullishRiskReward,
  clusterThemes,
  evaluateSeries,
  labelFromScore,
  loadSeeds,
  newsArticleJsonLd,
  scanPriceSeries,
  weightedSentiment
} from "./core.mjs";
import { LIVE_MARKET_SYMBOLS, normalizeYahooChartResult } from "./market-data.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const results = [];

await test("seed files are valid and complete", async () => {
  const seeds = await loadSeeds();
  assert.ok(seeds.marketSnapshots.length >= 14);
  assert.equal(seeds.news.length, 4);
  assert.equal(seeds.priceSeries.length, 2);
  assert.equal(seeds.creator.referenceImageId, "creator-ref-001");
  assert.ok(seeds.news.every((article) => !article.sourceUrl.includes("example.com")));
  for (const symbol of ["SPX", "NDX", "DJI", "NIFTY", "BANKNIFTY", "NIKKEI", "HSI", "SHCOMP", "KOSPI", "TAIEX", "STI", "ASX200", "DXY", "BRENT"]) {
    const snapshot = seeds.marketSnapshots.find((item) => item.symbol === symbol);
    assert.ok(snapshot, `missing seed snapshot ${symbol}`);
    assert.ok(snapshot.marketRegion, `${symbol} missing marketRegion`);
    assert.ok(snapshot.tradingViewSymbol, `${symbol} missing TradingView symbol`);
  }
});

await test("live symbol registry includes important Asian markets", () => {
  for (const symbol of ["NIKKEI", "HSI", "SHCOMP", "KOSPI", "TAIEX", "STI", "ASX200"]) {
    const definition = LIVE_MARKET_SYMBOLS.find((item) => item.symbol === symbol);
    assert.ok(definition, `missing live symbol ${symbol}`);
    assert.equal(definition.marketRegion, "Asia Watch");
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
  assert.equal(clusterThemes("2026-04-29", articles).length, 4);
});

await test("full digest contains public SEO and studio contracts", async () => {
  const digest = await buildDigest("2026-04-29");
  assert.equal(digest.sentimentLabel, "BEARISH");
  assert.ok(digest.onePageSummary.includes("Educational note"));
  assert.ok(digest.teleprompterScript.includes("[RISK DISCLAIMER]"));
  assert.ok(digest.asset.positivePrompt.includes("identity-locked creator portrait"));
  const jsonLd = newsArticleJsonLd(digest);
  assert.equal(jsonLd["@type"], "NewsArticle");
  assert.equal(jsonLd.headline, digest.title);
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
            indicators: { quote: [{ close: [7127.1] }] }
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
});

await test("Yahoo market data normalization preserves region metadata", () => {
  const snapshot = normalizeYahooChartResult(
    {
      symbol: "NIKKEI",
      name: "Nikkei 225",
      yahooSymbol: "^N225",
      tradingViewSymbol: "TVC:NI225",
      marketRegion: "Asia Watch",
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
            indicators: { quote: [{ close: [38105.2] }] }
          }
        ]
      }
    }
  );
  assert.equal(snapshot.symbol, "NIKKEI");
  assert.equal(snapshot.marketRegion, "Asia Watch");
  assert.equal(snapshot.session, "tokyo");
  assert.equal(snapshot.changePercent, 0.511);
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
  assert.ok(schema.includes("trading_view_symbol VARCHAR"), "market_snapshots missing TradingView chart symbol");
});

await test("backend market snapshot contract carries quote regions and chart symbols", async () => {
  const entity = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "marketdata", "MarketSnapshot.java"), "utf8");
  const dto = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "publishing", "PublicDigestDto.java"), "utf8");
  const service = await readFile(join(rootDir, "backend", "src", "main", "java", "com", "marketnarrative", "publishing", "PublicDigestService.java"), "utf8");
  for (const token of ["marketRegion", "session", "tradingViewSymbol"]) {
    assert.ok(entity.includes(token), `entity missing ${token}`);
    assert.ok(dto.includes(token), `DTO missing ${token}`);
  }
  assert.ok(service.includes("getMarketRegion()"));
  assert.ok(service.includes("getTradingViewSymbol()"));
});

await test("static publisher emits archive root and dated daily pages", async () => {
  const publisher = await readFile(join(rootDir, "tools", "publish-site.mjs"), "utf8");
  assert.ok(publisher.includes("archivePage(digests)"));
  assert.ok(publisher.includes("slugForDigest"));
  assert.ok(publisher.includes("29apr2026") || publisher.includes("monthName"));
  assert.ok(publisher.includes("Root index.html is the digest archive"));
  assert.ok(publisher.includes("archive.json"));
  assert.ok(publisher.includes("join(siteDir, slug"));
  assert.ok(!publisher.includes('copyFile(sourceHtml, join(siteDir, "index.html"))'));

  const workflow = await readFile(join(rootDir, ".github", "workflows", "pages.yml"), "utf8");
  assert.ok(workflow.includes("cancel-in-progress: true"));
  assert.ok(workflow.includes("Import previous deployed archive"));
  assert.ok(workflow.includes("tools/import-archive.mjs"));

  const importer = await readFile(join(rootDir, "tools", "import-archive.mjs"), "utf8");
  assert.ok(importer.includes("archive.digests"));
  assert.ok(importer.includes('"archive", "daily"'));
});

await test("frontend workspace separates public portal, admin studio, and shared packages", async () => {
  const rootPackage = JSON.parse(await readFile(join(rootDir, "package.json"), "utf8"));
  assert.deepEqual(rootPackage.workspaces, ["apps/*", "packages/*", "frontend"]);

  const publicPackage = JSON.parse(await readFile(join(rootDir, "apps", "public-portal", "package.json"), "utf8"));
  const adminPackage = JSON.parse(await readFile(join(rootDir, "apps", "admin-studio", "package.json"), "utf8"));
  const uiPackage = JSON.parse(await readFile(join(rootDir, "packages", "ui", "package.json"), "utf8"));
  const apiPackage = JSON.parse(await readFile(join(rootDir, "packages", "api-client", "package.json"), "utf8"));

  assert.equal(publicPackage.name, "@market-narrative/public-portal");
  assert.equal(adminPackage.name, "@market-narrative/admin-studio");
  assert.equal(uiPackage.name, "@market-narrative/ui");
  assert.equal(apiPackage.name, "@market-narrative/api-client");
  assert.ok(publicPackage.dependencies["@market-narrative/ui"]);
  assert.ok(adminPackage.dependencies["@market-narrative/api-client"]);
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
  assert.ok(publicHtml.body.includes("Public Briefing"));
  assert.ok(publicHtml.body.includes("Studio Command (Admin)"));
  assert.ok(publicHtml.body.includes("Engine Architecture"));
  assert.ok(publicHtml.body.includes("Executive Summary: The Morning Narrative"));
  assert.ok(publicHtml.body.includes("The Overnight Pulse"));
  assert.ok(publicHtml.body.includes("Asia Watch"));
  assert.ok(publicHtml.body.includes("Nikkei 225"));
  assert.ok(publicHtml.body.includes("Hang Seng"));
  assert.ok(publicHtml.body.includes("Macro Incremental Sources"));
  assert.ok(publicHtml.body.includes("Wed, 29 Apr, 2026"));
  assert.ok(publicHtml.body.includes("sentiment-pin"));
  assert.ok(!publicHtml.body.includes("A one-page public briefing generated by the Overnight Digest Engine"));
  assert.ok(publicHtml.body.includes("Nifty 50 Algorithmic Setup"));
  assert.ok(!publicHtml.body.includes("News Driving This 8:30 Brief"));
  assert.ok(!publicHtml.body.includes("Indian Market Setup (Nifty 50)"));
  assert.ok(!publicHtml.body.includes("Key News & Sources"));
  assert.ok(publicHtml.body.includes("Stop Loss"));
  assert.ok(publicHtml.body.includes("Real Quote Board"));
  assert.ok(publicHtml.body.includes("indexChartModal"));
  assert.ok(publicHtml.body.includes("openIndexChart"));
  assert.ok(publicHtml.body.includes("Open Full Chart"));
  assert.ok(publicHtml.body.includes("chartFallback"));
  assert.ok(publicHtml.body.includes("refreshPublishedDigest"));
  assert.ok(publicHtml.body.includes("tradingViewChart"));
  assert.ok(!publicHtml.body.includes("tickLiveQuotes"));
  assert.ok(!publicHtml.body.includes("Math.random"));
  assert.ok(!publicHtml.body.includes("mock quote source"));
  assert.ok(!publicHtml.body.includes("example.com"));
  assert.ok(publicHtml.body.includes("overnightChart"));
  assert.ok(publicHtml.body.includes("teleprompterContainer"));
  assert.ok(publicHtml.body.includes("generateAssetBtn"));
  const adminHtml = await app.request("GET", "/admin");
  assert.ok(adminHtml.body.includes("Studio Command Center"));
  assert.ok(adminHtml.body.includes('"studio-view"'));
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
