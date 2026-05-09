import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isTradingSessionDate, marketCalendarState } from "./market-calendar.mjs";

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
const allowVerifiedArchiveFallback = process.env.ALLOW_VERIFIED_ARCHIVE_FALLBACK === "true";
const allowNonTradingDayDigest = process.env.ALLOW_NON_TRADING_DAY_DIGEST === "true";
const calendarState = marketCalendarState(date);

if (process.env.SKIP_DAILY_GENERATE === "true") {
  console.log(`Skipping daily digest generation for artifact verification; publishing archived digest ${date} ${scheduledTime}.`);
} else if (!calendarState.isTradingSession && !allowNonTradingDayDigest) {
  const fallback = latestArchivedDigest();
  console.warn(
    `No trading-day public briefing for ${date} (${calendarState.state}: ${calendarState.reason}). ` +
    `Publishing archived digest ${fallback.date} ${fallback.scheduledTime} and a market-closed /latest page.`
  );
  const fallbackPublish = run("npm", ["run", "site:publish", "--", "--date", fallback.date, "--scheduled-time", fallback.scheduledTime], {
    env: {
      ...process.env,
      PUBLIC_BUILD_DATE: date,
      PUBLIC_LATEST_STATUS: "market-closed",
      SKIP_ARCHIVE_WRITE: "true"
    },
    exitOnFailure: false
  });
  if (fallbackPublish.status !== 0) {
    console.error("Unable to publish market-closed artifact.");
    process.exit(fallbackPublish.status ?? 1);
  }
  await writeLatestStatusPages({ date, fallback, status: "market-closed", calendarState });
  process.exit(0);
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
    await handleFreshBuildFailure({
      date,
      failedStep: "site publish",
      status: published.status,
      signal: published.signal
    });
  }
  await handleFreshBuildFailure({
    date,
    failedStep: "daily digest generation",
    status: generated.status,
    signal: generated.signal
  });
}
run("npm", ["run", "site:publish", "--", "--date", date, "--scheduled-time", scheduledTime]);

async function handleFreshBuildFailure({ date, failedStep, status, signal }) {
  const fallback = latestArchivedDigest();
  if (allowVerifiedArchiveFallback) {
    console.warn(
      `Live briefing for ${date} was not verified during ${failedStep}. ` +
      `ALLOW_VERIFIED_ARCHIVE_FALLBACK=true is set, so publishing archived digest ${fallback.date} ${fallback.scheduledTime}.`
    );
    run("npm", ["run", "site:publish", "--", "--date", fallback.date, "--scheduled-time", fallback.scheduledTime], {
      env: {
        ...process.env,
        PUBLIC_BUILD_DATE: date,
        PUBLIC_LATEST_STATUS: "archive-fallback",
        SKIP_ARCHIVE_WRITE: "true"
      }
    });
    process.exit(0);
  }

  const exitStatus = status ?? 1;
  console.error(
    `Live briefing for ${date} was not verified during ${failedStep}. ` +
    "Refusing to publish a previous archive as /latest. Publishing a public verification-hold page instead. " +
    "Fix the source/data failure or set ALLOW_VERIFIED_ARCHIVE_FALLBACK=true only for an explicit manual recovery deploy."
  );
  if (signal) {
    console.error(`Failed command signal: ${signal}`);
  }
  const fallbackPublish = run("npm", ["run", "site:publish", "--", "--date", fallback.date, "--scheduled-time", fallback.scheduledTime], {
    env: {
      ...process.env,
      PUBLIC_BUILD_DATE: date,
      PUBLIC_LATEST_STATUS: "verification-hold",
      SKIP_ARCHIVE_WRITE: "true"
    },
    exitOnFailure: false
  });
  if (fallbackPublish.status !== 0) {
    console.error(`Unable to publish verification-hold artifact after ${failedStep} failed.`);
    process.exit(fallbackPublish.status ?? (exitStatus === 0 ? 1 : exitStatus));
  }
  await writeLatestStatusPages({ date, failedStep, fallback, status: "verification-hold" });
  process.exit(0);
}

async function writeLatestStatusPages({ date, failedStep = "", fallback, status, calendarState = marketCalendarState(date) }) {
  const latestDir = join(rootDir, "out", "site", "latest");
  const guideDir = join(latestDir, "trading-guide");
  const html = latestStatusPage({ date, failedStep, fallback, status, calendarState, isTradingGuide: false });
  const guideHtml = latestStatusPage({ date, failedStep, fallback, status, calendarState, isTradingGuide: true });
  await mkdir(guideDir, { recursive: true });
  await writeFile(join(latestDir, "index.html"), html, "utf8");
  await writeFile(join(guideDir, "index.html"), guideHtml, "utf8");
}

function latestStatusPage({ date, failedStep, fallback, status, calendarState, isTradingGuide }) {
  const marketClosed = status === "market-closed";
  const holidayClosed = marketClosed && calendarState?.state === "exchange_holiday";
  const title = marketClosed
    ? `${formatDate(date)} market closed | Market Narrative`
    : `${formatDate(date)} briefing under verification | Market Narrative`;
  const fallbackSlug = slugForDate(fallback.date);
  const fallbackHref = isTradingGuide ? `/${fallbackSlug}/trading-guide/` : `/${fallbackSlug}/`;
  const fallbackLabel = isTradingGuide ? "Open latest verified trading guide" : "Open latest verified briefing";
  const eyebrow = marketClosed ? "Market Closed" : "Source Verification Hold";
  const heading = marketClosed
    ? `No ${isTradingGuide ? "trading guide" : "pre-market briefing"} for ${formatDate(date)}.`
    : `${formatDate(date)} briefing was not published as latest.`;
  const lead = marketClosed
    ? holidayClosed
      ? `Indian cash markets are closed for ${calendarState.reason}, so Market Narrative is not publishing a fresh ${isTradingGuide ? "trading guide" : "pre-open briefing"}.`
      : `Indian cash markets are not in session today, so Market Narrative is not publishing a fresh ${isTradingGuide ? "trading guide" : "pre-open briefing"}.`
    : `The ${isTradingGuide ? "trading guide" : "pre-market briefing"} did not clear the public source-quality gate during ${failedStep}, so Market Narrative is not presenting the previous archive as today's latest edition.`;
  const latestLine = marketClosed
    ? `The latest verified trading-day edition remains ${formatDate(fallback.date)}. Use it as historical context for the next open.`
    : `The latest verified archive remains ${formatDate(fallback.date)}. Use that only as historical context, not as today's pre-open read.`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,follow">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; font-family: Inter, Arial, sans-serif; color: #111827; background: #f8fafc; }
    main { max-width: 720px; margin: 0 auto; padding: 72px 24px; }
    p { font-size: 18px; line-height: 1.65; color: #374151; }
    .eyebrow { color: #b45309; font-size: 13px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
    h1 { font-size: 40px; line-height: 1.1; margin: 12px 0 18px; }
    a { display: inline-block; margin: 10px 12px 0 0; color: #ffffff; background: #111827; padding: 12px 16px; border-radius: 8px; text-decoration: none; font-weight: 800; }
    a.secondary { color: #111827; background: #e5e7eb; }
  </style>
</head>
<body>
  <main>
    <div class="eyebrow">${escapeHtml(eyebrow)}</div>
    <h1>${escapeHtml(heading)}</h1>
    <p>${escapeHtml(lead)}</p>
    <p>${escapeHtml(latestLine)}</p>
    <a href="${escapeHtml(fallbackHref)}">${escapeHtml(fallbackLabel)}</a>
    <a class="secondary" href="/">Open archive</a>
  </main>
</body>
</html>`;
}

function slugForDate(value) {
  const [year, month, day] = String(value).split("-");
  const monthName = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"][Number(month) - 1];
  return `${Number(day)}${monthName}${year}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00+05:30`));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function latestArchivedDigest() {
  const archiveDir = join(rootDir, "archive", "daily");
  const digests = readdirSync(archiveDir)
    .map((fileName) => {
      const match = fileName.match(/^(\d{4}-\d{2}-\d{2})-(0715|0830)-digest\.json$/);
      return match ? { date: match[1], scheduledTime: `${match[2].slice(0, 2)}:${match[2].slice(2)}` } : null;
    })
    .filter(Boolean)
    .filter((item) => isTradingSessionDate(item.date))
    .sort((left, right) => `${left.date}T${left.scheduledTime}`.localeCompare(`${right.date}T${right.scheduledTime}`));
  const latest = digests.at(-1);
  if (!latest) {
    console.error("No weekday archived digest is available for artifact verification.");
    process.exit(1);
  }
  return latest;
}

function run(command, args, options = {}) {
  const spawnOptions = {
    stdio: "inherit",
    shell: false,
    env: options.env ?? process.env
  };
  const result = spawnSync(command, args, spawnOptions);
  if (result.error?.code === "ENOENT" && command === "npm" && args[0] === "run") {
    const fallback = runNpmScriptWithNode(args, spawnOptions);
    if (fallback) {
      return finishRun(fallback, options);
    }
  }
  return finishRun(result, options);
}

function finishRun(result, options) {
  if (result.status !== 0 && options.exitOnFailure !== false) {
    process.exit(result.status ?? 1);
  }
  return result;
}

function runNpmScriptWithNode(args, spawnOptions) {
  const scriptName = args[1];
  const forwardedArgs = args[2] === "--" ? args.slice(3) : args.slice(2);
  const packageJson = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"));
  const script = packageJson.scripts?.[scriptName];
  const match = /^node\s+(\S+)$/.exec(script || "");
  if (!match) {
    return null;
  }
  console.warn(`npm not found; running ${scriptName} via node ${match[1]}.`);
  return spawnSync("node", [match[1], ...forwardedArgs], spawnOptions);
}
