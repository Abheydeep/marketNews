import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isGeneralEditionDate, isTradingSessionDate, marketCalendarState } from "./market-calendar.mjs";
import { log } from "./logger.mjs";
import { publishCommandEnv } from "./publish-command-env.mjs";

async function writeLatestSlugArtifact(slug) {
  const outPath = join(rootDir, "out", "site", "latest-slug.txt");
  await writeFile(outPath, `${slug}\n`, "utf8");
  return outPath;
}

async function writePwaArtifacts() {
  const manifest = {
    name: "Market Narrative",
    short_name: "Market Narrative",
    description: "Pre-market briefings and the Multibagger research model from Market Narrative.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#050816",
    theme_color: "#050816",
    orientation: "portrait",
    icons: [
      { src: "/favicon.svg",       sizes: "any",     type: "image/svg+xml", purpose: "any" },
      { src: "/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml", purpose: "any" },
    ],
  };
  await writeFile(join(rootDir, "out", "site", "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const sw = `// Market Narrative service worker. Caches the home page and the
// most recent briefing so the app is usable on a flaky network.
const CACHE = "mn-shell-v2";
const PRECACHE_URLS = ["/", "/manifest.json", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // never cache functions
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && (res.type === "basic" || res.type === "default")) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
`;
  await writeFile(join(rootDir, "out", "site", "sw.js"), sw, "utf8");
}

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
const localPreviewDigest = process.env.LOCAL_PREVIEW_DIGEST === "true";
const calendarState = marketCalendarState(date);
const runId = `vercel-public-${date}-${Date.now()}`;

log.info("public vercel build started", { runId, date, scheduledTime, skipDailyGenerate: process.env.SKIP_DAILY_GENERATE === "true", calendarState: calendarState.state });

if (process.env.SKIP_DAILY_GENERATE === "true") {
  log.info("publishing archived digest for artifact verification", { runId, date, scheduledTime });
} else if (localPreviewDigest) {
  run("npm", ["run", "site:publish", "--", "--date", date, "--scheduled-time", "07:15"], {
    env: { ...process.env, SKIP_ARCHIVE_WRITE: "true", LOCAL_PREVIEW_DIGEST: "true" }
  });
  await writeLatestSlugArtifact(slugForDate(date));
  await writePwaArtifacts();
  log.info("public vercel build completed local preview artifact", { runId, date });
  process.exit(0);
} else if (!calendarState.isTradingSession && !isGeneralEditionDate(date) && !allowNonTradingDayDigest) {
  // Genuinely closed, non-edition days (e.g. Saturdays) show the market-closed shell.
  // Sundays and exchange holidays ARE general-edition days — they fall through to the
  // generate branch below and publish a market-update edition instead.
  const fallback = latestArchivedDigest();
  log.warn("publishing market-closed public artifact", { runId, date, state: calendarState.state, reason: calendarState.reason, fallback });
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
    log.error("unable to publish market-closed artifact", { runId, status: fallbackPublish.status });
    process.exit(fallbackPublish.status ?? 1);
  }
  await writeLatestSlugArtifact(slugForDate(fallback.date));
  await writePwaArtifacts();
  log.info("public vercel build completed market-closed artifact", { runId, fallback });
  process.exit(0);
} else {
  // If today's archive is already committed (e.g., from the daily schedule run),
  // publish from it directly — no need to re-run the LLM pipeline on code-only pushes.
  // This is the main fix for the "latest lags after code pushes" problem.
  const committedToday = todayArchivedDigest(date);
  if (committedToday) {
    log.info("committed archive found for today — skipping regeneration", { runId, date, scheduledTime: committedToday.scheduledTime });
    const published = run("npm", ["run", "site:publish", "--", "--date", date, "--scheduled-time", committedToday.scheduledTime], {
      env: { ...process.env, SKIP_ARCHIVE_WRITE: "true" },
      exitOnFailure: false
    });
    if (published.status === 0) {
      await writeLatestSlugArtifact(slugForDate(date));
      await writePwaArtifacts();
      log.info("public vercel build completed from committed archive", { runId, date });
      process.exit(0);
    }
    log.warn("publish from committed archive failed, attempting fresh generation", { runId, date });
  }

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
    const published = run("npm", ["run", "site:publish", "--", "--date", date, "--scheduled-time", "07:15"], {
      env: {
        ...process.env,
        SKIP_ARCHIVE_WRITE: "true"
      },
      exitOnFailure: false
    });
    if (published.status === 0) {
      await writeLatestSlugArtifact(slugForDate(date));
      await writePwaArtifacts();
      log.info("public vercel build completed fresh artifact", { runId, date });
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
run("npm", ["run", "site:publish", "--", "--date", date, "--scheduled-time", scheduledTime], {
  env: {
    ...process.env,
    SKIP_ARCHIVE_WRITE: "true"
  }
});
await writeLatestSlugArtifact(slugForDate(date));
await writePwaArtifacts();

async function handleFreshBuildFailure({ date, failedStep, status, signal }) {
  const fallback = latestArchivedDigest();
  // writeLatestStatusPages was removed: /latest/ is handled by API/static shell resolution.
  if (allowVerifiedArchiveFallback) {
    log.warn("publishing verified archive fallback", { runId, date, failedStep, status, signal, fallback });
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
  const holdMessage = `Live briefing for ${date} was not verified during ${failedStep}. Refusing to publish a previous archive as /latest.`;
  log.error(holdMessage, { runId, date, failedStep, status, signal, fallback });
  if (signal) {
    log.error("failed command signal", { runId, signal });
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
    log.error("unable to publish verification-hold artifact", { runId, failedStep, status: fallbackPublish.status });
    process.exit(fallbackPublish.status ?? (exitStatus === 0 ? 1 : exitStatus));
  }
  await writeLatestSlugArtifact(slugForDate(fallback.date));
  await writePwaArtifacts();
  process.exit(0);
}


function slugForDate(value) {
  const date = String(value);
  if (String(process.env.PUBLIC_SLUG_FORMAT ?? "compact").toLowerCase() === "iso" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const [year, month, day] = date.split("-");
  const monthName = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"][Number(month) - 1];
  return `${Number(day)}${monthName}${year}`;
}

function todayArchivedDigest(date) {
  const archiveDir = join(rootDir, "archive", "daily");
  // Prefer the latest slot if multiple exist for the same day.
  for (const slot of ["0830", "0800", "0715"]) {
    if (existsSync(join(archiveDir, `${date}-${slot}-digest.json`))) {
      return { date, scheduledTime: `${slot.slice(0, 2)}:${slot.slice(2)}` };
    }
  }
  return null;
}

function latestArchivedDigest() {
  const archiveDir = join(rootDir, "archive", "daily");
  const digests = readdirSync(archiveDir)
    .map((fileName) => {
      const match = fileName.match(/^(\d{4}-\d{2}-\d{2})-(0715|0800|0830)-digest\.json$/);
      return match ? { date: match[1], scheduledTime: `${match[2].slice(0, 2)}:${match[2].slice(2)}` } : null;
    })
    .filter(Boolean)
    .filter((item) => isGeneralEditionDate(item.date))
    .sort((left, right) => `${left.date}T${left.scheduledTime}`.localeCompare(`${right.date}T${right.scheduledTime}`));
  const latest = digests.at(-1);
  if (!latest) {
    log.error("no weekday archived digest available", { runId });
    process.exit(1);
  }
  return latest;
}

function run(command, args, options = {}) {
  log.info("running build command", { runId, command, args });
  const spawnOptions = {
    stdio: "inherit",
    shell: false,
    env: publishCommandEnv(command, args, options.env ?? process.env)
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
  log.warn("npm not found; falling back to node script", { runId, scriptName, path: match[1] });
  return spawnSync("node", [match[1], ...forwardedArgs], spawnOptions);
}
