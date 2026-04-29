import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const baseUrl = process.env.MARKET_NEWS_URL ?? "https://abheydeep.github.io/marketNews";
const cycles = Number.parseInt(process.env.SOAK_CYCLES ?? "5", 10);

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
        `chartTitle="${result.chartTitle}"`,
        `chartLink=${result.chartHref}`,
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
    page.waitForURL(/\/marketNews\/29apr2026\/?/, { timeout: 30_000 }),
    openDailyLink.click()
  ]);
  assert.ok(page.url().includes("/marketNews/29apr2026/"), `archive card opened unexpected URL: ${page.url()}`);
  await expectDailyContent(page);

  await page.goto(dailyUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expectDailyContent(page);

  const nikkeiTile = page.locator('button[data-symbol="NIKKEI"]');
  await expectOne(nikkeiTile, "Nikkei index tile");
  await nikkeiTile.click();
  await page.locator("#indexChartModal.open").waitFor({ state: "visible", timeout: 15_000 });
  const chartTitle = await page.locator("#indexChartTitle").innerText({ timeout: 10_000 });
  const chartHref = await page.locator("#openFullChart").getAttribute("href", { timeout: 10_000 });
  assert.ok(chartTitle.includes("Nikkei 225"), `chart title should identify Nikkei 225, got ${chartTitle}`);
  assert.ok(chartHref?.includes("TVC%3ANI225"), `Nikkei chart link should use TradingView NI225, got ${chartHref}`);

  const closeChart = page.getByRole("button", { name: "Close index chart" });
  await expectOne(closeChart, "chart close button");
  await closeChart.click();
  await page.locator("#indexChartModal.open").waitFor({ state: "hidden", timeout: 15_000 });

  const adminTab = page.getByRole("button", { name: "Studio Command (Admin)" });
  await expectOne(adminTab, "studio command tab");
  await adminTab.click();
  await expectOne(page.getByRole("heading", { name: "Studio Command Center" }), "studio command heading");
  await expectOne(page.getByRole("button", { name: "Generate Daily Thumbnail" }), "generate thumbnail button");

  return {
    cycle,
    dailyUrl: page.url(),
    chartTitle,
    chartHref,
    adminReady: true
  };
}

async function expectDailyContent(page) {
  await expectOne(page.getByText("Daily Pre-Market Summary", { exact: true }), "daily summary heading");
  await expectOne(page.getByText("Wed, 29 Apr, 2026", { exact: true }), "daily date");
  await expectOne(page.getByRole("heading", { name: "The Overnight Pulse" }), "overnight pulse heading");
  await expectOne(page.getByRole("heading", { name: "Asia Watch" }), "asia watch heading");
  await expectOne(page.locator('button[data-symbol="NIKKEI"]'), "Nikkei index tile");
  await expectOne(page.locator('button[data-symbol="HSI"]'), "Hang Seng index tile");
  await expectOne(page.getByText("Source: Reuters Markets", { exact: true }), "Reuters source link");
}

async function expectOne(locator, label) {
  const count = await locator.count();
  assert.equal(count, 1, `${label} should resolve to exactly one element, got ${count}`);
}
