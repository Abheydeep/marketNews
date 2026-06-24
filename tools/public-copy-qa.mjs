import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, normalize, relative } from "node:path";
import { findPublicBriefingViolations } from "./editorial-guardrails.mjs";

const defaultTargets = ["out/site", "public"];
const explicitTargets = process.argv.slice(2);
const targets = explicitTargets.length ? explicitTargets : defaultTargets;
const requireExistingTargets = explicitTargets.length > 0;
const scanExtensions = new Set([".html", ".json", ".txt"]);
const adminLabelPatterns = [
  /Daily Pre-Market Archive/i,
  /All Market Narrative briefings/i,
  /root page/i,
  /now works/i,
  /news archive/i,
  /Open a dated briefing/i,
  /full quote board/i,
  /chart links/i,
  /Asia watch:/i,
  /\b\d+\s+markets tracked\b/i,
  /\b\d+\s+setups\b/i,
  /\b\d+\s+sources\b/i,
  /Open daily briefing/i
];
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
      if (requireExistingTargets) {
        violations.push({ file: target, message: "explicit public-copy QA target does not exist" });
      }
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

  if (isAdminPath(path)) {
    scanAdminPublicLabels(path, content);
    return;
  }

  if (isArchiveListingPage(path)) {
    return;
  }

  for (const violation of findPublicBriefingViolations(path, content)) {
    violations.push({
      file: displayPath(path),
      message: `${violation.pattern}: ${violation.excerpt}`
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
  return pathParts(path).includes("_next");
}

function shouldSkipFile(path) {
  return normalize(path).endsWith(`${slash()}deployment-manifest.json`);
}

function isArchiveHome(path) {
  const normalized = normalize(path).replaceAll("\\", "/");
  return normalized.endsWith("out/site/index.html") || normalized.endsWith("public/index.html");
}

function isArchiveListingPage(path) {
  const normalized = normalize(path).replaceAll("\\", "/");
  return normalized.endsWith("archive/index.html");
}

function slash() {
  return process.platform === "win32" ? "\\" : "/";
}

function pathParts(path) {
  return normalize(path).split(/[\\/]/);
}

function isAdminPath(path) {
  return pathParts(path).includes("admin");
}

function scanAdminPublicLabels(path, content) {
  if (extname(path) !== ".html") {
    return;
  }
  for (const label of publicFacingLabels(content)) {
    for (const pattern of adminLabelPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(label);
      if (match) {
        violations.push({
          file: displayPath(path),
          message: `${pattern.toString()}: ${excerptAround(label, match.index, match[0].length)}`
        });
      }
    }
  }
}

function publicFacingLabels(content) {
  const labels = [];
  const elementPattern = /<(a|button)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = elementPattern.exec(content)) !== null) {
    labels.push(stripTags(match[2]));
  }
  return labels;
}

function stripTags(value) {
  return value
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function excerptAround(text, index, length) {
  const start = Math.max(0, index - 48);
  const end = Math.min(text.length, index + length + 48);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function displayPath(path) {
  return relative(process.cwd(), path) || path;
}
