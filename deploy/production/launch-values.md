# MarketNarrative Launch Values

Use this as the launch cheat sheet. DNS records do not go in `.env`; DNS records go in Cloudflare or BigRock DNS. Environment variables go in Vercel and the DigitalOcean VPS.

## Vercel Public Project

Project: `marketnarrative-public`
Repository: `Abheydeep/marketNews` (This Repo)

Build settings:

```text
Root Directory: ./
Install Command: npm install
Build Command: npm run vercel:build
Output Directory: public
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
Repository: `Abheydeep/marketnarrative-admin`

Build settings:

```text
Root Directory: ./
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Environment variables:

```env
VITE_API_BASE_URL=https://api.marketnarrative.in
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
Repository: `Abheydeep/marketnarrative-trade`

Build settings:

```text
Root Directory: ./
Install Command: npm install
Build Command: npm run build
Output Directory: out
```

Environment variables:

```env
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

marketnarrative-admin owns:
  admin.marketnarrative.in

marketnarrative-trade owns:
  trade.marketnarrative.in
```

## Render Backend Launch

Render is the fastest backend path for the current launch. The root `render.yaml` creates:

```text
marketnarrative-api        -> api.marketnarrative.in
marketnarrative-trade-api  -> trade-api.marketnarrative.in
marketnarrative-postgres
marketnarrative-redis
```

Use `docs/render-deployment.md` for the full flow.

The only required secret for login is:

```env
ABHEY_ADMIN_PASSWORD=replace-with-strong-abhey-password
```

Keep this launch guard:

```env
ENABLE_LIVE_ORDERS=false
```

## VPS `.env`

If you choose a VPS instead of Render, create this file at `/opt/marketnarrative/.env` on the VPS. Replace placeholder values before starting Docker Compose.

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

Add these after creating the Render services or VPS backend:

```text
api.marketnarrative.in        CNAME or A    <backend target>
trade-api.marketnarrative.in  CNAME or A    <backend target>
```

For Render, use the exact CNAME targets shown in each service's Custom Domains page. Keep API records DNS-only until HTTPS and WebSocket smoke tests pass.
