"""
Nifty / Bank Nifty — FVG + Order-Flow Strategy Backtest
========================================================
Reuses the 60-day 5-min data fetch from run_backtest.py, then replays two
alternative strategies across the same filter layers:

  1. FVG (Fair Value Gap)  — 3-candle imbalance; trade the retrace-into-gap.
  2. Order-Flow proxy      — large-volume directional "initiative" bars as a
                             stand-in for true depth-of-market order flow.
                             (Yahoo gives no DOM; this is an OHLCV proxy.)

Run from the repo root:
    python3 services/trading-api/backtest/run_fvg_backtest.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_BT = Path(__file__).resolve().parent
sys.path.insert(0, str(_BT))            # so `import run_backtest` works
sys.path.insert(0, str(_BT.parent))     # so `app.*` imports resolve

from app.schemas import Candle
from run_backtest import (
    IST, HOLD_BARS, RISK_REWARD,
    SESSION_START, SESSION_END, EXPIRY_CUTOFF, VOLUME_MULT,
    SYMBOLS, fetch_yahoo, simulate_exit, stats, by_hour, by_weekday, avg_volume,
)

# ── strategy constants ──────────────────────────────────────────────────────
FVG_MIN_GAP_PCT     = 0.0005   # gap must be ≥ 0.05% of price (real displacement)
FVG_EXPIRY_BARS     = 24       # FVG must be filled within 24 bars (2h) or it's void
STOP_BUFFER         = 0.001    # stop 0.1% beyond the far edge of the gap / bar
INITIATIVE_VOL_MULT = 2.0      # order-flow bar volume must exceed 2× 20-bar avg
CLOSE_STRENGTH      = 0.70     # close must land in the top/bottom 30% of bar range
WARMUP_BARS         = 20       # bars needed before first signal (volume avg window)


# ── FVG strategy ────────────────────────────────────────────────────────────

def run_fvg(candles: list[Candle], filters: dict[str, bool]) -> list[dict]:
    """
    Detect 3-candle Fair Value Gaps, wait for price to retrace into the gap,
    enter in the FVG direction. Stop beyond the far edge, target at 2R.
    """
    trades: list[dict] = []
    used: set[int] = set()
    n = len(candles)

    for i in range(WARMUP_BARS, n - HOLD_BARS):
        c0, c2 = candles[i - 2], candles[i]

        # ── detect FVG at bar i ──
        fvg = None
        if c0.high < c2.low:                         # bullish imbalance
            if (c2.low - c0.high) / c2.low >= FVG_MIN_GAP_PCT:
                fvg = ("bull", c2.low, c0.high)      # (kind, proximal, distal)
        elif c0.low > c2.high:                       # bearish imbalance
            if (c0.low - c2.high) / c2.high >= FVG_MIN_GAP_PCT:
                fvg = ("bear", c2.high, c0.low)
        if fvg is None:
            continue

        kind, proximal, distal = fvg

        # ── wait for price to retrace into the gap ──
        entry_idx = None
        for j in range(i + 1, min(i + 1 + FVG_EXPIRY_BARS, n - HOLD_BARS)):
            bar = candles[j]
            if kind == "bull" and bar.low <= proximal:
                entry_idx = j
                break
            if kind == "bear" and bar.high >= proximal:
                entry_idx = j
                break
        if entry_idx is None or entry_idx in used:
            continue

        entry_bar = candles[entry_idx]
        ist  = entry_bar.ts + IST
        hm   = ist.time()
        wday = ist.weekday()

        # ── filters applied at the entry bar ──
        if filters.get("time_of_day") and (hm < SESSION_START or hm >= SESSION_END):
            continue
        if filters.get("expiry") and wday == 3 and hm < EXPIRY_CUTOFF:
            continue
        if filters.get("volume"):
            av = avg_volume(candles[max(0, entry_idx - 20):entry_idx])
            if av > 0 and entry_bar.volume < VOLUME_MULT * av:
                continue

        used.add(entry_idx)

        if kind == "bull":
            direction = "BUY"
            entry  = proximal
            stop   = distal * (1 - STOP_BUFFER)
            risk   = entry - stop
            target = entry + risk * RISK_REWARD
        else:
            direction = "SELL"
            entry  = proximal
            stop   = distal * (1 + STOP_BUFFER)
            risk   = stop - entry
            target = entry - risk * RISK_REWARD
        if risk <= 0:
            continue

        outcome = simulate_exit(candles[entry_idx + 1:], direction, target, stop)
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
        })

    return trades


# ── order-flow proxy strategy ───────────────────────────────────────────────

def run_orderflow(candles: list[Candle], filters: dict[str, bool]) -> list[dict]:
    """
    Order-flow proxy (no true DOM available): a bar with volume > 2× the 20-bar
    average AND a close in the top/bottom 30% of its range is treated as an
    'initiative' bar — aggressive buyers/sellers in control. Trade continuation:
    enter at the close, stop at the opposite extreme of the bar, target 2R.
    """
    trades: list[dict] = []
    n = len(candles)

    for i in range(WARMUP_BARS, n - HOLD_BARS):
        bar = candles[i]
        rng = bar.high - bar.low
        if rng <= 0:
            continue

        av = avg_volume(candles[max(0, i - 20):i])
        if av <= 0 or bar.volume < INITIATIVE_VOL_MULT * av:
            continue

        ist  = bar.ts + IST
        hm   = ist.time()
        wday = ist.weekday()
        if filters.get("time_of_day") and (hm < SESSION_START or hm >= SESSION_END):
            continue
        if filters.get("expiry") and wday == 3 and hm < EXPIRY_CUTOFF:
            continue

        close_pos = (bar.close - bar.low) / rng   # 0 = at low, 1 = at high
        if close_pos >= CLOSE_STRENGTH:
            direction = "BUY"
            entry  = bar.close
            stop   = bar.low * (1 - STOP_BUFFER)
            risk   = entry - stop
            target = entry + risk * RISK_REWARD
        elif close_pos <= 1 - CLOSE_STRENGTH:
            direction = "SELL"
            entry  = bar.close
            stop   = bar.high * (1 + STOP_BUFFER)
            risk   = stop - entry
            target = entry - risk * RISK_REWARD
        else:
            continue
        if risk <= 0:
            continue

        outcome = simulate_exit(candles[i + 1:], direction, target, stop)
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
        })

    return trades


# ── main ────────────────────────────────────────────────────────────────────

FVG_FILTERS = {
    "baseline (no filters)": {"time_of_day": False, "expiry": False, "volume": False},
    "+ time-of-day":         {"time_of_day": True,  "expiry": False, "volume": False},
    "+ expiry":              {"time_of_day": True,  "expiry": True,  "volume": False},
    "+ volume (all 3)":      {"time_of_day": True,  "expiry": True,  "volume": True},
}

OF_FILTERS = {
    "baseline (no filters)": {"time_of_day": False, "expiry": False},
    "+ time-of-day":         {"time_of_day": True,  "expiry": False},
    "+ time + expiry":       {"time_of_day": True,  "expiry": True},
}


def _print_table(title: str, configs: dict, runner, candles: list[Candle]) -> dict:
    print(f"\n  {title}")
    print(f"  {'Scenario':<24} {'Trades':>6} {'Win%':>6} {'PF':>5} {'AvgR':>6} {'TotalR':>8} {'Sharpe':>7}")
    print(f"  {'─' * 67}")
    results: dict[str, list[dict]] = {}
    for label, filters in configs.items():
        trades = runner(candles, filters)
        s = stats(trades)
        results[label] = trades
        print(
            f"  {label:<24} {s['count']:>6} {s['win_rate']:>5.1f}%"
            f" {s['profit_factor']:>5.2f} {s['avg_r']:>6.3f}"
            f" {s['total_r']:>8.1f} {s['sharpe_approx']:>7.2f}"
        )
    return results


def main() -> None:
    print("\n─── Nifty / Bank Nifty — FVG + Order-Flow Backtest ───")
    print("Fetching 60 days of 5-min data from Yahoo Finance …\n")

    all_candles: dict[str, list[Candle]] = {}
    for name, (price_sym, volume_sym) in SYMBOLS.items():
        try:
            candles = fetch_yahoo(price_sym, volume_sym)
            all_candles[name] = candles
            non_zero = sum(1 for c in candles if c.volume > 0)
            print(f"  {name:12s} {len(candles):5d} bars  "
                  f"({candles[0].ts.date()} → {candles[-1].ts.date()})  vol>0: {non_zero}")
        except Exception as exc:
            print(f"  {name}: FETCH FAILED — {exc}")

    for index_name, candles in all_candles.items():
        print(f"\n{'═' * 72}")
        print(f"  {index_name}")
        print(f"{'═' * 72}")

        fvg_results = _print_table(
            "FAIR VALUE GAP (retrace-into-gap, 2R target)",
            FVG_FILTERS, run_fvg, candles,
        )
        of_results = _print_table(
            "ORDER-FLOW PROXY (initiative-bar continuation, 2R target)",
            OF_FILTERS, run_orderflow, candles,
        )

        full_fvg = fvg_results["+ volume (all 3)"]
        if full_fvg:
            print(f"\n  FVG hour breakdown (all filters, {index_name}):")
            print(f"  {'Hour (IST)':>12}  {'Trades':>6}  {'Win%':>6}  {'PF':>5}")
            for hour, s in by_hour(full_fvg).items():
                bar = "█" * int(s["win_rate"] / 5)
                print(f"  {hour:>10}:00  {s['count']:>6}  {s['win_rate']:>5.1f}%  {s['profit_factor']:>5.2f}  {bar}")

            print(f"\n  FVG weekday breakdown (all filters, {index_name}):")
            print(f"  {'Day':<12}  {'Trades':>6}  {'Win%':>6}  {'PF':>5}")
            for day, s in by_weekday(full_fvg).items():
                print(f"  {day:<12}  {s['count']:>6}  {s['win_rate']:>5.1f}%  {s['profit_factor']:>5.2f}")

    print(f"\n{'─' * 72}")
    print("  Done.")
    print("  Note: 'Order-Flow Proxy' approximates aggression from OHLCV volume —")
    print("  it is NOT true depth-of-market. Real DOM needs a live Kite tick capture.")
    print("  FVG entries assume a limit fill at the gap's proximal edge.\n")


if __name__ == "__main__":
    main()
