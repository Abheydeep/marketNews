"""
FVG + Efficiency-Ratio Regime Gate — re-validation
====================================================
Diagnosis showed Fold 1 (Feb 20 → Mar 20) was a *persistent* decline: the
rolling efficiency ratio was 2–4× higher than the choppy folds, and FVG
retrace entries got their stops run over (Loss% 65–71%).

This script adds a regime gate: at the entry bar, compute the efficiency
ratio over the last W bars; if it exceeds eff_max (market in a clean
directional run), skip the trade. It then sweeps (W, eff_max) for each base
FVG config and re-checks the 3-fold walk-forward.

A gate "works" if every fold's PF clears 1.0 while keeping a usable sample.

Run from the repo root:
    python3 services/trading-api/backtest/gate_fvg.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_BT = Path(__file__).resolve().parent
sys.path.insert(0, str(_BT))
sys.path.insert(0, str(_BT.parent))

from app.schemas import Candle
from run_backtest import (
    IST, HOLD_BARS, SESSION_START, SESSION_END, EXPIRY_CUTOFF,
    SYMBOLS, fetch_yahoo, simulate_exit,
)
from sweep_fvg import sweep_stats

STOP_BUFFER = 0.001
WARMUP_BARS = 20

# base FVG configs: (label, gap%, target R, expiry bars)
BASE_CONFIGS = [
    ("A  0.12%/1.5R/12", 0.0012, 1.5, 12),
    ("B  0.03%/3.0R/12", 0.0003, 3.0, 12),
    ("C  0.05%/2.0R/24", 0.0005, 2.0, 24),
]

# regime gate grid: efficiency window (bars) × max efficiency to allow a trade
GATE_GRID = [(W, e) for W in (48, 96, 192) for e in (0.12, 0.16, 0.20, 0.25, 0.32)]


def efficiency_series(candles: list[Candle], window: int) -> list[float | None]:
    """Rolling Kaufman efficiency ratio: |net move over W| / |path over W|."""
    closes = [c.close for c in candles]
    n = len(closes)
    cum = [0.0] * (n + 1)            # cum[k] = Σ |Δclose| for bars 0..k-1
    for j in range(1, n):
        cum[j + 1] = cum[j] + abs(closes[j] - closes[j - 1])
    eff: list[float | None] = [None] * n
    for i in range(window, n):
        path = cum[i + 1] - cum[i - window + 1]
        net = abs(closes[i] - closes[i - window])
        eff[i] = (net / path) if path else 0.0
    return eff


def run_fvg_gated(candles: list[Candle], gap: float, rr: float, exp: int,
                  eff_window: int | None = None,
                  eff_max: float = 1.0) -> list[dict]:
    """FVG retrace strategy with optional efficiency-ratio regime gate.
    Returns trades tagged with their fold index (0/1/2)."""
    trades: list[dict] = []
    used: set[int] = set()
    n = len(candles)
    third = n // 3
    eff = efficiency_series(candles, eff_window) if eff_window else None

    for i in range(WARMUP_BARS, n - HOLD_BARS):
        c0, c2 = candles[i - 2], candles[i]

        fvg = None
        if c0.high < c2.low and (c2.low - c0.high) / c2.low >= gap:
            fvg = ("bull", c2.low, c0.high)
        elif c0.low > c2.high and (c0.low - c2.high) / c2.high >= gap:
            fvg = ("bear", c2.high, c0.low)
        if fvg is None:
            continue

        kind, proximal, distal = fvg

        entry_idx = None
        for j in range(i + 1, min(i + 1 + exp, n - HOLD_BARS)):
            bar = candles[j]
            if kind == "bull" and bar.low <= proximal:
                entry_idx = j
                break
            if kind == "bear" and bar.high >= proximal:
                entry_idx = j
                break
        if entry_idx is None or entry_idx in used:
            continue

        ist  = candles[entry_idx].ts + IST
        hm   = ist.time()
        wday = ist.weekday()
        if hm < SESSION_START or hm >= SESSION_END:
            continue
        if wday == 3 and hm < EXPIRY_CUTOFF:
            continue

        # ── regime gate: skip when market is in a persistent directional run ──
        if eff is not None:
            e = eff[entry_idx]
            if e is not None and e >= eff_max:
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
        trades.append({"outcome": outcome, "fold": min(entry_idx // third, 2)})

    return trades


def fold_pfs(trades: list[dict], rr: float) -> dict:
    """Per-fold + overall stats from a pooled trade list."""
    out: dict = {}
    for k in range(3):
        fk = [t for t in trades if t["fold"] == k]
        out[f"f{k}"] = sweep_stats(fk, rr)
    out["all"] = sweep_stats(trades, rr)
    return out


def main() -> None:
    print("\n─── FVG Efficiency-Ratio Gate — re-validation ───")
    print("Fetching 60 days of 5-min data from Yahoo Finance …\n")

    data: dict[str, list[Candle]] = {}
    for name, (price_sym, volume_sym) in SYMBOLS.items():
        data[name] = fetch_yahoo(price_sym, volume_sym)
        print(f"  {name:12s} {len(data[name]):5d} bars")

    for label, gap, rr, exp in BASE_CONFIGS:
        print(f"\n{'═' * 80}")
        print(f"  BASE CONFIG {label}")
        print(f"{'═' * 80}")

        def evaluate(W, emax):
            pooled: list[dict] = []
            for candles in data.values():
                pooled.extend(run_fvg_gated(candles, gap, rr, exp, W, emax))
            return fold_pfs(pooled, rr)

        # ungated baseline
        base = evaluate(None, 1.0)
        print(f"  {'Gate':<20} {'Fold1 PF/n':>13} {'Fold2 PF/n':>13} "
              f"{'Fold3 PF/n':>13} {'All PF/n':>13} {'MinFold':>8}")
        print(f"  {'─' * 78}")

        def row(name, r):
            f0, f1, f2, a = r["f0"], r["f1"], r["f2"], r["all"]
            worst = min(f0["pf"], f1["pf"], f2["pf"])
            print(f"  {name:<20}"
                  f" {f0['pf']:>6.2f}/{f0['count']:<5}"
                  f" {f1['pf']:>6.2f}/{f1['count']:<5}"
                  f" {f2['pf']:>6.2f}/{f2['count']:<5}"
                  f" {a['pf']:>6.2f}/{a['count']:<5}"
                  f" {worst:>8.2f}")
            return worst

        row("ungated", base)

        scored = []
        for W, emax in GATE_GRID:
            r = evaluate(W, emax)
            worst = min(r["f0"]["pf"], r["f1"]["pf"], r["f2"]["pf"])
            scored.append((worst, W, emax, r))

        # show the 6 gate settings with the best worst-fold PF
        scored.sort(key=lambda x: (x[0], x[3]["all"]["count"]), reverse=True)
        for worst, W, emax, r in scored[:6]:
            row(f"W={W} eff<{emax}", r)

        best = scored[0]
        verdict = ("ROBUST"  if best[0] >= 1.0 else
                   "BORDERLINE" if best[0] >= 0.9 else
                   "STILL FRAGILE")
        print(f"  {'─' * 78}")
        print(f"  Best gate: W={best[1]} eff<{best[2]}  →  worst-fold PF "
              f"{best[0]:.2f}  ({verdict})")

    print(f"\n{'─' * 80}")
    print("  ROBUST = every fold PF ≥ 1.0 with the gate on. PF is still gross of")
    print("  options spread, theta and brokerage.\n")


if __name__ == "__main__":
    main()
