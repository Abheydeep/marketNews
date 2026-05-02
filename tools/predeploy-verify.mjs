import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const checks = [
  {
    name: "Repo contract tests",
    command: "npm",
    args: ["test"]
  },
  {
    name: "Trading dashboard typecheck",
    command: "npm",
    args: ["--workspace", "@market-narrative/trading-dashboard", "run", "typecheck"]
  },
  {
    name: "Trading dashboard production export",
    command: "npm",
    args: ["--workspace", "@market-narrative/trading-dashboard", "run", "build"]
  },
  {
    name: "Vercel artifact separation",
    run: verifyVercelArtifacts
  },
  {
    name: "FastAPI trading API tests",
    command: fastApiPython(),
    args: ["-m", "pytest"]
  }
];

if (commandExists("mvn")) {
  checks.push({
    name: "Spring backend tests",
    command: "mvn",
    args: ["-q", "test"],
    cwd: "backend"
  });
} else if (process.env.REQUIRE_MAVEN === "true") {
  console.error("FAIL Spring backend tests: mvn is required but was not found.");
  process.exit(1);
} else {
  console.warn("WARN Spring backend tests skipped: mvn was not found. Set REQUIRE_MAVEN=true in CI to make this fatal.");
}

const startedAt = Date.now();
const failures = [];

for (const check of checks) {
  const label = `\n==> ${check.name}`;
  console.log(label);
  if (check.run) {
    try {
      check.run();
    } catch (error) {
      failures.push(`${check.name}: ${error.message}`);
    }
  } else {
    const result = spawnSync(check.command, check.args, {
      cwd: check.cwd,
      stdio: "inherit",
      shell: false
    });
    if (result.status !== 0) {
      failures.push(`${check.name} exited with ${result.status ?? "unknown status"}`);
    }
  }
}

const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
if (failures.length > 0) {
  console.error(`\nFAIL predeploy verification failed in ${seconds}s`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`\nPASS predeploy verification completed in ${seconds}s`);

function fastApiPython() {
  const venvPython = "services/trading-api/.venv/bin/python";
  return existsSync(venvPython) ? venvPython : "python3";
}

function commandExists(command) {
  const result = spawnSync(command, ["--version"], { stdio: "ignore", shell: false });
  return result.status === 0;
}

function verifyVercelArtifacts() {
  buildTarget("public");
  assertOutput("deployment-manifest.json", /"target": "public"/);
  assertOutput("index.html", /Pre-Market Intelligence Archive/);
  assertOutput("index.html", /Latest Market Briefings/);
  assertOutput("index.html", /Read market briefing/);
  assertOutput("index.html", /Previous session driver/);
  assertOutput("index.html", /sentiment-sparkline/);
  assertOutputNot("index.html", /All Market Narrative briefings|The root page now works|Asia watch:|markets tracked|\b\d+\s+setups\b|\b\d+\s+sources\b|Open daily briefing/);
  runPublicCopyQa("out/vercel");
  assertOutput("index.html", /Admin login/);
  assertOutputAbsent("components/index.html");

  buildTarget("admin");
  assertOutput("deployment-manifest.json", /"target": "admin"/);
  assertOutput("index.html", /Studio Command|Daily Reel Script|Admin Login/);
  assertOutput("components/index.html", /Project Components Map|Repository Component Map/);
  assertOutput("multibagger/index.html", /Multibagger Review Desk|Run Monthly Review/);
  assertOutput("robots.txt", /Disallow: \//);
  assertOutputNot("index.html", /Pre-Market Intelligence Archive/);

  buildTarget("trade");
  assertOutput("deployment-manifest.json", /"target": "trade"/);
  assertOutput("icon.svg", /mn-signal/);
  assertOutput("index.html", /_next\/static/);
}

function buildTarget(target) {
  const result = spawnSync("npm", ["run", "vercel:build"], {
    env: {
      ...process.env,
      MARKET_NARRATIVE_DEPLOY_TARGET: target,
      MARKET_DATA_MODE: "mock",
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

function runPublicCopyQa(target) {
  const result = spawnSync("node", ["tools/public-copy-qa.mjs", target], {
    stdio: "inherit",
    shell: false
  });
  if (result.status !== 0) {
    throw new Error(`public copy QA exited with ${result.status ?? "unknown status"}`);
  }
}

function assertOutput(relativePath, pattern) {
  const filePath = join("out", "vercel", relativePath);
  if (!existsSync(filePath)) {
    throw new Error(`expected ${filePath} to exist`);
  }
  const content = readFileSync(filePath, "utf8");
  if (!pattern.test(content)) {
    throw new Error(`${filePath} did not match ${pattern}`);
  }
}

function assertOutputNot(relativePath, pattern) {
  const filePath = join("out", "vercel", relativePath);
  if (!existsSync(filePath)) {
    throw new Error(`expected ${filePath} to exist`);
  }
  const content = readFileSync(filePath, "utf8");
  if (pattern.test(content)) {
    throw new Error(`${filePath} unexpectedly matched ${pattern}`);
  }
}

function assertOutputAbsent(relativePath) {
  const filePath = join("out", "vercel", relativePath);
  if (existsSync(filePath)) {
    throw new Error(`expected ${filePath} to be absent`);
  }
}
