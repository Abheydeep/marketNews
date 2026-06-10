import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDigest, reelScriptMarkdown } from "./core.mjs";
import { cockpitPage } from "./cockpit-page.mjs";
import { assertPublicBriefingCopy } from "./editorial-guardrails.mjs";
import { marketCalendarState } from "./market-calendar.mjs";
import { assertPremarketPublishWindow } from "./publish-window.mjs";
import { publicDigestPayload } from "./public-payload.mjs";
import { updateLatestRedirect } from "./update-latest-redirect.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const date = readArg("--date") ?? todayInIst();
const scheduledTime = readArg("--scheduled-time") ?? "07:15";
const marketDataMode = readArg("--market-data") ?? process.env.MARKET_DATA_MODE ?? "mock";
const newsDataMode = readArg("--news-data") ?? process.env.NEWS_DATA_MODE ?? "live";
const enforcePublishWindow = readFlag("--enforce-publish-window") || process.env.ENFORCE_PREMARKET_WINDOW === "true";
const label = scheduledTime.replace(":", "");
const outputDir = join(rootDir, "out", "daily");
const liveMode = marketDataMode === "live" || newsDataMode === "live";

if (liveMode) {
  try {
    const archiveFile = join(rootDir, "archive", "daily", `${date}-${label}-digest.json`);
    await access(archiveFile);
    process.stdout.write(`Verified archive already exists for ${date} (${archiveFile}). Skipping generation.\n`);
    process.exit(0);
  } catch {
    // File does not exist, proceed.
  }
}

const calendarState = marketCalendarState(date);

if (liveMode && !calendarState.isTradingSession && process.env.ALLOW_NON_TRADING_DAY_DIGEST !== "true") {
  process.stderr.write(`Daily briefing generation blocked for ${date}: ${calendarState.state} (${calendarState.reason}).\n`);
  process.stderr.write("Set ALLOW_NON_TRADING_DAY_DIGEST=true only for an explicit manual non-trading-day test.\n");
  process.exit(2);
}

if (liveMode && enforcePublishWindow && process.env.ALLOW_LATE_PREMARKET_PUBLISH !== "true") {
  try {
    assertPremarketPublishWindow({ date, scheduledTime });
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(2);
  }
}

const generatedDigest = await buildDigest(date, { marketDataMode, newsDataMode });
const nonTradingSession = !calendarState.isTradingSession
  ? {
    state: calendarState.state,
    reason: calendarState.reason,
    source: calendarState.source
  }
  : null;
if (nonTradingSession && generatedDigest.sourceVerification) {
  generatedDigest.sourceVerification = {
    ...generatedDigest.sourceVerification,
    isVerifiedForPublicArchive: false
  };
}

const digest = {
  ...generatedDigest,
  scheduledFor: `${date}T${scheduledTime}:00+05:30`,
  generatedAt: new Date().toISOString(),
  runMode: nonTradingSession
    ? "manual-non-trading-source-data"
    : marketDataMode === "live" || newsDataMode === "live" ? "scheduled-verified-source-data" : "manual-fixture-schedule",
  ...(nonTradingSession ? { nonTradingSession } : {})
};

await mkdir(outputDir, { recursive: true });

const jsonPath = join(outputDir, `${date}-${label}-digest.json`);
const htmlPath = join(outputDir, `${date}-${label}-summary.html`);
const studioHtmlPath = join(outputDir, `${date}-${label}-studio.html`);
const reelScriptPath = join(outputDir, `${date}-${label}-reel-script.md`);
const publicHtml = cockpitPage(digest, "public-view", { includeStudio: false, theme: "glass-v2" });

assertPublicBriefingCopy(jsonPath, JSON.stringify(publicDigestPayload(digest)));
assertPublicBriefingCopy(htmlPath, publicHtml);

await writeFile(jsonPath, `${JSON.stringify(digest, null, 2)}\n`, "utf8");
await writeFile(htmlPath, publicHtml, "utf8");
await writeFile(studioHtmlPath, cockpitPage(digest, "studio-view", { includeStudio: true }), "utf8");
await writeFile(reelScriptPath, reelScriptMarkdown(digest), "utf8");
const latestRedirectSlug = await updateLatestRedirect({ date });

process.stdout.write(`Daily pre-market summary generated for ${date}\n`);
process.stdout.write(`Scheduled-for timestamp: ${digest.scheduledFor}\n`);
process.stdout.write(`Generated-at timestamp: ${digest.generatedAt}\n`);
process.stdout.write(`Market-data mode: ${digest.marketDataMode}\n`);
process.stdout.write(`News-data mode: ${digest.newsDataMode}\n`);
process.stdout.write(`Verified article links: ${digest.sourceVerification?.verifiedArticleCount ?? 0}\n`);
process.stdout.write(`Latest redirect: /latest/ -> /${latestRedirectSlug}/\n`);
if (digest.marketDataError) {
  process.stdout.write(`Market-data fallback: ${digest.marketDataError}\n`);
}
process.stdout.write(`JSON: ${jsonPath}\n`);
process.stdout.write(`Public HTML: ${htmlPath}\n`);
process.stdout.write(`Private Studio HTML: ${studioHtmlPath}\n`);
process.stdout.write(`Reel script: ${reelScriptPath}\n`);

function todayInIst() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function readFlag(name) {
  return process.argv.includes(name);
}
