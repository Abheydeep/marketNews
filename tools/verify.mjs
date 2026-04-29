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
  assert.ok(publicHtml.body.includes("Generated 8:30 AM Brief"));
  assert.ok(!publicHtml.body.includes("A one-page public briefing generated by the Overnight Digest Engine"));
  assert.ok(publicHtml.body.includes("Nifty 50 Scanner Setup"));
  assert.ok(publicHtml.body.includes("News Driving This 8:30 Brief"));
  assert.ok(!publicHtml.body.includes("Indian Market Setup (Nifty 50)"));
  assert.ok(!publicHtml.body.includes("Key News & Sources"));
  assert.ok(publicHtml.body.includes("Invalidation"));
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
