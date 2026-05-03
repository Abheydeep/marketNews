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
const date = process.env.SKIP_DAILY_GENERATE === "true" ? process.env.VERCEL_BUILD_FIXTURE_DATE ?? latestArchivedDate() : today;

if (process.env.SKIP_DAILY_GENERATE === "true") {
  console.log(`Skipping daily digest generation for artifact verification; publishing archived digest ${date}.`);
} else {
  const generated = run("npm", [
    "run",
    "daily:generate",
    "--",
    "--date",
    date,
    "--scheduled-time",
    "08:30",
    "--market-data",
    process.env.MARKET_DATA_MODE ?? "live",
    "--news-data",
    process.env.NEWS_DATA_MODE ?? "live"
  ], { exitOnFailure: false });
  if (generated.status === 0) {
    const published = run("npm", ["run", "site:publish", "--", "--date", date, "--scheduled-time", "08:30"], { exitOnFailure: false });
    if (published.status === 0) {
      process.exit(0);
    }
  }
  const fallbackDate = latestArchivedDate();
  console.warn(`Live briefing for ${date} was not verified. Publishing latest verified archive ${fallbackDate} instead.`);
  run("npm", ["run", "site:publish", "--", "--date", fallbackDate, "--scheduled-time", "08:30"], {
    env: { ...process.env, SKIP_ARCHIVE_WRITE: "true" }
  });
  process.exit(0);
}
run("npm", ["run", "site:publish", "--", "--date", date, "--scheduled-time", "08:30"]);

function latestArchivedDate() {
  const archiveDir = join(rootDir, "archive", "daily");
  const dates = readdirSync(archiveDir)
    .map((fileName) => fileName.match(/^(\d{4}-\d{2}-\d{2})-0830-digest\.json$/)?.[1])
    .filter(Boolean)
    .sort();
  const latest = dates.at(-1);
  if (!latest) {
    console.error("No archived digest is available for artifact verification.");
    process.exit(1);
  }
  return latest;
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
