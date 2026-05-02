import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve as resolveDns } from "node:dns/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);

const config = {
  publicUrl: envUrl("PUBLIC_URL", "https://marketnarrative.in"),
  wwwUrl: envUrl("WWW_URL", "https://www.marketnarrative.in"),
  adminUrl: envUrl("ADMIN_URL", "https://admin.marketnarrative.in"),
  tradeUrl: envUrl("TRADE_URL", "https://trade.marketnarrative.in"),
  authApiUrl: envUrl("AUTH_API_URL", "https://api.marketnarrative.in"),
  tradingApiUrl: envUrl("TRADING_API_URL", "https://trade-api.marketnarrative.in"),
  adminEmail: process.env.TRADING_ADMIN_EMAIL ?? "abhey@marketnarrative.in",
  adminPassword: process.env.TRADING_ADMIN_PASSWORD ?? "",
  nonAdminEmail: process.env.NON_ABHEY_EMAIL ?? "",
  nonAdminPassword: process.env.NON_ABHEY_PASSWORD ?? "",
  runAuthenticated: process.env.RUN_AUTHENTICATED_QA === "true",
  requireAuthenticated: process.env.REQUIRE_AUTHENTICATED_QA === "true",
  runBrowser: process.env.SKIP_BROWSER_QA !== "true",
  timeoutMs: Number.parseInt(process.env.PROD_QA_TIMEOUT_MS ?? "12000", 10)
};

const results = [];

await group("Domain sanity", async () => {
  await check("Domain", "Production URLs use .in only", "config", "No .com production hostnames", async () => {
    for (const [name, value] of Object.entries({
      publicUrl: config.publicUrl,
      wwwUrl: config.wwwUrl,
      adminUrl: config.adminUrl,
      tradeUrl: config.tradeUrl,
      authApiUrl: config.authApiUrl,
      tradingApiUrl: config.tradingApiUrl
    })) {
      const host = new URL(value).hostname;
      assert.ok(host.endsWith(".marketnarrative.in") || host === "marketnarrative.in", `${name} uses ${host}`);
    }
    return "all configured hosts use .in";
  });

  await check("Domain", "Repo has no marketnarrative dot-com references", "repo", "No accidental .com refs", async () => {
    const result = spawnSync(
      "rg",
      [
        "-n",
        "marketnarrative\\.com($|[\\s\"'<>/?#:])",
        "README.md",
        "docs",
        "deploy",
        "apps",
        "frontend",
        "tools",
        "backend",
        "services",
        "-g",
        "!tools/production-qa-gate.mjs"
      ],
      { encoding: "utf8", shell: false }
    );
    assert.equal(result.status, 1, result.stdout || result.stderr || "unexpected reference found");
    return "no forbidden references";
  });

  await check("Domain", "Unconfigured .com trade host is not active", "trade .com", "NXDOMAIN or no answer", async () => {
    const host = ["trade", "marketnarrative", "com"].join(".");
    try {
      const records = await withTimeout(resolveDns(host), 3000, `${host} DNS lookup`);
      assert.deepEqual(records, [], `${host} unexpectedly resolves to ${records.join(", ")}`);
    } catch (error) {
      if (["ENODATA", "ENOTFOUND", "ESERVFAIL", "ETIMEOUT"].includes(error.code) || /timed out/i.test(error.message)) {
        return `${host} not configured`;
      }
      throw error;
    }
    return `${host} not configured`;
  });
});

await group("Public user surface", async () => {
  await expectPage(
    "User",
    "Public home",
    config.publicUrl,
    200,
    [/Pre-Market Intelligence Archive/i, /Latest Market Briefings/i, /Read market briefing/i, /Previous session driver/i, /sentiment-sparkline/i],
    [/Studio Command/i, /All Market Narrative briefings/i, /The root page now works/i, /Asia watch:/i, /markets tracked/i, /\b\d+\s+setups\b/i, /\b\d+\s+sources\b/i, /Open daily briefing/i]
  );
  await expectPage(
    "User",
    "Public www",
    config.wwwUrl,
    [200, 301, 302, 307, 308],
    [/Pre-Market Intelligence Archive/i, /Latest Market Briefings/i],
    [/All Market Narrative briefings/i, /The root page now works/i, /Asia watch:/i, /markets tracked/i, /\b\d+\s+setups\b/i, /\b\d+\s+sources\b/i]
  );
  await expectManifest("User", "Public manifest", config.publicUrl, "public");
  await expectSvg("User", "Public favicon", `${config.publicUrl}/favicon.svg`, /mn-logo-mark|mn-signal/i);
  await expectPage("User", "Latest briefing", `${config.publicUrl}/1may2026/`, 200, [/Daily Pre-Market Summary|Live Quote Board|Nifty/i, /Open TradingView Chart/i], [/Open Yahoo Chart/i]);
  await expectJson("User", "Latest digest JSON", `${config.publicUrl}/1may2026/digest.json`, 200, (payload) => {
    assert.ok(Array.isArray(payload.marketSnapshots), "marketSnapshots missing");
    assert.equal(Object.hasOwn(payload, "teleprompterScript"), false, "teleprompterScript leaked");
    assert.equal(Object.hasOwn(payload, "reelScript"), false, "reelScript leaked");
  });
  await expectPage(
    "User",
    "Public multibagger",
    `${config.publicUrl}/multibagger/`,
    200,
    [/5x Multibagger Portfolio|Concentrated 5x/i, /Since Apr 27, 2026/i, /Current value/i, /Model P&L/i, /KPEL/i],
    [/Run Monthly Review/i]
  );
  await expectJson("User", "Public multibagger state", `${config.publicUrl}/multibagger/state.json`, 200, (payload) => {
    const serialized = JSON.stringify(payload);
    assert.match(serialized, /KPEL/);
    assert.doesNotMatch(serialized, /broker|account value|quantity|raw OCR/i);
    assert.equal(payload.modelEntryDate, "2026-04-27");
    assert.equal(payload.performance?.modelEntryDate, "2026-04-27");
    assert.ok(Number.isFinite(payload.performance?.currentModelValueInr), "portfolio current value missing");
    assert.ok(Number.isFinite(payload.performance?.totalPnlInr), "portfolio P&L missing");
    assert.ok(Array.isArray(payload.holdings), "holdings missing");
    assert.ok(payload.holdings.every((holding) =>
      Number.isFinite(holding.entryPrice)
      && Number.isFinite(holding.lastPrice)
      && Number.isFinite(holding.returnPercent)
      && Number.isFinite(holding.currentModelValueInr)
    ), "holding return fields missing");
  });
  await expectPage("User", "Public admin path blocked", `${config.publicUrl}/admin/`, 404, [/not found|NOT_FOUND|404/i]);
});

await group("Admin surface", async () => {
  await expectPage("Admin", "Admin home", config.adminUrl, 200, [/Admin Login/i, /Studio Command|Daily Reel Script/i], [/Pre-Market Intelligence Archive/i]);
  await expectManifest("Admin", "Admin manifest", config.adminUrl, "admin");
  await expectPage("Admin", "Project components", `${config.adminUrl}/components/`, 200, [/Project Components Map|Repository Component Map/i, /Admin Login/i]);
  await expectPage("Admin", "Multibagger review", `${config.adminUrl}/multibagger/`, 200, [/Multibagger Review Desk/i, /Run Monthly Review/i], [/Public research tracker/i]);
  await expectSvg("Admin", "Admin favicon", `${config.adminUrl}/favicon.svg`, /mn-logo-mark|mn-signal/i);
  await expectPage("Admin", "Admin robots noindex", `${config.adminUrl}/robots.txt`, 200, [/Disallow:\s*\//i]);
});

await group("Trade surface", async () => {
  await expectPage("Trade", "Trading cockpit gate", config.tradeUrl, 200, [/Trading Cockpit/i, /Abhey trading admin/i, /trade-mn-signal|Market Narrative/i, /Auth API:/i], [/lucide-lock-keyhole/i, /FAILED TO FETCH/i]);
  await expectManifest("Trade", "Trade manifest", config.tradeUrl, "trade");
  await expectSvg("Trade", "Trade icon", `${config.tradeUrl}/icon.svg`, /mn-signal|Market Narrative/i);
  await expectPage("Trade", "Kite callback", `${config.tradeUrl}/kite/callback/`, 200, [/Kite Session|Waiting for request token|Trading admin token missing/i]);
});

await group("API surface", async () => {
  await expectJson("API", "Spring health", `${config.authApiUrl}/actuator/health`, 200, (payload) => {
    assert.match(String(payload.status ?? ""), /UP|ok/i);
  });
  await expectJson("API", "Trading API health", `${config.tradingApiUrl}/health`, 200, (payload) => {
    assert.equal(payload.status, "ok");
  });
  await expectPage("API", "Trading API unauth is 401", `${config.tradingApiUrl}/api/market/envelope`, 401, [/not authenticated|unauthorized|detail/i]);
  await expectCors("API", "Spring CORS allows trade", `${config.authApiUrl}/api/auth/login`, config.tradeUrl);
  await expectCors("API", "Spring CORS allows admin", `${config.authApiUrl}/api/auth/login`, config.adminUrl);
});

if (config.runAuthenticated || config.requireAuthenticated) {
  await group("Authenticated trade safety", async () => {
    if (!config.adminPassword) {
      await failOrSkip(
        "Trade",
        "Authenticated QA configured",
        "TRADING_ADMIN_PASSWORD",
        "Production Abhey password available",
        "Set TRADING_ADMIN_PASSWORD to run authenticated QA",
        config.requireAuthenticated
      );
      return;
    }

    const token = await check("Trade", "Abhey login and trade permissions", `${config.authApiUrl}/api/auth/login`, "JWT has trade:execute", async () => {
      const tokenValue = await login(config.adminEmail, config.adminPassword);
      const claims = decodeJwt(tokenValue);
      assert.equal(String(claims.sub).toLowerCase(), config.adminEmail.toLowerCase());
      assert.equal(claims.role, "ADMIN");
      assert.ok(claims.permissions.includes("trade:execute"), "trade:execute missing");
      return tokenValue;
    });

    if (config.nonAdminEmail && config.nonAdminPassword) {
      await check("Trade", "Non-Abhey rejected by trading API", `${config.tradingApiUrl}/api/market/envelope`, "HTTP 403", async () => {
        const nonAdminToken = await login(config.nonAdminEmail, config.nonAdminPassword);
        const response = await fetchText(`${config.tradingApiUrl}/api/market/envelope`, {
          headers: { Authorization: `Bearer ${nonAdminToken}` }
        });
        assert.equal(response.status, 403);
        return `HTTP ${response.status}`;
      });
    } else {
      await failOrSkip("Trade", "Non-Abhey negative auth", "NON_ABHEY_EMAIL/NON_ABHEY_PASSWORD", "HTTP 403", "credentials not supplied", false);
    }

    for (const index of ["NIFTY", "BANKNIFTY"]) {
      await expectAuthedJson("Trade", `${index} signal`, `${config.tradingApiUrl}/api/signals/latest?index=${index}`, token, (payload) => {
        assert.ok(["BUY", "SELL", "WAIT"].includes(payload.action), `bad action ${payload.action}`);
      });
      await expectAuthedJson("Trade", `${index} option chain`, `${config.tradingApiUrl}/api/options/chain?index=${index}`, token, (payload) => {
        assert.equal(payload.index, index);
        assert.ok(Array.isArray(payload.strikes), "strikes missing");
      });
    }

    await check("Trade", "Live order confirmation remains blocked", `${config.tradingApiUrl}/api/orders/confirm`, "BLOCKED while ENABLE_LIVE_ORDERS=false", async () => {
      const proposal = await fetchJson(`${config.tradingApiUrl}/api/orders/proposals`, [200, 409], token, {
        method: "POST",
        body: JSON.stringify({ index: "BANKNIFTY" })
      });
      if (proposal.statusCode === 409) {
        return "No proposal because current signal is WAIT";
      }
      const confirmation = await fetchJson(`${config.tradingApiUrl}/api/orders/confirm`, 200, token, {
        method: "POST",
        body: JSON.stringify({ proposal_id: proposal.payload.proposal_id, manual_confirm: true })
      });
      assert.equal(confirmation.status, "BLOCKED", `unexpected status ${confirmation.status}`);
      assert.match(JSON.stringify(confirmation.reasons), /ENABLE_LIVE_ORDERS|disabled/i);
      return "BLOCKED";
    });
  });
} else {
  await failOrSkip("Trade", "Authenticated trade safety", "RUN_AUTHENTICATED_QA=true", "Abhey login, non-Abhey 403, order blocked", "not requested", false);
}

if (config.runBrowser) {
  await group("Browser and mobile smoke", async () => {
    await runBrowserSmoke();
  });
} else {
  await failOrSkip("Browser", "Browser smoke", "SKIP_BROWSER_QA not set", "Desktop and mobile pages render without console errors", "skipped by env", false);
}

printSummary();

async function group(name, fn) {
  console.log(`\n==> ${name}`);
  await fn();
}

async function expectPage(surface, name, url, expectedStatus, requiredPatterns = [], forbiddenPatterns = []) {
  await check(surface, name, url, `HTTP ${statusLabel(expectedStatus)} with expected copy`, async () => {
    const response = await fetchText(url);
    assertStatus(response.status, expectedStatus);
    for (const pattern of requiredPatterns) {
      assert.match(response.body, pattern, `missing ${pattern}`);
    }
    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(response.body, pattern, `forbidden ${pattern} present`);
    }
    return `HTTP ${response.status}; ${compact(response.body)}`;
  });
}

async function expectJson(surface, name, url, expectedStatus, validate) {
  await check(surface, name, url, `HTTP ${statusLabel(expectedStatus)} JSON`, async () => {
    const response = await fetchText(url, { headers: { Accept: "application/json" } });
    assertStatus(response.status, expectedStatus);
    const payload = JSON.parse(response.body || "{}");
    validate(payload, response);
    return `HTTP ${response.status}; ${compact(JSON.stringify(payload))}`;
  });
}

async function expectAuthedJson(surface, name, url, token, validate) {
  await check(surface, name, url, "HTTP 200 JSON with Bearer auth", async () => {
    const payload = await fetchJson(url, 200, token);
    validate(payload);
    return compact(JSON.stringify(payload));
  });
}

async function expectManifest(surface, name, baseUrl, target) {
  await expectJson(surface, name, `${baseUrl}/deployment-manifest.json`, 200, (payload) => {
    assert.equal(payload.app, "marketnarrative");
    assert.equal(payload.target, target);
  });
}

async function expectSvg(surface, name, url, pattern) {
  await check(surface, name, url, "HTTP 200 SVG brand asset", async () => {
    const response = await fetchText(url, { headers: { Accept: "image/svg+xml,text/plain,*/*" } });
    assert.equal(response.status, 200);
    assert.match(response.body, /<svg/i);
    assert.match(response.body, pattern);
    return `HTTP ${response.status}; svg`;
  });
}

async function expectCors(surface, name, url, origin) {
  await check(surface, name, url, `CORS preflight allows ${origin}`, async () => {
    const response = await fetchText(url, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"
      }
    });
    assert.ok([200, 204].includes(response.status), `HTTP ${response.status}`);
    const allowOrigin = response.headers.get("access-control-allow-origin") ?? "";
    assert.ok(allowOrigin === origin || allowOrigin === "*", `bad access-control-allow-origin=${allowOrigin || "(missing)"}`);
    return `HTTP ${response.status}; allow-origin=${allowOrigin}`;
  });
}

async function check(surface, name, url, expected, fn) {
  try {
    const current = await fn();
    addResult({ status: "PASS", surface, name, url, expected, current });
    return current;
  } catch (error) {
    addResult({ status: "FAIL", surface, name, url, expected, current: error.message });
    process.exitCode = 1;
    return undefined;
  }
}

async function failOrSkip(surface, name, url, expected, current, required) {
  addResult({ status: required ? "FAIL" : "SKIP", surface, name, url, expected, current });
  if (required) {
    process.exitCode = 1;
  }
}

function addResult(result) {
  results.push(result);
  const icon = result.status === "PASS" ? "PASS" : result.status === "SKIP" ? "SKIP" : "FAIL";
  console.log(`${icon} [${result.surface}] ${result.name} -> ${result.current}`);
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      ...options,
      signal: controller.signal
    });
    return {
      status: response.status,
      body: await response.text(),
      headers: response.headers
    };
  } catch (error) {
    throw new Error(error.cause?.code ?? error.message);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, expectedStatus, token, options = {}) {
  const response = await fetchText(url, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    },
    body: options.body
  });
  const expected = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  assert.ok(expected.includes(response.status), `expected HTTP ${expected.join(" or ")}, got ${response.status}`);
  const payload = JSON.parse(response.body || "{}");
  if (Array.isArray(expectedStatus)) {
    return { statusCode: response.status, payload };
  }
  return payload;
}

async function login(email, password) {
  const payload = await fetchJson(`${config.authApiUrl}/api/auth/login`, 200, null, {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  assert.ok(payload.token, "login response did not include token");
  return payload.token;
}

function decodeJwt(token) {
  const [, payload] = token.split(".");
  assert.ok(payload, "token does not contain a payload");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

async function runBrowserSmoke() {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const browserResults = [];
  try {
    for (const viewport of [
      { name: "desktop", width: 1440, height: 1000 },
      { name: "mobile", width: 390, height: 844 }
    ]) {
      const context = await browser.newContext({ viewport });
      const consoleErrors = [];
      context.on("page", (page) => {
        page.on("console", (message) => {
          if (message.type() === "error") {
            consoleErrors.push(`${page.url()} :: ${message.text()}`);
          }
        });
        page.on("pageerror", (error) => {
          consoleErrors.push(`${page.url()} :: ${error.message}`);
        });
      });
      const page = await context.newPage();
      await browserCheck(page, "User", `Browser ${viewport.name} public home`, config.publicUrl, /Pre-Market Intelligence Archive|Latest Market Briefings/i);
      await browserCheck(page, "User", `Browser ${viewport.name} latest briefing`, `${config.publicUrl}/1may2026/`, /Live Quote Board|Daily Pre-Market Summary/i);
      await browserCheck(page, "User", `Browser ${viewport.name} multibagger`, `${config.publicUrl}/multibagger/`, /Since Apr 27, 2026|Current value/i);
      await browserCheck(page, "Admin", `Browser ${viewport.name} admin gate`, config.adminUrl, /Admin Login|Studio Command/i);
      await browserCheck(page, "Trade", `Browser ${viewport.name} trade gate`, config.tradeUrl, /Trading Cockpit|Abhey trading admin/i);
      assert.deepEqual(consoleErrors, [], `console/page errors:\n${consoleErrors.join("\n")}`);
      browserResults.push(`${viewport.name} ok`);
      await context.close();
    }
    addResult({
      status: "PASS",
      surface: "Browser",
      name: "Desktop and mobile smoke",
      url: "public/admin/trade",
      expected: "No console errors and key pages render",
      current: browserResults.join(", ")
    });
  } catch (error) {
    addResult({
      status: "FAIL",
      surface: "Browser",
      name: "Desktop and mobile smoke",
      url: "public/admin/trade",
      expected: "No console errors and key pages render",
      current: error.message
    });
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

async function browserCheck(page, surface, name, url, pattern) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: config.timeoutMs });
  const body = await page.locator("body").innerText({ timeout: config.timeoutMs });
  assert.match(body, pattern, `${name} missing ${pattern}`);
  const visibleBody = await page.locator("body").boundingBox();
  assert.ok(visibleBody && visibleBody.width > 300 && visibleBody.height > 300, `${name} has invalid body dimensions`);
}

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (error) {
    const fallbackRoot =
      process.env.PLAYWRIGHT_NODE_MODULES ??
      (process.env.HOME
        ? join(process.env.HOME, ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules")
        : "");
    if (fallbackRoot) {
      try {
        const fallbackRequire = createRequire(join(fallbackRoot, "playwright", "package.json"));
        return fallbackRequire("playwright");
      } catch {
        // Fall through to the actionable error below.
      }
    }
    throw new Error(`Playwright is required for production browser QA. ${error.message}`);
  }
}

function assertStatus(actual, expectedStatus) {
  const expected = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  assert.ok(expected.includes(actual), `expected HTTP ${expected.join(" or ")}, got ${actual}`);
}

function statusLabel(status) {
  return Array.isArray(status) ? status.join(" or ") : String(status);
}

function envUrl(name, fallback) {
  return (process.env[name] ?? fallback).replace(/\/$/, "");
}

function compact(value) {
  return String(value).replace(/\s+/g, " ").slice(0, 140);
}

async function withTimeout(promise, timeoutMs, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(`${label} timed out after ${timeoutMs}ms`);
          error.code = "ETIMEOUT";
          reject(error);
        }, timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function printSummary() {
  const counts = results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
  const rows = results.map((item) => ({
    Status: item.status,
    Surface: item.surface,
    Scenario: item.name,
    Expected: item.expected,
    Current: item.current,
    URL: item.url
  }));
  console.log("\nProduction QA matrix:");
  console.table(rows);
  console.log(`Production QA summary: ${counts.PASS ?? 0} passed, ${counts.SKIP ?? 0} skipped, ${counts.FAIL ?? 0} failed.`);
  if (process.exitCode) {
    console.error("Launch remains BLOCKED. Fix every FAIL before sharing the site.");
    process.exit(process.exitCode);
  }
  if ((counts.SKIP ?? 0) > 0) {
    console.warn("Launch has skipped checks. Run authenticated QA before real trading use.");
  }
}
