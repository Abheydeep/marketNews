import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const parts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).formatToParts(new Date());
const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
const today = `${byType.year}-${byType.month}-${byType.day}`;
const latestArchive = process.env.VERCEL_BUILD_FIXTURE_DATE
  ? { date: process.env.VERCEL_BUILD_FIXTURE_DATE, scheduledTime: process.env.VERCEL_BUILD_FIXTURE_TIME ?? "07:15" }
  : latestArchivedDigest();
const date = process.env.SKIP_DAILY_GENERATE === "true" ? latestArchive.date : today;
const scheduledTime = process.env.SKIP_DAILY_GENERATE === "true" ? latestArchive.scheduledTime : "07:15";

if (process.env.SKIP_DAILY_GENERATE === "true") {
  console.log(`Skipping daily digest generation for artifact verification; publishing archived digest ${date} ${scheduledTime}.`);
} else {
  const generated = run("npm", [
    "run",
    "daily:generate",
    "--",
    "--date",
    date,
    "--scheduled-time",
    "07:15",
    "--market-data",
    process.env.MARKET_DATA_MODE ?? "live",
    "--news-data",
    process.env.NEWS_DATA_MODE ?? "live"
  ], { exitOnFailure: false });
  if (generated.status === 0) {
    const published = run("npm", ["run", "site:publish", "--", "--date", date, "--scheduled-time", "07:15"], { exitOnFailure: false });
    if (published.status === 0) {
      process.exit(0);
    }
  }
  const fallback = latestArchivedDigest();
  console.warn(`Live briefing for ${date} was not verified. Publishing latest verified weekday archive ${fallback.date} ${fallback.scheduledTime} instead.`);
  run("npm", ["run", "site:publish", "--", "--date", fallback.date, "--scheduled-time", fallback.scheduledTime], {
    env: { ...process.env, SKIP_ARCHIVE_WRITE: "true" }
  });
  process.exit(0);
}
run("npm", ["run", "site:publish", "--", "--date", date, "--scheduled-time", scheduledTime]);

function latestArchivedDigest() {
  const archiveDir = join(rootDir, "archive", "daily");
  const digests = readdirSync(archiveDir)
    .map((fileName) => {
      const match = fileName.match(/^(\d{4}-\d{2}-\d{2})-(0715|0830)-digest\.json$/);
      return match ? { date: match[1], scheduledTime: `${match[2].slice(0, 2)}:${match[2].slice(2)}` } : null;
    })
    .filter(Boolean)
    .filter((item) => isWeekdayIst(item.date))
    .sort((left, right) => `${left.date}T${left.scheduledTime}`.localeCompare(`${right.date}T${right.scheduledTime}`));
  const latest = digests.at(-1);
  if (!latest) {
    console.error("No weekday archived digest is available for artifact verification.");
    process.exit(1);
  }
  return latest;
}

function isWeekdayIst(value) {
  const day = new Date(`${value}T12:00:00+05:30`).getDay();
  return day >= 1 && day <= 5;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    env: options.env ?? process.env
  });
  if (result.status !== 0 && options.exitOnFailure !== false) {
    process.exit(result.status ?? 1);
  }
  return result;
}
