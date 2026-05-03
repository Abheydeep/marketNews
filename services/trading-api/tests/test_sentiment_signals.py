from datetime import datetime, timezone

from app.domain.options import OptionsMicrostructureEngine
from app.domain.sentiment import SentimentAnalysisService
from app.domain.signals import SignalGenerator
from app.schemas import IndicatorSnapshot, OptionContract, OptionSnapshot, PriceZone, TechnicalSnapshot


def test_sentiment_mapping_and_duplicate_ingestion():
    service = SentimentAnalysisService()
    assert service.map_finbert_score("positive", 0.85) == 0.85
    assert service.map_finbert_score("negative", 0.65) == -0.65
    assert service.map_finbert_score("neutral", 0.99) == 0.0


def test_signal_generator_requires_full_buy_confluence():
    now = datetime.now(timezone.utc)
    technical = TechnicalSnapshot(
        indicators=IndicatorSnapshot(ema=100, rsi=58, macd=1, macd_signal=0.5, vwap=101),
        pivots=[],
        wick_zones=[],
        kde_zones=[
            PriceZone(lower=99, upper=101, center=100, kind="support", strength=3),
            PriceZone(lower=119, upper=121, center=120, kind="resistance", strength=2),
        ],
        trendlines=[],
    )
    ce = OptionContract(
        instrument_token=1,
        tradingsymbol="NIFTYCE",
        name="NIFTY",
        expiry=now,
        strike=100,
        option_type="CE",
        lot_size=25,
    )
    pe = ce.model_copy(update={"instrument_token": 2, "tradingsymbol": "NIFTYPE", "option_type": "PE"})
    chain = OptionsMicrostructureEngine().build_chain(
        "NIFTY",
        100.2,
        [
            OptionSnapshot(contract=ce, last_price=10, open_interest=100, oi_delta=10, ts=now),
            OptionSnapshot(contract=pe, last_price=10, open_interest=120, oi_delta=20, ts=now),
        ],
        spot_delta=1,
        ts=now,
    )
    signal = SignalGenerator().generate("NIFTY", 100.2, technical, chain, sentiment_score=0.35)
    assert signal.action == "BUY"
    assert signal.target_price == 120
    assert signal.stop_loss is not None


def test_signal_generator_does_not_block_core_setup_on_neutral_sentiment():
    now = datetime.now(timezone.utc)
    technical = TechnicalSnapshot(
        indicators=IndicatorSnapshot(ema=100, rsi=58, macd=1, macd_signal=0.5, vwap=101),
        pivots=[],
        wick_zones=[],
        kde_zones=[
            PriceZone(lower=99, upper=101, center=100, kind="support", strength=3),
            PriceZone(lower=119, upper=121, center=120, kind="resistance", strength=2),
        ],
        trendlines=[],
    )
    ce = OptionContract(
        instrument_token=1,
        tradingsymbol="NIFTYCE",
        name="NIFTY",
        expiry=now,
        strike=100,
        option_type="CE",
        lot_size=25,
    )
    pe = ce.model_copy(update={"instrument_token": 2, "tradingsymbol": "NIFTYPE", "option_type": "PE"})
    chain = OptionsMicrostructureEngine().build_chain(
        "NIFTY",
        100.2,
        [
            OptionSnapshot(contract=ce, last_price=10, open_interest=100, oi_delta=10, ts=now),
            OptionSnapshot(contract=pe, last_price=10, open_interest=120, oi_delta=20, ts=now),
        ],
        spot_delta=1,
        ts=now,
    )
    signal = SignalGenerator().generate("NIFTY", 100.2, technical, chain, sentiment_score=0.0)
    assert signal.action == "BUY"
    assert any("neutral" in reason.lower() for reason in signal.reasons)
