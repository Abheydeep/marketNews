# Production Deployment

## Targets

- `marketnarrative.in` and `www.marketnarrative.in`: public static briefing on Vercel.
- `trade.marketnarrative.in`: Abhey-only trading cockpit on Vercel.
- `api.marketnarrative.in`: Spring Boot API on Render or a VPS.
- `trade-api.marketnarrative.in`: FastAPI trading API on Render or a VPS.
- DNS: Cloudflare.

## Branch And PR

Use the feature branch:

```bash
git switch codex/deploy-marketnarrative
```

Open a PR to `main` after the verification commands pass.

## Vercel Projects

Create three separate Vercel projects from `Abheydeep/marketNews`. Each project builds from the repo root and writes `out/vercel`; the deployed surface is selected by `MARKET_NARRATIVE_DEPLOY_TARGET`. The build script can also infer the target from unmistakable Vercel project/deployment URLs such as `market-news-admin-studio` or `admin.marketnarrative.in`, but the explicit env var remains the preferred production setting.

Do not attach `admin.marketnarrative.in` to the public project, and do not attach `marketnarrative.in` or `www.marketnarrative.in` to the admin project. If a deployment summary lists repository source files like `/apps/...` as static assets, the build settings are wrong and the project is publishing the repository root.

Public project:

- Project name: `marketnarrative-public`
- Root directory: `.`
- Framework preset: Other
- Install command: `npm install`
- Build command: `npm run vercel:build`
- Output directory: `out/vercel`
- Domains: `marketnarrative.in`, `www.marketnarrative.in`
- Env:
  - `MARKET_NARRATIVE_DEPLOY_TARGET=public`
  - `MARKET_DATA_MODE=live`

Admin project:

- Project name: `marketnarrative-admin` or the reused `market-news-admin-studio`
- Root directory: `.`
- Framework preset: Other
- Install command: `npm install`
- Build command: `npm run vercel:build`
- Output directory: `out/vercel`
- Domains: `admin.marketnarrative.in`
- Env:
  - `MARKET_NARRATIVE_DEPLOY_TARGET=admin`
  - `MARKET_DATA_MODE=live`
  - `PUBLIC_SITE_ORIGIN=https://marketnarrative.in`
  - `ADMIN_SITE_ORIGIN=https://admin.marketnarrative.in`
  - `MARKET_NARRATIVE_API_BASE=https://api.marketnarrative.in`

Admin routes:

```text
https://admin.marketnarrative.in/              Private Studio Command page
https://admin.marketnarrative.in/components/   Private project components map
https://admin.marketnarrative.in/multibagger/ Private multibagger review workflow
```

Trade project:

- Project name: `marketnarrative-trade`
- Root directory: `.`
- Framework preset: Other
- Install command: `npm install`
- Build command: `npm run vercel:build`
- Output directory: `out/vercel`
- Domains: `trade.marketnarrative.in`
- Env:
  - `MARKET_NARRATIVE_DEPLOY_TARGET=trade`
  - `NEXT_PUBLIC_AUTH_API_BASE_URL=https://api.marketnarrative.in`
  - `NEXT_PUBLIC_TRADING_API_BASE_URL=https://trade-api.marketnarrative.in`
  - `NEXT_PUBLIC_TRADING_ADMIN_EMAIL=abhey@marketnarrative.in`

Reference settings are stored in `deploy/vercel/`.

## DigitalOcean VPS

Render is now the preferred free/low-friction backend path for launch smoke testing. Use `docs/render-deployment.md` and the root `render.yaml` if deploying the APIs on Render.

Use the VPS path below only when you want a long-running Docker host with Caddy and full control.

Create an Ubuntu LTS droplet with Docker and Compose. Recommended baseline:

- 2 vCPU / 4 GB RAM for launch.
- Enable DigitalOcean backups.
- Firewall: SSH from your IP, HTTP, HTTPS.

On the server:

```bash
curl -fsSLO https://raw.githubusercontent.com/Abheydeep/marketNews/main/deploy/production/bootstrap-ubuntu.sh
bash bootstrap-ubuntu.sh
sudo mkdir -p /opt/marketnarrative
cd /opt/marketnarrative
git clone https://github.com/Abheydeep/marketNews.git .
git checkout main
cp deploy/production/env.example .env
```

Edit `.env` with real values:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `ABHEY_ADMIN_PASSWORD`
- Optional Kite/news keys

Start services:

```bash
docker compose --env-file .env -f infra/docker-compose.prod.yml up -d --build
```

The trading SQL schema is mounted into Postgres as an init script for first boot. If the database volume already exists before this file is present, apply it manually with:

```bash
docker compose --env-file .env -f infra/docker-compose.prod.yml exec -T postgres psql -U narrative -d market_narrative < services/trading-api/sql/schema.sql
```

Launch defaults keep live order placement disabled with `ENABLE_LIVE_ORDERS=false`.

## Cloudflare DNS

1. Add `marketnarrative.in` to Cloudflare.
2. Change the BigRock nameservers to Cloudflare’s assigned nameservers.
3. In Vercel, add `marketnarrative.in`, `www.marketnarrative.in`, and `trade.marketnarrative.in` to the relevant projects.
4. Copy Vercel’s exact DNS records into Cloudflare.
5. Add DigitalOcean records:

```text
api       A     <droplet-ip>     DNS only
trade-api A     <droplet-ip>     DNS only
```

Use DNS-only for API records at first. Enable proxying only after WebSocket and HTTPS smoke tests pass.

## Test Gates

Before deploying:

```bash
npm run test:deploy
```

The complete release test matrix lives in `docs/testing.md`. Do not treat a green build as a launch approval; VPS, DNS, auth, order-block, and browser smoke tests are separate gates.

After VPS:

```bash
curl -fsS https://api.marketnarrative.in/actuator/health
curl -fsS https://trade-api.marketnarrative.in/health
curl -i https://trade-api.marketnarrative.in/api/market/envelope
```

Expected unauthenticated trading API result: `401`.

After DNS and Vercel:

```bash
npm run prod:smoke
```

For the authenticated production check, transmit the admin password only from a trusted shell:

```bash
RUN_AUTHENTICATED_SMOKE=true \
TRADING_ADMIN_PASSWORD='<production password>' \
npm run prod:smoke
```

For the launch order-safety check:

```bash
RUN_AUTHENTICATED_SMOKE=true \
RUN_ORDER_BLOCK_SMOKE=true \
TRADING_ADMIN_PASSWORD='<production password>' \
npm run prod:smoke
```

Expected order result while `ENABLE_LIVE_ORDERS=false`: `BLOCKED`, never `PLACED`.

After Vercel/DNS:

- `https://marketnarrative.in` loads the public archive.
- `https://www.marketnarrative.in` aliases or redirects correctly.
- `https://trade.marketnarrative.in` shows the Abhey admin gate.
- Browser console has no runtime errors.
- After Abhey login, the trading WebSocket connects.
- Live orders remain blocked unless all risk gates pass.

## Production Security Notes

- `JWT_SECRET` must be identical for Spring and FastAPI.
- `TRADING_ADMIN_EMAIL` is `abhey@marketnarrative.in` in production.
- `ABHEY_ADMIN_PASSWORD` must only live in the VPS `.env` or managed secret storage.
- Do not enable `ENABLE_LIVE_ORDERS=true` for launch.
- Keep Postgres and Redis internal to Docker; do not publish their ports.
