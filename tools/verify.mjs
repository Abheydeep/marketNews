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
import { normalizeYahooChartResult } from "./market-data.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const results = [];

await test("seed files are valid and complete", async () => {
  const seeds = await loadSeeds();
  assert.equal(seeds.marketSnapshots.length, 5);
  assert.equal(seeds.news.length, 4);
  assert.equal(seeds.priceSeries.length, 2);
  assert.equal(seeds.creator.referenceImageId, "creator-ref-001");
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
  assert.ok(publicHtml.body.includes("Macro Incremental Sources"));
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
  assert.ok(publicHtml.body.includes("refreshPublishedDigest"));
  assert.ok(publicHtml.body.includes("tradingViewChart"));
  assert.ok(!publicHtml.body.includes("tickLiveQuotes"));
  assert.ok(!publicHtml.body.includes("Math.random"));
  assert.ok(!publicHtml.body.includes("mock quote source"));
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
