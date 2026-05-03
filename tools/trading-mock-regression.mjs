import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import net from "node:net";

const root = new URL("..", import.meta.url);
const apiDir = new URL("services/trading-api/", root);
const pythonBin = existsSync(new URL(".venv/bin/python", apiDir)) ? ".venv/bin/python" : "python3";
const jwtSecret = "change-this-local-demo-secret-change-this-local-demo-secret";
const jwtIssuer = "market-narrative-local";
const tradingAdminEmail = "abhey@marketnarrative.in";

const apiPort = await freePort();
const apiBase = `http://127.0.0.1:${apiPort}`;
const token = createTradingToken();
const server = spawn(
  pythonBin,
  ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(apiPort), "--log-level", "warning"],
  {
    cwd: apiDir,
    env: {
      ...process.env,
      TRADING_MARKET_MODE: "mock",
      TRADING_AUTH_REQUIRED: "true",
      ENABLE_LIVE_ORDERS: "false",
      TRADING_ADMIN_EMAIL: tradingAdminEmail,
      JWT_SECRET: jwtSecret,
      JWT_ISSUER: jwtIssuer,
      TRADING_CORS_ORIGIN: "http://127.0.0.1:3002",
      KITE_API_KEY: "",
      KITE_API_SECRET: ""
    },
    stdio: ["ignore", "pipe", "pipe"]
  }
);

let stdout = "";
let stderr = "";
server.stdout.on("data", (chunk) => {
  stdout += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

try {
  await waitForHealth(apiBase);
  await assertRejectsMissingToken(apiBase);
  const envelope = await getJson(`${apiBase}/api/market/envelope`, { token });
  assertEnvelope(envelope);
  await assertKillSwitch(apiBase, token);
  await assertOrderPathStaysSafe(apiBase, token, envelope);
  await assertWebSocketSnapshot(apiBase, token);
  console.log("PASS mock trading regression: authenticated envelope, NIFTY/BANKNIFTY charts, OI chain, kill switch, safe order path, websocket");
} finally {
  await stopServer(server);
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForHealth(baseUrl) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (server.exitCode !== null) {
      throw new Error(`trading API exited early with ${server.exitCode}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
    }
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }
    await delay(250);
  }
  throw new Error(`trading API did not become healthy\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
}

async function assertRejectsMissingToken(baseUrl) {
  const response = await fetch(`${baseUrl}/api/market/envelope`);
  assert(response.status === 401, `missing-token envelope should be 401, got ${response.status}`);
}

function assertEnvelope(envelope) {
  assert(envelope.status.mode === "mock", `expected mock mode, got ${envelope.status.mode}`);
  assert(envelope.status.message.includes("Demo market stream"), "mock status should identify demo stream");
  for (const index of ["NIFTY", "BANKNIFTY"]) {
    const candles = envelope.candles?.[index] ?? [];
    const chain = envelope.option_chains?.[index];
    const signal = envelope.signals?.[index];
    assert(candles.length >= 50, `${index} should have a nonblank candle series`);
    assert(candles.every((candle) => Number.isFinite(candle.close) && candle.volume > 0), `${index} candles should be numeric`);
    assert(chain, `${index} option chain missing`);
    assert(chain.snapshots.length >= 10, `${index} option chain should include nearby strikes`);
    assert(chain.snapshots.some((snapshot) => Math.abs(snapshot.oi_delta) > 0), `${index} should expose non-zero OI deltas in mock`);
    assert(chain.pcr.pcr > 0, `${index} PCR should be positive`);
    assert(signal, `${index} signal missing`);
    assert(["BUY", "SELL", "WAIT"].includes(signal.action), `${index} signal action invalid`);
    assert(signal.reasons.length > 0, `${index} signal should explain itself`);
  }
}

async function assertKillSwitch(baseUrl, token) {
  const enabled = await postJson(`${baseUrl}/api/orders/kill-switch`, { enabled: true }, { token });
  assert(enabled.kill_switch_enabled === true, "kill switch should enable");
  const disabled = await postJson(`${baseUrl}/api/orders/kill-switch`, { enabled: false }, { token });
  assert(disabled.kill_switch_enabled === false, "kill switch should disable");
}

async function assertOrderPathStaysSafe(baseUrl, token, envelope) {
  const index = envelope.signals.BANKNIFTY?.action === "WAIT" ? "NIFTY" : "BANKNIFTY";
  const response = await fetch(`${baseUrl}/api/orders/proposals`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ index })
  });
  if (response.status === 409) {
    const text = await response.text();
    assert(text.includes("WAIT"), "WAIT proposal rejection should be explicit");
    return;
  }
  assert(response.ok, `proposal should be 200 or 409, got ${response.status}`);
  const proposal = await response.json();
  const confirmation = await postJson(
    `${baseUrl}/api/orders/confirm`,
    { proposal_id: proposal.proposal_id, manual_confirm: true },
    { token }
  );
  assert(confirmation.status === "BLOCKED", `mock/live-disabled confirmation must be BLOCKED, got ${confirmation.status}`);
  assert(
    confirmation.reasons.includes("ENABLE_LIVE_ORDERS is not true"),
    "live-disabled confirmation should cite ENABLE_LIVE_ORDERS"
  );
}

async function assertWebSocketSnapshot(baseUrl, token) {
  const wsBase = baseUrl.replace("http://", "ws://");
  const payload = await new Promise((resolve, reject) => {
    const ws = new WebSocket(`${wsBase}/ws/market?token=${encodeURIComponent(token)}`);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("timed out waiting for websocket market snapshot"));
    }, 6000);
    ws.addEventListener("message", (event) => {
      clearTimeout(timer);
      ws.close();
      resolve(JSON.parse(event.data));
    });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("websocket failed before first market snapshot"));
    });
  });
  assert(payload.candles.NIFTY.length > 0, "websocket should carry NIFTY candles");
  assert(payload.candles.BANKNIFTY.length > 0, "websocket should carry BANKNIFTY candles");
}

async function getJson(url, { token } = {}) {
  const response = await fetch(url, { headers: token ? headers(token) : undefined });
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function postJson(url, body, { token } = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

function headers(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

function createTradingToken() {
  const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
  const payload = base64UrlJson({
    iss: jwtIssuer,
    sub: tradingAdminEmail,
    name: "Mock Trading Admin",
    role: "ADMIN",
    permissions: ["trade:read", "trade:execute"],
    exp: Math.floor(Date.now() / 1000) + 3600
  });
  const unsigned = `${header}.${payload}`;
  const signature = createHmac("sha256", jwtSecret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

function base64UrlJson(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function stopServer(child) {
  if (child.exitCode !== null) {
    return;
  }
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    delay(3000).then(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
    })
  ]);
}
