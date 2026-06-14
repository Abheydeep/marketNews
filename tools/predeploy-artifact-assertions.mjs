import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

export function buildTarget(target) {
  const result = spawnSync("npm", ["run", "vercel:build"], {
    env: {
      ...process.env,
      MARKET_NARRATIVE_DEPLOY_TARGET: target,
      MARKET_DATA_MODE: "mock",
      NEWS_DATA_MODE: "fixture",
      SKIP_DAILY_GENERATE: "true",
      SKIP_ARCHIVE_WRITE: "true"
    },
    stdio: "inherit",
    shell: false
  });
  if (result.status !== 0) {
    throw new Error(`${target} Vercel build exited with ${result.status ?? "unknown status"}`);
  }
}

export function runPublicCopyQa(target) {
  const result = spawnSync("node", ["tools/public-copy-qa.mjs", target], {
    stdio: "inherit",
    shell: false
  });
  if (result.status !== 0) {
    throw new Error(`public copy QA exited with ${result.status ?? "unknown status"}`);
  }
}

export function assertOutput(relativePath, pattern) {
  const filePath = join("public", relativePath);
  if (!existsSync(filePath)) {
    throw new Error(`expected ${filePath} to exist`);
  }
  const content = readFileSync(filePath, "utf8");
  if (!pattern.test(content)) {
    throw new Error(`${filePath} did not match ${pattern}`);
  }
}

export function assertOutputNot(relativePath, pattern) {
  const filePath = join("public", relativePath);
  if (!existsSync(filePath)) {
    throw new Error(`expected ${filePath} to exist`);
  }
  const content = readFileSync(filePath, "utf8");
  if (pattern.test(content)) {
    throw new Error(`${filePath} unexpectedly matched ${pattern}`);
  }
}

export function assertOutputAbsent(relativePath) {
  const filePath = join("public", relativePath);
  if (existsSync(filePath)) {
    throw new Error(`expected ${filePath} to be absent`);
  }
}

export function assertOutputTree(relativePath, pattern) {
  const content = readTree(join("public", relativePath));
  if (!pattern.test(content)) {
    throw new Error(`${join("public", relativePath)} tree did not match ${pattern}`);
  }
}

export function assertOutputTreeNot(relativePath, pattern) {
  const content = readTree(join("public", relativePath));
  if (pattern.test(content)) {
    throw new Error(`${join("public", relativePath)} tree unexpectedly matched ${pattern}`);
  }
}

function readTree(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`expected ${filePath} to exist`);
  }
  if (statSync(filePath).isFile()) {
    return readFileSync(filePath, "utf8");
  }
  return readdirSync(filePath, { withFileTypes: true })
    .map((entry) => readTree(join(filePath, entry.name)))
    .join("\n");
}
