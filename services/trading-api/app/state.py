from __future__ import annotations

from datetime import datetime, timedelta, timezone
from random import Random

from app.config import settings
from app.domain.options import OptionsMicrostructureEngine
from app.domain.risk import RiskManager
from app.domain.sentiment import MockNewsProvider, SentimentAnalysisService
from app.domain.signals import SignalGenerator
from app.domain.technical import TechnicalAnalysisEngine
from app.schemas import (
    Candle,
    IndexSymbol,
    MarketEnvelope,
    OptionChain,
    OptionContract,
    OptionSnapshot,
    OrderProposal,
    TradingSignal,
)


class TradingState:
    def __init__(self) -> None:
        self.technical_engine = TechnicalAnalysisEngine()
        self.options_engine = OptionsMicrostructureEngine()
        self.sentiment_service = SentimentAnalysisService(enable_finbert=settings.enable_finbert)
        self.signal_generator = SignalGenerator()
        self.risk_manager = RiskManager(settings)
        self.candles: dict[IndexSymbol, list[Candle]] = {"NIFTY": [], "BANKNIFTY": []}
        self.technicals = {}
        self.option_chains: dict[IndexSymbol, OptionChain] = {}
        self.news = []
        self.signals: dict[IndexSymbol, TradingSignal] = {}
        self.proposals: dict[str, OrderProposal] = {}

    async def bootstrap_mock(self) -> None:
        now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
        self.candles["NIFTY"] = self._mock_candles(now, 22500, 55)
        self.candles["BANKNIFTY"] = self._mock_candles(now, 48500, 130)
        self.news = await self.sentiment_service.ingest([MockNewsProvider()])
        for index, spot in (("NIFTY", self.candles["NIFTY"][-1].close), ("BANKNIFTY", self.candles["BANKNIFTY"][-1].close)):
            self.option_chains[index] = self._mock_chain(index, spot, now)  # type: ignore[index]
            technical = self.technical_engine.analyze(self.candles[index])  # type: ignore[index]
            self.technicals[index] = technical
            avg_sentiment = sum(event.sentiment_score for event in self.news) / len(self.news)
            self.signals[index] = self.signal_generator.generate(index, spot, technical, self.option_chains[index], avg_sentiment)  # type: ignore[index]

    def envelope(self) -> MarketEnvelope:
        return MarketEnvelope(
            candles=self.candles,
            technicals=self.technicals,
            option_chains=self.option_chains,
            news=self.news,
            signals=self.signals,
            risk=self.risk_manager.state,
        )

    def _mock_candles(self, now: datetime, base: float, amplitude: float) -> list[Candle]:
        rng = Random(int(base))
        candles: list[Candle] = []
        price = base
        for offset in range(90):
            open_price = price
            drift = (rng.random() - 0.47) * amplitude
            close = open_price + drift
            high = max(open_price, close) + rng.random() * amplitude * 0.45
            low = min(open_price, close) - rng.random() * amplitude * 0.45
            volume = 100000 + rng.random() * 50000
            candles.append(
                Candle(
                    ts=now - timedelta(minutes=90 - offset),
                    open=open_price,
                    high=high,
                    low=low,
                    close=close,
                    volume=volume,
                )
            )
            price = close
        return candles

    def _mock_chain(self, index: IndexSymbol, spot: float, now: datetime) -> OptionChain:
        step = 100 if index == "BANKNIFTY" else 50
        atm = round(spot / step) * step
        expiry = (now + timedelta(days=3)).replace(hour=0, minute=0, second=0, microsecond=0)
        snapshots: list[OptionSnapshot] = []
        for strike in range(int(atm - step * 5), int(atm + step * 6), step):
            for option_type in ("CE", "PE"):
                token = abs(hash((index, strike, option_type))) % 100000000
                distance = abs(strike - spot)
                option_price = max(20.0, 220.0 - distance * 0.25)
                oi = 1000000 + max(0, 5 * step - distance) * 900
                if option_type == "PE":
                    oi *= 1.05
                snapshots.append(
                    OptionSnapshot(
                        contract=OptionContract(
                            instrument_token=token,
                            tradingsymbol=f"{index}{expiry.strftime('%d%b%y').upper()}{int(strike)}{option_type}",
                            name=index,
                            expiry=expiry,
                            strike=float(strike),
                            option_type=option_type,  # type: ignore[arg-type]
                            lot_size=15 if index == "BANKNIFTY" else 25,
                        ),
                        last_price=round(option_price, 2),
                        open_interest=oi,
                        oi_delta=15000 if option_type == "PE" else 9000,
                        price_delta=8.0,
                        volume=25000,
                        ts=now,
                    )
                )
        return self.options_engine.build_chain(index, spot, snapshots, spot_delta=12.0, ts=now)


trading_state = TradingState()
