import { spawnSync } from "node:child_process";
import { copyFile, cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
// Vercel's default static output directory. Writing here lets the deploy
// proceed without `outputDirectory` in vercel.json (the current CLI schema
// rejects that property).
const outputDir = join(rootDir, "public");
const explicitTarget = process.env.MARKET_NARRATIVE_DEPLOY_TARGET;
const inferredTarget = explicitTarget ? null : inferVercelTarget();

if (process.env.VERCEL === "1" && !explicitTarget && !inferredTarget) {
  console.error("MARKET_NARRATIVE_DEPLOY_TARGET is required on Vercel.");
  console.error("Set it to one of: public, admin, trade.");
  console.error("Or use a Vercel project/deployment URL that clearly includes public, admin, or trade.");
  console.error("This prevents admin.marketnarrative.in from accidentally serving the public site.");
  console.error(`Vercel target signals: ${vercelTargetSignals().join(", ") || "none"}`);
  process.exit(1);
}

const target = normalizeTarget(explicitTarget ?? inferredTarget ?? "public");

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

if (target === "public") {
  run("npm", ["run", "vercel:build:public"]);
  await copyOutput(join(rootDir, "out", "site"), { excludeTopLevel: ["admin"] });
  await writeManifest(target, ["/", "/latest/", "/latest/trading-guide/", "/multibagger/", "/about/", "/subscribe/"]);
  // Mirror out/site/latest-slug.txt to the project root so api/latest-redirect.js
  // can read it as a last-resort fallback on cold start when the env var and
  // the /digest.json fetch are both unavailable. Vercel deploys the project
  // root alongside api/, making ../latest-slug.txt readable from the function.
  await copyLatestSlugFallback(join(rootDir, "out", "site", "latest-slug.txt"));
  run("node", ["tools/public-copy-qa.mjs", "public"]);
  console.log("Prepared Vercel public output in public");
} else if (target === "admin") {
  run("npm", ["run", "vercel:build:public"]);
  await copyOutput(join(rootDir, "out", "site", "admin"));
  await writeFile(join(outputDir, "robots.txt"), "User-agent: *\nDisallow: /\n", "utf8");
  await writeManifest(target, ["/", "/components/", "/multibagger/"]);
  console.log("Prepared Vercel admin studio output in public");
} else if (target === "trade") {
  run("npm", ["--workspace", "@market-narrative/trading-dashboard", "run", "build"]);
  await copyOutput(join(rootDir, "apps", "trading-dashboard", "out"));
  await writeManifest(target, ["/", "/kite/callback/"]);
  console.log("Prepared Vercel trading cockpit output in public");
} else {
  console.error(`Unknown MARKET_NARRATIVE_DEPLOY_TARGET="${target}". Use "public", "admin", or "trade".`);
  process.exit(1);
}

function normalizeTarget(value) {
  return String(value).trim().toLowerCase();
}

function inferVercelTarget() {
  const signals = vercelTargetSignals();
  for (const signal of signals) {
    if (/(^|[^a-z])admin([^a-z]|$)|admin-studio|market-news-admin/.test(signal)) {
      return "admin";
    }
    if (/(^|[^a-z])trade([^a-z]|$)|trading|market-news-trade/.test(signal)) {
      return "trade";
    }
    if (/(^|[^a-z])public([^a-z]|$)|marketnarrative-public|market-news-public|^marketnarrative\.in$|^www\.marketnarrative\.in$/.test(signal)) {
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
    if (excluded.has(entry.name)) {
      continue;
    }
    await cp(join(sourceDir, entry.name), join(outputDir, entry.name), { recursive: true });
  }
}

async function copyLatestSlugFallback(sourcePath) {
  if (!existsSync(sourcePath)) {
    console.warn(`copyLatestSlugFallback: source not found at ${sourcePath}; /latest/ will rely on env + /digest.json only.`);
    return;
  }
  const dest = join(rootDir, "latest-slug.txt");
  await copyFile(sourcePath, dest);
  console.log(`Mirrored ${sourcePath} → ${dest} for api/latest-redirect.js fallback.`);
}

async function writeManifest(targetName, routes) {
  await writeFile(
    join(outputDir, "deployment-manifest.json"),
    `${JSON.stringify(
      {
        app: "marketnarrative",
        target: targetName,
        routes
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: rootDir, stdio: "inherit", shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
