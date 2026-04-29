import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const baseUrl = process.env.MARKET_NEWS_URL ?? "https://abheydeep.github.io/marketNews";
const cycles = Number.parseInt(process.env.SOAK_CYCLES ?? "5", 10);
const expectedChartSymbols = [
  "SPX",
  "NDX",
  "DJI",
  "NIKKEI",
  "HSI",
  "SHCOMP",
  "KOSPI",
  "TAIEX",
  "NIFTY",
  "BANKNIFTY",
  "DXY",
  "BRENT"
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const consoleErrors = [];

page.on("console", (message) => {
  if (message.type() === "error") {
    consoleErrors.push(message.text());
  }
});

try {
  const results = [];

  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    results.push(await runCycle(page, cycle));
  }

  assert.equal(consoleErrors.length, 0, `browser console errors:\n${consoleErrors.join("\n")}`);

  console.log(`PASS ${cycles}/${cycles} live browser cycles against ${baseUrl}`);
  for (const result of results) {
    console.log(
      [
        `cycle=${result.cycle}`,
        `daily=${result.dailyUrl}`,
        `charts=${result.verifiedCharts}`,
        `sampleChart="${result.chartTitle}"`,
        `sampleLink=${result.chartHref}`,
        `admin=${result.adminReady}`
      ].join(" | ")
    );
  }
} finally {
  await browser.close();
}

async function runCycle(page, cycle) {
  const stamp = `${Date.now()}-${cycle}`;
  const rootUrl = `${baseUrl}/?soak=${stamp}`;
  const dailyUrl = `${baseUrl}/29apr2026/?soak=${stamp}`;

  await page.goto(rootUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expectOne(page.getByRole("heading", { name: "All Market Narrative briefings" }), "archive heading");
  await expectOne(page.getByRole("link", { name: "Latest briefing" }), "latest briefing link");
  const openDailyLink = page.getByRole("link", { name: "Open daily briefing" });
  await expectOne(openDailyLink, "open daily link");
  assert.equal(
    await page.getByText("Daily Pre-Market Summary", { exact: true }).count(),
    0,
    "archive root must not render a daily briefing"
  );

  await Promise.all([
    page.waitForURL(/\/(?:marketNews\/)?29apr2026\/?/, { timeout: 30_000, waitUntil: "domcontentloaded" }),
    openDailyLink.click()
  ]);
  assert.ok(/\/(?:marketNews\/)?29apr2026\/?/.test(page.url()), `archive card opened unexpected URL: ${page.url()}`);
  await expectDailyContent(page);

  await page.goto(dailyUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expectDailyContent(page);
  await expandQuoteBoard(page);

  const verifiedCharts = [];
  for (const symbol of expectedChartSymbols) {
    verifiedCharts.push(await verifyIndexChart(page, symbol));
  }

  const adminTab = page.getByRole("button", { name: "Studio Command (Admin)" });
  await expectOne(adminTab, "studio command tab");
  await adminTab.click();
  await expectOne(page.getByRole("heading", { name: "Studio Command Center" }), "studio command heading");
  await expectOne(page.getByRole("button", { name: "Generate Daily Thumbnail" }), "generate thumbnail button");

  return {
    cycle,
    dailyUrl: page.url(),
    chartTitle: verifiedCharts[0].title,
    chartHref: verifiedCharts[0].href,
    verifiedCharts: verifiedCharts.length,
    adminReady: true
  };
}

async function verifyIndexChart(page, symbol) {
  const tile = page.locator(`button[data-symbol="${symbol}"]`);
  await expectOne(tile, `${symbol} index tile`);
  await tile.click();
  await page.locator("#indexChartModal.open").waitFor({ state: "visible", timeout: 15_000 });

  const title = await page.locator("#indexChartTitle").innerText({ timeout: 10_000 });
  const href = await page.locator("#openFullChart").getAttribute("href", { timeout: 10_000 });
  const renderState = await page.locator("#marketChartCanvas").getAttribute("data-render-state", { timeout: 10_000 });
  assert.ok(title.includes(symbol), `${symbol} chart title should include symbol, got ${title}`);
  assert.ok(href?.startsWith("https://finance.yahoo.com/quote/"), `${symbol} chart link should use Yahoo Finance, got ${href}`);
  assert.equal(renderState, "rendered", `${symbol} chart canvas should render from published series`);
  assert.equal(await page.locator("#chartFallback.visible").count(), 0, `${symbol} chart fallback should not be visible`);

  const pixelStats = await page.locator("#marketChartCanvas").evaluate((canvas) => {
    const context = canvas.getContext("2d");
    const { width, height } = canvas;
    const sample = context.getImageData(0, 0, width, height).data;
    let nonBlank = 0;
    for (let index = 0; index < sample.length; index += 16) {
      if (sample[index] < 245 || sample[index + 1] < 245 || sample[index + 2] < 245) {
        nonBlank += 1;
      }
    }
    return { width, height, nonBlank };
  });
  assert.ok(pixelStats.width > 200 && pixelStats.height > 160, `${symbol} chart canvas should have real dimensions`);
  assert.ok(pixelStats.nonBlank > 100, `${symbol} chart canvas appears blank`);

  const closeChart = page.getByRole("button", { name: "Close index chart" });
  await expectOne(closeChart, "chart close button");
  await closeChart.click();
  await page.locator("#indexChartModal.open").waitFor({ state: "hidden", timeout: 15_000 });

  return { symbol, title, href };
}

async function expectDailyContent(page) {
  await expectOne(page.getByText("Daily Pre-Market Summary", { exact: true }), "daily summary heading");
  await expectOne(page.getByText("Wed, 29 Apr, 2026", { exact: true }), "daily date");
  await expectOne(page.getByRole("heading", { name: "The Overnight Pulse" }), "overnight pulse heading");
  await expectOne(page.getByRole("heading", { name: "1. What Changed Overnight" }), "changed overnight heading");
  await expectOne(page.getByRole("heading", { name: "2. Source Extraction" }), "source extraction heading");
  await expectOne(page.getByRole("heading", { name: "3. India Read-Through" }), "india read-through heading");
  await expectOne(page.getByRole("heading", { name: "4. What To Watch Next" }), "watch next heading");
  const setupCard = page.locator(".setup-card");
  await expectOne(setupCard, "algorithmic setup card");
  await expectOne(
    setupCard.getByText("No active 1:2 risk-reward setup has passed live quote validation.", { exact: false }),
    "live-validated no setup notice"
  );
  assert.equal(await setupCard.getByText("22,705", { exact: false }).count(), 0, "stale Nifty entry should not be visible");
  assert.equal(await setupCard.getByText("23,859", { exact: false }).count(), 0, "stale Nifty target should not be visible");
  await expectOne(page.locator("#quoteBoardToggle"), "quote board toggle");
  await expectOne(page.locator('#quoteBoardToggle[aria-expanded="false"]'), "collapsed quote board toggle");
  await expectOne(page.locator("#quoteBoardBody[hidden]"), "collapsed quote board body");
  for (const region of ["US Overnight", "Asia Watch", "India Open", "Macro Hedges"]) {
    assert.equal(await page.getByRole("heading", { name: region }).count(), 0, `${region} quote group should not render while collapsed`);
  }
  assert.equal(await page.locator('button[data-symbol="NIKKEI"]').count(), 0, "index tiles should not render until quote board expands");
  await expectOne(page.getByText("Source: Reuters Markets", { exact: true }), "Reuters source link");
  await expectOne(page.getByText("Moneycontrol Markets", { exact: true }), "Moneycontrol source");
  await expectOne(page.getByText("Economic Times Markets", { exact: true }), "Economic Times source");
}

async function expandQuoteBoard(page) {
  const toggle = page.locator("#quoteBoardToggle");
  await expectOne(toggle, "quote board toggle before expansion");
  await toggle.click();
  await page.locator("#quoteBoardBody").waitFor({ state: "visible", timeout: 15_000 });
  await expectOne(page.locator('#quoteBoardToggle[aria-expanded="true"]'), "expanded quote board toggle");
  assert.equal(await page.locator("#quoteBoardBody[hidden]").count(), 0, "expanded quote board body should not be hidden");
  for (const region of ["US Overnight", "Asia Watch", "India Open", "Macro Hedges"]) {
    await expectOne(page.getByRole("heading", { name: region }), `${region} quote group after expansion`);
  }
  await expectOne(page.getByRole("heading", { name: "Asia Watch" }), "asia watch heading");
  await expectOne(page.locator('button[data-symbol="NIKKEI"]').getByText("Japan - Nikkei 225", { exact: true }), "Japan Nikkei country label");
  await expectOne(page.locator('button[data-symbol="HSI"]').getByText("Hong Kong - Hang Seng", { exact: true }), "Hong Kong Hang Seng country label");
  await expectOne(page.locator('button[data-symbol="SHCOMP"]').getByText("Mainland China - Shanghai Composite", { exact: true }), "China Shanghai country label");
  await expectOne(page.locator('button[data-symbol="KOSPI"]').getByText("South Korea - KOSPI", { exact: true }), "South Korea KOSPI country label");
  await expectOne(page.locator('button[data-symbol="TAIEX"]').getByText("Taiwan - Taiwan Weighted", { exact: true }), "Taiwan Weighted country label");
  assert.equal(await page.locator('button[data-symbol="STI"]').count(), 0, "STI should not be visible in top-five Asia Watch");
  assert.equal(await page.locator('button[data-symbol="ASX200"]').count(), 0, "ASX200 should not be visible in top-five Asia Watch");
  const asiaBreadth = page.locator(".breadth-card").filter({ hasText: "Asia Watch (top 5 country markets)" });
  await expectOne(asiaBreadth, "top-five Asia breadth card");
  await expectOne(asiaBreadth.getByText(/\d of 5 country markets are higher; average move is/), "readable Asia breadth sentence");
}

async function expectOne(locator, label) {
  const count = await locator.count();
  assert.equal(count, 1, `${label} should resolve to exactly one element, got ${count}`);
}
