import assert from "node:assert/strict";

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
  authenticated: process.env.RUN_AUTHENTICATED_SMOKE === "true",
  orderBlock: process.env.RUN_ORDER_BLOCK_SMOKE === "true"
};

const results = [];

await check("public apex loads archive", async () => {
  const response = await fetchText(config.publicUrl);
  assert.equal(response.status, 200);
  assert.match(response.body, /Market Narrative|briefings|Daily Pre-Market Summary/i);
});

await check("www host loads or redirects cleanly", async () => {
  const response = await fetchText(config.wwwUrl);
  assert.ok([200, 301, 302, 307, 308].includes(response.status), `unexpected status ${response.status}`);
});

await check("admin host loads script engine login gate", async () => {
  const response = await fetchText(config.adminUrl);
  assert.equal(response.status, 200);
  assert.match(response.body, /Admin Login/i);
  assert.match(response.body, /Studio Command|Private Studio|Daily Reel Script/i);
});

await check("admin host loads multibagger review workflow", async () => {
  const response = await fetchText(`${config.adminUrl}/multibagger/`);
  assert.equal(response.status, 200);
  assert.match(response.body, /Multibagger Review Desk/i);
  assert.match(response.body, /Run Monthly Review/i);
});

await check("trade host loads Abhey login gate", async () => {
  const response = await fetchText(config.tradeUrl);
  assert.equal(response.status, 200);
  assert.match(response.body, /Trading Cockpit/i);
  assert.match(response.body, /Abhey|admin/i);
});

await check("Spring health endpoint is healthy", async () => {
  const payload = await fetchJson(`${config.authApiUrl}/actuator/health`, 200);
  assert.match(String(payload.status ?? ""), /UP|ok/i);
});

await check("FastAPI health endpoint is healthy", async () => {
  const payload = await fetchJson(`${config.tradingApiUrl}/health`, 200);
  assert.equal(payload.status, "ok");
});

await check("trading API rejects unauthenticated access", async () => {
  const response = await fetchText(`${config.tradingApiUrl}/api/market/envelope`);
  assert.equal(response.status, 401);
});

if (config.nonAdminEmail && config.nonAdminPassword) {
  await check("non-Abhey account cannot access trading API", async () => {
    const token = await login(config.nonAdminEmail, config.nonAdminPassword);
    const response = await fetchText(`${config.tradingApiUrl}/api/market/envelope`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(response.status, 403);
  });
} else {
  skip("non-Abhey 403 check skipped: set NON_ABHEY_EMAIL and NON_ABHEY_PASSWORD");
}

if (config.authenticated) {
  if (!config.adminPassword) {
    throw new Error("RUN_AUTHENTICATED_SMOKE=true requires TRADING_ADMIN_PASSWORD");
  }
  const token = await check("Abhey admin can login and receives trade permission", async () => {
    const tokenValue = await login(config.adminEmail, config.adminPassword);
    const claims = decodeJwt(tokenValue);
    assert.equal(String(claims.sub).toLowerCase(), config.adminEmail.toLowerCase());
    assert.equal(claims.role, "ADMIN");
    assert.ok(Array.isArray(claims.permissions));
    assert.ok(claims.permissions.includes("trade:execute"));
    return tokenValue;
  });

  await check("Abhey admin can read trading envelope", async () => {
    const payload = await fetchJson(`${config.tradingApiUrl}/api/market/envelope`, 200, token);
    assert.ok(payload.signals);
    assert.ok(payload.option_chains);
  });

  for (const index of ["NIFTY", "BANKNIFTY"]) {
    await check(`Abhey admin can read ${index} signal`, async () => {
      const payload = await fetchJson(`${config.tradingApiUrl}/api/signals/latest?index=${index}`, 200, token);
      assert.ok(["BUY", "SELL", "WAIT"].includes(payload.action));
      assert.ok(Array.isArray(payload.reasons));
    });
    await check(`Abhey admin can read ${index} option chain`, async () => {
      const payload = await fetchJson(`${config.tradingApiUrl}/api/options/chain?index=${index}`, 200, token);
      assert.equal(payload.index, index);
      assert.ok(Array.isArray(payload.strikes));
    });
  }

  if (config.orderBlock) {
    await check("order confirmation remains blocked while live orders are disabled", async () => {
      const proposalResponse = await fetchJson(`${config.tradingApiUrl}/api/orders/proposals`, [200, 409], token, {
        method: "POST",
        body: JSON.stringify({ index: "BANKNIFTY" })
      });
      if (proposalResponse.statusCode === 409) {
        assert.match(JSON.stringify(proposalResponse.payload), /WAIT/i);
        return;
      }
      const confirmation = await fetchJson(`${config.tradingApiUrl}/api/orders/confirm`, 200, token, {
        method: "POST",
        body: JSON.stringify({ proposal_id: proposalResponse.payload.proposal_id, manual_confirm: true })
      });
      assert.equal(confirmation.status, "BLOCKED");
      assert.match(JSON.stringify(confirmation.reasons), /ENABLE_LIVE_ORDERS/i);
    });
  } else {
    skip("order block smoke skipped: set RUN_ORDER_BLOCK_SMOKE=true");
  }
} else {
  skip("authenticated Abhey smoke skipped: set RUN_AUTHENTICATED_SMOKE=true and TRADING_ADMIN_PASSWORD");
}

printSummary();

async function check(name, fn) {
  try {
    const value = await fn();
    results.push({ name, status: "PASS" });
    console.log(`PASS ${name}`);
    return value;
  } catch (error) {
    results.push({ name, status: "FAIL", detail: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
    return undefined;
  }
}

function skip(name) {
  results.push({ name, status: "SKIP" });
  console.warn(`SKIP ${name}`);
}

async function login(email, password) {
  const response = await fetch(`${config.authApiUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const payload = await response.json().catch(() => ({}));
  assert.equal(response.status, 200, `login failed with ${response.status}: ${JSON.stringify(payload)}`);
  assert.ok(payload.token, "login response did not include token");
  return payload.token;
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    redirect: "follow",
    ...options
  });
  return { status: response.status, body: await response.text(), headers: response.headers };
}

async function fetchJson(url, expectedStatus, token, options = {}) {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    },
    body: options.body
  });
  const payload = await response.json().catch(() => ({}));
  const expected = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  assert.ok(expected.includes(response.status), `expected HTTP ${expected.join(" or ")}, got ${response.status}: ${JSON.stringify(payload)}`);
  if (Array.isArray(expectedStatus)) {
    return { statusCode: response.status, payload };
  }
  return payload;
}

function decodeJwt(token) {
  const [, payload] = token.split(".");
  assert.ok(payload, "token does not contain a payload");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

function envUrl(name, fallback) {
  return (process.env[name] ?? fallback).replace(/\/$/, "");
}

function printSummary() {
  const counts = results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\nProduction smoke summary: ${counts.PASS ?? 0} passed, ${counts.SKIP ?? 0} skipped, ${counts.FAIL ?? 0} failed.`);
  if (process.exitCode) {
    process.exit(process.exitCode);
  }
}
