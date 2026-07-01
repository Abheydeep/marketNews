import { spawnSync } from "node:child_process";
import { copyFile, cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "./logger.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
// Vercel's default static output directory. Writing here lets the deploy
// proceed without `outputDirectory` in vercel.json (the current CLI schema
// rejects that property).
const outputDir = join(rootDir, "public");
const explicitTarget = process.env.MARKET_NARRATIVE_DEPLOY_TARGET;
const inferredTarget = explicitTarget ? null : inferVercelTarget();

if (process.env.VERCEL === "1" && !explicitTarget && !inferredTarget) {
  log.error("MARKET_NARRATIVE_DEPLOY_TARGET is required on Vercel.");
  log.error("Set it to: public.");
  log.error("Admin and trade are now separate repos — see Abheydeep/marketnarrative-admin and Abheydeep/marketnarrative-trade.");
  log.error(`Vercel target signals: ${vercelTargetSignals().join(", ") || "none"}`);
  process.exit(1);
}

const target = normalizeTarget(explicitTarget ?? inferredTarget ?? "public");

if (target === "admin" || target === "trade") {
  log.error(`MARKET_NARRATIVE_DEPLOY_TARGET="${target}" is no longer valid in this repo.`);
  log.error("Admin studio → Abheydeep/marketnarrative-admin (Vite, dist/)");
  log.error("Trade cockpit → Abheydeep/marketnarrative-trade (Next.js, out/)");
  process.exit(1);
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

if (target === "public") {
  run("npm", ["run", "vercel:build:public"]);
  await copyOutput(join(rootDir, "out", "site"));
  await writeManifest(target, [
    "/",
    "/latest/",
    "/latest/trading-guide/",
    "/indices/",
    "/money-flow/fii-dii/",
    "/market-statistics/",
    "/moves/",
    "/multibagger/",
    "/about/",
    "/subscribe/",
    "/contact/",
    "/privacy/",
    "/terms/"
  ]);
  // Mirror out/site/latest-slug.txt to the project root so api/latest-redirect.js
  // can read it as a last-resort fallback on cold start when the env var and
  // the /digest.json fetch are both unavailable. Vercel deploys the project
  // root alongside api/, making ../latest-slug.txt readable from the function.
  await copyLatestSlugFallback(join(rootDir, "out", "site", "latest-slug.txt"));
  run("node", ["tools/public-copy-qa.mjs", "public"]);
  log.info("Prepared Vercel public output in public");
} else {
  log.error(`Unknown MARKET_NARRATIVE_DEPLOY_TARGET="${target}". Use "public".`);
  process.exit(1);
}

function normalizeTarget(value) {
  return String(value).trim().toLowerCase();
}

function inferVercelTarget() {
  const signals = vercelTargetSignals();
  for (const signal of signals) {
    if (/(^|[^a-z])public([^a-z]|$)|marketnarrative-public|market-news-public|^marketnarrative\.in$|^www\.marketnarrative\.in$|^marketnews(-\w+)?\.vercel\.app$|^marketnews$/.test(signal)) {
      return "public";
    }
  }
  return null;
}

function vercelTargetSignals() {
  return [
    process.env.VERCEL_PROJECT_NAME,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_URL
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""));
}

async function copyOutput(sourceDir, options = {}) {
  const excluded = new Set(options.excludeTopLevel ?? []);
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (excluded.has(entry.name)) continue;
    await cp(join(sourceDir, entry.name), join(outputDir, entry.name), { recursive: true });
  }
}

async function copyLatestSlugFallback(sourcePath) {
  if (!existsSync(sourcePath)) {
    log.warn(`copyLatestSlugFallback: source not found at ${sourcePath}; /latest/ will rely on env + /digest.json only.`);
    return;
  }
  const dest = join(rootDir, "latest-slug.txt");
  await copyFile(sourcePath, dest);
  log.info(`Mirrored ${sourcePath} → ${dest} for api/latest-redirect.js fallback.`);
}

async function writeManifest(targetName, routes) {
  await writeFile(
    join(outputDir, "deployment-manifest.json"),
    `${JSON.stringify({ app: "marketnarrative", target: targetName, routes }, null, 2)}\n`,
    "utf8"
  );
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: rootDir, stdio: "inherit", shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
