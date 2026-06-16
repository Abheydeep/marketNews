# Release Test Plan

This plan is intentionally heavier than a normal content site checklist because `marketnarrative.in` has two very different blast radii:

- Public market briefing pages must be fast, SEO-safe, and visually correct.
- The private trading cockpit must prove auth isolation, stale-data rejection, and live-order blocks before any launch.

Live Zerodha order placement is out of scope for launch and must remain disabled with `ENABLE_LIVE_ORDERS=false`.

## Test Levels

| Level | When | Owner | Required Before Merge | Required Before Launch |
| --- | --- | --- | --- | --- |
| Static checks | Every branch update | Developer/CI | Yes | Yes |
| Unit tests | Every branch update | Developer/CI | Yes | Yes |
| Contract tests | Every branch update | Developer/CI | Yes | Yes |
| Production builds | Every branch update | Developer/CI | Yes | Yes |
| Docker compose validation | Before VPS deploy | Developer/CI | Yes when Docker exists | Yes |
| Mock E2E | Before VPS deploy | Developer/CI | Yes | Yes |
| VPS smoke | After backend deploy | Operator | No | Yes |
| Vercel/DNS smoke | After DNS points | Operator | No | Yes |
| AuthZ/security smoke | After backend deploy | Operator | No | Yes |
| Trading-session observation | During market hours | Operator | No | Yes before using signals |
| Rollback drill | Before public announcement | Operator | No | Yes |

## Pre-Merge Gate

Run this before opening or merging the PR:

```bash
npm run context:verify
npm run test:deploy
```

This runs:

- Context guardrail verification.
- Repo contract tests via `npm test`.
- Trading dashboard TypeScript typecheck.
- Trading dashboard production export build.
- FastAPI trading API pytest suite.
- Spring backend Maven tests when `mvn` exists.

In CI, set `REQUIRE_MAVEN=true` so a missing Maven installation fails the build instead of warning.

Additional checks:

```bash
git diff --check
docker compose --env-file deploy/production/env.example -f infra/docker-compose.prod.yml config
```

The Docker command must be run on a machine with Docker installed. It proves the production compose file parses before the VPS sees it.

## Unit And Domain Coverage

FastAPI tests must cover these cases as deterministic unit tests with mocked adapters:

- Technical engine:
  - Zero-volume candles are dropped before indicators.
  - RSI/EMA/MACD/VWAP return stable values on known fixtures.
  - Fractal pivots ignore insignificant noise.
  - Wick rejection ratios classify upper/lower rejection correctly.
  - KDE zones are bands, not single-price lines.
  - Trendline slope/intercept are stable on synthetic rising/falling data.
- Options engine:
  - Instrument master parsing rejects expired contracts.
  - Current valid expiry is selected dynamically.
  - ATM strike selection handles NIFTY 50-point and BANKNIFTY 100-point intervals.
  - Missing quote/OI fields do not crash the chain builder.
  - PCR and five-minute PCR velocity are calculated from rolling snapshots.
  - OI matrix returns exactly `Long Build-up`, `Short Build-up`, `Long Liquidation`, or `Short Covering`.
- Sentiment engine:
  - Mock provider works with no API keys.
  - Duplicate news items are ignored.
  - Positive/neutral/negative model outputs map into `-1.0..+1.0`.
  - Absent FinBERT dependencies fall back cleanly.
- Signal engine:
  - BUY requires support-zone proximity, long build-up, rising PCR, and positive sentiment.
  - SELL requires resistance-zone proximity, short build-up, falling/weak PCR, and negative sentiment.
  - Partial confluence returns WAIT with ranked reasons.
  - Entry, target, stop, and confidence stay inside expected bounds.
- Risk engine:
  - Live orders are blocked when `ENABLE_LIVE_ORDERS=false`.
  - Manual confirmation is required for every order.
  - Expired proposal is blocked.
  - Expired Kite token is blocked.
  - Missing quote data is blocked.
  - Missing margin data is blocked.
  - Kill switch blocks new orders.
  - Daily loss lockout blocks new orders.
  - One open position per index is enforced.

## Backend Integration Coverage

Spring backend:

- `/actuator/health` returns `UP`.
- Demo admin seeding can be disabled with `SEED_DEMO_ADMIN=false`.
- Production trading admin is seeded only from `TRADING_ADMIN_EMAIL` and `ABHEY_ADMIN_PASSWORD`.
- Normal admin tokens do not include `trade:read` or `trade:execute`.
- Only the configured Abhey email receives trading permissions.
- JWT issuer and secret are environment-controlled.
- Login rejects invalid password and unknown user.

FastAPI trading API:

- Unauthenticated REST requests return `401`.
- Token with wrong issuer returns `401`.
- Expired token returns `401`.
- Valid non-Abhey admin token returns `403`.
- Valid Abhey trading-admin token returns `200`.
- WebSocket without token closes with policy violation.
- WebSocket with wrong token closes with policy violation.
- WebSocket with Abhey token streams market envelopes.
- `GET /api/kite/login-url` returns a controlled `400` when Kite key is absent.
- `POST /api/instruments/refresh` returns `401` when Kite session is missing.
- Kite HTTP adapter respects quote and historical rate limits.
- Token storage expires sessions at the next 6 AM IST boundary.

## Frontend Coverage

Trading dashboard:

- Production build/export completes.
- Static export opens without console errors.
- Login gate is visible on first load.
- Password input is empty on first load.
- Non-Abhey or no-scope token is rejected client-side.
- Valid Abhey token is persisted in localStorage.
- Logout clears token, snapshot, proposals, and WebSocket state.
- WebSocket URL includes the token query parameter.
- REST calls attach the Bearer token.
- Signal module handles BUY, SELL, WAIT, missing data, and proposal errors.
- Order confirmation modal cannot confirm without a proposal.
- Risk panel kill switch sends authenticated API call.
- Chart renders candles, KDE bands, and trendlines without blank canvas state.
- Layout has no overlap at `390x844`, `768x1024`, `1440x900`, and `1920x1080`.

Public site:

- Archive page loads latest and historical briefings.
- Daily briefing page loads published JSON only, not admin-only script payloads.
- Admin/studio sections are not present on public pages.
- Market chart canvas renders nonblank pixels.
- Source links are present and navigable.
- Browser console and page errors are empty.

Existing Playwright QA can be run with:

```bash
npm run site:qa
```

## Mock End-To-End Gate

Before deploying to the VPS, run the full application in mock mode:

1. Start Postgres and Redis locally.
2. Start Spring backend with local JWT settings.
3. Start FastAPI trading API with `TRADING_AUTH_REQUIRED=true` and `ENABLE_LIVE_ORDERS=false`.
4. Start the trading dashboard.
5. Login as the local Abhey admin.
6. Verify:
   - Market envelope loads.
   - WebSocket connects.
   - BUY/SELL/WAIT signal renders.
   - Order proposal either returns a proposal or rejects WAIT with `409`.
   - Order confirmation returns `BLOCKED`, never `PLACED`.
   - Kill switch changes risk state.

This mock gate is not a substitute for live Kite data, but it catches auth, contracts, WebSocket, rendering, and order safety wiring.

## Production Smoke Gate

After VPS, Vercel, and DNS are configured, run:

```bash
npm run prod:smoke
```

For the no-silly-mistakes release gate, run:

```bash
npm run prod:qa
```

This prints a route-by-route matrix for public, admin, trade, APIs, logos, manifests, stale chart-provider copy, CORS, browser console errors, and mobile rendering. A failed row blocks sharing the site.

Install the local pre-push hook before release work:

```bash
npm run hooks:install
```

The hook runs `npm test`, builds the public Vercel artifact in mock mode, and runs `npm run public:copy:qa`. Do not bypass it on release branches. GitHub Actions also runs the public-copy QA gate and `npm run mobile:smoke -- public` on pull requests and `main` pushes.

Before using the trading cockpit for real workflows, run the strict authenticated gate from a trusted shell:

```bash
TRADING_ADMIN_PASSWORD='<production password>' \
RUN_AUTHENTICATED_QA=true \
REQUIRE_AUTHENTICATED_QA=true \
npm run prod:qa
```

Default unauthenticated smoke checks:

- `https://marketnarrative.in` loads.
- `https://www.marketnarrative.in` loads or redirects.
- `https://marketnarrative.in/deployment-manifest.json` reports `target=public`.
- `https://admin.marketnarrative.in` loads the private Studio Command login gate.
- `https://admin.marketnarrative.in/deployment-manifest.json` reports `target=admin`.
- `https://admin.marketnarrative.in/components/` loads the private component map.
- `https://admin.marketnarrative.in/multibagger/` loads the private review workflow, not the public tracker.
- `https://trade.marketnarrative.in` loads the trading cockpit login gate.
- `https://trade.marketnarrative.in/deployment-manifest.json` reports `target=trade`.
- `https://api.marketnarrative.in/actuator/health` is healthy.
- `https://trade-api.marketnarrative.in/health` is healthy.
- Unauthenticated trading API access returns `401`.

Authenticated smoke checks require explicit environment variables because they transmit the admin password to the production auth API:

```bash
RUN_AUTHENTICATED_SMOKE=true \
TRADING_ADMIN_PASSWORD='<production password>' \
npm run prod:smoke
```

This verifies:

- Abhey login works.
- JWT subject is `abhey@marketnarrative.in`.
- JWT includes `trade:execute`.
- Trading envelope, latest signals, and option chains return `200`.

Optional non-Abhey negative check:

```bash
NON_ABHEY_EMAIL='<other-admin-email>' \
NON_ABHEY_PASSWORD='<other-admin-password>' \
npm run prod:smoke
```

Optional order-block smoke:

```bash
RUN_AUTHENTICATED_SMOKE=true \
RUN_ORDER_BLOCK_SMOKE=true \
TRADING_ADMIN_PASSWORD='<production password>' \
npm run prod:smoke
```

Expected result: order confirmation is `BLOCKED`. A `PLACED` result during launch mode is a release blocker.

## Local Prod-Like Content Gate

For content-generation, LLM-routing, or public briefing pipeline changes, run a
real-key local pass before deploy:

```bash
npm run local:prod -- --date YYYY-MM-DD
npm run local:prod:smoke
```

`local:prod` loads `.env.local`, requires a real `NVIDIA_API_KEY`, generates
with live market/news modes, builds the public artifact, runs public copy QA,
and serves the result locally. Unit tests remain mocked by default.

## VPS Infrastructure Gate

Run on the droplet:

```bash
docker compose --env-file .env -f infra/docker-compose.prod.yml ps
docker compose --env-file .env -f infra/docker-compose.prod.yml logs --tail=100 backend
docker compose --env-file .env -f infra/docker-compose.prod.yml logs --tail=100 trading-api
docker compose --env-file .env -f infra/docker-compose.prod.yml exec postgres pg_isready -U narrative -d market_narrative
docker compose --env-file .env -f infra/docker-compose.prod.yml exec redis redis-cli ping
```

Required:

- Backend, trading API, Postgres, Redis, and Caddy are up.
- Postgres and Redis have no public host ports.
- Caddy obtains valid certificates.
- Caddy routes:
  - `api.marketnarrative.in` to Spring `:8080`.
  - `trade-api.marketnarrative.in` to FastAPI `:8090`.
- Firewall allows only SSH, HTTP, and HTTPS.
- Docker restart policy is `unless-stopped`.

## DNS And TLS Gate

Before enabling Cloudflare proxying:

```bash
dig +short marketnarrative.in
dig +short www.marketnarrative.in
dig +short trade.marketnarrative.in
dig +short api.marketnarrative.in
dig +short trade-api.marketnarrative.in
curl -I https://marketnarrative.in
curl -I https://trade.marketnarrative.in
curl -I https://api.marketnarrative.in/actuator/health
curl -I https://trade-api.marketnarrative.in/health
```

Required:

- Apex, `www`, and `trade` match Vercel’s requested records.
- `api` and `trade-api` point to the droplet IP while DNS-only.
- HTTPS certificates are valid.
- No mixed-content warnings in the browser.
- CORS allows `https://trade.marketnarrative.in` and rejects unexpected origins.
- HSTS is enabled only after smoke tests pass.

## Market-Hours Observation Gate

Run this during an NSE market session before relying on any signal:

- Manual Kite login succeeds through the redirect/token exchange.
- `GET /api/kite/status` reports valid token.
- Instrument refresh completes after login.
- NIFTY and BANKNIFTY option universes show current valid expiries.
- ATM options update with fresh timestamps.
- OI is present in full-mode subscriptions.
- PCR and PCR velocity move when option OI changes.
- Signals update without stale tick warnings.
- Dashboard latency display remains under the configured threshold.
- Missing Kite/news keys degrade into mock/fallback modes without crashes.
- No order can be placed while `ENABLE_LIVE_ORDERS=false`.

If any tick stream, option-chain, or OI data is stale, treat all signals as non-tradable and leave order placement disabled.

## Security Gate

Before launch:

- Confirm `.env`, Kite tokens, TOTP seeds, passwords, and API keys are not committed.
- Confirm the code does not store Kite password or TOTP seed.
- Confirm `ENABLE_LIVE_ORDERS=false` on the VPS.
- Confirm `JWT_SECRET` is strong and shared only by Spring and FastAPI.
- Confirm `ABHEY_ADMIN_PASSWORD` exists only in secret storage or VPS `.env`.
- Confirm production `SEED_DEMO_ADMIN=false`.
- Confirm `TRADING_ADMIN_EMAIL=abhey@marketnarrative.in`.
- Confirm trading API protected endpoints require Bearer auth.
- Confirm order confirmation requires manual UI action.
- Confirm CORS does not use wildcard origins in production.
- Confirm Postgres and Redis are not internet-facing.

## Performance And Reliability Gate

Minimum launch observations:

- Public page first load is acceptable on mobile network emulation.
- Trading dashboard initial load stays usable on a laptop browser.
- WebSocket remains connected for at least 30 minutes in mock mode.
- FastAPI memory remains stable during the WebSocket soak.
- Caddy logs show no repeated upstream disconnect loops.
- Redis memory does not grow unbounded from tick cache keys.
- Postgres disk usage and backup status are visible.

Future hardening:

- Add tick replay load tests for 1x, 3x, and 5x expected market tick rate.
- Add WebSocket fanout soak even though v1 is single-user.
- Add Prometheus/Grafana or hosted metrics before enabling live orders.

## Launch-Day Checklist

Before announcing:

- PR merged into `main`.
- Vercel public project deployed from `main`.
- Vercel trade project deployed from `main`.
- VPS pulled `main` and restarted with `docker compose up -d --build`.
- `npm run prod:smoke` passes unauthenticated checks.
- Authenticated smoke passes.
- Order-block smoke returns `BLOCKED`.
- Browser manual check passes on desktop and mobile.
- Cloudflare proxying/HSTS decisions are made after smoke tests.
- Rollback command is ready.

## Rollback Drill

Have both rollback paths ready before launch:

Vercel:

- Promote the previous successful deployment for `marketnarrative-public`.
- Promote the previous successful deployment for `marketnarrative-trade`.

VPS:

```bash
cd /opt/marketnarrative
git fetch origin
git checkout <last-known-good-sha>
docker compose --env-file .env -f infra/docker-compose.prod.yml up -d --build
```

If trading API behavior is suspect, first set:

```bash
ENABLE_LIVE_ORDERS=false
```

Then restart `trading-api`. Live order placement must stay disabled until a fresh risk review passes.
