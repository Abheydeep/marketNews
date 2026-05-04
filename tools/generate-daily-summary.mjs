import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDigest, reelScriptMarkdown } from "./core.mjs";
import { cockpitPage } from "./cockpit-page.mjs";
import { assertPublicBriefingCopy } from "./editorial-guardrails.mjs";
import { publicDigestPayload } from "./public-payload.mjs";
import { updateLatestRedirect } from "./update-latest-redirect.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const date = readArg("--date") ?? todayInIst();
const scheduledTime = readArg("--scheduled-time") ?? "07:15";
const marketDataMode = readArg("--market-data") ?? process.env.MARKET_DATA_MODE ?? "mock";
const newsDataMode = readArg("--news-data") ?? process.env.NEWS_DATA_MODE ?? "live";
const label = scheduledTime.replace(":", "");
const outputDir = join(rootDir, "out", "daily");
const liveMode = marketDataMode === "live" || newsDataMode === "live";

if (liveMode && !isWeekdayIst(date) && process.env.ALLOW_NON_TRADING_DAY_DIGEST !== "true") {
  process.stderr.write(`Daily briefing generation blocked for ${date}: weekday-only public schedule.\n`);
  process.stderr.write("Set ALLOW_NON_TRADING_DAY_DIGEST=true only for an explicit manual non-trading-day test.\n");
  process.exit(2);
}

const digest = {
  ...(await buildDigest(date, { marketDataMode, newsDataMode })),
  scheduledFor: `${date}T${scheduledTime}:00+05:30`,
  generatedAt: new Date().toISOString(),
  runMode: marketDataMode === "live" || newsDataMode === "live" ? "scheduled-verified-source-data" : "manual-fixture-schedule"
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

function isWeekdayIst(value) {
  const day = new Date(`${value}T12:00:00+05:30`).getDay();
  return day >= 1 && day <= 5;
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}
