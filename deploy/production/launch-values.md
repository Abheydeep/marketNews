# MarketNarrative Launch Values

Use this as the launch cheat sheet. DNS records do not go in `.env`; DNS records go in Cloudflare or BigRock DNS. Environment variables go in Vercel and the DigitalOcean VPS.

## Vercel Public Project

Project: `marketnarrative-public`

The root `vercel.json` configures every Vercel project to run `npm run vercel:build` and publish `out/vercel`. The project role is selected by `MARKET_NARRATIVE_DEPLOY_TARGET`.

If the deployment summary lists source files such as `/apps/...` as static assets, the project is ignoring the build config and is publishing the repository root by mistake.

Build settings:

```text
Root Directory: ./
Install Command: npm install
Build Command: npm run vercel:build
Output Directory: out/vercel
```

Environment variables:

```env
MARKET_NARRATIVE_DEPLOY_TARGET=public
MARKET_DATA_MODE=live
```

Domains:

```text
marketnarrative.in
www.marketnarrative.in
```

## Vercel Admin Project

Project: `marketnarrative-admin`

You can reuse/rename the existing `market-news-admin-studio` Vercel project for this. This project owns the private script engine/admin studio and the private portfolio workflow.

Build settings:

```text
Root Directory: ./
Install Command: npm install
Build Command: npm run vercel:build
Output Directory: out/vercel
```

Environment variables:

```env
MARKET_NARRATIVE_DEPLOY_TARGET=admin
MARKET_DATA_MODE=live
PUBLIC_SITE_ORIGIN=https://marketnarrative.in
ADMIN_SITE_ORIGIN=https://admin.marketnarrative.in
MARKET_NARRATIVE_API_BASE=https://api.marketnarrative.in
```

Domains:

```text
admin.marketnarrative.in
```

Routes:

```text
https://admin.marketnarrative.in/              Private script engine / admin studio
https://admin.marketnarrative.in/components/   Private project components / architecture map
https://admin.marketnarrative.in/multibagger/ Private multibagger monthly review
```

## Vercel Trade Project

Project: `marketnarrative-trade`

Create a separate Vercel project named `marketnarrative-trade`. The trade project must have `MARKET_NARRATIVE_DEPLOY_TARGET=trade`, and it must not own the apex `marketnarrative.in`, `www.marketnarrative.in`, or `admin.marketnarrative.in` domains.

Build settings:

```text
Root Directory: ./
Install Command: npm install
Build Command: npm run vercel:build
Output Directory: out/vercel
```

Environment variables:

```env
MARKET_NARRATIVE_DEPLOY_TARGET=trade
NEXT_PUBLIC_AUTH_API_BASE_URL=https://api.marketnarrative.in
NEXT_PUBLIC_TRADING_API_BASE_URL=https://trade-api.marketnarrative.in
NEXT_PUBLIC_TRADING_ADMIN_EMAIL=abhey@marketnarrative.in
```

Domain:

```text
trade.marketnarrative.in
```

Domain ownership:

```text
marketnarrative-public owns:
  marketnarrative.in
  www.marketnarrative.in

marketnarrative-admin or market-news-admin-studio owns:
  admin.marketnarrative.in

marketnarrative-trade owns:
  trade.marketnarrative.in
```

## DigitalOcean VPS `.env`

Create this file at `/opt/marketnarrative/.env` on the VPS. Replace placeholder values before starting Docker Compose.

```env
POSTGRES_PASSWORD=replace-with-strong-postgres-password
JWT_SECRET=replace-with-64-plus-character-shared-secret
JWT_ISSUER=market-narrative-prod
TRADING_ADMIN_EMAIL=abhey@marketnarrative.in
FRONTEND_ORIGINS=https://admin.marketnarrative.in,https://trade.marketnarrative.in
ABHEY_ADMIN_PASSWORD=replace-with-strong-abhey-password

ENABLE_LIVE_ORDERS=false

KITE_API_KEY=
KITE_API_SECRET=
TRADING_TOKEN_KEY=
NEWSAPI_AI_KEY=
EODHD_API_KEY=
```

## DNS Records

Delete every `127.0.0.1` DNS record first.

Add these after Vercel gives you the exact records:

```text
marketnarrative.in        Vercel apex record
www.marketnarrative.in    Vercel www record
admin.marketnarrative.in  Vercel admin project record
trade.marketnarrative.in  Vercel trade project record
```

Add these after creating the DigitalOcean droplet:

```text
api.marketnarrative.in        A    <digitalocean-droplet-public-ip>
trade-api.marketnarrative.in  A    <digitalocean-droplet-public-ip>
```

Keep API records DNS-only until HTTPS and WebSocket smoke tests pass.
