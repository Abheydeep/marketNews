"""
FVG v2 — 3-Year Backtest via Kite Connect API
===============================================
Uses the live Kite session from trade.marketnarrative.in (token stored in
Redis) to pull 3 years of NSE 5-min candles and replay the FVG v2 strategy.

Kite Connect historical data limits:
  5minute  →  max 100 days per request  →  ~11 requests × 3 years
  Data available: NIFTY 50 (token 256265) and BankNifty (260105)

Authentication (pick whichever you have):
  Option A — Redis (production token, same as Render):
    TRADING_REDIS_URL=redis://... KITE_TOKEN_REDIS_KEY=trading:kite:session:v1

  Option B — local .env file in the repo root (copy from Render env vars):
    KITE_API_KEY=...  KITE_API_SECRET=...  TRADING_REDIS_URL=...  etc.

  Option C — local token file:
    KITE_TOKEN_STORE=.local/kite-session.json

Run from the repo root:
    python3 services/trading-api/backtest/backtest_fvg_kite.py
    # or set years to test:
    BACKTEST_YEARS=3 python3 services/trading-api/backtest/backtest_fvg_kite.py
"""

from __future__ import annotations

import asyncio
import os
import sys
import time as _time
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

_BT   = Path(__file__).resolve().parent
_ROOT = _BT.parent
sys.path.insert(0, str(_BT))
sys.path.insert(0, str(_ROOT))

# Load .env if present (python-dotenv optional — fallback to env vars)
_env_file = _ROOT.parent.parent / ".env"
if not _env_file.exists():
    _env_file = _ROOT.parent / ".env"
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))

from app.adapters.kite.auth import KiteAuthService
from app.adapters.kite.client import KiteHttpClient
from app.config import Settings, settings as _default_settings
from app.schemas import Candle
from run_backtest import IST, HOLD_BARS, SESSION_START, SESSION_END, EXPIRY_CUTOFF, simulate_exit
from backtest_fvg_v2 import (
    run_fvg_v2, _stats, _print_quarter_table,
    GAP_PCT, EXPIRY_BARS, EFF_WINDOW, EFF_MAX, STOP_BUFFER, TARGET_RR,
)
from sweep_fvg import sweep_stats

# ── instrument tokens (NSE index tokens, same as config defaults) ─────────────
INSTRUMENTS = {
    "NIFTY":     _default_settings.nifty_index_token,      # 256265
    "BANKNIFTY": _default_settings.banknifty_index_token,  # 260105
}

CHUNK_DAYS  = 90     # conservative — Kite allows 100 days per request for 5m
BACKTEST_YEARS = int(os.getenv("BACKTEST_YEARS", "3"))

# ── Kite historical fetch ─────────────────────────────────────────────────────

def _parse_kite_ts(raw: str) -> datetime:
    """Parse Kite's timestamp string into UTC datetime."""
    for fmt in ("%Y-%m-%d %H:%M:%S%z", "%Y-%m-%dT%H:%M:%S%z",
                "%Y-%m-%d %H:%M:%S"):
        try:
            dt = datetime.strptime(raw, fmt)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return datetime.now(timezone.utc)


async def fetch_kite_candles(
    client: KiteHttpClient,
    token: int,
    years: int = 3,
) -> list[Candle]:
    """
    Pull `years` of 5-min index candles in CHUNK_DAYS-day batches.
    NSE indices return 0 volume; we set volume=1.0 so VWAP doesn't divide
    by zero (VWAP becomes TWAP, a reasonable intraday price anchor).
    """
    now      = datetime.now(timezone.utc).replace(microsecond=0)
    end_dt   = now
    start_dt = now - timedelta(days=years * 365)
    chunk    = timedelta(days=CHUNK_DAYS)

    all_candles: dict[datetime, Candle] = {}

    t = start_dt
    while t < end_dt:
        t2 = min(t + chunk, end_dt)
        try:
            data = await client.historical(token, "5minute", t, t2)
            rows = data.get("candles", []) if isinstance(data, dict) else []
            for row in rows:
                if len(row) < 6:
                    continue
                ts    = _parse_kite_ts(str(row[0]))
                vol   = float(row[5]) if row[5] else 1.0
                candle = Candle(
                    ts=ts,
                    open=float(row[1]),  high=float(row[2]),
                    low=float(row[3]),   close=float(row[4]),
                    volume=max(vol, 1.0),   # guard against 0-volume index bars
                )
                all_candles[ts] = candle
            print(f"    chunk {t.date()} → {t2.date()} : {len(rows)} bars")
        except Exception as exc:
            print(f"    [warn] chunk {t.date()} → {t2.date()} : {exc}")
        t = t2 + timedelta(seconds=1)
        await asyncio.sleep(0.4)   # stay inside Kite's 3 req/s rate limit

    candles = [all_candles[k] for k in sorted(all_candles)]
    return candles

# ── main ──────────────────────────────────────────────────────────────────────

async def main() -> None:
    print("\n══════════════════════════════════════════════════════════════")
    print(f"  FVG v2 — Kite {BACKTEST_YEARS}-Year Backtest  "
          f"(EMA-21 · VWAP · Efficiency Gate)")
    print("══════════════════════════════════════════════════════════════")

    # ── init auth from the same config the production app uses ───────────────
    cfg    = Settings()
    auth   = KiteAuthService(cfg)
    client = KiteHttpClient(cfg, auth)

    if not auth.token_store.token_valid():
        print("\n  ✗ Kite session is not valid or expired.")
        print("    Log in at trade.marketnarrative.in → Connect Kite")
        print("    then re-run this script.\n")
        return

    token_preview = (auth.token_store.access_token() or "")[:8]
    print(f"  ✓ Kite session valid  (token: {token_preview}…)")
    print(f"  Pulling {BACKTEST_YEARS} year(s) of 5-min candles in "
          f"{CHUNK_DAYS}-day chunks …\n")

    all_trades: list[dict] = []

    for name, instrument_token in INSTRUMENTS.items():
        print(f"  ── {name}  (token {instrument_token}) "
              f"──────────────────────────")
        candles = await fetch_kite_candles(client, instrument_token,
                                            years=BACKTEST_YEARS)
        if not candles:
            print("    No data returned.\n")
            continue

        span = f"{candles[0].ts.date()} → {candles[-1].ts.date()}"
        print(f"    {len(candles):,} bars total  ({span})\n")

        trades = run_fvg_v2(candles)
        all_trades.extend(trades)

        s = _stats(trades)
        print(f"    Trades={s['count']}  Win={s['win_rate']:.1f}%  "
              f"PF={s['pf']:.2f}  AvgR={s['avg_r']:.3f}  "
              f"TotalR={s['total_r']:.1f}R")
        _print_quarter_table(trades, name)
        print()

    # ── pooled summary ────────────────────────────────────────────────────────
    if all_trades:
        print("══════════════════════════════════════════════════════════════")
        print("  POOLED NIFTY + BANKNIFTY")
        s = _stats(all_trades)
        print(f"  Trades={s['count']}  Win={s['win_rate']:.1f}%  "
              f"PF={s['pf']:.2f}  AvgR={s['avg_r']:.3f}  "
              f"TotalR={s['total_r']:.1f}R")
        _print_quarter_table(all_trades, "pooled")

        # ── fold robustness (3-fold walk-forward) ─────────────────────────────
        third = len(all_trades) // 3
        print(f"\n  3-FOLD WALK-FORWARD")
        worst_pf = 99.0
        for fold in range(3):
            fold_trades = [t for t in all_trades
                           if all_trades.index(t) // third == fold]
            fs = _stats(fold_trades)
            worst_pf = min(worst_pf, fs["pf"]) if fs["count"] else worst_pf
            print(f"  Fold {fold+1}  N={fs['count']:3d}  "
                  f"Win={fs['win_rate']:5.1f}%  PF={fs['pf']:.2f}")
        verdict = ("ROBUST" if worst_pf >= 1.0
                   else "MIXED"  if worst_pf >= 0.9
                   else "FRAGILE")
        print(f"\n  Worst-fold PF {worst_pf:.2f} → {verdict}")

    print("\n══════════════════════════════════════════════════════════════\n")


if __name__ == "__main__":
    asyncio.run(main())
