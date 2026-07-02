#!/usr/bin/env node
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync, spawn } from "node:child_process";
import { join } from "node:path";
import { log } from "./logger.mjs";
import { marketCalendarState } from "./market-calendar.mjs";

loadEnvLocal();

const date = readArg("--date") || todayInIst();
const port = readArg("--port") || process.env.PORT || "4173";
const hasLlmKey = process.env.NVIDIA_API_KEY;
const calendarState = marketCalendarState(date);
const productionCalendar = process.argv.includes("--production-calendar") ||
  process.env.LOCAL_PROD_PRODUCTION_CALENDAR === "true";
const allowImageFallback = process.argv.includes("--allow-image-fallback") ||
  process.env.LOCAL_PROD_ALLOW_IMAGE_FALLBACK === "true";
const forceNonTradingDayDigest = process.argv.includes("--force-non-trading-day-digest") ||
  process.env.ALLOW_NON_TRADING_DAY_DIGEST === "true" ||
  (!productionCalendar && !calendarState.isTradingSession);

if (!hasLlmKey) {
  log.error("local-prod requires a real LLM key", { required: "NVIDIA_API_KEY" });
  process.exit(2);
}

run("npm", ["run", "context:verify"]);
if (calendarState.isTradingSession || forceNonTradingDayDigest) {
  await clearLocalDailyLock(date);
  run("npm", ["run", "daily:generate", "--", "--date", date, "--scheduled-time", "07:15", "--market-data", "live", "--news-data", "live", "--force-generate"], liveEnv({ forceNonTradingDayDigest, forceDailyGenerate: true }));
} else {
  log.info("local-prod skipping daily generation for closed market date", {
    date,
    state: calendarState.state,
    reason: calendarState.reason,
    override: "--force-non-trading-day-digest",
    rehearsalDefault: "omit --production-calendar"
  });
}
run("npm", ["run", "vercel:build"], { ...liveEnv(), MARKET_NARRATIVE_DEPLOY_TARGET: "public" });
run("npm", ["run", "public:copy:qa", "--", "public"]);

await writeSummary({ date, port });
log.info("local-prod serving public artifact", { url: `http://127.0.0.1:${port}` });

const server = spawn("python3", ["-m", "http.server", port, "--directory", "public"], {
  stdio: "inherit",
  env: process.env
});
server.on("exit", (code) => process.exit(code ?? 0));

function run(command, args, extraEnv = process.env) {
  log.info("running local-prod step", { command, args });
  const result = spawnSync(command, args, { stdio: "inherit", env: extraEnv, shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function liveEnv(options = {}) {
  const env = {
    ...process.env,
    MARKET_DATA_MODE: "live",
    NEWS_DATA_MODE: "live",
    LOCAL_PREVIEW_DIGEST: "true",
    ALLOW_INSUFFICIENT_SOURCES: "true",
    REQUIRE_ARTICLE_IMAGE: allowImageFallback ? "false" : "true",
    SKIP_ARTICLE_IMAGE: allowImageFallback ? "true" : "false",
    PUBLIC_BRIEFING_AGENT_RERANK: "true",
    ALLOW_LATE_PREMARKET_PUBLISH: "true"
  };
  if (options.forceNonTradingDayDigest) env.ALLOW_NON_TRADING_DAY_DIGEST = "true";
  if (options.forceDailyGenerate) env.FORCE_DAILY_GENERATE = "true";
  return env;
}

async function writeSummary(summary) {
  await mkdir(".local", { recursive: true });
  await writeFile(join(".local", "local-prod-summary.json"), `${JSON.stringify({ ...summary, generatedAt: new Date().toISOString() }, null, 2)}\n`);
}

async function clearLocalDailyLock(value) {
  await rm(join("out", "daily", `publish-lock-${value}-0715.lock`), { force: true });
}

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function todayInIst() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}
