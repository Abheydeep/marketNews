import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = loadPlaywright();

const baseUrl = process.env.MARKET_NEWS_URL ?? "https://www.marketnarrative.in";
const cycles = Number.parseInt(process.env.SOAK_CYCLES ?? "5", 10);
const dailySlug = process.env.MARKET_NEWS_DAILY_SLUG ?? "4may2026";
const dailyDateLabel = process.env.MARKET_NEWS_DAILY_DATE_LABEL ?? "Mon, 04 May, 2026";
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
    const text = message.text();
    if (isExpectedLocalApiCorsNoise(text)) {
      return;
    }
    consoleErrors.push(text);
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

  await openPublicPage(page, rootUrl);
  await expectOne(page.getByRole("heading", { name: "Daily Pre-Market Briefing For Nifty And Bank Nifty" }), "archive product-promise heading");
  await expectOne(page.getByRole("link", { name: /Read today's brief/i }), "homepage primary briefing action");
  await expectOne(page.getByRole("link", { name: /Open Trading Guide/i }).first(), "homepage trading guide action");
  await expectOne(page.getByRole("link", { name: /Track Portfolio/i }), "homepage portfolio action");
  await expectOne(page.getByRole("heading", { name: "Recent briefings" }), "archive section heading");
  await expectOne(page.getByRole("link", { name: "Latest briefing" }), "latest briefing link");
  const openDailyLink = page.locator(`a.open-link[href="./${dailySlug}/"]`);
  await expectOne(openDailyLink.filter({ hasText: "Open briefing" }), "read market briefing link");
  const openDailyHref = await openDailyLink.getAttribute("href", { timeout: 10_000 });
  assert.ok(openDailyHref?.includes(dailySlug), `archive card points at unexpected href: ${openDailyHref}`);
  await expectOne(page.locator(".sentiment-sparkline").first(), "archive sentiment sparkline");
  await expectOne(page.getByText("Why it mattered for India", { exact: true }).first(), "archive India relevance driver");
  await expectOne(page.getByText("Top 8 India read-through notes selected", { exact: false }).first(), "archive simplified source-count language");
  assert.equal(
    await page.getByText("Daily Pre-Market Summary", { exact: true }).count(),
    0,
    "archive root must not render a daily briefing"
  );

  await openPublicPage(page, dailyUrl);
  await expectDailyContent(page);
  assert.equal(await page.locator("#trading-guide-view").count(), 0, "daily briefing must not render hidden trading-guide content");
  await expectOne(page.getByText("Join Email", { exact: false }), "briefing follow CTA");
  await expandQuoteBoard(page);

  const verifiedCharts = [];
  for (const symbol of expectedChartSymbols) {
    verifiedCharts.push(await verifyIndexChart(page, symbol));
  }

  await openPublicPage(page, `${baseUrl}/${dailySlug}/trading-guide/?soak=${stamp}`);
  await expectOne(page.locator('#trading-guide-view:not(.hidden)'), "trading guide is first visible surface");
  assert.equal(await page.locator("#public-view").count(), 0, "trading guide must not render hidden public briefing content");
  await expectOne(page.getByRole("heading", { name: "Opening levels, confirmation, and risk gates" }), "standalone trading guide heading");
  await expectOne(page.getByText("Today's Trade Map", { exact: true }), "standalone trading guide trade map");
  assert.equal(await page.locator('#public-view:not(.hidden)').count(), 0, "trading guide URL must not foreground the daily briefing");

  assert.equal(await page.getByRole("button", { name: "Studio Command (Admin)" }).count(), 0, "public page should not expose Studio Command tab");
  assert.equal(await page.locator("#studio-view").count(), 0, "public page should not render studio section");
  const publicDigest = await fetch(`${baseUrl.replace(/\/$/, "")}/${dailySlug}/digest.json`).then((response) => response.json());
  assert.equal(publicDigest.status, "PUBLISHED", "public digest.json must not expose DRAFT status");
  assert.equal(Object.hasOwn(publicDigest, "teleprompterScript"), false, "public digest.json must redact teleprompterScript");
  assert.equal(Object.hasOwn(publicDigest, "reelScript"), false, "public digest.json must redact reelScript");

  return {
    cycle,
    dailyUrl,
    chartTitle: verifiedCharts[0].title,
    chartHref: verifiedCharts[0].href,
    verifiedCharts: verifiedCharts.length,
    studioPublic: false
  };
}

async function openPublicPage(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  } catch (error) {
    if (!/Timeout/i.test(error.message)) {
      throw error;
    }
    await renderFetchedHtml(page, url);
  }
}

async function renderFetchedHtml(page, url) {
  const response = await fetch(url, { headers: { "User-Agent": "MarketNarrativeSoak/1.0" } });
  assert.equal(response.status, 200, `browser fallback fetch for ${url} returned HTTP ${response.status}`);
  const html = await response.text();
  const baseHref = new URL(url).href.replace(/[?#].*$/, "");
  const htmlWithBase = html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
  await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.setContent(htmlWithBase, { waitUntil: "domcontentloaded", timeout: 30_000 });
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
  assert.ok(href?.startsWith("/indices/#"), `${symbol} chart link should stay on Market Narrative, got ${href}`);
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

function isExpectedLocalApiCorsNoise(text) {
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/i.test(baseUrl)) {
    return false;
  }
  if (/^Failed to load resource: net::ERR_FAILED$/i.test(text.trim())) {
    return true;
  }
  return /api\.marketnarrative\.in\/api\/public\/digest/i.test(text) && /CORS policy|ERR_FAILED/i.test(text);
}

async function expectDailyContent(page) {
  const publicView = page.locator("#public-view");
  await expectOne(publicView.getByText("Daily Pre-Market Summary", { exact: true }), "daily summary heading");
  await expectOne(publicView.getByText(dailyDateLabel, { exact: true }), "daily date");
  const summaryExpand = publicView.locator("#summaryExpand");
  await expectOne(summaryExpand, "compact expandable summary");
  await expectOne(publicView.getByText("2 Minute Summary", { exact: true }).first(), "compact summary label");
  await expectOne(publicView.locator("#summaryExpand[open]"), "visible two-minute summary");
  const summaryBeforeShareAndMood = await publicView.locator("#summaryExpand").evaluate((node) => {
    const summaryTop = node.getBoundingClientRect().top;
    const shareTop = document.querySelector(".share-row")?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
    const moodTop = document.querySelector("[aria-label='Market mood and priority signals']")?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
    return summaryTop < shareTop && summaryTop < moodTop;
  });
  assert.equal(summaryBeforeShareAndMood, true, "two-minute summary should appear before share and mood modules");
  const compactSummary = await summaryExpand.locator("summary p").innerText({ timeout: 10_000 });
  assert.ok(compactSummary.split(/\s+/).filter(Boolean).length <= 50, "compact summary should be 50 words or fewer");
  assert.match(compactSummary, /Watch first: .*Nifty [0-9,]+\/[0-9,]+/, `compact summary missing hard first-watch level: ${compactSummary}`);
  assert.equal(/[A-Za-z0-9][,;:]\.|[A-Za-z0-9]\.[;:]/.test(compactSummary), false, `compact summary has malformed punctuation: ${compactSummary}`);
  assert.equal(/Global crude-flow signal|India impact runs only through/i.test(compactSummary), false, `compact summary leaked internal driver wording: ${compactSummary}`);
  await summaryExpand.locator("summary").click();
  await expectOne(publicView.locator("#summaryExpand:not([open])"), "two-minute summary collapses");
  await summaryExpand.locator("summary").click();
  await publicView.locator("#summaryExpand[open]").waitFor({ state: "visible", timeout: 10_000 });
  await expectOne(publicView.getByRole("heading", { name: "The Overnight Pulse" }), "overnight pulse heading");
  await expectOne(publicView.getByRole("heading", { name: "Market Map" }), "market map heading");
  assert.equal(await publicView.getByText("Pre-market desk note", { exact: true }).count(), 0, "daily brief should not show desk-note module");
  assert.equal(await publicView.getByRole("heading", { name: "Stories Driving The Open" }).count(), 0, "two-minute summary should not repeat stories module");
  assert.equal(await publicView.getByRole("heading", { name: "View Chart On TradingView" }).count(), 0, "daily brief should not show standalone chart CTA");
  assert.equal(await publicView.locator(".setup-card").count(), 0, "daily brief should not show trading recommendations");
  await expectOne(publicView.locator("#quoteBoardToggle"), "quote board toggle");
  await expectOne(publicView.getByText("Previous close/reference quotes", { exact: false }).or(publicView.getByText("Market quote context", { exact: false })), "explicit quote-board context");
  assert.equal(await publicView.getByText("live refresh pending", { exact: false }).count(), 0, "quote board must not imply live refresh when showing archived context");
  assert.equal(await publicView.getByText("Last available close", { exact: false }).count(), 0, "quote board must not foreground stale close copy");
  await expectOne(publicView.locator('#quoteBoardToggle[aria-expanded="false"]'), "collapsed quote board toggle");
  await expectOne(publicView.locator("#quoteBoardBody[hidden]"), "collapsed quote board body");
  for (const region of ["US Overnight", "Asia Watch", "India Open", "Macro Hedges"]) {
    assert.equal(await page.locator("#indexBoard .quote-region h3").filter({ hasText: region }).count(), 0, `${region} quote group should not render while collapsed`);
  }
  assert.equal(await page.locator('button[data-symbol="NIKKEI"]').count(), 0, "index tiles should not render until quote board expands");
  const sourceCards = await publicView.locator(".source-card").count();
  assert.equal(sourceCards, 8, `expected 8 India read-through source cards, got ${sourceCards}`);
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
  const moveStateCount =
    (await page.locator(".market-move.up").count()) +
    (await page.locator(".market-move.down").count()) +
    (await page.locator(".market-move.flat").count());
  assert.ok(moveStateCount > 0, "quote board should render quote move state classes");
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
