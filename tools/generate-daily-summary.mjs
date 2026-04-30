import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDigest, reelScriptMarkdown } from "./core.mjs";
import { cockpitPage } from "./cockpit-page.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const date = readArg("--date") ?? todayInIst();
const scheduledTime = readArg("--scheduled-time") ?? "08:30";
const marketDataMode = readArg("--market-data") ?? process.env.MARKET_DATA_MODE ?? "mock";
const label = scheduledTime.replace(":", "");
const outputDir = join(rootDir, "out", "daily");
const digest = {
  ...(await buildDigest(date, { marketDataMode })),
  scheduledFor: `${date}T${scheduledTime}:00+05:30`,
  generatedAt: new Date().toISOString(),
  runMode: marketDataMode === "live" ? "scheduled-live-market-data" : "manual-mock-schedule"
};

await mkdir(outputDir, { recursive: true });

const jsonPath = join(outputDir, `${date}-${label}-digest.json`);
const htmlPath = join(outputDir, `${date}-${label}-summary.html`);
const studioHtmlPath = join(outputDir, `${date}-${label}-studio.html`);
const reelScriptPath = join(outputDir, `${date}-${label}-reel-script.md`);

await writeFile(jsonPath, `${JSON.stringify(digest, null, 2)}\n`, "utf8");
await writeFile(htmlPath, cockpitPage(digest, "public-view", { includeStudio: false }), "utf8");
await writeFile(studioHtmlPath, cockpitPage(digest, "studio-view", { includeStudio: true }), "utf8");
await writeFile(reelScriptPath, reelScriptMarkdown(digest), "utf8");

process.stdout.write(`Daily pre-market summary generated for ${date}\n`);
process.stdout.write(`Scheduled-for timestamp: ${digest.scheduledFor}\n`);
process.stdout.write(`Generated-at timestamp: ${digest.generatedAt}\n`);
process.stdout.write(`Market-data mode: ${digest.marketDataMode}\n`);
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
