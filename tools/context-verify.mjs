#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const REQUIRED = [
  "context/project-overview.md",
  "context/architecture-context.md",
  "context/ui-context.md",
  "context/code-standards.md",
  "context/ai-workflow-rules.md",
  "context/progress-tracker.md"
];

const SCRIPT_CHECKS = [
  "context:verify", "test", "test:deploy", "public:copy:qa", "vercel:build",
  "prod:smoke", "reliability:smoke", "prod:qa", "local:prod", "local:prod:smoke"
];

const LEGACY_LIMITS = {
  "tools/cockpit-page.mjs": 10652,
  "tools/publish-site.mjs": 4533,
  "tools/news-sources.mjs": 2784,
  "tools/core.mjs": 2763,
  "tools/verify.mjs": 3394,
  "tools/predeploy-verify.mjs": 298,
  "tools/reliability-smoke.mjs": 245,
  "tools/multibagger-page.mjs": 3100,
  "tools/project-components-page.mjs": 1320,
  "tools/multibagger-data.mjs": 825,
  "tools/full-site-qa.mjs": 785,
  "tools/production-qa-gate.mjs": 722,
  "tools/editorial-guardrails.mjs": 436,
  "tools/mobile-shell.mjs": 404,
  "tools/production-smoke.mjs": 383,
  "tools/vercel-build-public.mjs": 360,
  "tools/market-data.mjs": 365,
  "tools/live-site-soak.mjs": 329,
  "tools/public-payload.mjs": 255,
  "tools/generate-move-articles.mjs": 248,
  "tools/trading-mock-regression.mjs": 238,
  "tools/market-calendar.mjs": 228,
  "scratch/modify_news.mjs": 215
};

const failures = [];
const root = process.cwd();
const pkg = JSON.parse(read("package.json"));

for (const file of REQUIRED) assert(existsSync(path(file)), `missing ${file}`);
assert(existsSync(path("AGENTS.md")), "missing AGENTS.md");

const agents = read("AGENTS.md");
let lastIndex = -1;
for (const file of REQUIRED) {
  const index = agents.indexOf(file);
  assert(index > lastIndex, `AGENTS.md read order missing/out of order: ${file}`);
  lastIndex = index;
}

const architecture = read("context/architecture-context.md");
for (const diagram of [...architecture.matchAll(/context\/architecture-diagrams\/[^\s`)]+\.mmd/g)].map((m) => m[0])) {
  assert(existsSync(path(diagram)), `missing referenced diagram ${diagram}`);
}

const progress = read("context/progress-tracker.md");
assert(/## Regression Baseline/i.test(progress), "progress-tracker lacks Regression Baseline");

const standards = read("context/code-standards.md");
for (const name of SCRIPT_CHECKS) {
  const command = pkg.scripts?.[name];
  assert(command, `package.json missing script ${name}`);
  assert(standards.includes(`\`${name}\`: \`${command}\``), `code-standards script drift: ${name}`);
}

for (const file of allMjsFiles()) {
  const lines = lineCount(file);
  if (LEGACY_LIMITS[file]) {
    assert(lines <= LEGACY_LIMITS[file], `${file} grew from ${LEGACY_LIMITS[file]} to ${lines} lines`);
  } else {
    assert(lines < 200, `${file} has ${lines} lines; new .mjs files must stay under 200`);
  }
}

if (failures.length) {
  process.stderr.write(`FAIL context verification\n${failures.map((f) => `- ${f}`).join("\n")}\n`);
  process.exit(1);
}
process.stdout.write("PASS context verification\n");

function allMjsFiles() {
  const tracked = git(["ls-files", "*.mjs"]);
  const untracked = git(["ls-files", "--others", "--exclude-standard", "*.mjs"]);
  return [...new Set([...tracked, ...untracked].filter(Boolean))];
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim().split(/\n+/).filter(Boolean);
}

function lineCount(file) {
  return read(file).split("\n").length - 1;
}

function read(file) {
  return readFileSync(path(file), "utf8");
}

function path(file) {
  return join(root, file);
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
