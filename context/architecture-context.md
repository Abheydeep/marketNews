# Architecture Context

Market Narrative consists of this repository (housing public pages, Spring Boot API, and FastAPI trading backend) plus separate standalone frontends for the admin studio and trading cockpit.

## Production Boundaries

- Public site: `marketnarrative.in`, deploy target `public` (built from this repo).
- Admin studio: `admin.marketnarrative.in`, deploy target `admin` (built from `marketnarrative-admin` repo).
- Trading cockpit: `trade.marketnarrative.in`, deploy target `trade` (built from `marketnarrative-trade` repo).
- Spring API: `api.marketnarrative.in`, auth/admin/public APIs (built from this repo).
- FastAPI trading API: `trade-api.marketnarrative.in`, internal trading data and
  guarded order workflows (built from this repo).

## Core Pipelines

- Morning briefing: calendar check, source ingestion, scoring, NVIDIA agent
  reranking, LLM enrichment, public copy QA, static publish.
- Static publish: archive digest to public HTML, `/latest/` shell, sitemap,
  robots, public JSON payloads, deployment manifest.
- QA: context verification, repo tests, deployment gate, public copy QA,
  reliability smoke, production QA.

## Invariants

- Archives under `archive/daily/` are immutable once published unless explicitly
  reviewed as a historical correction.
- Full public briefings cannot present mock data as live data.
- Each source card needs a unique India read-through.
- `/latest/` must resolve to the latest sitemap briefing by redirect or static
  shell.
- Public pages must contain the educational/non-advice boundary.
- Private scripts, prompts, broker data, and trading controls never ship in the
  public artifact.
- Architecture-changing work updates Mermaid diagrams in this directory.

## Diagrams

- `context/architecture-diagrams/01-production-surfaces.mmd`
- `context/architecture-diagrams/02-morning-briefing-pipeline.mmd`
- `context/architecture-diagrams/03-llm-enrichment-pipeline.mmd`
- `context/architecture-diagrams/04-static-publish-deploy.mmd`
- `context/architecture-diagrams/05-qa-release-gates.mmd`
- `context/architecture-diagrams/06-module-ownership-debt.mmd`

## Large Legacy Files

These files are architecture debt. They may be refactored or reduced, but must
not grow without documenting the reason in `context/progress-tracker.md`.

| File | Baseline Lines | Target |
| --- | ---: | --- |
| `tools/cockpit-page.mjs` | 10377 | split by page sections |
| `tools/publish-site.mjs` | 4425 | split by page/render concern |
| `tools/news-sources.mjs` | 2784 | split ingestion, scoring, enrichment |
| `tools/core.mjs` | 2656 | split digest, lead, setups, desk note |
| `tools/verify.mjs` | 3415 | split test groups |
| `tools/predeploy-verify.mjs` | 298 | split artifact and service checks |
| `tools/reliability-smoke.mjs` | 245 | split probes/helpers |
| `tools/multibagger-page.mjs` | 3100 | split tracker sections |
| `tools/project-components-page.mjs` | 1320 | split component groups |
| `tools/multibagger-data.mjs` | 825 | split state and transforms |
| `tools/full-site-qa.mjs` | 785 | split browser checks |
| `tools/production-qa-gate.mjs` | 722 | split surface checks |
| `tools/editorial-guardrails.mjs` | 436 | split public copy rules |
| `tools/mobile-shell.mjs` | 397 | split CSS/script helpers |
| `tools/production-smoke.mjs` | 383 | split probes |
| `tools/vercel-build-public.mjs` | 360 | split artifact steps |
| `tools/market-data.mjs` | 365 | split provider adapters |
| `tools/live-site-soak.mjs` | 329 | split browser helpers |
| `tools/public-payload.mjs` | 255 | split payload sections |
| `tools/generate-move-articles.mjs` | 248 | split detection/render |
| `tools/trading-mock-regression.mjs` | 238 | split assertions |
| `tools/market-calendar.mjs` | 213 | split CLI and library |
| `scratch/modify_news.mjs` | 215 | remove or shrink scratch |
