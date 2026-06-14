import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { verifyVercelArtifacts } from "./predeploy-vercel-artifacts.mjs";

export function createPredeployChecks({ requireMaven = false } = {}) {
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
    },
    {
      name: "Mock trading cockpit regression",
      command: "npm",
      args: ["run", "trading:mock:regression"]
    }
  ];

  if (commandExists("mvn")) {
    checks.push({
      name: "Spring backend tests",
      command: "mvn",
      args: ["-q", "test"],
      cwd: "backend"
    });
  } else if (requireMaven) {
    return {
      checks,
      fatal: "Spring backend tests: mvn is required but was not found."
    };
  } else {
    return {
      checks,
      warning: "Spring backend tests skipped: mvn was not found. Set REQUIRE_MAVEN=true in CI to make this fatal."
    };
  }

  return { checks };
}

export function runPredeployCheck(check) {
  if (check.run) {
    check.run();
    return;
  }
  const result = spawnSync(check.command, check.args, {
    cwd: check.cwd,
    stdio: "inherit",
    shell: false
  });
  if (result.status !== 0) {
    throw new Error(`${check.name} exited with ${result.status ?? "unknown status"}`);
  }
}

function fastApiPython() {
  const venvPython = "services/trading-api/.venv/bin/python";
  return existsSync(venvPython) ? venvPython : "python3";
}

function commandExists(command) {
  const result = spawnSync(command, ["--version"], { stdio: "ignore", shell: false });
  return result.status === 0;
}
