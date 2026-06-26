import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDigest, reelScriptMarkdown } from "./core.mjs";
import { cockpitPage } from "./cockpit-page.mjs";
import { assertPublicBriefingCopy } from "./editorial-guardrails.mjs";
import { marketCalendarState, isGeneralEditionDate, isMarketUpdateDate } from "./market-calendar.mjs";
import { assertPremarketPublishWindow } from "./publish-window.mjs";
import { publicDigestPayload } from "./public-payload.mjs";
import { updateLatestRedirect } from "./update-latest-redirect.mjs";
import { log } from "./logger.mjs";
import { buildBriefingImagePrompt, generateArticleImage } from "./generate-article-image.mjs";
import { writeOgImageAsset } from "./og-image-assets.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const date = readArg("--date") ?? todayInIst();
const scheduledTime = readArg("--scheduled-time") ?? "07:15";
const marketDataMode = readArg("--market-data") ?? process.env.MARKET_DATA_MODE ?? "mock";
const newsDataMode = readArg("--news-data") ?? process.env.NEWS_DATA_MODE ?? "live";
const enforcePublishWindow = readFlag("--enforce-publish-window") || process.env.ENFORCE_PREMARKET_WINDOW === "true";
const publishWindowCutoffMinutes = optionalNumber(readArg("--publish-window-cutoff-minutes") ?? process.env.PREMARKET_LATE_CUTOFF_MINUTES);
const forceGenerate = readFlag("--force-generate") || process.env.FORCE_DAILY_GENERATE === "true";
const requireArticleImage = process.env.REQUIRE_ARTICLE_IMAGE === "true";
const label = scheduledTime.replace(":", "");
const outputDir = join(rootDir, "out", "daily");
const liveMode = marketDataMode === "live" || newsDataMode === "live";
const runId = `daily-${date}-${label}-${Date.now()}`;

const lockFile = join(rootDir, `out`, `daily`, `publish-lock-${date}-${label}.lock`);
log.info("daily generation started", { runId, date, scheduledTime, marketDataMode, newsDataMode, liveMode });
if (liveMode && !forceGenerate) {
  try {
    const archiveFile = join(rootDir, "archive", "daily", `${date}-${label}-digest.json`);
    await access(archiveFile);
    log.info("daily generation skipped existing archive", { runId, archiveFile });
    process.stdout.write(`Verified archive already exists for ${date} (${archiveFile}). Skipping generation.\n`);
    await mkdir(join(rootDir, "out", "daily"), { recursive: true });
    await writeFile(join(rootDir, "out", "daily", `${date}-${label}-digest.json`), await readFile(archiveFile, "utf8"), "utf8");
    process.exit(0);
  } catch {
    // File does not exist, check lock
    try {
      await access(lockFile);
      log.warn("daily generation skipped active lock", { runId, lockFile });
      process.stdout.write(`Lock file exists for ${date} (${lockFile}). Already running. Skipping.\n`);
      process.exit(0);
    } catch {
      await mkdir(dirname(lockFile), { recursive: true });
      await writeFile(lockFile, new Date().toISOString(), "utf8");
    }
  }
}

const calendarState = marketCalendarState(date);

if (liveMode && !isGeneralEditionDate(date) && process.env.ALLOW_NON_TRADING_DAY_DIGEST !== "true") {
  log.warn("daily generation blocked non-trading day", { runId, date, state: calendarState.state, reason: calendarState.reason });
  process.stderr.write(`Daily briefing generation blocked for ${date}: ${calendarState.state} (${calendarState.reason}).\n`);
  process.stderr.write("Set ALLOW_NON_TRADING_DAY_DIGEST=true only for an explicit manual non-trading-day test.\n");
  process.exit(2);
}

// The pre-market publish window only applies to trading days (it gates the 9:15 open).
// Holiday / Sunday market-update editions can publish any time.
if (liveMode && enforcePublishWindow && calendarState.isTradingSession && process.env.ALLOW_LATE_PREMARKET_PUBLISH !== "true") {
  try {
    assertPremarketPublishWindow({ date, scheduledTime, cutoffMinutes: publishWindowCutoffMinutes });
  } catch (error) {
    log.error("daily generation blocked publish window", { runId, date, scheduledTime, error: error.message });
    process.stderr.write(`${error.message}\n`);
    process.exit(2);
  }
}

const generatedDigest = await buildDigest(date, {
  marketDataMode,
  newsDataMode,
  nvidiaApiKey: process.env.NVIDIA_API_KEY,
  agentLeadRerank: Boolean(process.env.NVIDIA_API_KEY)
});
log.info("daily digest built", {
  runId,
  verifiedArticleCount: generatedDigest.sourceVerification?.verifiedArticleCount ?? 0,
  marketDataMode: generatedDigest.marketDataMode,
  newsDataMode: generatedDigest.newsDataMode
});
const marketUpdateMode = isMarketUpdateDate(date);
const nonTradingSession = !calendarState.isTradingSession
  ? {
    state: calendarState.state,
    reason: calendarState.reason,
    source: calendarState.source
  }
  : null;
// Holiday / Sunday market-update editions are published as the public latest, so keep them
// verified. Only de-verify a non-trading day we are NOT publishing as a general edition.
if (nonTradingSession && !marketUpdateMode && generatedDigest.sourceVerification) {
  generatedDigest.sourceVerification = {
    ...generatedDigest.sourceVerification,
    isVerifiedForPublicArchive: false
  };
}

const digest = {
  ...generatedDigest,
  scheduledFor: `${date}T${scheduledTime}:00+05:30`,
  generatedAt: new Date().toISOString(),
  marketUpdateMode,
  runMode: marketUpdateMode
    ? "scheduled-market-update"
    : nonTradingSession
      ? "manual-non-trading-source-data"
      : marketDataMode === "live" || newsDataMode === "live" ? "scheduled-verified-source-data" : "manual-fixture-schedule",
  ...(nonTradingSession ? { nonTradingSession } : {})
};
digest.ogImageUrl = await generatedBriefingOgImageUrl(digest);
if (requireArticleImage && !digest.ogImageUrl) {
  throw new Error("Article image generation is required for this run but no image URL was produced.");
}

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
log.info("daily generation completed", { runId, jsonPath, htmlPath, latestRedirectSlug });

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

function optionalNumber(value) {
  if (value == null || value === "") {
    return undefined;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

async function generatedBriefingOgImageUrl(digest) {
  const prompt = buildBriefingImagePrompt(digest);
  const buffer = await Promise.race([
    generateArticleImage(prompt),
    new Promise((resolve) => setTimeout(() => resolve(null), 50_000))
  ]);
  const asset = await writeOgImageAsset(buffer, `${digest.digestDate}.jpg`).catch((error) => {
    log.warn("briefing image asset write failed", { runId, date: digest.digestDate, error: error.message });
    return null;
  });
  return asset?.url ?? null;
}
