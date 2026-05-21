from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.domain.options import OI_LONG_BUILDUP, OI_SHORT_BUILDUP
from app.schemas import IndexSymbol, OptionChain, PriceZone, TechnicalSnapshot, TradingSignal

_IST = timedelta(hours=5, minutes=30)
_SESSION_START = (9, 45)   # 9:45 AM IST — skip opening noise
_SESSION_END   = (15, 0)   # 3:00 PM IST
_EXPIRY_CUTOFF = (11, 0)   # Thursday before 11 AM IST — near-expiry gamma noise
_VOLUME_MULT   = 1.5       # bar volume must exceed 1.5× 20-bar average


class SignalGenerator:
    def __init__(self, zone_proximity_percent: float = 0.005) -> None:
        self.zone_proximity_percent = zone_proximity_percent

    def generate(
        self,
        index: IndexSymbol,
        price: float,
        technical: TechnicalSnapshot,
        option_chain: OptionChain,
        sentiment_score: float,
        *,
        current_volume: float = 0.0,
        avg_volume_20: float = 0.0,
        ts: datetime | None = None,
        is_expiry_day: bool = False,
    ) -> TradingSignal:
        support = self._nearest_zone(price, technical.kde_zones, "support")
        resistance = self._nearest_zone(price, technical.kde_zones, "resistance")
        reasons: list[str] = []

        # ── Filter 1: time-of-day ───────────────────────────────────────────
        if ts is not None:
            ist = ts.astimezone(timezone.utc) + _IST
            hm = (ist.hour, ist.minute)
            if hm < _SESSION_START or hm >= _SESSION_END:
                reasons.append(
                    f"WAIT: outside session window "
                    f"({ist.strftime('%H:%M')} IST — trade only {_SESSION_START[0]:02d}:{_SESSION_START[1]:02d}–"
                    f"{_SESSION_END[0]:02d}:{_SESSION_END[1]:02d})"
                )
                return TradingSignal(index=index, action="WAIT", confidence=0.0,
                                     reasons=reasons[:3], generated_at=datetime.now(timezone.utc))

        # ── Filter 2: expiry proximity (Thursday pre-11 AM) ────────────────
        if ts is not None and is_expiry_day:
            ist = ts.astimezone(timezone.utc) + _IST
            if (ist.hour, ist.minute) < _EXPIRY_CUTOFF:
                reasons.append(
                    f"WAIT: expiry-day gamma noise before "
                    f"{_EXPIRY_CUTOFF[0]:02d}:{_EXPIRY_CUTOFF[1]:02d} IST — skipping"
                )
                return TradingSignal(index=index, action="WAIT", confidence=0.0,
                                     reasons=reasons[:3], generated_at=datetime.now(timezone.utc))

        # ── Filter 3: volume confirmation ───────────────────────────────────
        if current_volume > 0 and avg_volume_20 > 0:
            if current_volume < _VOLUME_MULT * avg_volume_20:
                reasons.append(
                    f"WAIT: thin volume ({current_volume:,.0f} < "
                    f"{_VOLUME_MULT}× avg {avg_volume_20:,.0f}) — waiting for confirmation"
                )
                return TradingSignal(index=index, action="WAIT", confidence=0.0,
                                     reasons=reasons[:3], generated_at=datetime.now(timezone.utc))

        buy_checks = [
            (support is not None and self._near(price, support), "price is near a KDE support zone"),
            (option_chain.oi_status == OI_LONG_BUILDUP, "options matrix confirms Long Build-up"),
            (option_chain.pcr.pcr > 0.8 and option_chain.pcr.velocity_5m >= 0, "PCR is above 0.8 and rising"),
        ]
        sell_checks = [
            (resistance is not None and self._near(price, resistance), "price is near a KDE resistance zone"),
            (option_chain.oi_status == OI_SHORT_BUILDUP, "options matrix confirms Short Build-up"),
            (option_chain.pcr.pcr < 1.0 and option_chain.pcr.velocity_5m <= 0, "PCR is below 1.0 and falling"),
        ]
        buy_sentiment_ok = sentiment_score > -0.35
        sell_sentiment_ok = sentiment_score < 0.35

        if all(passed for passed, _reason in buy_checks) and support is not None and buy_sentiment_ok:
            target = self._next_resistance(price, technical.kde_zones)
            stop = support.lower * 0.998
            return TradingSignal(
                index=index,
                action="BUY",
                entry_price=price,
                target_price=target.center if target else price + (price - stop) * 2,
                stop_loss=stop,
                confidence=self._confidence(buy_checks, option_chain.pcr.velocity_5m, sentiment_score),
                reasons=self._passed_reasons("BUY", buy_checks, sentiment_score),
                generated_at=datetime.now(timezone.utc),
            )

        if all(passed for passed, _reason in sell_checks) and resistance is not None and sell_sentiment_ok:
            target = self._next_support(price, technical.kde_zones)
            stop = resistance.upper * 1.002
            return TradingSignal(
                index=index,
                action="SELL",
                entry_price=price,
                target_price=target.center if target else price - (stop - price) * 2,
                stop_loss=stop,
                confidence=self._confidence(sell_checks, option_chain.pcr.velocity_5m, sentiment_score),
                reasons=self._passed_reasons("SELL", sell_checks, sentiment_score),
                generated_at=datetime.now(timezone.utc),
            )

        reasons.append("No clean multi-factor opportunity yet. Wait.")
        reasons.extend(self._status_reasons("BUY", buy_checks, buy_sentiment_ok))
        reasons.extend(self._status_reasons("SELL", sell_checks, sell_sentiment_ok))
        return TradingSignal(index=index, action="WAIT", confidence=0.0, reasons=reasons[:6], generated_at=datetime.now(timezone.utc))

    def _near(self, price: float, zone: PriceZone) -> bool:
        if zone.lower <= price <= zone.upper:
            return True
        return abs(price - zone.center) / price <= self.zone_proximity_percent

    def _nearest_zone(self, price: float, zones: list[PriceZone], kind: str) -> PriceZone | None:
        typed = [zone for zone in zones if zone.kind == kind]
        if not typed:
            return None
        return min(typed, key=lambda zone: abs(zone.center - price))

    def _next_resistance(self, price: float, zones: list[PriceZone]) -> PriceZone | None:
        candidates = [zone for zone in zones if zone.kind == "resistance" and zone.center > price]
        return min(candidates, key=lambda zone: zone.center) if candidates else None

    def _next_support(self, price: float, zones: list[PriceZone]) -> PriceZone | None:
        candidates = [zone for zone in zones if zone.kind == "support" and zone.center < price]
        return max(candidates, key=lambda zone: zone.center) if candidates else None

    def _confidence(self, checks: list[tuple[bool, str]], velocity: float, sentiment: float) -> float:
        base = sum(25 for passed, _reason in checks if passed)
        bonus = min(abs(velocity) * 8.0, 5.0) + min(abs(sentiment) * 5.0, 5.0)
        return min(100.0, round(base + bonus, 2))

    def _passed_reasons(self, side: str, checks: list[tuple[bool, str]], sentiment_score: float) -> list[str]:
        reasons = [f"{side} confirmed: {reason}" for passed, reason in checks if passed]
        if abs(sentiment_score) < 0.20:
            reasons.append("News sentiment is neutral; manual confirmation still required.")
        return reasons

    def _status_reasons(self, side: str, checks: list[tuple[bool, str]], sentiment_ok: bool) -> list[str]:
        passed_reasons = [f"{side} ready: {reason}" for passed, reason in checks if passed]
        failed_reasons = [f"{side} missing: {reason}" for passed, reason in checks if not passed]
        if not sentiment_ok:
            failed_reasons.append(f"{side} missing: sentiment is too hostile for this side")
        return (failed_reasons or passed_reasons)[:3]
