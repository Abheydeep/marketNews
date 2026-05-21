"""
Fair Value Gap — paper / observe-only strategy
================================================
Live implementation of the strategy validated in services/trading-api/backtest/
(see run_fvg_backtest.py → sweep_fvg.py → gate_fvg.py → confluence_fvg.py).

It generates PAPER trading signals from 5-minute index candles and records
them for live-market validation. It NEVER places, proposes, or confirms an
order — there is deliberately no code path from an FVGObservation to the
broker. To trade it for real, a human must explicitly route these signals
into the order path.

Validated config (60-day backtest, NIFTY + BANKNIFTY pooled, 3-fold
walk-forward — every fold PF ≥ 1.0):
  • FVG gap            ≥ 0.03% of price
  • retrace fill       within 12 bars of gap formation
  • efficiency gate    skip when 48-bar Kaufman efficiency ratio ≥ 0.20
  • fill confluence    the gap-fill bar must close in the trade direction
  • stop / target      0.1% beyond the gap's far edge / 2.0R
  • session filters    09:45–15:00 IST, Thursday pre-11:00 cutoff
Result: ~58% win, profit factor ~2.86 — GROSS of options spread/theta/cost.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.schemas import Candle, IndexSymbol, TradingSignal

# ── validated config ────────────────────────────────────────────────────────
_GAP_PCT      = 0.0003   # FVG gap must be ≥ 0.03% of price
_EXPIRY_BARS  = 12       # gap must be filled within 12 five-minute bars
_EFF_WINDOW   = 48       # efficiency-ratio lookback (bars)
_EFF_MAX      = 0.20     # skip entries when efficiency ≥ this (persistent trend)
_STOP_BUFFER  = 0.001    # stop 0.1% beyond the gap's far edge
_TARGET_RR    = 2.0      # target = entry ± 2.0 × risk
_MIN_BARS     = _EFF_WINDOW + _EXPIRY_BARS + 3

_IST           = timedelta(hours=5, minutes=30)
_SESSION_START = (9, 45)
_SESSION_END   = (15, 0)
_EXPIRY_CUTOFF = (11, 0)


def _close_pos(candle: Candle) -> float:
    """Where the close sits in the bar's range: 0.0 = at low, 1.0 = at high."""
    rng = candle.high - candle.low
    return (candle.close - candle.low) / rng if rng > 0 else 0.5


def _efficiency(candles: list[Candle], end: int, window: int) -> float | None:
    """Kaufman efficiency ratio over `window` bars ending at index `end`."""
    if end - window < 0:
        return None
    net = abs(candles[end].close - candles[end - window].close)
    path = sum(abs(candles[j].close - candles[j - 1].close)
               for j in range(end - window + 1, end + 1))
    return (net / path) if path else 0.0


class FVGPaperStrategy:
    """Observe-only Fair Value Gap strategy. Emits paper signals, never orders."""

    def evaluate(
        self,
        index: IndexSymbol,
        candles: list[Candle],
        now: datetime,
        *,
        is_expiry_day: bool = False,
    ) -> TradingSignal:
        """Return a paper TradingSignal for the latest 5-minute bar.

        `candles` must be 5-minute index candles, oldest first. The action is
        BUY / SELL only when the latest bar is a fresh FVG fill that clears the
        regime gate and the fill-direction confluence; otherwise WAIT.
        """
        def wait(reason: str, ts: datetime | None = None) -> TradingSignal:
            return TradingSignal(
                index=index, action="WAIT", confidence=0.0,
                reasons=[reason], generated_at=ts or now,
            )

        n = len(candles)
        if n < _MIN_BARS:
            return wait(f"FVG paper: warming up ({n}/{_MIN_BARS} 5-min bars)")

        last = n - 1
        latest = candles[last]
        bar_ts = latest.ts if latest.ts.tzinfo else latest.ts.replace(tzinfo=timezone.utc)

        # scan the most-recently-formed FVGs first; the latest bar must be the
        # FIRST bar to fill the gap (matches the backtest's entry semantics)
        for i in range(last - 1, last - _EXPIRY_BARS - 1, -1):
            if i < 2:
                break
            c0, c2 = candles[i - 2], candles[i]

            kind = proximal = distal = None
            if c0.high < c2.low and (c2.low - c0.high) / c2.low >= _GAP_PCT:
                kind, proximal, distal = "bull", c2.low, c0.high
            elif c0.low > c2.high and (c0.low - c2.high) / c2.high >= _GAP_PCT:
                kind, proximal, distal = "bear", c2.high, c0.low
            if kind is None:
                continue

            if kind == "bull":
                if latest.low > proximal:
                    continue   # latest bar did not reach into the gap
                if any(candles[j].low <= proximal for j in range(i + 1, last)):
                    continue   # an earlier bar already filled it
            else:
                if latest.high < proximal:
                    continue
                if any(candles[j].high >= proximal for j in range(i + 1, last)):
                    continue

            return self._entry_or_wait(
                index, kind, proximal, distal, candles, last, bar_ts,
                is_expiry_day, wait,
            )

        return wait("FVG paper: no fresh gap-fill on the latest 5-min bar", bar_ts)

    def _entry_or_wait(
        self, index, kind, proximal, distal, candles, last, bar_ts,
        is_expiry_day, wait,
    ) -> TradingSignal:
        latest = candles[last]
        direction = "BUY" if kind == "bull" else "SELL"
        ist = bar_ts.astimezone(timezone.utc) + _IST
        hm = (ist.hour, ist.minute)

        # ── session window ──
        if hm < _SESSION_START or hm >= _SESSION_END:
            return wait(f"FVG paper: {direction} gap filled but outside the "
                        f"09:45–15:00 IST session window", bar_ts)
        # ── expiry-day gamma cutoff ──
        if is_expiry_day and hm < _EXPIRY_CUTOFF:
            return wait(f"FVG paper: {direction} gap filled but inside the "
                        f"expiry-day pre-11:00 IST cutoff", bar_ts)
        # ── efficiency regime gate ──
        eff = _efficiency(candles, last, _EFF_WINDOW)
        if eff is not None and eff >= _EFF_MAX:
            return wait(f"FVG paper: {direction} gap filled but the regime gate "
                        f"blocked it (48-bar efficiency {eff:.2f} ≥ {_EFF_MAX} — "
                        f"market in a persistent trend)", bar_ts)
        # ── fill-direction confluence ──
        cp = _close_pos(latest)
        if direction == "BUY" and cp < 0.50:
            return wait(f"FVG paper: bullish gap filled but the fill bar closed "
                        f"weak (close-position {cp:.2f} < 0.50)", bar_ts)
        if direction == "SELL" and cp > 0.50:
            return wait(f"FVG paper: bearish gap filled but the fill bar closed "
                        f"strong (close-position {cp:.2f} > 0.50)", bar_ts)

        entry = proximal
        if kind == "bull":
            stop = distal * (1 - _STOP_BUFFER)
            risk = entry - stop
            target = entry + risk * _TARGET_RR
        else:
            stop = distal * (1 + _STOP_BUFFER)
            risk = stop - entry
            target = entry - risk * _TARGET_RR
        if risk <= 0:
            return wait(f"FVG paper: {direction} gap filled but the risk "
                        f"geometry is invalid", bar_ts)

        eff_text = f"{eff:.2f}" if eff is not None else "n/a"
        return TradingSignal(
            index=index,
            action=direction,
            entry_price=round(entry, 2),
            target_price=round(target, 2),
            stop_loss=round(stop, 2),
            confidence=70.0,
            reasons=[
                "PAPER / OBSERVE-ONLY — no order is placed or proposed.",
                f"FVG {direction}: price retraced into a {kind} fair-value gap "
                f"and the fill bar closed in-direction (close-position {cp:.2f}).",
                f"Regime gate passed (48-bar efficiency {eff_text} < {_EFF_MAX}).",
                f"Entry {entry:.2f} · stop {stop:.2f} · target {target:.2f} "
                f"({_TARGET_RR:.1f}R).",
            ],
            generated_at=bar_ts,
        )
