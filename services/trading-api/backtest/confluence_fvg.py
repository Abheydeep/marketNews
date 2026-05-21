"""
FVG + Order-Flow Confluence — re-validation
=============================================
Base = the validated config: FVG (gap 0.03%, expiry 12) + efficiency gate
(W=48, eff<0.20). It works (worst-fold PF 1.22) but runs ~30% win rate at a
3:1 target — long losing streaks.

This script adds an order-flow confluence requirement at the gap-fill bar and
checks whether it lifts the win rate while keeping all folds robust:

  none              — base config, no confluence
  fill-dir-0.50     — fill bar closes in the FVG direction (half of range)
  fill-dir-0.65     — fill bar closes strongly in the FVG direction
  fill-vol-1.5      — fill bar volume > 1.5× the 20-bar average
  fill-vol+dir      — volume > 1.5× AND a directional close
  recent-initiative — an initiative bar (vol > 2× avg, strong close) in the
                      FVG direction within the last 12 bars

Then it re-tests the best confluence mode at target 1.5R / 2.0R / 3.0R — a
higher win rate may make a gentler target the better choice.

Run from the repo root:
    python3 services/trading-api/backtest/confluence_fvg.py
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
from gate_fvg import efficiency_series

# ── fixed base config (validated) ───────────────────────────────────────────
GAP_PCT     = 0.0003
EXPIRY_BARS = 12
EFF_WINDOW  = 48
EFF_MAX     = 0.20
STOP_BUFFER = 0.001
WARMUP_BARS = 20

CONFLUENCE_MODES = [
    "none", "fill-dir-0.50", "fill-dir-0.65",
    "fill-vol-1.5", "fill-vol+dir", "recent-initiative",
]


def _precompute(candles: list[Candle]) -> tuple[list[float], list[float]]:
    """close-position (0=low,1=high) and 20-bar avg volume, per bar."""
    n = len(candles)
    cpos = []
    for c in candles:
        rng = c.high - c.low
        cpos.append((c.close - c.low) / rng if rng > 0 else 0.5)
    avg20 = [0.0] * n
    for i in range(n):
        vols = [candles[j].volume for j in range(max(0, i - 20), i)
                if candles[j].volume > 0]
        avg20[i] = sum(vols) / len(vols) if vols else 0.0
    return cpos, avg20


def run_fvg_confluence(candles: list[Candle], rr: float, mode: str) -> list[dict]:
    """FVG + efficiency gate + order-flow confluence. Trades tagged with fold."""
    n = len(candles)
    third = n // 3
    eff = efficiency_series(candles, EFF_WINDOW)
    cpos, avg20 = _precompute(candles)

    def confluence_ok(j: int, direction: str) -> bool:
        if mode == "none":
            return True
        cp = cpos[j]
        vr = candles[j].volume / avg20[j] if avg20[j] > 0 else 0.0
        if mode == "fill-dir-0.50":
            return cp >= 0.50 if direction == "BUY" else cp <= 0.50
        if mode == "fill-dir-0.65":
            return cp >= 0.65 if direction == "BUY" else cp <= 0.35
        if mode == "fill-vol-1.5":
            return vr >= 1.5
        if mode == "fill-vol+dir":
            if vr < 1.5:
                return False
            return cp >= 0.55 if direction == "BUY" else cp <= 0.45
        if mode == "recent-initiative":
            for k in range(max(0, j - 12), j + 1):
                vk = candles[k].volume / avg20[k] if avg20[k] > 0 else 0.0
                if vk >= 2.0:
                    if direction == "BUY" and cpos[k] >= 0.70:
                        return True
                    if direction == "SELL" and cpos[k] <= 0.30:
                        return True
            return False
        return True

    trades: list[dict] = []
    used: set[int] = set()

    for i in range(WARMUP_BARS, n - HOLD_BARS):
        c0, c2 = candles[i - 2], candles[i]

        fvg = None
        if c0.high < c2.low and (c2.low - c0.high) / c2.low >= GAP_PCT:
            fvg = ("bull", c2.low, c0.high)
        elif c0.low > c2.high and (c0.low - c2.high) / c2.high >= GAP_PCT:
            fvg = ("bear", c2.high, c0.low)
        if fvg is None:
            continue

        kind, proximal, distal = fvg

        entry_idx = None
        for j in range(i + 1, min(i + 1 + EXPIRY_BARS, n - HOLD_BARS)):
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

        e = eff[entry_idx]
        if e is not None and e >= EFF_MAX:
            continue

        direction = "BUY" if kind == "bull" else "SELL"
        if not confluence_ok(entry_idx, direction):
            continue

        used.add(entry_idx)

        if kind == "bull":
            entry  = proximal
            stop   = distal * (1 - STOP_BUFFER)
            risk   = entry - stop
            target = entry + risk * rr
        else:
            entry  = proximal
            stop   = distal * (1 + STOP_BUFFER)
            risk   = stop - entry
            target = entry - risk * rr
        if risk <= 0:
            continue

        outcome = simulate_exit(candles[entry_idx + 1:], direction, target, stop)
        trades.append({"outcome": outcome, "fold": min(entry_idx // third, 2)})

    return trades


def fold_report(trades: list[dict], rr: float) -> dict:
    out = {f"f{k}": sweep_stats([t for t in trades if t["fold"] == k], rr)
           for k in range(3)}
    out["all"] = sweep_stats(trades, rr)
    return out


def _row(name: str, r: dict) -> float:
    f0, f1, f2, a = r["f0"], r["f1"], r["f2"], r["all"]
    worst = min(f0["pf"], f1["pf"], f2["pf"])
    print(f"  {name:<20}"
          f" {f0['pf']:>5.2f}/{f0['count']:<4}"
          f" {f1['pf']:>5.2f}/{f1['count']:<4}"
          f" {f2['pf']:>5.2f}/{f2['count']:<4}"
          f" {a['pf']:>5.2f}/{a['count']:<4}"
          f" {a['win_rate']:>5.1f}%"
          f" {worst:>7.2f}")
    return worst


def main() -> None:
    print("\n─── FVG + Order-Flow Confluence — re-validation ───")
    print("Base: FVG gap 0.03% · expiry 12 · efficiency gate W=48 eff<0.20\n")

    data: dict[str, list[Candle]] = {}
    for name, (price_sym, volume_sym) in SYMBOLS.items():
        data[name] = fetch_yahoo(price_sym, volume_sym)
        print(f"  {name:12s} {len(data[name]):5d} bars")

    def evaluate(mode: str, rr: float) -> dict:
        pooled: list[dict] = []
        for candles in data.values():
            pooled.extend(run_fvg_confluence(candles, rr, mode))
        return fold_report(pooled, rr)

    # ── Part 1: confluence modes at target 3.0R ──
    print(f"\n{'═' * 82}")
    print("  CONFLUENCE MODES  (target 3.0R)")
    print(f"{'═' * 82}")
    print(f"  {'Mode':<20} {'Fold1':>10} {'Fold2':>10} {'Fold3':>10} "
          f"{'All':>10} {'Win%':>6} {'MinPF':>8}")
    print(f"  {'─' * 80}")

    results: dict[str, dict] = {}
    for mode in CONFLUENCE_MODES:
        r = evaluate(mode, 3.0)
        results[mode] = r
        _row(mode, r)

    # best mode = highest worst-fold PF among modes with a usable sample
    # (≥100 total trades ≈ ~1.7/day over 60 days)
    ranked = sorted(
        ((min(r["f0"]["pf"], r["f1"]["pf"], r["f2"]["pf"]), m, r)
         for m, r in results.items() if r["all"]["count"] >= 100),
        reverse=True,
    )
    best_mode = ranked[0][1] if ranked else "none"

    # ── Part 2: best mode across target multiples ──
    print(f"\n{'═' * 82}")
    print(f"  BEST MODE '{best_mode}'  across target multiples")
    print(f"{'═' * 82}")
    print(f"  {'Target':<20} {'Fold1':>10} {'Fold2':>10} {'Fold3':>10} "
          f"{'All':>10} {'Win%':>6} {'MinPF':>8}")
    print(f"  {'─' * 80}")
    for rr in (1.5, 2.0, 3.0):
        _row(f"{rr}R target", evaluate(best_mode, rr))

    print(f"\n{'─' * 82}")
    print("  Cells show PF/trade-count. ROBUST = every fold PF ≥ 1.0.")
    print("  Goal of confluence: lift win% so the streak risk of a 3:1 target eases.")
    print("  PF is still gross of options spread, theta and brokerage.\n")


if __name__ == "__main__":
    main()
