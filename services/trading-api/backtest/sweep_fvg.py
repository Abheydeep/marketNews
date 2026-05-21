"""
FVG Parameter Sweep — Nifty / Bank Nifty
=========================================
Grid-searches the three FVG knobs against 60 days of 5-min data:

  • min gap %    — how big an imbalance must be to count as displacement
  • target R     — reward:risk multiple for the profit target
  • expiry bars  — how long an unfilled FVG stays valid

Filters held fixed at the robust config: time-of-day + expiry (no volume).
Trades from NIFTY and BANKNIFTY are pooled for the ranking, so the winner
isn't curve-fit to one index. Ranked by profit factor.

Run from the repo root:
    python3 services/trading-api/backtest/sweep_fvg.py
"""

from __future__ import annotations

import sys
from pathlib import Path
from statistics import mean, stdev

_BT = Path(__file__).resolve().parent
sys.path.insert(0, str(_BT))
sys.path.insert(0, str(_BT.parent))

from app.schemas import Candle
from run_backtest import (
    IST, HOLD_BARS, SESSION_START, SESSION_END, EXPIRY_CUTOFF,
    SYMBOLS, fetch_yahoo, simulate_exit,
)

STOP_BUFFER = 0.001
WARMUP_BARS = 20

# ── sweep grid ──────────────────────────────────────────────────────────────
GAP_PCTS    = [0.0003, 0.0005, 0.0008, 0.0012, 0.0018, 0.0025]
TARGET_RRS  = [1.0, 1.5, 2.0, 2.5, 3.0]
EXPIRY_BARS = [12, 24, 36]
MIN_TRADES  = 120   # pooled trade count below this is flagged as untrustworthy


def run_fvg(candles: list[Candle], min_gap_pct: float, rr: float,
            expiry_bars: int) -> list[dict]:
    """FVG retrace strategy, parameterised. Filters fixed: time-of-day + expiry."""
    trades: list[dict] = []
    used: set[int] = set()
    n = len(candles)

    for i in range(WARMUP_BARS, n - HOLD_BARS):
        c0, c2 = candles[i - 2], candles[i]

        fvg = None
        if c0.high < c2.low:
            if (c2.low - c0.high) / c2.low >= min_gap_pct:
                fvg = ("bull", c2.low, c0.high)
        elif c0.low > c2.high:
            if (c0.low - c2.high) / c2.high >= min_gap_pct:
                fvg = ("bear", c2.high, c0.low)
        if fvg is None:
            continue

        kind, proximal, distal = fvg

        entry_idx = None
        for j in range(i + 1, min(i + 1 + expiry_bars, n - HOLD_BARS)):
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

        # fixed filters: time-of-day + expiry
        if hm < SESSION_START or hm >= SESSION_END:
            continue
        if wday == 3 and hm < EXPIRY_CUTOFF:
            continue

        used.add(entry_idx)

        if kind == "bull":
            direction = "BUY"
            entry  = proximal
            stop   = distal * (1 - STOP_BUFFER)
            risk   = entry - stop
            target = entry + risk * rr
        else:
            direction = "SELL"
            entry  = proximal
            stop   = distal * (1 + STOP_BUFFER)
            risk   = stop - entry
            target = entry - risk * rr
        if risk <= 0:
            continue

        outcome = simulate_exit(candles[entry_idx + 1:], direction, target, stop)
        trades.append({"outcome": outcome})

    return trades


def sweep_stats(trades: list[dict], rr: float) -> dict:
    """Stats with WIN worth +rr R (variable target), LOSS −1R, TIMEOUT −0.5R."""
    if not trades:
        return {"count": 0, "win_rate": 0.0, "pf": 0.0, "total_r": 0.0,
                "avg_r": 0.0, "sharpe": 0.0}

    wins     = sum(1 for t in trades if t["outcome"] == "WIN")
    losses   = sum(1 for t in trades if t["outcome"] == "LOSS")
    timeouts = sum(1 for t in trades if t["outcome"] == "TIMEOUT")

    r_series = [rr] * wins + [-1.0] * losses + [-0.5] * timeouts
    total_r  = sum(r_series)
    gross_win  = rr * wins
    gross_loss = losses + 0.5 * timeouts
    pf = gross_win / gross_loss if gross_loss else float("inf")

    avg_r = mean(r_series)
    sd    = stdev(r_series) if len(r_series) > 1 else 0
    sharpe = (avg_r / sd) * (252 ** 0.5) if sd else 0

    return {
        "count":    len(trades),
        "win_rate": round(wins / len(trades) * 100, 1),
        "pf":       round(pf, 2) if pf != float("inf") else 99.0,
        "total_r":  round(total_r, 1),
        "avg_r":    round(avg_r, 3),
        "sharpe":   round(sharpe, 2),
    }


def main() -> None:
    print("\n─── FVG Parameter Sweep — Nifty / Bank Nifty ───")
    print("Fetching 60 days of 5-min data from Yahoo Finance …\n")

    all_candles: dict[str, list[Candle]] = {}
    for name, (price_sym, volume_sym) in SYMBOLS.items():
        candles = fetch_yahoo(price_sym, volume_sym)
        all_candles[name] = candles
        print(f"  {name:12s} {len(candles):5d} bars  "
              f"({candles[0].ts.date()} → {candles[-1].ts.date()})")

    combos = len(GAP_PCTS) * len(TARGET_RRS) * len(EXPIRY_BARS)
    print(f"\n  Sweeping {combos} combinations × 2 indices "
          f"(NIFTY + BANKNIFTY pooled) …\n")

    rows: list[dict] = []
    for gap in GAP_PCTS:
        for rr in TARGET_RRS:
            for exp in EXPIRY_BARS:
                pooled: list[dict] = []
                for candles in all_candles.values():
                    pooled.extend(run_fvg(candles, gap, rr, exp))
                s = sweep_stats(pooled, rr)
                rows.append({"gap": gap, "rr": rr, "exp": exp, **s})

    # ── trustworthy ranking: pooled count ≥ MIN_TRADES, sorted by PF ──
    trusted = [r for r in rows if r["count"] >= MIN_TRADES]
    trusted.sort(key=lambda r: (r["pf"], r["total_r"]), reverse=True)

    print(f"  ── Top configs (pooled trades ≥ {MIN_TRADES}, ranked by profit factor) ──")
    print(f"  {'Gap%':>6} {'TgtR':>5} {'Exp':>4}  {'Trades':>6} {'Win%':>6} "
          f"{'PF':>5} {'AvgR':>6} {'TotalR':>8} {'Sharpe':>7}")
    print(f"  {'─' * 68}")
    for r in trusted[:15]:
        print(f"  {r['gap'] * 100:>5.2f}% {r['rr']:>5.1f} {r['exp']:>4}  "
              f"{r['count']:>6} {r['win_rate']:>5.1f}% {r['pf']:>5.2f} "
              f"{r['avg_r']:>6.3f} {r['total_r']:>8.1f} {r['sharpe']:>7.2f}")

    if not trusted:
        print("  (no config cleared the minimum trade count)")

    # ── current production config for reference ──
    cur = next((r for r in rows if r["gap"] == 0.0005 and r["rr"] == 2.0
                and r["exp"] == 24), None)
    if cur:
        print(f"\n  Current backtest config (gap 0.05%, target 2.0R, expiry 24):")
        print(f"  {cur['count']} trades  {cur['win_rate']}% win  "
              f"PF {cur['pf']}  totalR {cur['total_r']}  avgR {cur['avg_r']}")

    # ── full low-count tail (flagged) ──
    flagged = sorted((r for r in rows if r["count"] < MIN_TRADES),
                     key=lambda r: r["pf"], reverse=True)[:5]
    if flagged:
        print(f"\n  High-PF but LOW SAMPLE (< {MIN_TRADES} trades — do not trust):")
        for r in flagged:
            print(f"  {r['gap'] * 100:>5.2f}% {r['rr']:>5.1f} {r['exp']:>4}  "
                  f"{r['count']:>6} trades  {r['win_rate']:>5.1f}% win  PF {r['pf']:>5.2f}")

    print(f"\n{'─' * 72}")
    print("  Done. 'Best' = highest profit factor among configs with enough")
    print("  trades to be statistically meaningful. PF is on the index/ETF and")
    print("  excludes options spread, theta and brokerage — discount accordingly.\n")


if __name__ == "__main__":
    main()
