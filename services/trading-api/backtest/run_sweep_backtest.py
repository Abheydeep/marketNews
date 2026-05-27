"""
Liquidity Sweep Strategy Backtest — Nifty / Bank Nifty
=======================================================
A liquidity sweep ("stop hunt") is when price wicks past a recent swing
high/low — running the stop orders resting there — then closes back inside.
The failed breakout is the signal; the trade is the reversal.

  • bullish sweep — bar's LOW pierces a recent swing low, CLOSE back above it
                     → BUY (sell-side liquidity grabbed, expect bounce)
  • bearish sweep — bar's HIGH pierces a recent swing high, CLOSE back below
                     → SELL (buy-side liquidity grabbed, expect drop)

Entry at the sweep bar's close · stop just past the sweep wick · target 2R.
Replays the same filter layers and 3-fold walk-forward used for FVG.

Run from the repo root:
    python3 services/trading-api/backtest/run_sweep_backtest.py
"""

from __future__ import annotations

import sys
from collections import defaultdict
from pathlib import Path

_BT = Path(__file__).resolve().parent
sys.path.insert(0, str(_BT))
sys.path.insert(0, str(_BT.parent))

from app.schemas import Candle
from run_backtest import (
    IST, HOLD_BARS, RISK_REWARD, SESSION_START, SESSION_END, EXPIRY_CUTOFF,
    VOLUME_MULT, SYMBOLS, fetch_yahoo, simulate_exit, stats, by_hour,
    by_weekday, avg_volume,
)

SWING_K        = 3      # fractal half-width for swing pivots
SWEEP_LOOKBACK = 60     # only sweep liquidity from swings within 60 bars
STOP_BUFFER    = 0.001  # stop 0.1% beyond the sweep wick
CLOSE_STRENGTH = 0.60   # "strong" variant: close in top/bottom 40% of range
WARMUP_BARS    = 70


def swing_points(candles: list[Candle]) -> tuple[list[int], list[int]]:
    """Fractal swing-high and swing-low indices (highest/lowest of ±SWING_K)."""
    highs: list[int] = []
    lows: list[int] = []
    n = len(candles)
    for i in range(SWING_K, n - SWING_K):
        window = candles[i - SWING_K:i + SWING_K + 1]
        if candles[i].high >= max(c.high for c in window):
            highs.append(i)
        if candles[i].low <= min(c.low for c in window):
            lows.append(i)
    return highs, lows


def run_sweep(candles: list[Candle], filters: dict[str, bool]) -> list[dict]:
    """Liquidity-sweep reversal strategy. filters: time_of_day, expiry, volume, strong."""
    trades: list[dict] = []
    used: set[int] = set()
    highs, lows = swing_points(candles)
    n = len(candles)

    for t in range(WARMUP_BARS, n - HOLD_BARS):
        bar = candles[t]
        rng = bar.high - bar.low
        if rng <= 0:
            continue

        # most recent confirmed swing low / high within the lookback window
        recent_low = recent_high = None
        for s in reversed(lows):
            if s > t - SWING_K:
                continue
            if s < t - SWEEP_LOOKBACK:
                break
            recent_low = candles[s].low
            break
        for s in reversed(highs):
            if s > t - SWING_K:
                continue
            if s < t - SWEEP_LOOKBACK:
                break
            recent_high = candles[s].high
            break

        direction = sweep_extreme = None
        if recent_low is not None and bar.low < recent_low and bar.close > recent_low:
            direction, sweep_extreme = "BUY", bar.low
        elif recent_high is not None and bar.high > recent_high and bar.close < recent_high:
            direction, sweep_extreme = "SELL", bar.high
        if direction is None:
            continue

        # optional "strong" filter — reversal close in the far 40% of the range
        if filters.get("strong"):
            close_pos = (bar.close - bar.low) / rng
            if direction == "BUY" and close_pos < CLOSE_STRENGTH:
                continue
            if direction == "SELL" and close_pos > 1 - CLOSE_STRENGTH:
                continue

        ist  = bar.ts + IST
        hm   = ist.time()
        wday = ist.weekday()
        if filters.get("time_of_day") and (hm < SESSION_START or hm >= SESSION_END):
            continue
        if filters.get("expiry") and wday == 3 and hm < EXPIRY_CUTOFF:
            continue
        if filters.get("volume"):
            av = avg_volume(candles[max(0, t - 20):t])
            if av > 0 and bar.volume < VOLUME_MULT * av:
                continue

        if t in used:
            continue

        entry = bar.close
        if direction == "BUY":
            stop   = sweep_extreme * (1 - STOP_BUFFER)
            risk   = entry - stop
            target = entry + risk * RISK_REWARD
        else:
            stop   = sweep_extreme * (1 + STOP_BUFFER)
            risk   = stop - entry
            target = entry - risk * RISK_REWARD
        if risk <= 0:
            continue

        used.add(t)
        outcome = simulate_exit(candles[t + 1:], direction, target, stop)
        trades.append({
            "ts":        ist.isoformat(),
            "weekday":   ist.strftime("%A"),
            "hour":      ist.hour,
            "direction": direction,
            "entry":     round(entry, 2),
            "target":    round(target, 2),
            "stop":      round(stop, 2),
            "risk_pts":  round(risk, 2),
            "outcome":   outcome,
            "fold":      0,   # set later
        })

    return trades


FILTER_CONFIGS = {
    "baseline (no filters)":   {"time_of_day": False, "expiry": False, "volume": False, "strong": False},
    "+ time-of-day":           {"time_of_day": True,  "expiry": False, "volume": False, "strong": False},
    "+ expiry":                {"time_of_day": True,  "expiry": True,  "volume": False, "strong": False},
    "+ strong reversal close": {"time_of_day": True,  "expiry": True,  "volume": False, "strong": True},
}


def _fold_of(idx: int, n: int) -> int:
    return min(idx // (n // 3), 2)


def main() -> None:
    print("\n─── Liquidity Sweep Strategy Backtest — Nifty / Bank Nifty ───")
    print("Fetching 60 days of 5-min data from Yahoo Finance …\n")

    data: dict[str, list[Candle]] = {}
    for name, (price_sym, volume_sym) in SYMBOLS.items():
        data[name] = fetch_yahoo(price_sym, volume_sym)
        print(f"  {name:12s} {len(data[name]):5d} bars  "
              f"({data[name][0].ts.date()} → {data[name][-1].ts.date()})")

    # ── per-symbol filter comparison ──
    for index_name, candles in data.items():
        print(f"\n{'═' * 72}")
        print(f"  {index_name}")
        print(f"{'═' * 72}")
        print(f"  {'Scenario':<26} {'Trades':>6} {'Win%':>6} {'PF':>5} "
              f"{'AvgR':>6} {'TotalR':>8}")
        print(f"  {'─' * 62}")
        for label, filters in FILTER_CONFIGS.items():
            s = stats(run_sweep(candles, filters))
            print(f"  {label:<26} {s['count']:>6} {s['win_rate']:>5.1f}% "
                  f"{s['profit_factor']:>5.2f} {s['avg_r']:>6.3f} "
                  f"{s['total_r']:>8.1f}")

    # ── pooled 3-fold walk-forward for the strongest config ──
    best = FILTER_CONFIGS["+ strong reversal close"]
    print(f"\n{'═' * 72}")
    print("  WALK-FORWARD — '+ strong reversal close' (NIFTY + BANKNIFTY pooled)")
    print(f"{'═' * 72}")
    fold_trades: dict[int, list] = defaultdict(list)
    for candles in data.values():
        n = len(candles)
        for tr in run_sweep(candles, best):
            # bucket by entry timestamp position via a re-derived fold
            fold_trades[_fold_of(_index_for(tr, candles), n)].append(tr)
    print(f"  {'Slice':<12} {'Trades':>6} {'Win%':>6} {'PF':>5} {'AvgR':>6} {'TotalR':>8}")
    print(f"  {'─' * 50}")
    worst = 99.0
    for k in range(3):
        s = stats(fold_trades[k])
        worst = min(worst, s["profit_factor"]) if s["count"] else worst
        print(f"  Fold {k + 1:<7} {s['count']:>6} {s['win_rate']:>5.1f}% "
              f"{s['profit_factor']:>5.2f} {s['avg_r']:>6.3f} {s['total_r']:>8.1f}")
    pooled = [tr for trs in fold_trades.values() for tr in trs]
    s = stats(pooled)
    print(f"  {'─' * 50}")
    print(f"  {'All':<12} {s['count']:>6} {s['win_rate']:>5.1f}% "
          f"{s['profit_factor']:>5.2f} {s['avg_r']:>6.3f} {s['total_r']:>8.1f}")
    verdict = "ROBUST" if worst >= 1.0 else "MIXED" if worst >= 0.9 else "FRAGILE"
    print(f"  Verdict: worst-fold PF {worst:.2f} → {verdict}")

    print(f"\n{'─' * 72}")
    print("  Entry at sweep-bar close; PF gross of options spread/theta/cost.")
    print("  Next: test sweep → FVG confluence (a sweep then an FVG retrace).\n")


def _index_for(trade: dict, candles: list[Candle]) -> int:
    """Recover the candle index of a trade from its IST timestamp."""
    from datetime import datetime
    ts = datetime.fromisoformat(trade["ts"])
    for i, c in enumerate(candles):
        if (c.ts + IST).isoformat() == trade["ts"]:
            return i
    return 0


if __name__ == "__main__":
    main()
