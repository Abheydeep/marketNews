import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { assertPublicBriefingCopy } from "./editorial-guardrails.mjs";

const require = createRequire(import.meta.url);
const { chromium } = loadPlaywright();

const baseUrl = (process.env.MARKET_NEWS_URL ?? "https://abheydeep.github.io/marketNews").replace(/\/$/, "");
const cycles = Number.parseInt(process.env.FULL_QA_CYCLES ?? "5", 10);
const dailyPages = parseDailyPages(process.env.FULL_QA_DAILY_PAGES) ?? [
  { slug: "3may2026", label: "Sun, 03 May, 2026" },
  { slug: "1may2026", label: "Fri, 01 May, 2026", archive: false }
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
  if (!isSameSite && ["api.marketnarrative.in", "trade-api.marketnarrative.in"].includes(url.hostname)) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: "qa-admin-token", status: "ok" })
    });
    return;
  }
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
        `adminChecks=${summary.adminChecks}`,
        `darkPreviewCards=${summary.darkPreviewCards}`,
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
  const darkPreviewCards = await verifyDarkPreview(page, stamp);
  const adminResult = await verifyAdminRoutes(page, stamp);
  const adminChecks = adminResult.checks;
  let chartButtons = 0;
  let chartExternalLinks = 0;
  let sourceLinks = 0;
  let studioButtons = adminResult.studioButtons;
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
    adminChecks,
    darkPreviewCards,
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
  assertPublicBriefingCopy("archive page HTML", await page.content());
  await expectOne(page.locator("body.archive-dark"), "archive dark theme");
  await verifyDarkSurfaceContrast(page, "archive dark page", { rootSelector: ".archive-dark", minimumSamples: 20 });
  await expectOne(page.getByRole("heading", { name: "Market Narrative" }), "archive heading");
  await expectOne(page.getByText("Pre-Market Intelligence Archive", { exact: true }), "archive eyebrow");
  await expectOne(page.getByRole("heading", { name: "Latest Market Briefings" }), "archive section heading");
  await expectOne(page.getByRole("link", { name: "Latest briefing" }), "latest briefing link");
  await expectOne(page.locator(".hero .byline").filter({ hasText: "By Abhey Deep / Market Narrative" }), "archive byline");
  await expectOne(page.locator(".summary-chip").filter({ hasText: "Last verified update" }), "archive last verified update");
  assert.equal(await page.getByRole("link", { name: "Admin login" }).count(), 0, "archive should not expose admin login");
  await expectAtLeast(page.getByText("Previous session driver", { exact: true }), 1, "archive previous session driver");
  await expectAtLeast(page.locator(".sentiment-sparkline"), 1, "archive sentiment sparkline");
  assert.equal(await page.getByRole("link", { name: "Dark preview" }).count(), 0, "archive should not expose a separate dark preview link");
  assert.equal(await page.getByRole("link", { name: "Project components" }).count(), 0, "archive should not expose admin project components");
  for (const daily of dailyPages) {
    if (daily.archive !== false) {
      await expectOne(page.locator(`a.open-link[href="./${daily.slug}/"]`), `${daily.slug} open daily link`);
      await expectOne(page.locator(`a.open-link[href="./${daily.slug}/"]`).filter({ hasText: "Read market briefing" }), `${daily.slug} read market briefing link`);
      await expectAtLeast(page.getByText(daily.label, { exact: true }), 1, `${daily.slug} archive date`);
    }
  }
  for (const phrase of ["All Market Narrative briefings", "The root page now works", "Asia watch:", "markets tracked", "Open daily briefing"]) {
    assert.equal(await page.getByText(phrase, { exact: false }).count(), 0, `archive should not show rough copy: ${phrase}`);
  }
  assert.equal(await page.getByText("Daily Pre-Market Summary", { exact: true }).count(), 0, "archive root must not render a daily briefing");

  const linkCount = await page.locator("a").count();
  for (let index = 0; index < linkCount; index += 1) {
    await page.goto(rootUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const link = page.locator("a").nth(index);
    const href = await link.getAttribute("href");
    assert.ok(href, `archive link ${index} should have href`);
    if (!isInternalHref(href)) {
      continue;
    }
    await clickInternalLink(page, link, href, "archive");
  }
  return linkCount;
}

async function verifyDarkPreview(page, stamp) {
  const preview = { slug: "dark-preview", label: "dark preview" };
  const previewUrl = `${baseUrl}/dark-preview/?fullqa=${stamp}`;
  await page.goto(previewUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  assertPublicBriefingCopy("dark preview HTML", await page.content());
  await expectOne(page.locator("body.glass-v2"), "dark preview glass theme");
  await expectOne(page.getByText("Daily Pre-Market Summary", { exact: true }), "dark preview heading");
  await expectOne(page.getByText("Market Mood", { exact: true }), "dark preview market mood rail");
  await expectOne(page.getByText("Primary Driver", { exact: true }), "dark preview primary driver rail");
  await expectOne(page.getByText("India Filter", { exact: true }), "dark preview india filter rail");
  await expectOne(page.getByText("Live Quote Board", { exact: true }), "dark preview live quote board");
  assert.equal(await page.getByRole("button", { name: "Studio Command (Admin)" }).count(), 0, "dark preview should not expose Studio Command");
  assert.equal(await page.locator("#studio-view").count(), 0, "dark preview should not render studio section");
  const sourceCards = page.locator(".source-card[role='link'][data-source-url]");
  const sourceCardCount = await sourceCards.count();
  assert.ok(sourceCardCount >= 14, `dark preview should render whole-card source links, got ${sourceCardCount}`);
  await verifyDarkSurfaceContrast(page, "dark preview initial view");
  await verifySummary(page, preview, { keepOpen: true });
  await verifyDarkSurfaceContrast(page, "dark preview expanded summary");
  await page.locator("#summaryExpand > summary").click();
  await expectOne(page.locator("#summaryExpand:not([open])"), "dark preview summary closes after contrast check");
  await verifyQuoteBoard(page, preview);
  await verifyPublicDigestJson(preview, stamp);
  return sourceCardCount;
}

async function verifyDarkSurfaceContrast(page, label, options = {}) {
  const result = await page.evaluate((input) => {
    const base = [5, 8, 22];
    const root = document.querySelector(input.rootSelector) ?? document.querySelector(".glass-v2 #public-view") ?? document.querySelector(".glass-v2") ?? document.body;
    const ignoredTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "CANVAS"]);
    const samples = Array.from(root.querySelectorAll("*"))
      .filter((node) => hasVisibleDirectText(node, ignoredTags))
      .map((node) => ({
        selector: selectorFor(node),
        color: getComputedStyle(node).color,
        text: directText(node).slice(0, 70)
      }));
    const ratios = samples.map((sample) => ({
      ...sample,
      ratio: contrastRatio(parseRgb(sample.color), base)
    }));
    const failures = ratios
      .filter((sample) => sample.ratio < 4.5)
      .sort((left, right) => left.ratio - right.ratio)
      .slice(0, 12);
    return {
      min: Math.min(...ratios.map((sample) => sample.ratio)),
      count: ratios.length,
      failures
    };

    function hasVisibleDirectText(node, ignoredTags) {
      if (ignoredTags.has(node.tagName)) {
        return false;
      }
      if (!directText(node)) {
        return false;
      }
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) < 0.15) {
        return false;
      }
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }

    function directText(node) {
      return Array.from(node.childNodes)
        .filter((child) => child.nodeType === Node.TEXT_NODE)
        .map((child) => child.textContent.trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function selectorFor(node) {
      const tag = node.tagName.toLowerCase();
      const id = node.id ? `#${node.id}` : "";
      const className = Array.from(node.classList).slice(0, 3).map((item) => `.${item}`).join("");
      return `${tag}${id}${className}`;
    }

    function parseRgb(value) {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) {
        return [255, 255, 255];
      }
      return match[1].split(",").slice(0, 3).map((channel) => Number.parseFloat(channel));
    }

    function contrastRatio(foreground, background) {
      const bright = luminance(foreground);
      const dark = luminance(background);
      return (Math.max(bright, dark) + 0.05) / (Math.min(bright, dark) + 0.05);
    }

    function luminance(rgb) {
      const [red, green, blue] = rgb.map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return red * 0.2126 + green * 0.7152 + blue * 0.0722;
    }
  }, {
    rootSelector: options.rootSelector ?? ".glass-v2 #public-view"
  });

  assert.ok(result.count > (options.minimumSamples ?? 40), `${label} should sample visible text nodes, got ${result.count}`);
  assert.deepEqual(
    result.failures,
    [],
    `${label} has visible text below 4.5:1 contrast: ${JSON.stringify(result.failures, null, 2)}`
  );
}

async function verifyAdminRoutes(page, stamp) {
  const adminUrl = `${baseUrl}/admin/?fullqa=${stamp}`;
  await page.goto(`${baseUrl}/?auth-reset=${stamp}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.evaluate(() => sessionStorage.removeItem("marketNarrativeAdminSession"));
  await page.goto(adminUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expectOne(page.locator("body.auth-pending"), "admin route should start behind login");
  await expectOne(page.getByRole("heading", { name: "Admin Login" }), "admin login heading");
  assert.equal(await page.getByRole("heading", { name: "Studio Command Center" }).count(), 0, "studio should not be visible before login");
  await loginAsAdmin(page, "admin route");
  await expectOne(page.locator("body.auth-ready"), "admin route unlocks after login");
  await expectOne(page.getByRole("heading", { name: "Studio Command Center" }), "admin studio heading after login");
  await assertNoRoughAdminCopy(page, "admin studio");
  const studioButtons = await exerciseAdminStudioControls(page);
  await clickTab(page, "Engine Architecture", "Engine Architecture & Roadmap");
  assert.equal(await page.getByRole("link", { name: "Project Components" }).count(), 0, "project components should be a console tab, not a separate link");
  await clickTab(page, "Project Components", "How the Market Narrative desk fits together");
  await expectOne(page.locator("body.auth-ready"), "admin components reuses login session");
  await expectOne(page.getByRole("heading", { name: "How the Market Narrative desk fits together" }), "admin components heading");
  await assertNoRoughAdminCopy(page, "admin components");
  await verifyDarkSurfaceContrast(page, "admin components console tab", { rootSelector: ".glass-v2 #components-view", minimumSamples: 80 });
  const panels = page.locator("details.component");
  const panelCount = await panels.count();
  assert.ok(panelCount >= 8, `admin components should render at least 8 expandable panels, got ${panelCount}`);
  assert.equal(await page.locator("details.component[open]").count(), 0, "admin components should start collapsed");
  const digestPanel = page.locator("details.component").filter({ hasText: "3. Digest and Narrative Desk" });
  await expectOne(digestPanel, "admin digest desk expandable panel");
  await digestPanel.locator("summary").click();
  await expectOne(page.locator("details.component[open]").filter({ hasText: "3. Digest and Narrative Desk" }), "admin digest desk opens");
  await digestPanel.locator("summary").click();
  await expectOne(page.locator("details.component:not([open])").filter({ hasText: "3. Digest and Narrative Desk" }), "admin digest desk collapses");
  await clickTab(page, "Multibagger Review", "Multibagger Review Desk");
  await expectOne(page.locator("#multibagger-admin-view details.admin-console-details").first(), "admin multibagger collapsible panel");
  assert.equal(await page.getByRole("link", { name: "Multibagger Review" }).count(), 0, "multibagger review should be a console tab, not a separate link");
  assert.equal(await page.getByRole("link", { name: "Multibagger Portfolio" }).count(), 0, "admin console should not link out to the public multibagger tracker");
  await page.goto(`${baseUrl}/admin/components/?fullqa=${stamp}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expectOne(page.locator("body.auth-ready"), "admin components route reuses login session");
  await expectOne(page.locator('#components-view:not(.hidden)'), "admin components route opens inside console");
  await expectOne(page.getByRole("heading", { name: "How the Market Narrative desk fits together" }), "admin components route heading");
  await page.goto(`${baseUrl}/admin/multibagger/?fullqa=${stamp}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expectOne(page.locator("body.auth-ready"), "admin multibagger route reuses login session");
  await expectOne(page.locator('#multibagger-admin-view:not(.hidden)'), "admin multibagger route opens inside console");
  await expectOne(page.getByRole("heading", { name: "Multibagger Review Desk" }), "admin multibagger route heading");
  return { checks: 4, studioButtons };
}

async function exerciseAdminStudioControls(page) {
  let clicked = 0;
  const controls = [
    ["#runDigestBtn", "Digest check completed"],
    ["#regenerateScriptBtn", "Script refreshed"],
    ["#publishDigestBtn", "PUBLISH QUEUED"],
    ["#copyReelScriptBtn", null],
    ["#togglePrompterBtn", "Pause Script"],
    ["#resetPrompterBtn", null]
  ];
  for (const [selector, expectedText] of controls) {
    const button = page.locator(selector);
    await expectOne(button, `admin control ${selector}`);
    await button.click();
    clicked += 1;
    if (expectedText) {
      await expectAtLeast(page.getByText(expectedText, { exact: false }), 1, `admin control result ${expectedText}`);
    }
  }

  for (const name of ["Slow", "Normal", "Fast"]) {
    const button = page.locator(".speed-btn").filter({ hasText: name });
    await expectOne(button, `teleprompter speed ${name}`);
    await button.click();
    clicked += 1;
  }

  const asset = page.locator("#generateAssetBtn");
  await expectOne(asset, "generate asset button");
  await asset.click();
  clicked += 1;
  await page.waitForFunction(() => document.querySelector("#generateAssetBtn")?.textContent?.includes("Regenerate Thumbnail"));
  await expectOne(page.getByRole("button", { name: "Regenerate Thumbnail" }), "thumbnail generated state");

  await expectOne(page.getByText("Reel Cut Builder", { exact: true }), "reel cut builder heading");
  const video = page.locator("#generateReelVideoBtn");
  await expectOne(video, "generate reel video button");
  await video.click();
  clicked += 1;
  await page.waitForFunction(() => document.querySelector("#generateReelVideoBtn")?.textContent?.includes("Rebuild Reel Video Draft"));
  await expectOne(page.getByRole("button", { name: "Rebuild Reel Video Draft" }), "reel video draft generated state");
  await expectAtLeast(page.getByText("Reel video draft ready", { exact: false }), 1, "reel video draft status");

  return clicked;
}

async function assertNoRoughAdminCopy(page, label) {
  const text = await page.locator("body").innerText();
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
    assert.ok(!text.includes(phrase), `${label} visible text should not include rough admin copy: ${phrase}`);
  }
}

async function loginAsAdmin(page, label) {
  const email = page.locator("#adminEmail");
  const password = page.locator("#adminPassword");
  const submit = page.getByRole("button", { name: "Enter Admin Studio" }).or(page.getByRole("button", { name: "Open Components" }));
  await expectOne(email, `${label} email input`);
  await expectOne(password, `${label} password input`);
  await expectOne(submit, `${label} submit button`);
  await email.fill("admin@marketnarrative.local");
  await password.fill("market-open");
  await submit.click();
}

async function verifyDailyPage(page, daily, stamp) {
  const dailyUrl = `${baseUrl}/${daily.slug}/?fullqa=${stamp}`;
  await page.goto(dailyUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const pageHtml = await page.content();
  const isLegacy = pageHtml.includes("Legacy source audit unavailable");
  assertPublicBriefingCopy(`${daily.slug} HTML`, pageHtml);
  await expectOne(page.locator("body.glass-v2"), `${daily.slug} dark glass theme`);
  await verifyDarkSurfaceContrast(page, `${daily.slug} initial dark view`);
  await expectOne(page.getByText("Daily Pre-Market Summary", { exact: true }), `${daily.slug} heading`);
  await expectAtLeast(page.getByText(daily.label, { exact: true }), 1, `${daily.slug} date`);
  if (isLegacy) {
    await expectOne(page.getByText("Legacy source audit unavailable", { exact: false }), `${daily.slug} legacy audit banner`);
  } else {
    await expectAtLeast(page.locator(".source-card[role='link'][data-source-url]"), 1, `${daily.slug} whole-card article source links`);
  }
  await expectOne(page.getByText("Live Quote Board", { exact: true }), `${daily.slug} live quote board`);
  await expectOne(page.getByRole("link", { name: "Open chart on TradingView" }), `${daily.slug} live chart CTA`);
  await expectOne(page.locator(".share-row"), `${daily.slug} share row`);
  assert.equal(await page.getByRole("link", { name: "Admin Login" }).count(), 0, `${daily.slug} should not expose admin login`);
  assert.equal(await page.getByRole("link", { name: "Project Components" }).count(), 0, `${daily.slug} should not expose admin project components`);
  assert.equal(await page.getByRole("button", { name: "Engine Architecture" }).count(), 0, `${daily.slug} should not expose admin architecture`);
  assert.equal(await page.getByText("Real Quote Board", { exact: true }).count(), 0, `${daily.slug} should not show Real Quote Board`);
  assert.equal(await page.getByText("Chart Series Pending", { exact: false }).count(), 0, `${daily.slug} should not show stale chart placeholder`);
  assert.equal(await page.getByText("Preparing quotes", { exact: false }).count(), 0, `${daily.slug} should not show permanent quote loading text`);

  const brandLink = page.locator("a.brand");
  await expectOne(brandLink, `${daily.slug} brand link`);
  await clickInternalLink(page, brandLink, await brandLink.getAttribute("href"), `${daily.slug} brand`);
  await page.goto(dailyUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

  const tabs = await verifyTabs(page, daily);
  await clickTab(page, "Public Briefing", "Daily Pre-Market Summary");
  await verifySummary(page, daily, { keepOpen: true });
  await verifyDarkSurfaceContrast(page, `${daily.slug} expanded dark summary`);
  await page.locator("#summaryExpand > summary").click();
  await expectOne(page.locator("#summaryExpand:not([open])"), `${daily.slug} summary closes after contrast check`);
  await verifyQuoteBoard(page, daily);
  assert.equal(await page.getByRole("button", { name: "Studio Command (Admin)" }).count(), 0, `${daily.slug} should not expose Studio Command`);
  assert.equal(await page.locator("#studio-view").count(), 0, `${daily.slug} should not render studio section`);
  await verifyPublicDigestJson(daily, stamp);
  const chartResult = await verifyCharts(page, daily);
  const sourceLinks = await clickSourceLinks(page, daily, { isLegacy });

  return {
    tabs,
    chartButtons: chartResult.buttons,
    chartExternalLinks: chartResult.externalLinks,
    sourceLinks,
    studioButtons: 0
  };
}

async function verifyPublicDigestJson(daily, stamp) {
  const response = await fetch(`${baseUrl}/${daily.slug}/digest.json?fullqa=${stamp}`);
  assert.equal(response.ok, true, `${daily.slug} public digest.json should load`);
  const digest = await response.json();
  assertPublicBriefingCopy(`${daily.slug} digest.json`, JSON.stringify(digest));
  assert.equal(Object.hasOwn(digest, "teleprompterScript"), false, `${daily.slug} public digest.json should redact teleprompterScript`);
  assert.equal(Object.hasOwn(digest, "reelScript"), false, `${daily.slug} public digest.json should redact reelScript`);
  assert.equal(digest.asset?.positivePrompt, undefined, `${daily.slug} public digest.json should redact asset prompts`);
  assert.ok(Array.isArray(digest.newsCards) && digest.newsCards.length >= 10, `${daily.slug} public digest.json should include compact news card DTOs`);
  assert.deepEqual(
    Object.keys(digest.newsCards[0]).sort(),
    ["category", "publisherName", "sentimentLabel", "sourceUrl", "thumbnailAlt", "thumbnailUrl", "timestamp", "title"],
    `${daily.slug} newsCards should expose only display fields`
  );
  assert.equal(JSON.stringify(digest.newsCards).includes("whyItMatters"), false, `${daily.slug} newsCards should not ship expanded article analysis`);
  assert.equal(JSON.stringify(digest.newsCards).includes("entityMatchScore"), false, `${daily.slug} newsCards should not ship raw weighting fields`);
  assert.equal(JSON.stringify(digest.newsCards).includes("sentimentScore"), false, `${daily.slug} newsCards should not ship raw sentiment scores`);
}

async function verifyTabs(page, daily) {
  await clickTab(page, "Public Briefing", "Daily Pre-Market Summary");
  return 1;
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

async function verifySummary(page, daily, options = {}) {
  const summary = page.locator("#summaryExpand");
  await expectOne(summary, `${daily.slug} compact summary details`);
  await expectOne(summary.locator("summary"), `${daily.slug} compact summary toggle`);
  await expectOne(page.locator("#summaryExpand:not([open])"), `${daily.slug} summary initially collapsed`);
  await summary.locator("summary").click();
  await page.locator("#summaryExpand[open]").waitFor({ state: "visible", timeout: 10_000 });
  await expectOne(page.getByText("Pre-market desk note", { exact: true }), `${daily.slug} expanded briefing`);
  if (options.keepOpen) {
    return;
  }
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
    await clickExternalPopup(page, chartLink, "https://www.tradingview.com/chart/", `${daily.slug} ${symbol} TradingView chart`);
    externalLinks += 1;
    const close = page.getByRole("button", { name: "Close index chart" });
    await expectOne(close, `${daily.slug} ${symbol} close chart`);
    await close.click();
    await page.locator("#indexChartModal.open").waitFor({ state: "hidden", timeout: 15_000 });
  }
  return { buttons: chartSymbols.length, externalLinks };
}

async function clickSourceLinks(page, daily, options = {}) {
  await clickTab(page, "Public Briefing", "Daily Pre-Market Summary");
  await verifySourceFilters(page, daily);
  const links = page.locator(".source-lead-card a, .source-card a").filter({ visible: true });
  const count = await links.count();
  if (options.isLegacy) {
    assert.equal(count, 0, `${daily.slug} legacy page should suppress unaudited read-source links`);
    return 0;
  }
  assert.ok(count >= 15, `${daily.slug} should render at least 15 source links`);
  for (let index = 0; index < count; index += 1) {
    await clickExternalPopup(page, links.nth(index), "http", `${daily.slug} source link ${index + 1}`);
  }
  return count;
}

async function verifySourceFilters(page, daily) {
  await expectOne(page.getByText("Evidence Map", { exact: true }), `${daily.slug} source evidence map`);
  await expectOne(page.getByText("Lead evidence", { exact: true }), `${daily.slug} lead source evidence`);
  const ledger = page.locator("#sourceLedger");
  await expectOne(ledger, `${daily.slug} source ledger details`);
  await expectOne(page.locator("#sourceLedger:not([open])"), `${daily.slug} source ledger should start collapsed`);
  assert.equal(await page.locator(".source-card:visible").count(), 0, `${daily.slug} full source cards should not show by default`);
  await page.locator("#sourceLedger > summary").click();
  await expectOne(page.locator("#sourceLedger[open]"), `${daily.slug} source ledger opens`);
  await expectAtLeast(page.locator(".source-category-head h3"), 4, `${daily.slug} source category headings`);
  const buttons = page.locator("[data-source-filter]");
  const buttonCount = await buttons.count();
  assert.ok(buttonCount >= 5, `${daily.slug} should render source filter buttons`);
  await expectOne(page.locator('[data-source-filter="all"][aria-pressed="false"]'), `${daily.slug} all source filter should not be active by default`);
  const defaultVisibleCards = await page.locator(".source-card:visible").count();
  assert.ok(defaultVisibleCards > 0 && defaultVisibleCards < 14, `${daily.slug} source ledger should default to one category, got ${defaultVisibleCards}`);

  for (let index = 1; index < buttonCount; index += 1) {
    const button = buttons.nth(index);
    const filter = await button.getAttribute("data-source-filter");
    await button.click();
    await expectOne(page.locator(`[data-source-filter="${filter}"][aria-pressed="true"]`), `${daily.slug} source filter ${filter} active`);
    await expectOne(page.locator(`[data-source-group="${filter}"]:visible`), `${daily.slug} source group ${filter} visible`);
    const visibleCards = await page.locator(`.source-card[data-source-category="${filter}"]:visible`).count();
    assert.ok(visibleCards > 0, `${daily.slug} source filter ${filter} should show cards`);
  }

  await page.locator('[data-source-filter="all"]').click();
  await expectOne(page.locator('[data-source-filter="all"][aria-pressed="true"]'), `${daily.slug} all source filter active`);
  assert.ok(await page.locator(".source-card:visible").count() >= 14, `${daily.slug} all source filter should restore cards`);
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

function isInternalHref(href) {
  const resolved = new URL(href, baseUrl);
  return resolved.origin === new URL(baseUrl).origin;
}

function parseDailyPages(value) {
  if (!value) {
    return null;
  }
  return value.split(",").map((item) => {
    const [slug, label, archiveFlag] = item.split("|").map((part) => part.trim());
    if (!slug || !label) {
      throw new Error("FULL_QA_DAILY_PAGES entries must be slug|label or slug|label|archive=false");
    }
    return { slug, label, archive: archiveFlag === "archive=false" ? false : true };
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
