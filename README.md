# Market Narrative Storyboard Engine

Resume-grade MVP for an automated financial media system that turns overnight global market data, news sentiment, and rule-based technical analysis into a public pre-market briefing plus a private creator studio with a daily reel script, teleprompter draft, and thumbnail prompt package.

## Monorepo Layout

- `backend/` - Java 17 Spring Boot modular monolith.
- `apps/public-portal/` - public Next.js SEO portal.
- `apps/admin-studio/` - private React SPA command center.
- `packages/ui/` - shared market design system.
- `packages/api-client/` - typed API client and permission contracts.
- `frontend/` - earlier combined Next.js prototype retained for reference.
- `infra/` - Docker Compose for PostgreSQL and Redis.
- `docs/` - Architecture notes, production roadmap, and resume framing.

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

## No-Install Demo

You can run a working demo server with only Node:

```bash
npm run demo
```

Then open:

- Public portal: `http://localhost:4173`
- Admin studio: `http://localhost:4173/admin`

Demo admin credentials:

- Email: `admin@marketnarrative.local`
- Password: `market-open`

The no-install demo mirrors the mock workflow used by the Spring/Next implementation. It is included so the project is usable even before Java 17, Maven, Docker, and npm registry access are available.

The demo keeps the public and private surfaces separate:

- Public route `/`: public briefing and architecture only.
- Private route `/admin`: Studio Command with daily reel script, scanner workbench, source QA, AI thumbnail simulation, and animated teleprompter.

## Daily 8:30 AM Summary

For the no-install demo, generate the daily pre-market summary with:

```bash
npm run daily:generate
```

This writes:

- `out/daily/YYYY-MM-DD-0830-digest.json`
- `out/daily/YYYY-MM-DD-0830-summary.html` public-safe briefing
- `out/daily/YYYY-MM-DD-0830-studio.html` private local studio
- `out/daily/YYYY-MM-DD-0830-reel-script.md` private daily creator script

To run it every market morning at 8:30 AM IST on macOS/Linux, add this cron entry:

```cron
30 8 * * 1-5 cd /Users/abheydeep/Documents/Codex/2026-04-29/i-want-make-below-project-lets && /usr/local/bin/npm run daily:generate >> /tmp/market-narrative-daily.log 2>&1
```

If `npm` is in a different location, run `which npm` and replace `/usr/local/bin/npm`.

For the Spring Boot backend, the scheduler is already configured through:

```yaml
app:
  digest:
    cron: 0 30 8 * * MON-FRI
    zone: Asia/Kolkata
```

Production delivery options can be added on top of the scheduled run: email, Telegram, WhatsApp, Slack, or publishing the HTML page to a hosted public URL.

## Static Hosting Export

After generating the daily summary, prepare a deployable static site:

```bash
npm run site:publish -- --date 2026-04-29 --scheduled-time 08:30
```

This creates `out/site/index.html`, dated briefing pages, and public-safe digest JSON. The static export intentionally redacts private teleprompter/reel scripts and AI prompts. Use live Yahoo Finance market snapshots during generation with:

```bash
npm run daily:generate -- --market-data live
```

The public quote board uses the generated `digest.json`; when hosted on GitHub Pages, the browser checks that file every minute and reflects the latest published values. Clicking an index opens a first-party canvas chart from the Yahoo Finance price series captured during generation, with a Yahoo Finance chart link for the external full view.

The export also creates `out/site/components/index.html`, an expandable project-components map that explains the data pipeline, public/private split, Studio workflow, publishing process, and QA checks in a readable visual format. The public archive, dated briefings, and components page all use the premium dark glassmorphism UI; `out/site/dark-preview/index.html` remains only as a backward-compatible alias.

## GitHub Pages

This repo includes a GitHub Pages workflow at `.github/workflows/pages.yml`. After pushing to GitHub, enable Pages with **GitHub Actions** as the source. The workflow publishes the static site on push and every 15 minutes across weekday Indian and US market windows, including the 08:30 IST pre-market run.

See `docs/github-pages.md`.

## Advanced Architecture Track

The repo now includes the production architecture path described in `docs/advanced-architecture.md`: split public/admin frontend deployments, shared workspace packages, Auth0-style permission claims, agentic RAG extension points, Redis digest publication, and PostgreSQL monthly partitioning guidance.

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

The MVP produces educational market analysis only. It does not place orders, automate trades, or provide financial advice.
