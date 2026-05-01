# Trading API

FastAPI service for the Nifty/Bank Nifty trading cockpit. It is additive to the existing Spring Boot narrative backend.

## Run

```bash
cd services/trading-api
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8090
```

Install `requirements-ml.txt` only when `ENABLE_FINBERT=true` is needed. Install `requirements-quant-extra.txt` only in an environment where `pandas-ta` wheels are available; the default engine has pure-Python indicator fallbacks.

The service starts in mock mode, but trading endpoints require an Abhey trading-admin JWT by default. Use the Spring auth service to log in as `abhey@marketnarrative.local` / `market-open` locally, or set `TRADING_AUTH_REQUIRED=false` for isolated API development.

It exposes:

- `GET /health`
- `GET /api/market/envelope`
- `GET /api/kite/login-url`
- `POST /api/kite/session`
- `GET /api/options/chain?index=NIFTY`
- `GET /api/signals/latest?index=BANKNIFTY`
- `POST /api/orders/proposals`
- `POST /api/orders/confirm`
- `POST /api/orders/kill-switch`
- `WS /ws/market`

`app/adapters/kite/ticker.py` contains the live `KiteTicker` bridge. It subscribes selected ATM option tokens in full mode and forwards ticks into the async application loop once credentials and instrument refresh are configured.

## Kite Safety

Kite authentication uses the documented redirect flow. The service does not store Kite passwords or TOTP seeds, and it does not attempt automated login. Live orders remain blocked unless `ENABLE_LIVE_ORDERS=true`, the user manually confirms the order, a valid Kite token exists, the proposal is fresh, the kill switch is off, and risk limits pass.

Set `TRADING_TOKEN_KEY` to a Fernet key to encrypt the local Kite session file:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
