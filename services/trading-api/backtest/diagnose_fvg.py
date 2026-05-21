"""
Fold-1 Regime Diagnosis — why did every FVG config lose Feb 20 → Mar 20?
=========================================================================
Walk-forward validation showed every FVG config loses money in Fold 1 and
profits in Folds 2 & 3. Same failure regardless of parameters → it's a market
REGIME problem, not overfitting. This script characterises each fold so the
regime gate can be targeted rather than guessed.

Per fold / per index it reports:
  • net return, efficiency ratio  — trending vs choppy
  • avg bar range, return stdev   — volatility level
  • FVG outcome split (WIN/LOSS/TIMEOUT)
  • FVG win rate split by BUY (bullish gap) vs SELL (bearish gap)

Run from the repo root:
    python3 services/trading-api/backtest/diagnose_fvg.py
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

# diagnose with the "current" config — middle-of-road 2R target
GAP_PCT     = 0.0005
TARGET_RR   = 2.0
EXPIRY_BARS = 24
STOP_BUFFER = 0.001
WARMUP_BARS = 20


def run_fvg_detailed(candles: list[Candle]) -> list[dict]:
    """FVG retrace strategy returning {outcome, direction} per trade."""
    trades: list[dict] = []
    used: set[int] = set()
    n = len(candles)

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
        used.add(entry_idx)

        if kind == "bull":
            direction = "BUY"
            entry  = proximal
            stop   = distal * (1 - STOP_BUFFER)
            risk   = entry - stop
            target = entry + risk * TARGET_RR
        else:
            direction = "SELL"
            entry  = proximal
            stop   = distal * (1 + STOP_BUFFER)
            risk   = stop - entry
            target = entry - risk * TARGET_RR
        if risk <= 0:
            continue

        outcome = simulate_exit(candles[entry_idx + 1:], direction, target, stop)
        trades.append({"outcome": outcome, "direction": direction})

    return trades


def regime(candles: list[Candle]) -> dict:
    """Trend / volatility characterisation of a candle series."""
    closes = [c.close for c in candles]
    first, last = closes[0], closes[-1]
    ret_pct = (last - first) / first * 100

    abs_moves = sum(abs(closes[i] - closes[i - 1]) for i in range(1, len(closes)))
    efficiency = abs(last - first) / abs_moves if abs_moves else 0.0

    ranges = [(c.high - c.low) / c.close for c in candles if c.close > 0]
    avg_range_pct = mean(ranges) * 100 if ranges else 0.0

    rets = [(closes[i] - closes[i - 1]) / closes[i - 1]
            for i in range(1, len(closes)) if closes[i - 1] > 0]
    ret_std = stdev(rets) * 100 if len(rets) > 1 else 0.0

    up_bars = sum(1 for c in candles if c.close > c.open) / len(candles) * 100

    return {
        "ret_pct":     round(ret_pct, 2),
        "efficiency":  round(efficiency, 3),
        "avg_range":   round(avg_range_pct, 3),
        "ret_std":     round(ret_std, 3),
        "up_bars":     round(up_bars, 1),
    }


def fvg_breakdown(trades: list[dict]) -> dict:
    if not trades:
        return {"n": 0}
    n = len(trades)
    wins   = sum(1 for t in trades if t["outcome"] == "WIN")
    losses = sum(1 for t in trades if t["outcome"] == "LOSS")
    tmo    = sum(1 for t in trades if t["outcome"] == "TIMEOUT")
    buys   = [t for t in trades if t["direction"] == "BUY"]
    sells  = [t for t in trades if t["direction"] == "SELL"]
    buy_w  = sum(1 for t in buys if t["outcome"] == "WIN")
    sell_w = sum(1 for t in sells if t["outcome"] == "WIN")
    return {
        "n":        n,
        "win_pct":  round(wins / n * 100, 1),
        "loss_pct": round(losses / n * 100, 1),
        "tmo_pct":  round(tmo / n * 100, 1),
        "n_buy":    len(buys),
        "buy_win":  round(buy_w / len(buys) * 100, 1) if buys else 0.0,
        "n_sell":   len(sells),
        "sell_win": round(sell_w / len(sells) * 100, 1) if sells else 0.0,
    }


def main() -> None:
    print("\n─── FVG Fold-1 Regime Diagnosis ───")
    print(f"Config: gap {GAP_PCT*100:.2f}% · target {TARGET_RR}R · expiry {EXPIRY_BARS}\n")

    data: dict[str, list[Candle]] = {}
    for name, (price_sym, volume_sym) in SYMBOLS.items():
        data[name] = fetch_yahoo(price_sym, volume_sym)
        print(f"  {name:12s} {len(data[name]):5d} bars")

    for index_name, candles in data.items():
        third = len(candles) // 3
        chunks = [candles[:third], candles[third:2 * third], candles[2 * third:]]

        print(f"\n{'═' * 78}")
        print(f"  {index_name}")
        print(f"{'═' * 78}")
        print(f"  {'Fold':<22} {'Ret%':>7} {'Effic':>6} {'BarRng%':>8} "
              f"{'RetSD%':>7} {'Up%':>6}")
        print(f"  {'─' * 62}")
        for k, chunk in enumerate(chunks, 1):
            r = regime(chunk)
            span = f"Fold {k} ({chunk[0].ts.date().strftime('%m-%d')}→{chunk[-1].ts.date().strftime('%m-%d')})"
            print(f"  {span:<22} {r['ret_pct']:>7.2f} {r['efficiency']:>6.3f} "
                  f"{r['avg_range']:>8.3f} {r['ret_std']:>7.3f} {r['up_bars']:>6.1f}")

        print(f"\n  {'Fold':<22} {'Trades':>6} {'Win%':>6} {'Loss%':>6} {'Timeout%':>9} "
              f"{'BUY n/win':>12} {'SELL n/win':>13}")
        print(f"  {'─' * 74}")
        for k, chunk in enumerate(chunks, 1):
            b = fvg_breakdown(run_fvg_detailed(chunk))
            if b["n"] == 0:
                print(f"  Fold {k}: no trades")
                continue
            print(f"  {'Fold ' + str(k):<22} {b['n']:>6} {b['win_pct']:>5.1f}% "
                  f"{b['loss_pct']:>5.1f}% {b['tmo_pct']:>8.1f}% "
                  f"{b['n_buy']:>4}/{b['buy_win']:>5.1f}% "
                  f"{b['n_sell']:>5}/{b['sell_win']:>5.1f}%")

    print(f"\n{'─' * 78}")
    print("  Reading the table:")
    print("  • Efficiency ≈ |net move| / |total path|. >0.30 trending, <0.15 choppy.")
    print("  • If Fold 1 is trending one way and the LOSING side is the FVG that")
    print("    fights that trend → the gate is a trend filter.")
    print("  • High Loss% → stops run over (chop/trend-against).")
    print("  • High Timeout% → no follow-through (low volatility).\n")


if __name__ == "__main__":
    main()
