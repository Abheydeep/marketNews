import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

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
  const result = spawnSync(check.command, check.args, {
    cwd: check.cwd,
    stdio: "inherit",
    shell: false
  });
  if (result.status !== 0) {
    failures.push(`${check.name} exited with ${result.status ?? "unknown status"}`);
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
