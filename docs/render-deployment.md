# Render Backend Deployment

This is the production backend path for:

- `api.marketnarrative.in` -> Spring Boot auth/admin/public API
- `trade-api.marketnarrative.in` -> FastAPI trading API

The frontends stay on Vercel:

- `marketnarrative.in`
- `admin.marketnarrative.in`
- `trade.marketnarrative.in`

## Why Render

Render can run the Spring and FastAPI Docker services directly, and it can attach managed Postgres and Key Value instances from the same Blueprint. Free instances are acceptable for a first smoke launch, but they have real limits: free web services spin down after idle time, free Postgres expires after 30 days, and free Key Value is in-memory only.

## What The Blueprint Creates

The root `render.yaml` creates:

- `marketnarrative-postgres`
- `marketnarrative-redis`
- `marketnarrative-api`
- `marketnarrative-trade-api`
- shared env group `marketnarrative-prod-shared`

The web services use Docker:

```text
marketnarrative-api        backend/Dockerfile                 /actuator/health
marketnarrative-trade-api  services/trading-api/Dockerfile    /health
```

Live Zerodha orders remain disabled by default:

```env
ENABLE_LIVE_ORDERS=false
```

## Secrets Render Will Ask For

Render prompts for `sync: false` values during Blueprint creation. Enter only what you have.

Required for login:

```env
DESK_ADMIN_PASSWORD=<strong password for desk@marketnarrative.in>
```

Optional for launch:

```env
KITE_API_KEY=
KITE_API_SECRET=
TRADING_TOKEN_KEY=
NEWSAPI_AI_KEY=
EODHD_API_KEY=
```

If Kite keys are blank, the dashboard can still load mock trading state after admin login. Kite login/session features need the Kite keys.

## Render Dashboard Steps

1. Open [Render Blueprints](https://dashboard.render.com/blueprints).
2. Create a new Blueprint from `https://github.com/marketnarrative/marketNews`.
3. Select the branch that contains `render.yaml`.
4. Review the services:
   - `marketnarrative-api`
   - `marketnarrative-trade-api`
   - `marketnarrative-postgres`
   - `marketnarrative-redis`
5. Enter `DESK_ADMIN_PASSWORD`.
6. Leave `ENABLE_LIVE_ORDERS=false`.
7. Create the Blueprint and wait for both web services to deploy.

## DNS

Do not point API subdomains at Vercel. After Render creates the services and custom domains, set explicit DNS records for both API subdomains.

Use the exact targets shown in Render's Custom Domains page. They will usually look like:

```text
api        CNAME  marketnarrative-api.onrender.com
trade-api  CNAME  marketnarrative-trade-api.onrender.com
```

If your DNS provider still has a wildcard Vercel record, these explicit records must override it:

```text
*          ALIAS/CNAME  Vercel wildcard
api        CNAME        Render API service
trade-api  CNAME        Render trading API service
```

Do not use `127.0.0.1` for public DNS.

## Smoke Tests

Once Render and DNS are live:

```bash
curl -fsS https://api.marketnarrative.in/actuator/health
curl -fsS https://trade-api.marketnarrative.in/health
curl -i https://trade-api.marketnarrative.in/api/market/envelope
```

Expected:

- Spring health returns healthy.
- Trading API health returns `{"status":"ok"}`.
- Unauthenticated trading API returns `401`.

Then log in at:

```text
https://trade.marketnarrative.in/
```

Username:

```text
desk@marketnarrative.in
```

Password:

```text
the DESK_ADMIN_PASSWORD entered in Render
```

## Production Caveats

Free Render is good enough for validation and friend-sharing smoke tests, but not for live trading:

- Free web services can cold-start after idle time.
- Free Postgres expires after 30 days unless upgraded.
- Free Key Value is not durable.
- WebSocket sessions can drop on restarts.

Before live trading, upgrade at least the API services and Postgres, keep `ENABLE_LIVE_ORDERS=false` until order-safety smoke passes, and only then review the live-order switch.
