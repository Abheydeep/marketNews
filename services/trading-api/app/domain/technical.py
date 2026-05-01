from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from statistics import mean

from app.schemas import (
    Candle,
    IndicatorSnapshot,
    PivotPoint,
    PriceZone,
    TechnicalSnapshot,
    Trendline,
)


@dataclass(frozen=True)
class TechnicalAnalysisConfig:
    ema_period: int = 20
    rsi_period: int = 14
    macd_fast: int = 12
    macd_slow: int = 26
    macd_signal: int = 9
    pivot_lookback: int = 2
    pivot_lookforward: int = 2
    pivot_min_distance: float = 0.018
    wick_body_ratio: float = 1.8
    wick_zone_width_percent: float = 0.0015
    kde_bandwidth_percent: float = 0.0025
    kde_zone_width_percent: float = 0.002


class TechnicalAnalysisEngine:
    def __init__(self, config: TechnicalAnalysisConfig | None = None) -> None:
        self.config = config or TechnicalAnalysisConfig()

    def clean_candles(self, candles: list[Candle]) -> list[Candle]:
        return [candle for candle in candles if candle.volume > 0]

    def ema(self, values: list[float], period: int) -> float:
        if not values:
            raise ValueError("EMA requires at least one value")
        effective_period = min(period, len(values))
        multiplier = 2.0 / (effective_period + 1.0)
        value = values[0]
        for current in values[1:]:
            value = (current - value) * multiplier + value
        return value

    def rsi(self, values: list[float], period: int) -> float:
        if len(values) <= period:
            return 50.0
        gains = 0.0
        losses = 0.0
        window = values[-(period + 1) :]
        for previous, current in zip(window, window[1:]):
            change = current - previous
            if change >= 0:
                gains += change
            else:
                losses += abs(change)
        if losses == 0:
            return 100.0
        relative_strength = (gains / period) / (losses / period)
        return 100.0 - (100.0 / (1.0 + relative_strength))

    def macd(self, values: list[float]) -> tuple[float, float]:
        fast = self.ema(values, self.config.macd_fast)
        slow = self.ema(values, self.config.macd_slow)
        macd_value = fast - slow
        macd_line = []
        for index in range(1, len(values) + 1):
            line_fast = self.ema(values[:index], self.config.macd_fast)
            line_slow = self.ema(values[:index], self.config.macd_slow)
            macd_line.append(line_fast - line_slow)
        return macd_value, self.ema(macd_line, self.config.macd_signal)

    def vwap(self, candles: list[Candle]) -> float:
        traded_value = sum(((candle.high + candle.low + candle.close) / 3.0) * candle.volume for candle in candles)
        volume = sum(candle.volume for candle in candles)
        if volume <= 0:
            return candles[-1].close
        return traded_value / volume

    def indicators(self, candles: list[Candle]) -> IndicatorSnapshot:
        closes = [candle.close for candle in candles]
        macd_value, macd_signal = self.macd(closes)
        return IndicatorSnapshot(
            ema=self.ema(closes, self.config.ema_period),
            rsi=self.rsi(closes, self.config.rsi_period),
            macd=macd_value,
            macd_signal=macd_signal,
            vwap=self.vwap(candles),
        )

    def detect_fractal_pivots(self, candles: list[Candle]) -> list[PivotPoint]:
        cfg = self.config
        pivots: list[PivotPoint] = []
        if len(candles) < cfg.pivot_lookback + cfg.pivot_lookforward + 1:
            return pivots

        lows = [candle.low for candle in candles]
        highs = [candle.high for candle in candles]
        price_span = max(highs) - min(lows) or 1.0

        for index in range(cfg.pivot_lookback, len(candles) - cfg.pivot_lookforward):
            low_window = lows[index - cfg.pivot_lookback : index + cfg.pivot_lookforward + 1]
            high_window = highs[index - cfg.pivot_lookback : index + cfg.pivot_lookforward + 1]
            if lows[index] == min(low_window) and low_window.count(lows[index]) == 1:
                pivot = PivotPoint(index=index, ts=candles[index].ts, price=lows[index], kind="support")
                self._append_if_prominent(pivots, pivot, price_span)
            if highs[index] == max(high_window) and high_window.count(highs[index]) == 1:
                pivot = PivotPoint(index=index, ts=candles[index].ts, price=highs[index], kind="resistance")
                self._append_if_prominent(pivots, pivot, price_span)
        return pivots

    def _append_if_prominent(self, pivots: list[PivotPoint], pivot: PivotPoint, price_span: float) -> None:
        if not pivots:
            pivots.append(pivot.model_copy(update={"strength": 1.0}))
            return
        last_same = next((candidate for candidate in reversed(pivots) if candidate.kind == pivot.kind), None)
        if last_same is None:
            pivots.append(pivot.model_copy(update={"strength": 1.0}))
            return
        index_distance = abs(pivot.index - last_same.index) / 100.0
        price_distance = abs(pivot.price - last_same.price) / price_span
        distance = sqrt(index_distance * index_distance + price_distance * price_distance)
        if distance >= self.config.pivot_min_distance:
            pivots.append(pivot.model_copy(update={"strength": round(distance, 4)}))

    def detect_wick_zones(self, candles: list[Candle]) -> list[PriceZone]:
        zones: list[PriceZone] = []
        for candle in candles:
            body = max(abs(candle.open - candle.close), candle.close * 0.0001)
            lower_wick = min(candle.open, candle.close) - candle.low
            upper_wick = candle.high - max(candle.open, candle.close)
            if lower_wick / body >= self.config.wick_body_ratio:
                zones.append(self._zone(candle.low, "support", lower_wick / body))
            if upper_wick / body >= self.config.wick_body_ratio:
                zones.append(self._zone(candle.high, "resistance", upper_wick / body))
        return self._merge_nearby_zones(zones)

    def kde_zones(self, pivots: list[PivotPoint]) -> list[PriceZone]:
        zones: list[PriceZone] = []
        for kind in ("support", "resistance"):
            prices = [pivot.price for pivot in pivots if pivot.kind == kind]
            if not prices:
                continue
            zones.extend(self._kde_or_histogram(prices, kind))
        return sorted(self._merge_nearby_zones(zones), key=lambda zone: zone.center)

    def _kde_or_histogram(self, prices: list[float], kind: str) -> list[PriceZone]:
        if len(prices) == 1:
            return [self._zone(prices[0], kind, 1.0)]
        try:
            return self._scipy_kde_zones(prices, kind)
        except Exception:
            return self._histogram_zones(prices, kind)

    def _scipy_kde_zones(self, prices: list[float], kind: str) -> list[PriceZone]:
        from scipy.stats import gaussian_kde  # type: ignore

        low = min(prices)
        high = max(prices)
        if low == high:
            return [self._zone(low, kind, float(len(prices)))]
        grid = [low + (high - low) * step / 80 for step in range(81)]
        kde = gaussian_kde(prices)
        density = list(kde(grid))
        peaks: list[PriceZone] = []
        for index in range(1, len(grid) - 1):
            if density[index] >= density[index - 1] and density[index] >= density[index + 1]:
                peaks.append(self._zone(grid[index], kind, float(density[index])))
        return sorted(peaks, key=lambda zone: zone.strength, reverse=True)[:5]

    def _histogram_zones(self, prices: list[float], kind: str) -> list[PriceZone]:
        span = max(prices) - min(prices)
        bucket_size = max(mean(prices) * self.config.kde_bandwidth_percent, span / 8 if span else 1.0)
        buckets: dict[int, list[float]] = {}
        anchor = min(prices)
        for price in prices:
            bucket = int((price - anchor) / bucket_size)
            buckets.setdefault(bucket, []).append(price)
        zones = [self._zone(mean(bucket_prices), kind, float(len(bucket_prices))) for bucket_prices in buckets.values()]
        return sorted(zones, key=lambda zone: zone.strength, reverse=True)[:5]

    def trendlines(self, pivots: list[PivotPoint], kind: str) -> list[Trendline]:
        selected = [pivot for pivot in pivots if pivot.kind == kind]
        if len(selected) < 2:
            return []
        recent = selected[-6:]
        xs = [float(pivot.index) for pivot in recent]
        ys = [pivot.price for pivot in recent]
        x_mean = mean(xs)
        y_mean = mean(ys)
        denominator = sum((x - x_mean) ** 2 for x in xs) or 1.0
        slope = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, ys)) / denominator
        intercept = y_mean - slope * x_mean
        return [
            Trendline(
                kind=kind,
                slope=slope,
                intercept=intercept,
                start_index=recent[0].index,
                end_index=recent[-1].index,
            )
        ]

    def analyze(self, candles: list[Candle]) -> TechnicalSnapshot:
        clean = self.clean_candles(candles)
        if len(clean) < 2:
            raise ValueError("Technical analysis requires at least two non-zero-volume candles")
        pivots = self.detect_fractal_pivots(clean)
        return TechnicalSnapshot(
            indicators=self.indicators(clean),
            pivots=pivots,
            wick_zones=self.detect_wick_zones(clean),
            kde_zones=self.kde_zones(pivots),
            trendlines=self.trendlines(pivots, "support") + self.trendlines(pivots, "resistance"),
        )

    def _zone(self, center: float, kind: str, strength: float) -> PriceZone:
        width = center * self.config.kde_zone_width_percent
        return PriceZone(
            lower=center - width,
            upper=center + width,
            center=center,
            kind=kind,  # type: ignore[arg-type]
            strength=round(float(strength), 4),
        )

    def _merge_nearby_zones(self, zones: list[PriceZone]) -> list[PriceZone]:
        if not zones:
            return []
        merged: list[PriceZone] = []
        for zone in sorted(zones, key=lambda item: (item.kind, item.center)):
            if not merged or merged[-1].kind != zone.kind or zone.lower > merged[-1].upper:
                merged.append(zone)
                continue
            previous = merged[-1]
            total_strength = previous.strength + zone.strength
            center = (
                (previous.center * previous.strength + zone.center * zone.strength) / total_strength
                if total_strength
                else (previous.center + zone.center) / 2
            )
            merged[-1] = PriceZone(
                lower=min(previous.lower, zone.lower),
                upper=max(previous.upper, zone.upper),
                center=center,
                kind=zone.kind,
                strength=round(total_strength, 4),
            )
        return merged

