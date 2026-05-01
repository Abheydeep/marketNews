from datetime import datetime, timedelta, timezone

from app.domain.technical import TechnicalAnalysisEngine
from app.schemas import Candle


def make_candles():
    now = datetime.now(timezone.utc)
    closes = [100, 102, 101, 106, 103, 99, 101, 108, 104, 98, 103, 110, 105, 100, 106, 112, 107, 101]
    candles = []
    for index, close in enumerate(closes):
        candles.append(
            Candle(
                ts=now + timedelta(minutes=index),
                open=close - 1,
                high=close + (4 if index in {3, 7, 11, 15} else 1.5),
                low=close - (4 if index in {5, 9, 13, 17} else 1.5),
                close=close,
                volume=0 if index == 2 else 1000 + index,
            )
        )
    return candles


def test_technical_engine_drops_zero_volume_and_calculates_indicators():
    engine = TechnicalAnalysisEngine()
    clean = engine.clean_candles(make_candles())
    assert len(clean) == 17
    indicators = engine.indicators(clean)
    assert indicators.ema > 0
    assert 0 <= indicators.rsi <= 100
    assert indicators.vwap > 0


def test_technical_engine_detects_pivots_wicks_kde_and_trendlines():
    engine = TechnicalAnalysisEngine()
    snapshot = engine.analyze(make_candles())
    assert any(pivot.kind == "support" for pivot in snapshot.pivots)
    assert any(pivot.kind == "resistance" for pivot in snapshot.pivots)
    assert snapshot.wick_zones
    assert snapshot.kde_zones
    assert snapshot.trendlines

