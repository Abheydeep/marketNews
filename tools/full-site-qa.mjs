import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = loadPlaywright();

const baseUrl = (process.env.MARKET_NEWS_URL ?? "https://abheydeep.github.io/marketNews").replace(/\/$/, "");
const cycles = Number.parseInt(process.env.FULL_QA_CYCLES ?? "5", 10);
const dailyPages = [
  { slug: "30apr2026", label: "Thu, 30 Apr, 2026" },
  { slug: "29apr2026", label: "Wed, 29 Apr, 2026" }
];
const chartSymbols = ["SPX", "NDX", "DJI", "NIKKEI", "HSI", "SHCOMP", "KOSPI", "TAIEX", "NIFTY", "BANKNIFTY", "DXY", "BRENT"];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const consoleErrors = [];
const pageErrors = [];

context.on("page", attachPageListeners);
await context.route("**/*", async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const base = new URL(baseUrl);
  const isSameSite = url.origin === base.origin && url.pathname.startsWith(base.pathname.replace(/\/$/, ""));
  if (!isSameSite && request.resourceType() === "document") {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!doctype html><title>External QA</title><main>External link reached: ${escapeHtml(url.href)}</main>`
    });
    return;
  }
  await route.continue();
});

const page = await context.newPage();

try {
  const summaries = [];
  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    summaries.push(await runCycle(page, cycle));
  }
  assert.deepEqual(consoleErrors, [], `browser console errors:\n${consoleErrors.join("\n")}`);
  assert.deepEqual(pageErrors, [], `page errors:\n${pageErrors.join("\n")}`);
  console.log(`PASS ${cycles}/${cycles} full-site QA cycles against ${baseUrl}`);
  for (const summary of summaries) {
    console.log(
      [
        `cycle=${summary.cycle}`,
        `archiveLinks=${summary.archiveLinks}`,
        `dailyPages=${summary.dailyPages}`,
        `chartButtons=${summary.chartButtons}`,
        `chartExternalLinks=${summary.chartExternalLinks}`,
        `sourceLinks=${summary.sourceLinks}`,
        `studioButtons=${summary.studioButtons}`,
        `tabs=${summary.tabs}`
      ].join(" | ")
    );
  }
} finally {
  await browser.close();
}

function attachPageListeners(targetPage) {
  targetPage.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(`${targetPage.url()} :: ${message.text()}`);
    }
  });
  targetPage.on("pageerror", (error) => {
    pageErrors.push(`${targetPage.url()} :: ${error.message}`);
  });
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
        "Playwright is required for full-site QA.",
        "Install it in this workspace or set PLAYWRIGHT_NODE_MODULES to a node_modules directory that contains playwright.",
        `Original error: ${error.message}`
      ].join(" ")
    );
  }
}

async function runCycle(page, cycle) {
  const stamp = `${Date.now()}-${cycle}`;
  const rootUrl = `${baseUrl}/?fullqa=${stamp}`;
  const archiveLinks = await verifyArchive(page, rootUrl);
  let chartButtons = 0;
  let chartExternalLinks = 0;
  let sourceLinks = 0;
  let studioButtons = 0;
  let tabs = 0;

  for (const daily of dailyPages) {
    const result = await verifyDailyPage(page, daily, stamp);
    chartButtons += result.chartButtons;
    chartExternalLinks += result.chartExternalLinks;
    sourceLinks += result.sourceLinks;
    studioButtons += result.studioButtons;
    tabs += result.tabs;
  }

  return {
    cycle,
    archiveLinks,
    dailyPages: dailyPages.length,
    chartButtons,
    chartExternalLinks,
    sourceLinks,
    studioButtons,
    tabs
  };
}

async function verifyArchive(page, rootUrl) {
  await page.goto(rootUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expectOne(page.getByRole("heading", { name: "All Market Narrative briefings" }), "archive heading");
  await expectOne(page.getByRole("link", { name: "Latest briefing" }), "latest briefing link");
  for (const daily of dailyPages) {
    await expectOne(page.locator(`a.open-link[href="./${daily.slug}/"]`), `${daily.slug} open daily link`);
    await expectAtLeast(page.getByText(daily.label, { exact: true }), 1, `${daily.slug} archive date`);
  }
  assert.equal(await page.getByText("Daily Pre-Market Summary", { exact: true }).count(), 0, "archive root must not render a daily briefing");

  const linkCount = await page.locator("a").count();
  for (let index = 0; index < linkCount; index += 1) {
    await page.goto(rootUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const link = page.locator("a").nth(index);
    const href = await link.getAttribute("href");
    assert.ok(href, `archive link ${index} should have href`);
    await clickInternalLink(page, link, href, "archive");
  }
  return linkCount;
}

async function verifyDailyPage(page, daily, stamp) {
  const dailyUrl = `${baseUrl}/${daily.slug}/?fullqa=${stamp}`;
  await page.goto(dailyUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expectOne(page.getByText("Daily Pre-Market Summary", { exact: true }), `${daily.slug} heading`);
  await expectAtLeast(page.getByText(daily.label, { exact: true }), 1, `${daily.slug} date`);
  await expectOne(page.getByText("Live Quote Board", { exact: true }), `${daily.slug} live quote board`);
  assert.equal(await page.getByText("Real Quote Board", { exact: true }).count(), 0, `${daily.slug} should not show Real Quote Board`);

  const brandLink = page.locator("a.brand");
  await expectOne(brandLink, `${daily.slug} brand link`);
  await clickInternalLink(page, brandLink, await brandLink.getAttribute("href"), `${daily.slug} brand`);
  await page.goto(dailyUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

  const tabs = await verifyTabs(page, daily);
  await clickTab(page, "Public Briefing", "Daily Pre-Market Summary");
  await verifySummary(page, daily);
  await verifyQuoteBoard(page, daily);
  const chartResult = await verifyCharts(page, daily);
  const sourceLinks = await clickSourceLinks(page, daily);
  const studioButtons = await verifyStudio(page, daily);
  await verifyArchitecture(page, daily);

  return {
    tabs,
    chartButtons: chartResult.buttons,
    chartExternalLinks: chartResult.externalLinks,
    sourceLinks,
    studioButtons
  };
}

async function verifyTabs(page, daily) {
  await clickTab(page, "Public Briefing", "Daily Pre-Market Summary");
  await clickTab(page, "Studio Command (Admin)", "Studio Command Center");
  await clickTab(page, "Engine Architecture", "Engine Architecture & Roadmap");
  await clickTab(page, "Public Briefing", "Daily Pre-Market Summary");
  return 4;
}

async function clickTab(page, name, expectedHeading) {
  const tab = page.getByRole("button", { name });
  await expectOne(tab, `${name} tab`);
  await tab.click();
  if (expectedHeading === "Daily Pre-Market Summary") {
    await expectAtLeast(page.getByText(expectedHeading, { exact: true }), 1, `${expectedHeading} label`);
  } else {
    await expectOne(page.getByRole("heading", { name: expectedHeading }), `${expectedHeading} heading`);
  }
}

async function verifySummary(page, daily) {
  const summary = page.locator("#summaryExpand");
  await expectOne(summary, `${daily.slug} compact summary details`);
  await expectOne(summary.locator("summary"), `${daily.slug} compact summary toggle`);
  await expectOne(page.locator("#summaryExpand:not([open])"), `${daily.slug} summary initially collapsed`);
  await summary.locator("summary").click();
  await page.locator("#summaryExpand[open]").waitFor({ state: "visible", timeout: 10_000 });
  await expectOne(page.getByText("Expanded briefing after multi-source extraction", { exact: true }), `${daily.slug} expanded briefing`);
  await summary.locator("summary").click();
  await expectOne(page.locator("#summaryExpand:not([open])"), `${daily.slug} summary closes`);
}

async function verifyQuoteBoard(page, daily) {
  const toggle = page.locator("#quoteBoardToggle");
  await expectOne(toggle, `${daily.slug} quote board toggle`);
  await toggle.click();
  await page.locator("#quoteBoardBody").waitFor({ state: "visible", timeout: 15_000 });
  await expectOne(page.getByText("Select a market card above to inspect its live quotes and open charts.", { exact: true }), `${daily.slug} quote board prompt`);
  for (const region of ["US Overnight", "Asia Watch", "India Open", "Macro Hedges"]) {
    const card = page.locator(`button.breadth-card[data-region="${region}"]`);
    await expectOne(card, `${daily.slug} ${region} card`);
    await expectOne(card.locator(".market-state"), `${daily.slug} ${region} state pill`);
    await card.click();
    await expectOne(page.locator("#indexBoard .quote-region h3").filter({ hasText: region }), `${daily.slug} ${region} quote section`);
    await expectOne(page.locator(`button.breadth-card[data-region="${region}"][aria-pressed="true"]`), `${daily.slug} ${region} selected`);
  }
  assert.ok(await page.locator(".breadth-card .market-move.up").count() > 0, `${daily.slug} should color gains green`);
  assert.ok(await page.locator(".breadth-card .market-move.down").count() > 0, `${daily.slug} should color losses red`);
  await toggle.click();
  await expectOne(page.locator("#quoteBoardBody[hidden]"), `${daily.slug} quote board collapses`);
  await toggle.click();
  await page.locator("#quoteBoardBody").waitFor({ state: "visible", timeout: 15_000 });
}

async function verifyCharts(page, daily) {
  let externalLinks = 0;
  for (const symbol of chartSymbols) {
    const region = regionForSymbol(symbol);
    await page.locator(`button.breadth-card[data-region="${region}"]`).click();
    const tile = page.locator(`button[data-symbol="${symbol}"]`);
    await expectOne(tile, `${daily.slug} ${symbol} tile`);
    await tile.click();
    await page.locator("#indexChartModal.open").waitFor({ state: "visible", timeout: 15_000 });
    const title = await page.locator("#indexChartTitle").innerText({ timeout: 10_000 });
    assert.ok(title.includes(symbol), `${daily.slug} ${symbol} chart title should include symbol, got ${title}`);
    const canvas = page.locator("#marketChartCanvas");
    assert.equal(await canvas.getAttribute("data-render-state", { timeout: 10_000 }), "rendered", `${daily.slug} ${symbol} chart should render`);
    const stats = await canvas.evaluate((node) => {
      const context = node.getContext("2d");
      const pixels = context.getImageData(0, 0, node.width, node.height).data;
      let nonBlank = 0;
      for (let offset = 0; offset < pixels.length; offset += 16) {
        if (pixels[offset] < 245 || pixels[offset + 1] < 245 || pixels[offset + 2] < 245) {
          nonBlank += 1;
        }
      }
      return { width: node.width, height: node.height, nonBlank };
    });
    assert.ok(stats.width > 200 && stats.height > 160, `${daily.slug} ${symbol} chart should have dimensions`);
    assert.ok(stats.nonBlank > 100, `${daily.slug} ${symbol} chart appears blank`);
    const chartLink = page.locator("#openFullChart");
    await expectOne(chartLink, `${daily.slug} ${symbol} full chart link`);
    await clickExternalPopup(page, chartLink, "https://finance.yahoo.com/quote/", `${daily.slug} ${symbol} Yahoo chart`);
    externalLinks += 1;
    const close = page.getByRole("button", { name: "Close index chart" });
    await expectOne(close, `${daily.slug} ${symbol} close chart`);
    await close.click();
    await page.locator("#indexChartModal.open").waitFor({ state: "hidden", timeout: 15_000 });
  }
  return { buttons: chartSymbols.length, externalLinks };
}

async function clickSourceLinks(page, daily) {
  await clickTab(page, "Public Briefing", "Daily Pre-Market Summary");
  await verifySourceFilters(page, daily);
  const links = page.locator(".source-lead-card a, .source-card a");
  const count = await links.count();
  assert.ok(count >= 15, `${daily.slug} should render at least 15 source links`);
  for (let index = 0; index < count; index += 1) {
    await clickExternalPopup(page, links.nth(index), "http", `${daily.slug} source link ${index + 1}`);
  }
  return count;
}

async function verifySourceFilters(page, daily) {
  await expectOne(page.getByText("Evidence Map", { exact: true }), `${daily.slug} source evidence map`);
  await expectOne(page.getByText("Lead evidence", { exact: true }), `${daily.slug} lead source evidence`);
  const buttons = page.locator("[data-source-filter]");
  const buttonCount = await buttons.count();
  assert.ok(buttonCount >= 5, `${daily.slug} should render source filter buttons`);

  for (let index = 1; index < buttonCount; index += 1) {
    const button = buttons.nth(index);
    const filter = await button.getAttribute("data-source-filter");
    await button.click();
    await expectOne(page.locator(`[data-source-filter="${filter}"][aria-pressed="true"]`), `${daily.slug} source filter ${filter} active`);
    const visibleCards = await page.locator(`.source-card[data-source-category="${filter}"]:visible`).count();
    assert.ok(visibleCards > 0, `${daily.slug} source filter ${filter} should show cards`);
  }

  await page.locator('[data-source-filter="all"]').click();
  await expectOne(page.locator('[data-source-filter="all"][aria-pressed="true"]'), `${daily.slug} all source filter active`);
  assert.ok(await page.locator(".source-card:visible").count() >= 14, `${daily.slug} all source filter should restore cards`);
}

async function verifyStudio(page, daily) {
  await clickTab(page, "Studio Command (Admin)", "Studio Command Center");
  const actions = [
    { name: "Run Digest Check", expected: "Digest check completed" },
    { name: "Regenerate Script", expected: "Script regeneration simulated" },
    { name: "Publish Digest", expected: "Publish queued" }
  ];
  for (const action of actions) {
    const button = page.getByRole("button", { name: action.name });
    await expectOne(button, `${daily.slug} ${action.name}`);
    await button.click();
    await expectOne(page.getByText(action.expected, { exact: true }), `${daily.slug} ${action.expected}`);
  }
  for (const speed of ["Slow", "Normal", "Fast", "Reset"]) {
    const button = page.getByRole("button", { name: speed });
    await expectOne(button, `${daily.slug} ${speed} speed button`);
    await button.click();
  }
  const play = page.locator("#togglePrompterBtn");
  await expectOne(play, `${daily.slug} play script`);
  await play.click();
  await expectOne(page.locator("#teleprompterContainer.playing"), `${daily.slug} teleprompter playing`);
  await play.click();
  assert.equal(await page.locator("#teleprompterContainer.playing").count(), 0, `${daily.slug} teleprompter pauses`);
  const asset = page.getByRole("button", { name: "Generate Daily Thumbnail" });
  await expectOne(asset, `${daily.slug} generate thumbnail`);
  await asset.click();
  await page.getByRole("button", { name: "Asset Generated" }).waitFor({ state: "visible", timeout: 5_000 });
  return actions.length + 4 + 3;
}

async function verifyArchitecture(page, daily) {
  await clickTab(page, "Engine Architecture", "Engine Architecture & Roadmap");
  await expectOne(page.getByRole("heading", { name: "Tech Stack Overview" }), `${daily.slug} tech stack`);
  await expectOne(page.getByRole("heading", { name: "Execution Milestones" }), `${daily.slug} milestones`);
}

async function clickInternalLink(page, locator, href, label) {
  assert.ok(href, `${label} href should exist`);
  const before = page.url();
  const resolved = new URL(href, before).href;
  const expected = stripQuery(resolved);
  await Promise.all([
    page.waitForURL((url) => stripQuery(url.href) === expected, { timeout: 30_000 }),
    locator.click()
  ]);
  const after = page.url();
  assert.equal(stripQuery(after), stripQuery(resolved), `${label} should navigate to ${resolved}, got ${after}`);
}

async function clickExternalPopup(page, locator, expectedPrefix, label) {
  const href = await locator.getAttribute("href");
  assert.ok(href?.startsWith(expectedPrefix), `${label} href should start with ${expectedPrefix}, got ${href}`);
  const popupPromise = page.waitForEvent("popup", { timeout: 10_000 });
  await locator.click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => {});
  assert.ok(popup.url().startsWith(expectedPrefix), `${label} popup should open ${expectedPrefix}, got ${popup.url()}`);
  await popup.close();
}

function regionForSymbol(symbol) {
  if (["SPX", "NDX", "DJI"].includes(symbol)) return "US Overnight";
  if (["NIFTY", "BANKNIFTY"].includes(symbol)) return "India Open";
  if (["DXY", "BRENT"].includes(symbol)) return "Macro Hedges";
  return "Asia Watch";
}

async function expectOne(locator, label) {
  const count = await locator.count();
  assert.equal(count, 1, `${label} should resolve to exactly one element, got ${count}`);
}

async function expectAtLeast(locator, minimum, label) {
  const count = await locator.count();
  assert.ok(count >= minimum, `${label} should resolve to at least ${minimum} element(s), got ${count}`);
}

function stripQuery(value) {
  const url = new URL(value);
  url.search = "";
  url.hash = "";
  return url.href;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
