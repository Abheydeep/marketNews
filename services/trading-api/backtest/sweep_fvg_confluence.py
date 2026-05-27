"""
Liquidity Sweep × FVG Confluence
==================================
Standalone liquidity sweeps don't have edge (~30% win at 2:1R → FRAGILE).
But the *concept* — that price grabbed liquidity past a swing before pivoting —
might still earn its keep as a CONFLUENCE filter on top of the validated FVG
stack. The hypothesis: FVGs that form right after a same-direction sweep are
"the institutional kind" — those should win more often than random FVGs.

Base = validated FVG stack:
  gap 0.03% · expiry 12 · efficiency gate W=48 eff<0.20 · fill-dir confluence
  0.50 · target 2.0R
Sweep prerequisite: a same-direction liquidity sweep within the last M 5-min
bars before the FVG entry. Sweep = bar wicks past a confirmed swing
(fractal K=3, within 60 bars) and closes back inside.

Tested M ∈ {0 (no sweep req — baseline), 6, 12, 24, 48}.

Run from the repo root:
    python3 services/trading-api/backtest/sweep_fvg_confluence.py
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

# ── validated FVG config (locked) ───────────────────────────────────────────
GAP_PCT     = 0.0003
EXPIRY_BARS = 12
EFF_WINDOW  = 48
EFF_MAX     = 0.20
STOP_BUFFER = 0.001
TARGET_RR   = 2.0
WARMUP_BARS = 20

# ── sweep prerequisite ──────────────────────────────────────────────────────
SWING_K        = 3
SWING_LOOKBACK = 60
SWEEP_WINDOWS  = [0, 6, 12, 24, 48]   # M bars back to require same-dir sweep


def _close_pos(c: Candle) -> float:
    rng = c.high - c.low
    return (c.close - c.low) / rng if rng > 0 else 0.5


def _precompute_sweeps(candles: list[Candle]) -> list[str | None]:
    """Tag each bar as 'BUY' / 'SELL' / None based on whether it swept the most
    recent confirmed swing low/high (within SWING_LOOKBACK) and closed back inside."""
    n = len(candles)
    highs: list[int] = []
    lows: list[int] = []
    for i in range(SWING_K, n - SWING_K):
        window = candles[i - SWING_K:i + SWING_K + 1]
        if candles[i].high >= max(c.high for c in window):
            highs.append(i)
        if candles[i].low <= min(c.low for c in window):
            lows.append(i)

    out: list[str | None] = [None] * n
    for t in range(SWING_K + 1, n):
        bar = candles[t]
        recent_low = recent_high = None
        for s in reversed(lows):
            if s > t - SWING_K:
                continue
            if s < t - SWING_LOOKBACK:
                break
            recent_low = candles[s].low
            break
        for s in reversed(highs):
            if s > t - SWING_K:
                continue
            if s < t - SWING_LOOKBACK:
                break
            recent_high = candles[s].high
            break
        if recent_low is not None and bar.low < recent_low and bar.close > recent_low:
            out[t] = "BUY"
        elif recent_high is not None and bar.high > recent_high and bar.close < recent_high:
            out[t] = "SELL"
    return out


def run_fvg_with_sweep(candles: list[Candle], sweep_M: int) -> list[dict]:
    """Validated FVG stack + optional sweep prerequisite. sweep_M=0 skips it."""
    n = len(candles)
    third = n // 3
    eff = efficiency_series(candles, EFF_WINDOW)
    sweep = _precompute_sweeps(candles) if sweep_M > 0 else None

    trades: list[dict] = []
    used: set[int] = set()

    for i in range(WARMUP_BARS, n - HOLD_BARS):
        c0, c2 = candles[i - 2], candles[i]

        kind = proximal = distal = None
        if c0.high < c2.low and (c2.low - c0.high) / c2.low >= GAP_PCT:
            kind, proximal, distal = "bull", c2.low, c0.high
        elif c0.low > c2.high and (c0.low - c2.high) / c2.high >= GAP_PCT:
            kind, proximal, distal = "bear", c2.high, c0.low
        if kind is None:
            continue

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

        bar = candles[entry_idx]
        ist = bar.ts + IST
        hm, wday = ist.time(), ist.weekday()
        if hm < SESSION_START or hm >= SESSION_END:
            continue
        if wday == 3 and hm < EXPIRY_CUTOFF:
            continue

        e = eff[entry_idx]
        if e is not None and e >= EFF_MAX:
            continue

        direction = "BUY" if kind == "bull" else "SELL"

        # fill-direction confluence
        cp = _close_pos(bar)
        if direction == "BUY" and cp < 0.50:
            continue
        if direction == "SELL" and cp > 0.50:
            continue

        # sweep prerequisite — same-direction sweep within the last M bars
        if sweep is not None:
            start = max(0, entry_idx - sweep_M)
            if not any(sweep[k] == direction for k in range(start, entry_idx + 1)):
                continue

        used.add(entry_idx)

        entry = proximal
        if kind == "bull":
            stop = distal * (1 - STOP_BUFFER)
            risk = entry - stop
            target = entry + risk * TARGET_RR
        else:
            stop = distal * (1 + STOP_BUFFER)
            risk = stop - entry
            target = entry - risk * TARGET_RR
        if risk <= 0:
            continue

        outcome = simulate_exit(candles[entry_idx + 1:], direction, target, stop)
        trades.append({"outcome": outcome, "fold": min(entry_idx // third, 2)})

    return trades


def fold_report(trades: list[dict]) -> dict:
    out = {f"f{k}": sweep_stats([t for t in trades if t["fold"] == k], TARGET_RR)
           for k in range(3)}
    out["all"] = sweep_stats(trades, TARGET_RR)
    return out


def main() -> None:
    print("\n─── Liquidity Sweep × FVG Confluence ───")
    print(f"Base: validated FVG stack (gap 0.03% · expiry 12 · eff-gate W=48 "
          f"eff<0.20 · fill-dir 0.50 · target {TARGET_RR}R)\n")

    data: dict[str, list[Candle]] = {}
    for name, (price_sym, volume_sym) in SYMBOLS.items():
        data[name] = fetch_yahoo(price_sym, volume_sym)
        print(f"  {name:12s} {len(data[name]):5d} bars")

    print(f"\n{'═' * 82}")
    print("  SWEEP-PREREQUISITE WINDOW  (NIFTY + BANKNIFTY pooled)")
    print(f"{'═' * 82}")
    print(f"  {'Sweep M':<10} {'Fold1':>11} {'Fold2':>11} {'Fold3':>11} "
          f"{'All':>11} {'Win%':>6} {'MinPF':>8}")
    print(f"  {'─' * 78}")

    results: dict[int, dict] = {}
    for M in SWEEP_WINDOWS:
        pooled: list[dict] = []
        for candles in data.values():
            pooled.extend(run_fvg_with_sweep(candles, M))
        r = fold_report(pooled)
        results[M] = r
        f0, f1, f2, a = r["f0"], r["f1"], r["f2"], r["all"]
        worst = min(f0["pf"], f1["pf"], f2["pf"])
        label = "no sweep" if M == 0 else f"M={M}"
        print(f"  {label:<10}"
              f" {f0['pf']:>5.2f}/{f0['count']:<4}"
              f" {f1['pf']:>5.2f}/{f1['count']:<4}"
              f" {f2['pf']:>5.2f}/{f2['count']:<4}"
              f" {a['pf']:>5.2f}/{a['count']:<4}"
              f" {a['win_rate']:>5.1f}%"
              f" {worst:>8.2f}")

    print(f"\n{'─' * 82}")
    print("  Cells show PF/trade-count. A sweep prerequisite helps only if it")
    print("  lifts worst-fold PF and/or win% without collapsing the trade count.")
    print("  Robustness target: every fold PF ≥ 1.0 with ≥ ~80 pooled trades.\n")


if __name__ == "__main__":
    main()
