"""
FVG Robustness / Walk-Forward Validation
=========================================
The sweep ranked configs on the full 60-day window with both indices pooled.
A config that only wins there may be curve-fit. This script stress-tests the
sweep winners by checking each one across:

  • 3 contiguous time folds (~20 days each) — does the edge survive in time?
  • NIFTY and BANKNIFTY separately            — does it survive per-instrument?

Verdict per config: ROBUST  = PF ≥ 1.0 in all 5 cells
                    MIXED   = PF ≥ 1.0 in 3–4 cells
                    FRAGILE = PF ≥ 1.0 in < 3 cells

Run from the repo root:
    python3 services/trading-api/backtest/validate_fvg.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_BT = Path(__file__).resolve().parent
sys.path.insert(0, str(_BT))
sys.path.insert(0, str(_BT.parent))

from app.schemas import Candle
from run_backtest import SYMBOLS, fetch_yahoo
from sweep_fvg import run_fvg, sweep_stats

# ── candidate configs to validate: (label, gap%, target R, expiry bars) ──
CANDIDATES = [
    ("A  best-PF      ", 0.0012, 1.5, 12),
    ("B  big-sample   ", 0.0003, 3.0, 12),
    ("C  current      ", 0.0005, 2.0, 24),
    ("D  mid-ground   ", 0.0005, 3.0, 12),
]


def evaluate(candles: list[Candle], gap: float, rr: float, exp: int) -> dict:
    return sweep_stats(run_fvg(candles, gap, rr, exp), rr)


def evaluate_pooled(chunks: list[list[Candle]], gap: float, rr: float,
                    exp: int) -> dict:
    """Run each instrument's candle series separately, then pool the trades.
    (Never concatenate different instruments into one series — the FVG
    detector would compare NIFTY prices against BANKNIFTY prices.)"""
    trades: list[dict] = []
    for series in chunks:
        trades.extend(run_fvg(series, gap, rr, exp))
    return sweep_stats(trades, rr)


def main() -> None:
    print("\n─── FVG Robustness / Walk-Forward Validation ───")
    print("Fetching 60 days of 5-min data from Yahoo Finance …\n")

    data: dict[str, list[Candle]] = {}
    for name, (price_sym, volume_sym) in SYMBOLS.items():
        data[name] = fetch_yahoo(price_sym, volume_sym)
        print(f"  {name:12s} {len(data[name]):5d} bars  "
              f"({data[name][0].ts.date()} → {data[name][-1].ts.date()})")

    # ── carve 3 contiguous time folds per index (kept separate per index) ──
    index_chunks: dict[str, list[list[Candle]]] = {}
    for name, candles in data.items():
        third = len(candles) // 3
        index_chunks[name] = [candles[:third],
                              candles[third:2 * third],
                              candles[2 * third:]]
    # fold k = [NIFTY chunk k, BANKNIFTY chunk k] — pooled at the trade level
    folds: list[list[list[Candle]]] = [
        [index_chunks[name][k] for name in data] for k in range(3)
    ]
    fold_spans: list[tuple] = [
        (folds[k][0][0].ts.date(), folds[k][0][-1].ts.date()) for k in range(3)
    ]

    print(f"\n  Fold 1: {fold_spans[0][0]} → {fold_spans[0][1]}")
    print(f"  Fold 2: {fold_spans[1][0]} → {fold_spans[1][1]}")
    print(f"  Fold 3: {fold_spans[2][0]} → {fold_spans[2][1]}")

    for label, gap, rr, exp in CANDIDATES:
        print(f"\n{'═' * 72}")
        print(f"  Config {label.strip()}  —  gap {gap * 100:.2f}% · target {rr}R · expiry {exp}")
        print(f"{'═' * 72}")
        print(f"  {'Slice':<22} {'Trades':>6} {'Win%':>6} {'PF':>6} {'AvgR':>6} {'TotalR':>8}")
        print(f"  {'─' * 58}")

        cells_pf: list[float] = []

        for k in range(3):
            s = evaluate_pooled(folds[k], gap, rr, exp)
            cells_pf.append(s["pf"])
            span = f"Fold {k + 1} ({fold_spans[k][0].strftime('%m-%d')}→{fold_spans[k][1].strftime('%m-%d')})"
            print(f"  {span:<22} {s['count']:>6} {s['win_rate']:>5.1f}% "
                  f"{s['pf']:>6.2f} {s['avg_r']:>6.3f} {s['total_r']:>8.1f}")

        for name, candles in data.items():
            s = evaluate(candles, gap, rr, exp)
            cells_pf.append(s["pf"])
            print(f"  {name + ' (full)':<22} {s['count']:>6} {s['win_rate']:>5.1f}% "
                  f"{s['pf']:>6.2f} {s['avg_r']:>6.3f} {s['total_r']:>8.1f}")

        winning = sum(1 for pf in cells_pf if pf >= 1.0)
        verdict = ("ROBUST"  if winning == 5 else
                   "MIXED"   if winning >= 3 else
                   "FRAGILE")
        worst = min(cells_pf)
        print(f"  {'─' * 58}")
        print(f"  VERDICT: {verdict}  ({winning}/5 slices PF ≥ 1.0,  worst PF {worst:.2f})")

    print(f"\n{'─' * 72}")
    print("  Done. A config is only worth trading live if it is ROBUST here —")
    print("  consistent across separate time windows AND both indices. PF is")
    print("  still gross of options spread, theta and brokerage.\n")


if __name__ == "__main__":
    main()
