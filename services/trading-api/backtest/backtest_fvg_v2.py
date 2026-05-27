"""
FVG v2 — 3-Year Long-Term Backtest (Nifty + BankNifty)
=======================================================
Yahoo Finance only provides 60 days of 5-min data per request, but allows
fetching specific date ranges via period1/period2 Unix timestamps. This script
fetches data in 55-day chunks going back up to 400 days (~1.1 years, the
practical limit Yahoo will honour for 5-min NSE data).

For a true 3-year backtest on 5-min candles, TradingView is the correct tool:
  Strategy Tester → click the calendar → set start date to 3 years ago.
  TradingView stores NSE 5-min history going back 5+ years.

This script validates the v2 strategy (FVG + Efficiency Gate + EMA-21 + VWAP)
over the longest Python-accessible window and breaks results into quarters so
you can see whether edge is consistent across market regimes.

FVG v2 strategy stack (same as Pine Script):
  GAP_PCT    0.03%   gap between candle k and candle k+2 (imbalance zone)
  EXPIRY     12 bars  how long after gap forms to wait for a fill
  EFF_W      48 bars  Kaufman efficiency-ratio lookback
  EFF_MAX    0.20    skip bar if eff ≥ 0.20 (trending regime — skip)
  FILL_DIR   0.50    entry bar must close in top/bottom 50% of its range
  EMA        21 bars  only BUY when close > EMA21, SELL when close < EMA21
  VWAP              only BUY when close > intraday VWAP, SELL when below
  TARGET     2.0 R
  STOP_BUF   0.1%    stop 0.1% beyond distal edge

Run from the repo root:
    python3 services/trading-api/backtest/backtest_fvg_v2.py
"""

from __future__ import annotations

import json
import sys
import time as _time
import urllib.parse
import urllib.request
from datetime import datetime, date, time, timedelta, timezone
from pathlib import Path
from typing import Iterator

_BT = Path(__file__).resolve().parent
sys.path.insert(0, str(_BT))
sys.path.insert(0, str(_BT.parent))

from app.schemas import Candle
from run_backtest import (
    IST, HOLD_BARS, SESSION_START, SESSION_END, EXPIRY_CUTOFF,
    simulate_exit,
)
from sweep_fvg import sweep_stats

# ── strategy config (mirrors Pine Script v2) ─────────────────────────────────
GAP_PCT     = 0.0003   # 0.03%
EXPIRY_BARS = 12
EFF_WINDOW  = 48
EFF_MAX     = 0.20
STOP_BUFFER = 0.001    # 0.1%
TARGET_RR   = 2.0
EMA_PERIOD  = 21
WARMUP      = max(EFF_WINDOW, EMA_PERIOD) + 5

SYMBOLS = {
    "NIFTY":     ("^NSEI",    "NIFTYBEES.NS"),
    "BANKNIFTY": ("^NSEBANK", "BANKBEES.NS"),
}

# ── multi-chunk Yahoo fetch ───────────────────────────────────────────────────

def _fetch_raw_range(symbol: str, period1: int, period2: int) -> dict[datetime, dict]:
    """Fetch 5-min OHLCV for a specific date range (Unix timestamps)."""
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{urllib.parse.quote(symbol)}"
        f"?period1={period1}&period2={period2}&interval=5m"
    )
    req = urllib.request.Request(
        url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            payload = json.loads(resp.read())
        result = payload["chart"]["result"]
        if not result:
            return {}
        r = result[0]
        timestamps = r.get("timestamp", [])
        q = r["indicators"]["quote"][0]
        rows: dict[datetime, dict] = {}
        for i, ts in enumerate(timestamps):
            o  = q["open"][i]  if i < len(q.get("open",  [])) else None
            h  = q["high"][i]  if i < len(q.get("high",  [])) else None
            lo = q["low"][i]   if i < len(q.get("low",   [])) else None
            c  = q["close"][i] if i < len(q.get("close", [])) else None
            v  = q["volume"][i] if i < len(q.get("volume", [])) else None
            if None in (o, h, lo, c):
                continue
            dt = datetime.fromtimestamp(ts, tz=timezone.utc)
            rows[dt] = {"open": float(o), "high": float(h), "low": float(lo),
                        "close": float(c), "volume": float(v or 0)}
        return rows
    except Exception as exc:
        print(f"    [warn] {symbol} chunk {period1}-{period2}: {exc}")
        return {}


def fetch_multi_chunk(price_sym: str, volume_sym: str,
                      days_back: int = 400) -> list[Candle]:
    """
    Fetch up to `days_back` days of 5-min data in 55-day chunks.
    Yahoo Finance enforces a ~60-day window for 5m data; 55 gives a safe margin.
    We sleep briefly between requests to avoid rate-limiting.
    """
    now_ts   = int(datetime.now(timezone.utc).timestamp())
    chunk_s  = 55 * 24 * 3600
    start_ts = now_ts - days_back * 24 * 3600

    all_price:  dict[datetime, dict] = {}
    all_volume: dict[datetime, dict] = {}

    t = start_ts
    while t < now_ts:
        t2 = min(t + chunk_s, now_ts)
        chunk = _fetch_raw_range(price_sym,  t, t2)
        vol   = _fetch_raw_range(volume_sym, t, t2)
        all_price.update(chunk)
        all_volume.update(vol)
        t = t2 + 1
        _time.sleep(0.5)   # polite pause

    candles: list[Candle] = []
    for ts, row in sorted(all_price.items()):
        vol = all_volume.get(ts, {}).get("volume", 0.0)
        try:
            candles.append(Candle(
                ts=ts, open=row["open"], high=row["high"],
                low=row["low"],  close=row["close"],
                volume=float(vol or 0),
            ))
        except Exception:
            continue
    return candles

# ── technical indicators ─────────────────────────────────────────────────────

def ema_series(candles: list[Candle], period: int) -> list[float | None]:
    result: list[float | None] = [None] * len(candles)
    k = 2.0 / (period + 1)
    ema: float | None = None
    for i, c in enumerate(candles):
        if ema is None:
            if i >= period - 1:
                ema = sum(candles[j].close for j in range(i - period + 1, i + 1)) / period
        else:
            ema = c.close * k + ema * (1 - k)
        result[i] = ema
    return result


def vwap_series(candles: list[Candle]) -> list[float | None]:
    """Intraday VWAP that resets at each IST trading day."""
    result: list[float | None] = []
    cum_tp_vol = cum_vol = 0.0
    current_date: date | None = None
    for c in candles:
        bar_date = (c.ts + IST).date()
        if bar_date != current_date:
            cum_tp_vol = cum_vol = 0.0
            current_date = bar_date
        tp = (c.high + c.low + c.close) / 3.0
        cum_tp_vol += tp * c.volume
        cum_vol    += c.volume
        result.append(cum_tp_vol / cum_vol if cum_vol > 0 else None)
    return result


def efficiency_series(candles: list[Candle], window: int) -> list[float | None]:
    result: list[float | None] = []
    for i in range(len(candles)):
        if i < window:
            result.append(None)
            continue
        segment = candles[i - window: i + 1]
        path = sum(abs(segment[j].close - segment[j - 1].close)
                   for j in range(1, len(segment)))
        net  = abs(segment[-1].close - segment[0].close)
        result.append(net / path if path > 0 else 0.0)
    return result

# ── core FVG v2 backtest ──────────────────────────────────────────────────────

def run_fvg_v2(candles: list[Candle]) -> list[dict]:
    n     = len(candles)
    ema   = ema_series(candles, EMA_PERIOD)
    vwap  = vwap_series(candles)
    eff   = efficiency_series(candles, EFF_WINDOW)
    used: set[int] = set()
    trades: list[dict] = []

    for i in range(WARMUP, n - HOLD_BARS):
        c0, c2 = candles[i - 2], candles[i]

        # ── detect FVG ──
        kind = proximal = distal = None
        if c0.high < c2.low and (c2.low - c0.high) / c2.low >= GAP_PCT:
            kind, proximal, distal = "bull", c2.low, c0.high
        elif c0.low > c2.high and (c0.low - c2.high) / c2.high >= GAP_PCT:
            kind, proximal, distal = "bear", c2.high, c0.low
        if kind is None:
            continue

        # ── wait for first fill within expiry window ──
        entry_idx = None
        for j in range(i + 1, min(i + 1 + EXPIRY_BARS, n - HOLD_BARS)):
            bar = candles[j]
            if kind == "bull" and bar.low  <= proximal: entry_idx = j; break
            if kind == "bear" and bar.high >= proximal: entry_idx = j; break
        if entry_idx is None or entry_idx in used:
            continue

        bar = candles[entry_idx]
        ist = bar.ts + IST
        hm, wday = ist.time(), ist.weekday()
        if hm < SESSION_START or hm >= SESSION_END: continue
        if wday == 3 and hm < EXPIRY_CUTOFF:        continue  # Thu expiry

        e = eff[entry_idx]
        if e is None or e >= EFF_MAX:               continue  # trending — skip

        direction = "BUY" if kind == "bull" else "SELL"

        # ── fill-direction confluence ──
        rng = bar.high - bar.low
        cp  = (bar.close - bar.low) / rng if rng > 0 else 0.5
        if direction == "BUY"  and cp < 0.50: continue
        if direction == "SELL" and cp > 0.50: continue

        # ── EMA-21 trend filter ──
        e21 = ema[entry_idx]
        if e21 is None:                             continue
        if direction == "BUY"  and bar.close <= e21: continue
        if direction == "SELL" and bar.close >= e21: continue

        # ── VWAP bias ──
        vw = vwap[entry_idx]
        if vw is None:                              continue
        if direction == "BUY"  and bar.close <= vw: continue
        if direction == "SELL" and bar.close >= vw: continue

        used.add(entry_idx)

        entry = proximal
        if kind == "bull":
            stop   = distal * (1 - STOP_BUFFER)
            risk   = entry - stop
            target = entry + risk * TARGET_RR
        else:
            stop   = distal * (1 + STOP_BUFFER)
            risk   = stop - entry
            target = entry - risk * TARGET_RR
        if risk <= 0: continue

        outcome = simulate_exit(candles[entry_idx + 1:], direction, target, stop)
        trades.append({
            "outcome":    outcome,
            "ts":         ist,
            "quarter":    f"Q{((ist.month - 1) // 3) + 1} {ist.year}",
            "direction":  direction,
            "entry":      round(entry, 2),
            "target":     round(target, 2),
            "stop":       round(stop,   2),
            "risk_pts":   round(risk,   2),
        })
    return trades

# ── reporting ─────────────────────────────────────────────────────────────────

def _stats(trades: list[dict], rr: float = TARGET_RR) -> dict:
    return sweep_stats(trades, rr)


def _print_quarter_table(trades: list[dict], name: str) -> None:
    from collections import defaultdict
    by_q: dict[str, list[dict]] = defaultdict(list)
    for t in trades:
        by_q[t["quarter"]].append(t)
    print(f"\n  {'Quarter':<12} {'N':>4} {'Win%':>6} {'PF':>6}")
    print(f"  {'─'*32}")
    for q in sorted(by_q):
        s = _stats(by_q[q])
        bar = "█" * int(s["pf"] * 5) if s["pf"] > 0 else ""
        print(f"  {q:<12} {s['count']:>4} {s['win_rate']:>5.1f}% {s['pf']:>6.2f}  {bar}")
    s = _stats(trades)
    print(f"  {'─'*32}")
    print(f"  {'ALL':<12} {s['count']:>4} {s['win_rate']:>5.1f}% {s['pf']:>6.2f}")


def main() -> None:
    print("\n══════════════════════════════════════════════════════════════")
    print("  FVG v2 — Long-Term Backtest  (EMA-21 + VWAP + Eff Gate)")
    print("══════════════════════════════════════════════════════════════")
    print("  Fetching up to ~13 months of 5-min data in 55-day chunks …")
    print("  (Yahoo Finance hard-limits 5m data to ~60 days; older chunks")
    print("   may return empty — that's expected.)\n")

    all_trades: list[dict] = []

    for name, (price_sym, vol_sym) in SYMBOLS.items():
        print(f"  ── {name} ({price_sym}) ──────────────────────────────")
        candles = fetch_multi_chunk(price_sym, vol_sym, days_back=400)
        if not candles:
            print("    No data returned — check network / Yahoo limits.\n")
            continue
        span = f"{candles[0].ts.date()} → {candles[-1].ts.date()}"
        print(f"    {len(candles):,} bars  ({span})")

        trades = run_fvg_v2(candles)
        all_trades.extend(trades)

        s = _stats(trades)
        print(f"    Trades={s['count']}  Win={s['win_rate']:.1f}%  "
              f"PF={s['pf']:.2f}  AvgR={s['avg_r']:.3f}")
        _print_quarter_table(trades, name)
        print()

    if all_trades:
        print("══════════════════════════════════════════════════════════════")
        print("  POOLED (NIFTY + BANKNIFTY)")
        s = _stats(all_trades)
        print(f"  Trades={s['count']}  Win={s['win_rate']:.1f}%  "
              f"PF={s['pf']:.2f}  AvgR={s['avg_r']:.3f}  "
              f"TotalR={s['total_r']:.1f}")
        _print_quarter_table(all_trades, "pooled")

    print("\n══════════════════════════════════════════════════════════════")
    print("  NOTE — True 3-year backtest on 5-min candles:")
    print("  TradingView Strategy Tester → click the calendar icon →")
    print("  set start date to 3 years ago. TradingView stores NSE 5-min")
    print("  history going back 5+ years (requires Pro or Premium plan).")
    print("══════════════════════════════════════════════════════════════\n")


if __name__ == "__main__":
    main()
