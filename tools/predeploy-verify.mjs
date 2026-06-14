import { createPredeployChecks, runPredeployCheck } from "./predeploy-checks.mjs";
import { log } from "./logger.mjs";

// Contract marker: artifact builds still set SKIP_ARCHIVE_WRITE in
// predeploy-artifact-assertions.mjs so verification cannot mutate archives.
const { checks, warning, fatal } = createPredeployChecks({
  requireMaven: process.env.REQUIRE_MAVEN === "true"
});

if (fatal) {
  console.error(`FAIL ${fatal}`);
  process.exit(1);
}
if (warning) {
  console.warn(`WARN ${warning}`);
}

const startedAt = Date.now();
const failures = [];

for (const check of checks) {
  const label = `\n==> ${check.name}`;
  log.info("predeploy check started", { name: check.name });
  process.stdout.write(`${label}\n`);
  try {
    runPredeployCheck(check);
  } catch (error) {
    failures.push(error.message);
  }
}

const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
if (failures.length > 0) {
  log.error("predeploy verification failed", { seconds, failures });
  console.error(`\nFAIL predeploy verification failed in ${seconds}s`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

log.info("predeploy verification completed", { seconds, checks: checks.length });
console.log(`\nPASS predeploy verification completed in ${seconds}s`);
