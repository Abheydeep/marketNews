import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
  assertOutput("index.html", /Market Narrative: Nifty &amp; Bank Nifty Pre-Market Briefings/);
  assertOutput("index.html", /<h1>[^<]*(Nifty|Bank|Crude|Currency|Market)/);
  assertOutput("index.html", /Get the next trading-day 7:15 AM brief/);
  assertOutput("index.html", /application\/ld\+json/);
  assertOutput("index.html", /BreadcrumbList/);
  assertOutput("index.html", /WebSite/);
  assertOutput("index.html", /max-image-preview:large/);
  assertOutput("index.html", /Latest Market Briefings And Records/);
  assertOutput("index.html", /Search the archive/);
  assertOutput("index.html", /archiveSearch/);
  assertOutput("index.html", /Join daily email/);
  assertOutput("index.html", /Get the next trading-day 7:15 AM brief/);
  assertOutput("index.html", /details class="digest-card/);
  assertOutput("index.html", /verified article links/);
  assertOutput("index.html", /Read market briefing/);
  assertOutput("index.html", /Why it mattered for India/);
  assertOutput("index.html", /sentiment-sparkline/);
  assertOutput("index.html", /7:15 AM IST opening read/);
  assertOutput("index.html", /By Abhey Deep \/ Market Narrative/);
  assertOutput("index.html", /Last verified update/);
  assertOutput("index.html", /Daily trader workflow/);
  assertOutput("index.html", /Get the bias in 90 seconds/);
  assertOutput("index.html", /Trading Guide/);
  assertOutput("index.html", /Share this archive/);
  assertOutputNot("index.html", /Daily Pre-Market Archive|All Market Narrative briefings|root page|now works|news archive|Open a dated briefing|full quote board|chart links|Asia watch:|markets tracked|\b\d+\s+setups\b|\b\d+\s+sources\b|Open daily briefing/);
  assertOutput("multibagger/index.html", /Model status/);
  assertOutput("multibagger/index.html", /Rs 5L public baseline/);
  assertOutput("multibagger/index.html", /Current value/);
  assertOutput("multibagger/index.html", /Public tracking active|Rs 5L public baseline/);
  assertOutputNot("multibagger/index.html", /Baseline live/);
  assertOutput("multibagger/index.html", /Since entry \(04 May 2026, 02:12 pm\)/);
  assertOutput("multibagger/index.html", /How to read this page/);
  assertOutput("multibagger/index.html", /Start with the live model/);
  assertOutput("multibagger/index.html", /application\/ld\+json/);
  assertOutput("about/index.html", /About Market Narrative/);
  assertOutput("about/index.html", /Who is Abhey Deep/);
  assertOutput("about/index.html", /Why not just headlines/);
  assertOutput("about/index.html", /AboutPage/);
  assertOutput("about/index.html", /Person/);
  assertOutput("about/index.html", /aria-current="page">About/);
  assertOutput("about/index.html", /verified briefings published since launch/);
  assertOutput("about/index.html", /Browse the archive/);
  assertOutput("subscribe/index.html", /Join The 7:15 AM Brief/);
  assertOutput("subscribe/index.html", /Join daily email/);
  assertOutput("subscribe/index.html", /RegisterAction/);
  assertOutput("subscribe/index.html", /name="_honey"/);
  assertOutput("subscribe/index.html", /If you do not receive a confirmation email within a few minutes/);
  assertOutputNot("subscribe/index.html", /Request received\. Check your inbox/);
  assertOutputNot("subscribe/index.html", /name="_captcha" value="false"/);
  assertOutput("latest/index.html", /Market Narrative latest briefing|No pre-market briefing|briefing was not published as latest/);
  assertOutput("latest/trading-guide/index.html", /Market Narrative latest trading guide|No pre-market briefing|briefing was not published as latest/);
  assertOutput("index.html", /Today's briefing is live|Market closed today|Latest under verification/);
  assertOutput("4may2026/index.html", /Opening Nerve/);
  assertOutput("4may2026/index.html", /Evidence grade:/);
  assertOutput("4may2026/index.html", /Full India-source gate:/);
  assertOutput("4may2026/index.html", /Stand-down trigger/);
  assertOutput("4may2026/trading-guide/index.html", /Trading Guide/);
  assertOutput("4may2026/trading-guide/index.html", /Opening Nerve/);
  assertOutput("multibagger/index.html", /Research model started 27 Apr 2026/);
  assertOutput("multibagger/index.html", /Entries captured 04 May, 02:12 pm/);
  assertOutput("multibagger/index.html", /Latest quote refresh/);
  assertOutput("multibagger/index.html", /Share this public tracker/);
  assertOutput("multibagger/index.html", /Rs 5L deployed/);
  assertOutput("multibagger/index.html", /Current price/);
  assertOutput("multibagger/index.html", /Entry timestamp/);
  assertOutput("multibagger/index.html", /Entry: 04 May 2026, 02:12 pm/);
  assertOutput("multibagger/index.html", /Quote timestamp/);
  assertOutput("multibagger/index.html", /Closest challenger/);
  assertOutput("multibagger/index.html", /High replacement pressure/);
  assertOutput("multibagger/index.html", /Not tips/);
  assertOutput("multibagger/index.html", /Cash conversion matters/);
  assertOutput("multibagger/index.html", /holding-card-grid/);
  assertOutput("multibagger/index.html", /Detailed Ledger/);
  assertOutput("multibagger/index.html", /Renewable execution/);
  assertOutput("multibagger/index.html", /Plain-English role legend/);
  assertOutput("multibagger/index.html", /holding-name-line/);
  assertOutputNot("multibagger/index.html", /<th>Plain-English Role<\/th>/);
  assertOutputNot("multibagger/index.html", /Since baseline date|Since model date|Last static update|pre-fill/);
  assertOutput("multibagger/index.html", /allocation-donut/);
  assertOutput("multibagger/index.html", /Holdings/);
  assertOutput("multibagger/index.html", />Screener<\/a>/);
  assertOutput("multibagger/index.html", /Weights are normalized to Rs 5 lakh/);
  assertOutput("multibagger/state.json", /"modelEntryDate": "2026-04-27"/);
  assertOutput("multibagger/state.json", /"trackingBasis"/);
  assertOutput("multibagger/state.json", /"publicFillBaselineAt": "2026-05-04T14:12:00\+05:30"/);
  assertOutput("multibagger/state.json", /"displayLabel": "Renewable execution"/);
  assertOutput("multibagger/state.json", /"replacementPressure": "High"/);
  assertOutput("multibagger/state.json", /"entryAt": "2026-05-04T14:12:00\+05:30"/);
  assertOutput("multibagger/state.json", /"entryPrice"/);
  assertOutput("multibagger/state.json", /"returnPercent"/);
  assertOutput("multibagger/state.json", /"currentModelValueInr"/);
  runPublicCopyQa("out/vercel");
  assertOutputNot("index.html", /Admin login|admin\.marketnarrative\.in/);
  assertOutputAbsent("components/index.html");
  assertOutput("robots.txt", /Disallow: \/dark-preview\//);
  assertOutput("sitemap.xml", /<changefreq>daily<\/changefreq>/);
  assertOutput("sitemap.xml", /<priority>1\.0<\/priority>/);

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
  assertOutputTree("_next/static", /marketnarrative-trade-api\.onrender\.com/);
  assertOutputTreeNot("_next/static", /Market WebSocket connection failed/);
  assertOutputTree("_next/static", /Waiting for live/);
  assertOutputTree("_next/static", /OI Δ warming up/);
  assertOutputTree("_next/static", /ATM/);
  assertOutputTree("_next/static", /Asia\/Kolkata/);
}

function buildTarget(target) {
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

function assertOutputTree(relativePath, pattern) {
  const filePath = join("out", "vercel", relativePath);
  const content = readTree(filePath);
  if (!pattern.test(content)) {
    throw new Error(`${filePath} tree did not match ${pattern}`);
  }
}

function assertOutputTreeNot(relativePath, pattern) {
  const filePath = join("out", "vercel", relativePath);
  const content = readTree(filePath);
  if (pattern.test(content)) {
    throw new Error(`${filePath} tree unexpectedly matched ${pattern}`);
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
