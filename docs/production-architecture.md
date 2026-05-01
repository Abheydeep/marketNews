# MarketNarrative Production Architecture

This repo publishes one product family through separate production surfaces. Each surface builds from the same monorepo root, but Vercel selects the deployed artifact with `MARKET_NARRATIVE_DEPLOY_TARGET`.

## Production Surfaces

| Surface | Domain | Deploy target | Purpose | Public? |
| --- | --- | --- | --- | --- |
| Public briefing | `marketnarrative.in` and `www.marketnarrative.in` | `public` | Daily pre-market archive, dated briefings, public multibagger tracker | Yes |
| Admin studio | `admin.marketnarrative.in` | `admin` | Script engine, publishing studio, project component map, multibagger review workflow | No |
| Trading cockpit | `trade.marketnarrative.in` | `trade` | Abhey-only Nifty/Bank Nifty trading cockpit | No |
| Spring API | `api.marketnarrative.in` | DigitalOcean Docker Compose | Auth, digest admin APIs, public digest APIs, multibagger APIs | API |
| Trading API | `trade-api.marketnarrative.in` | DigitalOcean Docker Compose | Kite auth, market stream, options, signals, guarded order proposals | API |

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

## Admin Studio

The admin Vercel project uses:

```env
MARKET_NARRATIVE_DEPLOY_TARGET=admin
PUBLIC_SITE_ORIGIN=https://marketnarrative.in
ADMIN_SITE_ORIGIN=https://admin.marketnarrative.in
MARKET_NARRATIVE_API_BASE=https://api.marketnarrative.in
```

It runs the same static publisher, then copies only `out/site/admin` into `out/vercel`. Because that admin folder becomes the root of the admin deployment, the admin routes are:

```text
https://admin.marketnarrative.in/              Private script engine / admin studio
https://admin.marketnarrative.in/components/   Private project components and architecture map
https://admin.marketnarrative.in/multibagger/ Private multibagger monthly review
```

`/` is the private Studio Command page for the script engine and publishing workflow. `/components/` is the private project components and architecture map. `/multibagger/` is the private portfolio review workflow for screenshot upload, monthly review generation, and sanitized publishing.

The admin artifact writes `robots.txt` with `Disallow: /`. The static gate protects previews; production API operations still require Spring auth and permissions.

## Trading Cockpit

The trade Vercel project uses:

```env
MARKET_NARRATIVE_DEPLOY_TARGET=trade
NEXT_PUBLIC_AUTH_API_BASE_URL=https://api.marketnarrative.in
NEXT_PUBLIC_TRADING_API_BASE_URL=https://trade-api.marketnarrative.in
NEXT_PUBLIC_TRADING_ADMIN_EMAIL=abhey@marketnarrative.in
```

It builds `apps/trading-dashboard` as a static Next export. The cockpit remains separate from the admin studio because trading has different permissions, WebSocket behavior, and risk controls.

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
