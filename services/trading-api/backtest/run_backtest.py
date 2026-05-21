"""
Nifty / Bank Nifty — KDE Zone Strategy Backtest
================================================
Fetches 60 days of 5-min OHLCV from Yahoo Finance.
Replays the production signal logic across the full window,
with and without each filter gate, then prints a comparison table.

Run from the repo root:
    python3 services/trading-api/backtest/run_backtest.py
"""

from __future__ import annotations

import json
import sys
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, date, time, timedelta, timezone
from pathlib import Path
from statistics import mean, stdev

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.domain.technical import TechnicalAnalysisEngine
from app.schemas import Candle, PriceZone

# ── constants ──────────────────────────────────────────────────────────────
IST = timedelta(hours=5, minutes=30)
RISK_REWARD       = 2.0     # target = entry ± 2R
STOP_PCT_SUPPORT  = 0.002   # stop 0.2% below zone lower
STOP_PCT_RESIST   = 0.002   # stop 0.2% above zone upper
ZONE_PROXIMITY    = 0.005   # within 0.5% of zone centre
WARMUP_BARS       = 120     # bars needed before first signal
HOLD_BARS         = 48      # max bars to hold (48 × 5m = 4 hours)
VOLUME_MULT       = 1.5
SESSION_START     = time(9, 45)
SESSION_END       = time(15, 0)
EXPIRY_CUTOFF     = time(11, 0)

# Index prices (no volume) + ETF volume proxies
SYMBOLS = {
    "NIFTY":     ("^NSEI",    "NIFTYBEES.NS"),
    "BANKNIFTY": ("^NSEBANK", "BANKBEES.NS"),
}

engine = TechnicalAnalysisEngine()


# ── data fetch ─────────────────────────────────────────────────────────────

def fetch_yahoo_raw(symbol: str, interval: str = "5m", period: str = "60d") -> dict[datetime, dict]:
    """Returns {ts: {open,high,low,close,volume}} keyed by UTC timestamp."""
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{urllib.parse.quote(symbol)}"
        f"?range={period}&interval={interval}"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        payload = json.loads(resp.read())
    result = payload["chart"]["result"][0]
    timestamps = result["timestamp"]
    q = result["indicators"]["quote"][0]
    rows: dict[datetime, dict] = {}
    for i, ts in enumerate(timestamps):
        o  = q.get("open",   [None])[i] if i < len(q.get("open",   [])) else None
        h  = q.get("high",   [None])[i] if i < len(q.get("high",   [])) else None
        lo = q.get("low",    [None])[i] if i < len(q.get("low",    [])) else None
        c  = q.get("close",  [None])[i] if i < len(q.get("close",  [])) else None
        v  = q.get("volume", [None])[i] if i < len(q.get("volume", [])) else None
        if None in (o, h, lo, c):
            continue
        dt = datetime.fromtimestamp(ts, tz=timezone.utc)
        rows[dt] = {"open": float(o), "high": float(h), "low": float(lo),
                    "close": float(c), "volume": float(v or 0)}
    return rows


def fetch_yahoo(price_symbol: str, volume_symbol: str | None = None,
                interval: str = "5m", period: str = "60d") -> list[Candle]:
    """
    Fetch OHLC from price_symbol (e.g. ^NSEI) and volume from volume_symbol
    (e.g. NIFTYBEES.NS). NSE indices report zero volume so we proxy it from
    the corresponding ETF, aligning bars by UTC timestamp.
    """
    price_rows  = fetch_yahoo_raw(price_symbol,  interval, period)
    volume_rows = fetch_yahoo_raw(volume_symbol, interval, period) if volume_symbol else {}

    candles: list[Candle] = []
    for ts, row in sorted(price_rows.items()):
        vol = volume_rows.get(ts, {}).get("volume", 0.0) if volume_rows else row["volume"]
        try:
            candles.append(Candle(
                ts=ts,
                open=row["open"], high=row["high"], low=row["low"],
                close=row["close"], volume=float(vol or 0),
            ))
        except Exception:
            continue
    return candles


# ── helpers ────────────────────────────────────────────────────────────────

def nearest_zone(price: float, zones: list[PriceZone], kind: str) -> PriceZone | None:
    typed = [z for z in zones if z.kind == kind]
    if not typed:
        return None
    return min(typed, key=lambda z: abs(z.center - price))


def near(price: float, zone: PriceZone) -> bool:
    if zone.lower <= price <= zone.upper:
        return True
    return abs(price - zone.center) / price <= ZONE_PROXIMITY


def simulate_exit(
    future_bars: list[Candle],
    direction: str,
    target: float,
    stop: float,
) -> str:
    """Walk forward bars; return 'WIN', 'LOSS', or 'TIMEOUT'."""
    for bar in future_bars[:HOLD_BARS]:
        if direction == "BUY":
            if bar.low <= stop:
                return "LOSS"
            if bar.high >= target:
                return "WIN"
        else:
            if bar.high >= stop:
                return "LOSS"
            if bar.low <= target:
                return "WIN"
    return "TIMEOUT"


def avg_volume(candles: list[Candle], n: int = 20) -> float:
    recent = [c.volume for c in candles[-n:] if c.volume > 0]
    return mean(recent) if recent else 0.0


# ── backtest engine ────────────────────────────────────────────────────────

def run(candles: list[Candle], filters: dict[str, bool]) -> list[dict]:
    """
    filters keys:
      time_of_day   — block 9:15–9:45 and 3:00+ IST
      expiry        — block Thursday pre-11 AM IST
      volume        — require bar volume > 1.5× 20-bar avg
    """
    trades: list[dict] = []
    seen_bars: set[datetime] = set()   # one trade per bar max

    for i in range(WARMUP_BARS, len(candles) - HOLD_BARS):
        bar  = candles[i]
        ist  = bar.ts + IST
        hm   = ist.time()
        wday = ist.weekday()   # 0=Mon … 3=Thu … 6=Sun

        # ── time-of-day filter ──
        if filters.get("time_of_day"):
            if hm < SESSION_START or hm >= SESSION_END:
                continue

        # ── expiry filter ──
        if filters.get("expiry") and wday == 3:
            if hm < EXPIRY_CUTOFF:
                continue

        # ── volume filter ──
        lookback = candles[max(0, i - 120): i]
        avg_vol  = avg_volume(lookback)
        if filters.get("volume"):
            if avg_vol > 0 and bar.volume < VOLUME_MULT * avg_vol:
                continue

        # build KDE zones from 120-bar rolling window
        try:
            technical = engine.analyze(lookback)
        except ValueError:
            continue

        if not technical.kde_zones:
            continue

        price      = bar.close
        support    = nearest_zone(price, technical.kde_zones, "support")
        resistance = nearest_zone(price, technical.kde_zones, "resistance")

        near_sup = support    is not None and near(price, support)
        near_res = resistance is not None and near(price, resistance)

        if not (near_sup or near_res):
            continue

        # avoid duplicate signals on the same bar (e.g. near both)
        if bar.ts in seen_bars:
            continue
        seen_bars.add(bar.ts)

        direction = "BUY" if near_sup else "SELL"
        zone      = support if near_sup else resistance

        if direction == "BUY":
            stop   = zone.lower * (1 - STOP_PCT_SUPPORT)
            risk   = price - stop
            target = price + risk * RISK_REWARD
        else:
            stop   = zone.upper * (1 + STOP_PCT_RESIST)
            risk   = stop - price
            target = price - risk * RISK_REWARD

        if risk <= 0:
            continue

        outcome = simulate_exit(candles[i + 1:], direction, target, stop)

        trades.append({
            "ts":        ist.isoformat(),
            "weekday":   ist.strftime("%A"),
            "hour":      ist.hour,
            "direction": direction,
            "entry":     round(price, 2),
            "target":    round(target, 2),
            "stop":      round(stop, 2),
            "risk_pts":  round(risk, 2),
            "outcome":   outcome,
        })

    return trades


# ── stats ──────────────────────────────────────────────────────────────────

def stats(trades: list[dict]) -> dict:
    if not trades:
        return {"count": 0, "wins": 0, "losses": 0, "timeouts": 0,
                "win_rate": 0.0, "profit_factor": 0.0, "total_r": 0.0,
                "avg_r": 0.0, "sharpe_approx": 0.0}

    wins     = [t for t in trades if t["outcome"] == "WIN"]
    losses   = [t for t in trades if t["outcome"] == "LOSS"]
    timeouts = [t for t in trades if t["outcome"] == "TIMEOUT"]

    win_rate = len(wins) / len(trades) * 100

    # each WIN = +RISK_REWARD R, each LOSS = -1 R, TIMEOUT = -0.5 R (held 4h, partial)
    r_series = (
        [RISK_REWARD] * len(wins) +
        [-1.0]        * len(losses) +
        [-0.5]        * len(timeouts)
    )
    total_r    = sum(r_series)
    gross_win  = RISK_REWARD * len(wins)
    gross_loss = len(losses) + 0.5 * len(timeouts)
    profit_factor = gross_win / gross_loss if gross_loss else float("inf")

    avg_r = mean(r_series)
    sd    = stdev(r_series) if len(r_series) > 1 else 1
    sharpe = (avg_r / sd) * (252 ** 0.5) if sd else 0   # annualised approx

    return {
        "count":          len(trades),
        "wins":           len(wins),
        "losses":         len(losses),
        "timeouts":       len(timeouts),
        "win_rate":       round(win_rate, 1),
        "profit_factor":  round(profit_factor, 2),
        "total_r":        round(total_r, 2),
        "avg_r":          round(avg_r, 3),
        "sharpe_approx":  round(sharpe, 2),
    }


def by_weekday(trades: list[dict]) -> dict[str, dict]:
    grouped: dict[str, list] = defaultdict(list)
    for t in trades:
        grouped[t["weekday"]].append(t)
    return {day: stats(ts) for day, ts in sorted(grouped.items())}


def by_hour(trades: list[dict]) -> dict[int, dict]:
    grouped: dict[int, list] = defaultdict(list)
    for t in trades:
        grouped[t["hour"]].append(t)
    return {h: stats(ts) for h, ts in sorted(grouped.items())}


# ── main ───────────────────────────────────────────────────────────────────

FILTER_CONFIGS = {
    "baseline    (no filters)": {"time_of_day": False, "expiry": False, "volume": False},
    "+ time-of-day filter":     {"time_of_day": True,  "expiry": False, "volume": False},
    "+ expiry filter":          {"time_of_day": True,  "expiry": True,  "volume": False},
    "+ volume filter (all 3)":  {"time_of_day": True,  "expiry": True,  "volume": True},
}


def main() -> None:
    print("\n─── Nifty / Bank Nifty KDE Zone Strategy Backtest ───")
    print("Fetching 60 days of 5-min data from Yahoo Finance …\n")

    all_candles: dict[str, list[Candle]] = {}
    for name, (price_sym, volume_sym) in SYMBOLS.items():
        try:
            candles = fetch_yahoo(price_sym, volume_sym)
            all_candles[name] = candles
            non_zero = sum(1 for c in candles if c.volume > 0)
            print(f"  {name:12s} {len(candles):5d} bars  "
                  f"({candles[0].ts.date()} → {candles[-1].ts.date()})  "
                  f"vol>0: {non_zero}")
        except Exception as exc:
            print(f"  {name}: FETCH FAILED — {exc}")

    print()

    # ── per-symbol results ──────────────────────────────────────────────────
    for index_name, candles in all_candles.items():
        print(f"\n{'═' * 70}")
        print(f"  {index_name}")
        print(f"{'═' * 70}")
        print(f"  {'Scenario':<32} {'Trades':>6} {'Win%':>6} {'PF':>5} {'AvgR':>6} {'TotalR':>8} {'Sharpe':>7}")
        print(f"  {'─' * 65}")

        all_trades_for_scenario: dict[str, list[dict]] = {}
        for label, filters in FILTER_CONFIGS.items():
            trades = run(candles, filters)
            s = stats(trades)
            all_trades_for_scenario[label] = trades
            print(
                f"  {label:<32} {s['count']:>6} {s['win_rate']:>5.1f}%"
                f" {s['profit_factor']:>5.2f} {s['avg_r']:>6.3f}"
                f" {s['total_r']:>8.1f} {s['sharpe_approx']:>7.2f}"
            )

        # ── hour breakdown for fully-filtered scenario ──────────────────────
        full_trades = all_trades_for_scenario["+ volume filter (all 3)"]
        if full_trades:
            print(f"\n  Hour breakdown (all filters, {index_name}):")
            print(f"  {'Hour (IST)':>12}  {'Trades':>6}  {'Win%':>6}  {'PF':>5}")
            for hour, s in by_hour(full_trades).items():
                bar = "█" * int(s["win_rate"] / 5)
                print(f"  {hour:>10}:00  {s['count']:>6}  {s['win_rate']:>5.1f}%  {s['profit_factor']:>5.2f}  {bar}")

        # ── weekday breakdown ────────────────────────────────────────────────
        print(f"\n  Weekday breakdown (all filters, {index_name}):")
        print(f"  {'Day':<12}  {'Trades':>6}  {'Win%':>6}  {'PF':>5}")
        for day, s in by_weekday(full_trades).items():
            print(f"  {day:<12}  {s['count']:>6}  {s['win_rate']:>5.1f}%  {s['profit_factor']:>5.2f}")

    print(f"\n{'─' * 70}")
    print("  Done.")
    print(f"  Note: option chain (OI/PCR) not replayed — only KDE zone + filters.")
    print(f"  Production signals also require OI Long/Short Build-up + PCR gate,")
    print(f"  which would further reduce trade count and improve win rate.\n")


if __name__ == "__main__":
    main()
