import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, normalize, relative } from "node:path";
import { findPublicBriefingViolations } from "./editorial-guardrails.mjs";

const defaultTargets = ["out/site", "out/vercel"];
const targets = process.argv.slice(2).length ? process.argv.slice(2) : defaultTargets;
const scanExtensions = new Set([".html", ".json", ".txt"]);
const violations = [];

for (const target of targets) {
  await scanTarget(target);
}

if (violations.length > 0) {
  console.error("Public copy QA failed. Reputation-risk copy found:");
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.message}`);
  }
  process.exit(1);
}

console.log(`Public copy QA passed for ${targets.join(", ")}`);

async function scanTarget(target) {
  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      await scanDirectory(target);
      return;
    }
    await scanFile(target);
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

async function scanDirectory(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDirectory(path)) {
        continue;
      }
      await scanDirectory(path);
      continue;
    }
    if (entry.isFile()) {
      await scanFile(path);
    }
  }
}

async function scanFile(path) {
  if (!scanExtensions.has(extname(path))) {
    return;
  }
  if (shouldSkipFile(path)) {
    return;
  }
  const content = await readFile(path, "utf8");
  for (const violation of findPublicBriefingViolations(path, content)) {
    violations.push({
      file: displayPath(path),
      message: violation.excerpt
    });
  }

  if (isArchiveHome(path)) {
    const visibleSentiment = /<strong[^>]*>\s*(BULLISH|BEARISH)\s*<\/strong>/i.exec(content);
    if (visibleSentiment) {
      violations.push({
        file: displayPath(path),
        message: `visible archive-card sentiment label "${visibleSentiment[1]}" must be replaced by the sparkline`
      });
    }
  }
}

function shouldSkipDirectory(path) {
  return pathParts(path).includes("admin") || pathParts(path).includes("_next");
}

function shouldSkipFile(path) {
  return pathParts(path).includes("admin") || normalize(path).endsWith(`${slash()}deployment-manifest.json`);
}

function isArchiveHome(path) {
  const normalized = normalize(path).replaceAll("\\", "/");
  return normalized.endsWith("out/site/index.html") || normalized.endsWith("out/vercel/index.html");
}

function slash() {
  return process.platform === "win32" ? "\\" : "/";
}

function pathParts(path) {
  return normalize(path).split(/[\\/]/);
}

function displayPath(path) {
  return relative(process.cwd(), path) || path;
}
