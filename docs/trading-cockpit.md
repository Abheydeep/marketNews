# Nifty/Bank Nifty Trading Cockpit

## Shape

The cockpit consists of:

- `services/trading-api` (housed in this repo): Python FastAPI service for Kite auth, instruments, option-chain construction, technical analysis, sentiment, signals, and guarded order placement.
- [marketnarrative-trade](https://github.com/Abheydeep/marketnarrative-trade) (external repo): Next.js/Tailwind dashboard that consumes REST and WebSocket data from the trading API.

Trading access is restricted to the configured Abhey admin account. In local demo mode, `DemoUserInitializer` creates `abhey@marketnarrative.local` with password `market-open`. In production, set `TRADING_ADMIN_EMAIL=abhey@marketnarrative.in` and `ABHEY_ADMIN_PASSWORD` in the VPS `.env`. `LocalJwtService` grants `trade:read` and `trade:execute` only to the configured email.

## Kite Auth And Market Data

Kite authentication follows the official redirect flow:

1. Open `GET /api/kite/login-url`.
2. Complete manual Kite login in the browser.
3. Kite redirects to `/kite/callback?request_token=...`.
4. The dashboard posts the `request_token` to `POST /api/kite/session`.
5. The backend computes the checksum and stores the session token until the next 6 AM IST expiry.

The implementation intentionally does not store Kite passwords, TOTP seeds, or automate daily login.

Set `TRADING_TOKEN_KEY` to a Fernet key to encrypt the local session file. Without it, the dev fallback writes the token to a chmod `0600` local file under `.local/`.

## Backend Modules

- `app/adapters/kite`: manual auth, token storage, rate-limited historical/quote calls, instruments, margins, and order placement.
- `app/adapters/kite/ticker.py`: `KiteTicker` full-mode bridge for ATM option tokens.
- `app/domain/technical.py`: zero-volume cleanup, EMA, RSI, MACD, VWAP, fractal pivots, wick rejection zones, KDE/histogram support-resistance zones, and regression trendlines.
- `app/domain/options.py`: instrument master parsing, nearest-expiry ATM option selection, PCR, five-minute PCR velocity, and OI interpretation.
- `app/domain/sentiment.py`: mock fallback news provider plus optional FinBERT inference.
- `app/domain/signals.py`: BUY/SELL/WAIT confluence engine.
- `app/domain/risk.py`: manual-confirm order proposals, live-order unlock, stale proposal rejection, session checks, quote/margin checks, loss lockout, one-position cap, and kill switch.

## API Surface

- `GET /api/kite/login-url`
- `POST /api/kite/session`
- `GET /api/kite/status`
- `POST /api/instruments/refresh`
- `GET /api/market/envelope`
- `WS /ws/market`
- `GET /api/options/chain?index=NIFTY|BANKNIFTY`
- `GET /api/signals/latest?index=NIFTY|BANKNIFTY`
- `POST /api/orders/proposals`
- `POST /api/orders/confirm`
- `POST /api/orders/kill-switch`

## Data

The SQL schema lives at `services/trading-api/sql/schema.sql` and creates a separate `trading` schema in the existing PostgreSQL database. `app/storage.py` includes optional Redis hot-state caching and PostgreSQL signal recording; both degrade to no-ops when the dependencies or services are not available.

## Run

```bash
cd infra
docker compose up -d
```

```bash
cd services/trading-api
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8090
```

Use `pip install -r requirements-ml.txt` only for FinBERT inference. Use `requirements-quant-extra.txt` only where `pandas-ta` is available; the default technical engine includes pure-Python fallbacks.

To run the dashboard UI, clone and configure the external repository:
[marketnarrative-trade](https://github.com/Abheydeep/marketnarrative-trade)

Follow the setup and environment variable instructions in that repository's README.md to connect it to the local trading API.

## Test

```bash
cd services/trading-api
python3 -m pytest
```

If `pytest` is not installed yet, the same deterministic tests can be smoke-run with:

```bash
cd services/trading-api
python3 tests/run_unit_tests.py
```

The tests cover technical analysis cleanup/pivots/zones, option-chain parsing, PCR velocity, OI classification, sentiment score mapping, confluence signal generation, and live-order safety gates.

For the full release matrix, including auth boundaries, browser smoke, DNS/TLS, market-hours observation, order-block checks, and rollback drills, see `docs/testing.md`.

## Live Order Defaults

- Signal BUY maps to long ATM CE.
- Signal SELL maps to long ATM PE.
- Product is `MIS`.
- Order type is `LIMIT`.
- Quantity is one lot from the current instrument master.
- Option writing is not implemented in v1.
- Exits are monitored as target/stop alerts and require manual confirmation.
