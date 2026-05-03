import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = loadPlaywright();

const baseUrl = process.env.MARKET_NEWS_URL ?? "https://abheydeep.github.io/marketNews";
const cycles = Number.parseInt(process.env.SOAK_CYCLES ?? "5", 10);
const dailySlug = process.env.MARKET_NEWS_DAILY_SLUG ?? "3may2026";
const dailyDateLabel = process.env.MARKET_NEWS_DAILY_DATE_LABEL ?? "Sun, 03 May, 2026";
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
        `studioPublic=${result.studioPublic}`
      ].join(" | ")
    );
  }
} finally {
  await browser.close();
}

async function runCycle(page, cycle) {
  const stamp = `${Date.now()}-${cycle}`;
  const rootUrl = `${baseUrl}/?soak=${stamp}`;
  const dailyUrl = `${baseUrl}/${dailySlug}/?soak=${stamp}`;

  await page.goto(rootUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expectOne(page.getByRole("heading", { name: "Market Narrative" }), "archive heading");
  await expectOne(page.getByRole("heading", { name: "Latest Market Briefings" }), "archive section heading");
  await expectOne(page.getByRole("link", { name: "Latest briefing" }), "latest briefing link");
  const openDailyLink = page.locator(`a.open-link[href="./${dailySlug}/"]`);
  await expectOne(openDailyLink.filter({ hasText: "Read market briefing" }), "read market briefing link");
  await expectOne(page.locator(".sentiment-sparkline").first(), "archive sentiment sparkline");
  await expectOne(page.getByText("Previous session driver", { exact: true }).first(), "archive previous session driver");
  assert.equal(
    await page.getByText("Daily Pre-Market Summary", { exact: true }).count(),
    0,
    "archive root must not render a daily briefing"
  );

  await Promise.all([
    page.waitForURL((url) => url.href.includes(`/${dailySlug}/`), { timeout: 30_000, waitUntil: "domcontentloaded" }),
    openDailyLink.click()
  ]);
  assert.ok(page.url().includes(`/${dailySlug}/`), `archive card opened unexpected URL: ${page.url()}`);
  await expectDailyContent(page);

  await page.goto(dailyUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expectDailyContent(page);
  await expandQuoteBoard(page);

  const verifiedCharts = [];
  for (const symbol of expectedChartSymbols) {
    verifiedCharts.push(await verifyIndexChart(page, symbol));
  }

  assert.equal(await page.getByRole("button", { name: "Studio Command (Admin)" }).count(), 0, "public page should not expose Studio Command tab");
  assert.equal(await page.locator("#studio-view").count(), 0, "public page should not render studio section");
  const publicDigest = await fetch(`${baseUrl.replace(/\/$/, "")}/${dailySlug}/digest.json`).then((response) => response.json());
  assert.equal(Object.hasOwn(publicDigest, "teleprompterScript"), false, "public digest.json must redact teleprompterScript");
  assert.equal(Object.hasOwn(publicDigest, "reelScript"), false, "public digest.json must redact reelScript");

  return {
    cycle,
    dailyUrl: page.url(),
    chartTitle: verifiedCharts[0].title,
    chartHref: verifiedCharts[0].href,
    verifiedCharts: verifiedCharts.length,
    studioPublic: false
  };
}

async function verifyIndexChart(page, symbol) {
  const region = regionForTestSymbol(symbol);
  const regionCard = page.locator(`button.breadth-card[data-region="${region}"]`);
  await expectOne(regionCard, `${region} region card for ${symbol}`);
  await regionCard.click();
  await expectOne(page.locator("#indexBoard .quote-region h3").filter({ hasText: region }), `${region} quote group for ${symbol}`);
  const tile = page.locator(`button[data-symbol="${symbol}"]`);
  await expectOne(tile, `${symbol} index tile`);
  await tile.click();
  await page.locator("#indexChartModal.open").waitFor({ state: "visible", timeout: 15_000 });

  const title = await page.locator("#indexChartTitle").innerText({ timeout: 10_000 });
  const href = await page.locator("#openFullChart").getAttribute("href", { timeout: 10_000 });
  const renderState = await page.locator("#marketChartCanvas").getAttribute("data-render-state", { timeout: 10_000 });
  assert.ok(title.includes(symbol), `${symbol} chart title should include symbol, got ${title}`);
  assert.ok(href?.startsWith("https://www.tradingview.com/chart/"), `${symbol} chart link should use TradingView, got ${href}`);
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

function regionForTestSymbol(symbol) {
  if (["SPX", "NDX", "DJI"].includes(symbol)) return "US Overnight";
  if (["NIFTY", "BANKNIFTY"].includes(symbol)) return "India Open";
  if (["DXY", "BRENT"].includes(symbol)) return "Macro Hedges";
  return "Asia Watch";
}

async function expectDailyContent(page) {
  const publicView = page.locator("#public-view");
  await expectOne(publicView.getByText("Daily Pre-Market Summary", { exact: true }), "daily summary heading");
  await expectOne(publicView.getByText(dailyDateLabel, { exact: true }), "daily date");
  const summaryExpand = publicView.locator("#summaryExpand");
  await expectOne(summaryExpand, "compact expandable summary");
  await expectOne(publicView.getByText("2 min read", { exact: true }), "compact summary label");
  await expectOne(publicView.locator("#summaryExpand:not([open])"), "collapsed expanded briefing");
  const compactSummary = await summaryExpand.locator("summary p").innerText({ timeout: 10_000 });
  assert.ok(compactSummary.split(/\s+/).filter(Boolean).length <= 50, "compact summary should be 50 words or fewer");
  await summaryExpand.locator("summary").click();
  await publicView.locator("#summaryExpand[open]").waitFor({ state: "visible", timeout: 10_000 });
  await expectOne(publicView.getByText("Pre-market desk note", { exact: true }), "expanded briefing label");
  await expectOne(publicView.getByRole("heading", { name: "The Overnight Pulse" }), "overnight pulse heading");
  await expectOne(publicView.getByRole("heading", { name: "Market Map" }), "market map heading");
  await expectOne(publicView.getByRole("heading", { name: "Stories Driving The Open" }), "stories heading");
  await expectOne(publicView.getByRole("heading", { name: "How It Lands In India" }), "india read-through heading");
  await expectOne(publicView.getByRole("heading", { name: "What To Watch First" }), "watch next heading");
  await expectOne(publicView.getByRole("heading", { name: "Live Chart" }), "live chart CTA heading");
  await expectOne(publicView.getByRole("link", { name: "Open live chart on TradingView" }), "live chart CTA link");
  const setupCard = publicView.locator(".setup-card");
  await expectOne(setupCard, "algorithmic setup card");
  const setupStateCount = await setupCard.getByText(/Active Game Plan|Completed Setups|No active trade setup/i).count();
  assert.ok(setupStateCount > 0, "setup card should show an active, completed, or no-active-trade state");
  await expectOne(publicView.locator("#quoteBoardToggle"), "quote board toggle");
  await expectOne(publicView.locator('#quoteBoardToggle[aria-expanded="false"]'), "collapsed quote board toggle");
  await expectOne(publicView.locator("#quoteBoardBody[hidden]"), "collapsed quote board body");
  for (const region of ["US Overnight", "Asia Watch", "India Open", "Macro Hedges"]) {
    assert.equal(await page.locator("#indexBoard .quote-region h3").filter({ hasText: region }).count(), 0, `${region} quote group should not render while collapsed`);
  }
  assert.equal(await page.locator('button[data-symbol="NIKKEI"]').count(), 0, "index tiles should not render until quote board expands");
  const sourceCards = await publicView.locator(".source-card").count();
  assert.ok(sourceCards >= 14, `expected at least 14 source cards, got ${sourceCards}`);
  assert.equal(await publicView.locator(".source-card .source-thumb").count(), sourceCards, "each source card should render one thumbnail");
  assert.equal(await publicView.getByText("weight 0.", { exact: false }).count(), 0, "raw source weights should not render");
}

async function expandQuoteBoard(page) {
  const toggle = page.locator("#quoteBoardToggle");
  await expectOne(toggle, "quote board toggle before expansion");
  await toggle.click();
  await page.locator("#quoteBoardBody").waitFor({ state: "visible", timeout: 15_000 });
  await expectOne(page.locator('#quoteBoardToggle[aria-expanded="true"]'), "expanded quote board toggle");
  assert.equal(await page.locator("#quoteBoardBody[hidden]").count(), 0, "expanded quote board body should not be hidden");
  await expectOne(page.getByText("Select a market card above to inspect its live quotes and open charts.", { exact: true }), "quote board selection prompt");
  for (const region of ["US Overnight", "Asia Watch", "India Open", "Macro Hedges"]) {
    await expectOne(page.locator(`button.breadth-card[data-region="${region}"]`), `${region} quote board card`);
    await expectOne(page.locator(`button.breadth-card[data-region="${region}"] .market-state`), `${region} live/closed state`);
    assert.equal(await page.locator("#indexBoard .quote-region h3").filter({ hasText: region }).count(), 0, `${region} quote group should wait for card click`);
  }
  assert.ok(await page.locator(".breadth-card .market-move.up").count() > 0, "quote board should color positive moves green");
  assert.ok(await page.locator(".breadth-card .market-move.down").count() > 0, "quote board should color negative moves red");
  const usCard = page.locator('button.breadth-card[data-region="US Overnight"]');
  await usCard.click();
  await expectOne(page.locator("#indexBoard .quote-region h3").filter({ hasText: "US Overnight" }), "US Overnight quote group after card click");
  await expectOne(page.locator('button[data-symbol="SPX"]'), "SPX tile after US card click");
  assert.equal(await page.locator('button[data-symbol="NIKKEI"]').count(), 0, "Asia tiles should not render after US card click");
  const asiaCard = page.locator('button.breadth-card[data-region="Asia Watch"]');
  await asiaCard.click();
  await expectOne(page.locator("#indexBoard .quote-region h3").filter({ hasText: "Asia Watch" }), "asia watch heading");
  assert.equal(await page.locator('button[data-symbol="SPX"]').count(), 0, "US tiles should not render after Asia card click");
  await expectOne(page.locator('button[data-symbol="NIKKEI"]').getByText("Japan - Nikkei 225", { exact: true }), "Japan Nikkei country label");
  await expectOne(page.locator('button[data-symbol="HSI"]').getByText("Hong Kong - Hang Seng", { exact: true }), "Hong Kong Hang Seng country label");
  await expectOne(page.locator('button[data-symbol="SHCOMP"]').getByText("Mainland China - Shanghai Composite", { exact: true }), "China Shanghai country label");
  await expectOne(page.locator('button[data-symbol="KOSPI"]').getByText("South Korea - KOSPI", { exact: true }), "South Korea KOSPI country label");
  await expectOne(page.locator('button[data-symbol="TAIEX"]').getByText("Taiwan - Taiwan Weighted", { exact: true }), "Taiwan Weighted country label");
  assert.equal(await page.locator('button[data-symbol="STI"]').count(), 0, "STI should not be visible in top-five Asia Watch");
  assert.equal(await page.locator('button[data-symbol="ASX200"]').count(), 0, "ASX200 should not be visible in top-five Asia Watch");
  const asiaBreadth = page.locator(".breadth-card").filter({ hasText: "Asia Watch" });
  await expectOne(asiaBreadth, "top-five Asia breadth card");
  await expectOne(asiaBreadth.getByText(/\d up\s*\/ 5 tracked/), "compact Asia breadth sentence");
  await expectOne(asiaBreadth.getByText("Top 5 countries", { exact: false }), "top-five Asia breadth context");
  await page.locator('button.breadth-card[data-region="India Open"]').click();
  await expectOne(page.locator("#indexBoard .quote-region h3").filter({ hasText: "India Open" }), "India Open quote group after card click");
  assert.equal(await page.locator('button[data-symbol="SPX"]').count(), 0, "US tiles should not render after India card click");
  await page.locator('button.breadth-card[data-region="Macro Hedges"]').click();
  await expectOne(page.locator("#indexBoard .quote-region h3").filter({ hasText: "Macro Hedges" }), "Macro Hedges quote group after card click");
  assert.equal(await page.locator('button[data-symbol="NIFTY"]').count(), 0, "India tiles should not render after Macro card click");
}

async function expectOne(locator, label) {
  const count = await locator.count();
  assert.equal(count, 1, `${label} should resolve to exactly one element, got ${count}`);
}

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (error) {
    const fallbackRoot =
      process.env.PLAYWRIGHT_NODE_MODULES ??
      (process.env.HOME
        ? join(process.env.HOME, ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules")
        : "");
    if (fallbackRoot) {
      try {
        const fallbackRequire = createRequire(join(fallbackRoot, "playwright", "package.json"));
        return fallbackRequire("playwright");
      } catch {
        // Fall through to the actionable error below.
      }
    }
    throw new Error(
      [
        "Playwright is required for live-site soak.",
        "Install it in this workspace or set PLAYWRIGHT_NODE_MODULES to a node_modules directory that contains playwright.",
        `Original error: ${error.message}`
      ].join(" ")
    );
  }
}
