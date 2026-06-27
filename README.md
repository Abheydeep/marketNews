# Market Narrative Storyboard Engine

Resume-grade MVP for an automated financial media system that turns overnight global market data, news sentiment, and rule-based technical analysis into a public pre-market briefing plus a private creator studio with a daily reel script, teleprompter draft, and thumbnail prompt package.

## Monorepo Layout

- `backend/` - Java 17 Spring Boot modular monolith (provides core database, scheduler, and API endpoints).
- `services/trading-api/` - Python FastAPI service for Kite Connect, options microstructure, signals, and guarded order placement.
- `frontend/` - earlier combined Next.js prototype retained for reference.
- `infra/` - Docker Compose for PostgreSQL and Redis.
- `tools/` - Active desk toolchain (quote adapter, digest builder, page renderer, publisher, sitemap/robots generator, test suite, and QA checks).
- `archive/` - Public-safe digest history (redacted JSON timeline).
- `docs/` - Architecture notes, production roadmap, and resume framing.

### Extracted Standalone Repositories
The private UI applications have been split out of the monorepo into separate codebases:
- [marketnarrative-admin](https://github.com/Abheydeep/marketnarrative-admin) (Vite + React 19) - private admin studio command center.
- [marketnarrative-trade](https://github.com/Abheydeep/marketnarrative-trade) (Next.js 15 static export) - private Nifty/Bank Nifty real-time trading cockpit UI.

## MVP Workflow

1. Admin triggers the digest run from Studio Mode.
2. Backend concurrently loads market snapshots, news articles, and Nifty price bars.
3. News is clustered into market narrative themes.
4. Technical scanner validates only 1:2+ risk-reward setups.
5. Script generator builds deterministic teleprompter and 45-60 second reel scripts.
6. Asset pipeline stores a Stable Diffusion/ControlNet-ready prompt package.
7. Public portal renders the daily digest with source attribution and `NewsArticle` JSON-LD.

## Local Prerequisites

- Java 17
- Maven 3.9+
- Node.js 20+
- Docker Desktop

This workspace currently has Node available, but the backend needs Java 17 and Maven to run.

## No-Install Verification

The repository includes a dependency-free Node test harness that validates the core MVP workflow without Maven, Java 17, Docker, or npm packages:

```bash
npm test
```

This runs seed validation, risk-reward math tests, scanner acceptance/rejection tests, sentiment clustering tests, digest/script/SEO contract checks, schema checks, and a no-install public/admin demo flow.

Install the repo-native pre-push hook once per clone:

```bash
npm run hooks:install
```

The hook runs `npm test`, builds the public Vercel artifact in mock mode, and runs `npm run public:copy:qa`. Release branches must not bypass it; CI repeats the same public-copy gate.

Before sharing production, run the no-silly-mistakes gate:

```bash
npm run prod:qa
```

It checks public/admin/trade domains, deployment manifests, logos, stale chart links, API health, auth boundaries, browser console errors, and mobile rendering. Treat any failure as a launch blocker.

## Agent Context Guardrails

All coding sessions start from `AGENTS.md`, which points agents to the six
required files in `context/`. Run this before implementation and before commit:

```bash
npm run context:verify
```

For content or pipeline changes that must exercise real LLM behavior, use the
explicit local-prod path with keys in `.env.local`:

```bash
npm run local:prod -- --date YYYY-MM-DD
npm run local:prod:smoke
```

Normal unit tests keep LLMs mocked; the local-prod flow is the prod-like
real-key check.

## No-Install Demo

The repository includes a self-contained local demo server to simulate pages and APIs:

```bash
npm run demo
```

Then open:

- Public portal: `http://localhost:4173`

The local demo supports mock/preview routes for the extracted admin views:
- `/admin`: mock Studio Command view (reel script, scanner workbench, source QA).
- `/admin/components`: visual project-components map.

Demo admin credentials:
- Email: `admin@marketnarrative.local`
- Password: `market-open`

The no-install demo mirrors the mock workflow used by the Spring/Next implementation. It is included so the project is usable even before Java 17, Maven, Docker, and npm registry access are available. It keeps the public and private surfaces separate:
- Public route `/`: public briefing only.
- Auth-gated route `/admin` & `/admin/components`: mock views for operators to inspect local digests and layout.

## Daily 7:15 AM Summary

For the no-install demo, generate the daily pre-market summary with:

```bash
npm run daily:generate
```

This writes:

- `out/daily/YYYY-MM-DD-0715-digest.json`
- `out/daily/YYYY-MM-DD-0715-summary.html` public-safe briefing
- `out/daily/YYYY-MM-DD-0715-studio.html` private local studio
- `out/daily/YYYY-MM-DD-0715-reel-script.md` private daily creator script

To run it every market morning at 7:15 AM IST on macOS/Linux, add this cron entry:

```cron
15 7 * * 1-5 cd /Users/abheydeep/Documents/Codex/2026-04-29/i-want-make-below-project-lets && /usr/local/bin/npm run daily:generate >> /tmp/market-narrative-daily.log 2>&1
```

If `npm` is in a different location, run `which npm` and replace `/usr/local/bin/npm`.

For the Spring Boot backend, the scheduler is already configured through:

```yaml
app:
  digest:
    cron: 0 15 7 * * MON-FRI
    zone: Asia/Kolkata
```

Production delivery options can be added on top of the scheduled run: email, Telegram, WhatsApp, Slack, or publishing the HTML page to a hosted public URL.

Live public digest generation is weekday-only. Non-trading-day manual experiments should use fixture mode or set `ALLOW_NON_TRADING_DAY_DIGEST=true` explicitly so weekend pages are not promoted by accident.

## Static Hosting Export

After generating the daily summary, prepare a deployable static site:

```bash
npm run site:publish -- --date 2026-04-29 --scheduled-time 07:15
```

This creates `out/site/index.html`, dated briefing pages, and public-safe digest JSON. The static export intentionally redacts private teleprompter/reel scripts and AI prompts. Use live Yahoo Finance market snapshots during generation with:

```bash
npm run daily:generate -- --market-data live
```

The public quote board uses the generated `digest.json`; when hosted on GitHub Pages, the browser checks that file every minute and reflects the latest published values. Local dated `file://` previews also check the public GitHub Pages digest first, so a manual reload does not stay pinned to an old generated file. Clicking an index opens a first-party canvas chart from the captured price series, with a TradingView chart link for the external full view.

The public export builds strictly the public-facing pages (`/`, sitemaps, dated pages). The admin studio and trading cockpit frontends have been moved to their own standalone repositories and are no longer built as part of this static public export.

## GitHub Pages

This repo includes a GitHub Pages workflow at `.github/workflows/pages.yml`. After pushing to GitHub, enable Pages with **GitHub Actions** as the source. The workflow publishes the static site on push and every 5 minutes across weekday Indian and US market windows, including the 07:15 IST pre-market run.

See `docs/github-pages.md`.

## Advanced Architecture Track

The project utilizes a distributed architecture with:
- Public-facing briefings (built from this repository and hosted via Vercel).
- Separate frontend repositories for Admin and Trade interfaces.
- Spring API modular monolith for persistence and publishing workflows.
- FastAPI service for high-performance Kite Connect market data streams.

## Production Deployment

Use `docs/deployment.md` for the `marketnarrative.in` rollout:

- Vercel: `marketnarrative.in`, `www.marketnarrative.in`, `trade.marketnarrative.in`
- DigitalOcean: `api.marketnarrative.in`, `trade-api.marketnarrative.in`
- Cloudflare DNS
- Live trading disabled by default

## Trading Cockpit

The FastAPI backend for the trading cockpit resides in `services/trading-api/`. Run it locally with:

```bash
cd services/trading-api
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8090
```

To run the interactive trade cockpit UI dashboard, clone and run the standalone repository:
[marketnarrative-trade](https://github.com/Abheydeep/marketnarrative-trade)

Trading dashboard defaults:

- API: `http://localhost:8090`
- Dashboard: `http://127.0.0.1:3002`
- WebSocket: `ws://localhost:8090/ws/market`

Live Kite order placement is disabled by default. It requires the documented manual Kite redirect login/token exchange, `ENABLE_LIVE_ORDERS=true`, a fresh order proposal, explicit click confirmation, and risk checks.

Trading access is restricted to the configured Abhey admin account. Local demo mode uses `abhey@marketnarrative.local`; production uses `abhey@marketnarrative.in`.

## Run Infrastructure

```bash
cd infra
docker compose up -d
```

## Run Backend

```bash
cd backend
mvn spring-boot:run
```

Backend defaults:

- API: `http://localhost:8080`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- Demo admin login: `admin@marketnarrative.local` / `market-open`

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend defaults:

- Public portal: `http://localhost:3000`
- Admin studio: `http://localhost:3000/admin`

## Key API Endpoints

- `GET /api/public/digest/today`
- `GET /api/public/digest/{date}`
- `POST /api/auth/login`
- `POST /api/admin/digest/run`
- `GET /api/admin/digest/{date}`
- `PUT /api/admin/scripts/{id}`
- `POST /api/admin/scripts/{id}/regenerate`
- `POST /api/admin/assets/generate`
- `POST /api/admin/digest/{date}/publish`

## Safety Notice

The original narrative MVP produces educational market analysis only. The trading cockpit includes optional live Zerodha order placement, but it is disabled by default and guarded by manual confirmation, one-lot long-option defaults, token checks, stale-data checks, loss lockout, and a kill switch. It should be treated as personal tooling, not financial advice.
