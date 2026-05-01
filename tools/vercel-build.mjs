import { spawnSync } from "node:child_process";
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(rootDir, "out", "vercel");
const target = normalizeTarget(process.env.MARKET_NARRATIVE_DEPLOY_TARGET ?? "public");

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

if (target === "public") {
  run("npm", ["run", "vercel:build:public"]);
  await copyOutput(join(rootDir, "out", "site"), { excludeTopLevel: ["admin"] });
  console.log("Prepared Vercel public output in out/vercel");
} else if (target === "admin") {
  run("npm", ["run", "vercel:build:public"]);
  await copyOutput(join(rootDir, "out", "site", "admin"));
  await writeFile(join(outputDir, "robots.txt"), "User-agent: *\nDisallow: /\n", "utf8");
  console.log("Prepared Vercel admin studio output in out/vercel");
} else if (target === "trade") {
  run("npm", ["--workspace", "@market-narrative/trading-dashboard", "run", "build"]);
  await copyOutput(join(rootDir, "apps", "trading-dashboard", "out"));
  console.log("Prepared Vercel trading cockpit output in out/vercel");
} else {
  console.error(`Unknown MARKET_NARRATIVE_DEPLOY_TARGET="${target}". Use "public", "admin", or "trade".`);
  process.exit(1);
}

function normalizeTarget(value) {
  return String(value).trim().toLowerCase();
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

function run(command, args) {
  const result = spawnSync(command, args, { cwd: rootDir, stdio: "inherit", shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
