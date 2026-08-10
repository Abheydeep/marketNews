# MarketNarrative Production Architecture

This codebase publishes the public site briefing, while the operator admin studio and trading cockpit have been split out into separate standalone repositories.

## Production Surfaces

| Surface | Domain | Repository | Purpose | Public? |
| --- | --- | --- | --- | --- |
| Public briefing | `marketnarrative.in` and `www.marketnarrative.in` | `marketnarrative/marketNews` (This Repo) | Daily pre-market archive, dated briefings, public multibagger tracker | Yes |
| Admin studio | `admin.marketnarrative.in` | `marketnarrative/marketnarrative-admin` | Script engine, publishing studio, components map, portfolio review | No |
| Trading cockpit | `trade.marketnarrative.in` | `marketnarrative/marketnarrative-trade` | Nifty/Bank Nifty trading cockpit | No |
| Spring API | `api.marketnarrative.in` | `marketnarrative/marketNews` (This Repo) | Auth, digest admin APIs, public digest APIs, multibagger APIs | API |
| Trading API | `trade-api.marketnarrative.in` | `marketnarrative/marketNews` (This Repo) | Kite auth, market stream, options, signals, guarded order proposals | API |

## Public Site

The public Vercel project uses:

```env
MARKET_NARRATIVE_DEPLOY_TARGET=public
```

It runs `npm run vercel:build`, which delegates to the static publisher and copies `out/site` into `out/vercel` while excluding the generated `admin/` folder. That means the public Vercel artifact contains the archive, dated briefings, `/multibagger/`, `digest.json`, `archive.json`, `robots.txt`, `sitemap.xml`, and the social preview card, but it does not publish private admin pages under `marketnarrative.in/admin/`.

Public routes:

```text
https://marketnarrative.in/
https://marketnarrative.in/1may2026/
https://marketnarrative.in/multibagger/
https://marketnarrative.in/multibagger/state.json
```

The multibagger public state is a model tracker, not a statement of real account activity. It uses April 27, 2026 as the public model entry date, publishes reference entry prices, calculates current model value/P&L/return from server-side quote snapshots, and falls back to the latest static snapshot when the Spring API is unavailable.

## Admin Studio

The Admin Studio frontend lives in `marketnarrative/marketnarrative-admin`.
It is built as a React Vite SPA and deployed to Vercel (target: `admin.marketnarrative.in`).
It communicates with the Spring monolith backend APIs for script reviews, manual runs, and asset triggers.

Deployed admin routes:
- `https://admin.marketnarrative.in/` (Private script engine / admin studio)
- `https://admin.marketnarrative.in/components/` (Private project components and architecture map)
- `https://admin.marketnarrative.in/multibagger/` (Private multibagger monthly review)

## Trading Cockpit

The Trading Cockpit frontend lives in `marketnarrative/marketnarrative-trade`.
It is built as a Next.js 15 app, statically exported, and deployed to Vercel (target: `trade.marketnarrative.in`).
It communicates with the FastAPI trading backend for option streams, scans, and Kite integrations.

## Backend Boundary

Spring runs behind `api.marketnarrative.in` and owns local auth plus admin/public narrative APIs. Its CORS allowlist must include both private frontend origins:

```env
FRONTEND_ORIGINS=https://admin.marketnarrative.in,https://trade.marketnarrative.in
```

FastAPI runs behind `trade-api.marketnarrative.in` and owns trading-specific workflows. Live Zerodha orders remain disabled for launch with:

```env
ENABLE_LIVE_ORDERS=false
```

## Privacy Rules

The public artifact can expose public digest payloads, sanitized multibagger state, source links, and educational disclaimers.

The public artifact must not expose Studio Command, Project Components, reel scripts, positive prompts, uploaded portfolio screenshots, raw OCR, quantities, broker data, account values, private review reasoning, or trading execution controls.

The admin artifact can render private operator workflows, but sensitive operations still belong behind authenticated backend endpoints. The trading artifact must never place live orders unless the explicit risk gates and manual confirmation pass.

## Release QA Gate

Release branches cannot bypass the public-copy gate. Before pushing or merging a release branch, run `npm test`, `npm run test:deploy`, and `npm run public:copy:qa` against the generated public artifact. The repo pre-push hook runs the local guard, and GitHub Actions is the final required check for PRs and `main` pushes because local hooks can be skipped by Git.
