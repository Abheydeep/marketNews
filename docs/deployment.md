# Production Deployment

## Targets

- `marketnarrative.in` and `www.marketnarrative.in`: public static briefing on Vercel.
- `trade.marketnarrative.in`: Abhey-only trading cockpit on Vercel.
- `api.marketnarrative.in`: Spring Boot API on DigitalOcean.
- `trade-api.marketnarrative.in`: FastAPI trading API on DigitalOcean.
- DNS: Cloudflare.

## Branch And PR

Use the feature branch:

```bash
git switch codex/deploy-marketnarrative
```

Open a PR to `main` after the verification commands pass.

## Vercel Projects

Create two Vercel projects from `Abheydeep/marketNews`.

Public project:

- Project name: `marketnarrative-public`
- Root directory: `.`
- Framework preset: Other
- Install command: `npm install`
- Build command: `npm run vercel:build:public`
- Output directory: `out/site`
- Domains: `marketnarrative.in`, `www.marketnarrative.in`
- Env: `MARKET_DATA_MODE=live`

Trade project:

- Project name: `marketnarrative-trade`
- Root directory: `.`
- Framework preset: Other
- Install command: `npm install`
- Build command: `npm --workspace @market-narrative/trading-dashboard run build`
- Output directory: `apps/trading-dashboard/out`
- Domains: `trade.marketnarrative.in`
- Env:
  - `NEXT_PUBLIC_AUTH_API_BASE_URL=https://api.marketnarrative.in`
  - `NEXT_PUBLIC_TRADING_API_BASE_URL=https://trade-api.marketnarrative.in`
  - `NEXT_PUBLIC_TRADING_ADMIN_EMAIL=abhey@marketnarrative.in`

Reference settings are stored in `deploy/vercel/`.

## DigitalOcean VPS

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

## Smoke Tests

Before deploying:

```bash
npm test
npm --workspace @market-narrative/trading-dashboard run typecheck
npm --workspace @market-narrative/trading-dashboard run build
cd services/trading-api && .venv/bin/python -m pytest
```

After VPS:

```bash
curl -fsS https://api.marketnarrative.in/actuator/health
curl -fsS https://trade-api.marketnarrative.in/health
curl -i https://trade-api.marketnarrative.in/api/market/envelope
```

Expected unauthenticated trading API result: `401`.

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
