from __future__ import annotations

from datetime import datetime, timedelta, timezone
from random import Random
from typing import Any, Protocol

from app.config import settings
from app.domain.options import InstrumentMasterParser, OptionsMicrostructureEngine
from app.domain.risk import RiskManager
from app.domain.sentiment import MockNewsProvider, SentimentAnalysisService
from app.domain.signals import SignalGenerator
from app.domain.technical import TechnicalAnalysisEngine
from app.schemas import (
    Candle,
    IndexSymbol,
    MarketEnvelope,
    MarketDataStatus,
    OptionChain,
    OptionContract,
    OptionSnapshot,
    OrderProposal,
    TradingSignal,
)


class KiteClientProtocol(Protocol):
    auth: Any

    async def instruments(self) -> str: ...

    async def historical(
        self,
        instrument_token: int,
        interval: str,
        from_ts: datetime,
        to_ts: datetime,
        continuous: bool = False,
        oi: bool = False,
    ) -> dict[str, Any]: ...

    async def ltp(self, instruments: list[str]) -> dict[str, Any]: ...

    async def quote(self, instruments: list[str]) -> dict[str, Any]: ...


class TradingState:
    def __init__(self, app_settings=settings) -> None:
        self.settings = app_settings
        self.technical_engine = TechnicalAnalysisEngine()
        self.options_engine = OptionsMicrostructureEngine()
        self.instrument_parser = InstrumentMasterParser()
        self.sentiment_service = SentimentAnalysisService(enable_finbert=self.settings.enable_finbert)
        self.signal_generator = SignalGenerator()
        self.risk_manager = RiskManager(self.settings)
        self.candles: dict[IndexSymbol, list[Candle]] = {"NIFTY": [], "BANKNIFTY": []}
        self.technicals = {}
        self.option_chains: dict[IndexSymbol, OptionChain] = {}
        self.news = []
        self.signals: dict[IndexSymbol, TradingSignal] = {}
        self.proposals: dict[str, OrderProposal] = {}
        self.contracts: list[OptionContract] = []
        self.previous_option_oi: dict[int, float] = {}
        self.last_refresh_at: datetime | None = None
        self.last_spots: dict[IndexSymbol, float] = {}
        self.status = self._status("mock" if self.settings.trading_market_mode != "kite" else "kite", False, "Starting trading data service")

    async def bootstrap(self) -> None:
        if self.settings.trading_market_mode == "kite":
            self._clear_market_data()
            self.status = self._status("kite", False, "Awaiting Kite session. No sample market data is displayed in live mode.")
            return
        await self.bootstrap_mock()

    async def bootstrap_mock(self) -> None:
        now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
        self.status = self._status("mock", False, "Demo market stream. Configure Kite mode for live market data.", last_refresh_at=now)
        self.candles["NIFTY"] = self._mock_candles(now, 22500, 55)
        self.candles["BANKNIFTY"] = self._mock_candles(now, 48500, 130)
        self.news = await self.sentiment_service.ingest([MockNewsProvider()])
        for index, spot in (("NIFTY", self.candles["NIFTY"][-1].close), ("BANKNIFTY", self.candles["BANKNIFTY"][-1].close)):
            self.option_chains[index] = self._mock_chain(index, spot, now)  # type: ignore[index]
            technical = self.technical_engine.analyze(self.candles[index])  # type: ignore[index]
            self.technicals[index] = technical
            avg_sentiment = sum(event.sentiment_score for event in self.news) / len(self.news)
            self.signals[index] = self.signal_generator.generate(index, spot, technical, self.option_chains[index], avg_sentiment)  # type: ignore[index]
        self.last_refresh_at = now

    async def refresh_if_due(self, kite_client: KiteClientProtocol) -> None:
        if self.settings.trading_market_mode != "kite":
            return
        now = datetime.now(timezone.utc)
        if self.last_refresh_at and (now - self.last_refresh_at).total_seconds() < self.settings.kite_refresh_seconds:
            return
        await self.refresh_from_kite(kite_client)

    async def refresh_from_kite(self, kite_client: KiteClientProtocol) -> MarketDataStatus:
        if self.settings.trading_market_mode != "kite":
            await self.bootstrap_mock()
            return self.status
        if not self.settings.kite_api_key:
            self._clear_market_data()
            self.status = self._status("kite", False, "KITE_API_KEY is not configured")
            return self.status
        if not kite_client.auth.token_store.token_valid():
            self._clear_market_data(keep_last=True)
            self.status = self._status("kite", False, "Kite session is missing or expired. Connect Kite to load live data.")
            return self.status

        now = datetime.now(timezone.utc).replace(microsecond=0)
        try:
            if not self.contracts:
                await self.refresh_instruments(kite_client)
            notes: list[str] = []
            spots = await self._kite_spots(kite_client, now, notes)
            all_quote_keys: list[str] = []
            selected_contracts: dict[IndexSymbol, list[OptionContract]] = {"NIFTY": [], "BANKNIFTY": []}
            for index in ("NIFTY", "BANKNIFTY"):
                spot = spots[index]
                selected_contracts[index] = self.instrument_parser.build_chain_contracts(self.contracts, index, spot, today=now)
                all_quote_keys.extend(f"NFO:{contract.tradingsymbol}" for contract in selected_contracts[index])
                try:
                    candles = await self._kite_candles(kite_client, index, now)
                except Exception as exc:
                    candles = []
                    notes.append(f"{index} candle fallback active: {exc}")
                if candles:
                    self.candles[index] = candles
                    self.technicals[index] = self.technical_engine.analyze(candles)
                elif self.candles[index]:
                    notes.append(f"{index} using last good candles")
                else:
                    self.candles[index] = self._spot_seed_candles(now, spot)
                    self.technicals[index] = self.technical_engine.analyze(self.candles[index])
                    notes.append(f"{index} seeded from index LTP until historical candles arrive")

            option_quotes: dict[str, Any] = {}
            quote_failed = False
            if all_quote_keys:
                try:
                    option_quotes = await kite_client.quote(all_quote_keys)
                except Exception as exc:
                    quote_failed = True
                    notes.append(f"Option quote fallback active: {exc}")
            self.news = await self.sentiment_service.ingest([MockNewsProvider()])
            avg_sentiment = sum(event.sentiment_score for event in self.news) / len(self.news) if self.news else 0.0

            for index in ("NIFTY", "BANKNIFTY"):
                spot = spots[index]
                snapshots = self._option_snapshots(selected_contracts[index], option_quotes, now)
                # Fall back to historical minute bars whenever live quotes are absent —
                # covers both API errors and empty responses (e.g. market closed after hours).
                if not snapshots:
                    snapshots = await self._historical_option_snapshots(kite_client, selected_contracts[index], spot, now)
                    if snapshots:
                        notes.append(f"{index} options: using historical bar fallback")
                if snapshots:
                    spot_delta = spot - self.last_spots.get(index, spot)
                    self.option_chains[index] = self.options_engine.build_chain(index, spot, snapshots, spot_delta=spot_delta, ts=now)
                else:
                    # No option data at all — keep last known chain or seed a neutral mock so
                    # the signals dict is always populated and the frontend never gets a KeyError.
                    if index not in self.option_chains:
                        self.option_chains[index] = self._mock_chain(index, spot, now)
                    notes.append(f"{index} options: no data, using last/mock chain for signal baseline")
                technical = self.technicals.get(index)
                if technical:
                    self.signals[index] = self.signal_generator.generate(
                        index, spot, technical, self.option_chains[index], avg_sentiment
                    )
                self.last_spots[index] = spot

            self.last_refresh_at = now
            message = "Live Kite market data is active."
            if notes:
                message = "Kite data active with fallback: " + " | ".join(notes[:2])
            self.status = self._status("kite", True, message, kite_session_valid=True, last_refresh_at=now)
            return self.status
        except Exception as exc:
            self.status = self._status(
                "kite",
                False,
                f"Kite refresh failed: {exc}",
                kite_session_valid=kite_client.auth.token_store.token_valid(),
                last_refresh_at=self.last_refresh_at,
            )
            return self.status

    async def refresh_instruments(self, kite_client: KiteClientProtocol) -> list[OptionContract]:
        payload = await kite_client.instruments()
        records = self.instrument_parser.parse_csv(payload)
        self.contracts = self.instrument_parser.contracts_from_records(records)
        return self.contracts

    def envelope(self) -> MarketEnvelope:
        return MarketEnvelope(
            status=self.status,
            candles=self.candles,
            technicals=self.technicals,
            option_chains=self.option_chains,
            news=self.news,
            signals=self.signals,
            risk=self.risk_manager.state,
        )

    def _clear_market_data(self, keep_last: bool = False) -> None:
        if keep_last and any(self.candles.values()):
            return
        self.candles = {"NIFTY": [], "BANKNIFTY": []}
        self.technicals = {}
        self.option_chains = {}
        self.news = []
        self.signals = {}

    def _status(
        self,
        mode: str,
        is_live: bool,
        message: str,
        kite_session_valid: bool = False,
        last_refresh_at: datetime | None = None,
    ) -> MarketDataStatus:
        return MarketDataStatus(
            mode="kite" if mode == "kite" else "mock",
            is_live=is_live,
            kite_configured=bool(self.settings.kite_api_key),
            kite_session_valid=kite_session_valid,
            message=message,
            updated_at=datetime.now(timezone.utc),
            last_refresh_at=last_refresh_at,
        )

    async def _kite_spots(self, kite_client: KiteClientProtocol, now: datetime, notes: list[str]) -> dict[IndexSymbol, float]:
        try:
            payload = await kite_client.ltp(["NSE:NIFTY 50", "NSE:NIFTY BANK"])
            return {
                "NIFTY": float(payload["NSE:NIFTY 50"]["last_price"]),
                "BANKNIFTY": float(payload["NSE:NIFTY BANK"]["last_price"]),
            }
        except Exception as exc:
            notes.append(f"Index LTP fallback active: {exc}")
            spots: dict[IndexSymbol, float] = {}
            for index in ("NIFTY", "BANKNIFTY"):
                candles = await self._kite_candles(kite_client, index, now)
                if candles:
                    self.candles[index] = candles
                    self.technicals[index] = self.technical_engine.analyze(candles)
                    spots[index] = candles[-1].close
            if set(spots) != {"NIFTY", "BANKNIFTY"}:
                raise RuntimeError("Kite quote and historical fallbacks both failed for index spots") from exc
            return spots

    async def _kite_candles(self, kite_client: KiteClientProtocol, index: IndexSymbol, now: datetime) -> list[Candle]:
        token = self.settings.banknifty_index_token if index == "BANKNIFTY" else self.settings.nifty_index_token
        payload = await kite_client.historical(token, "minute", now - timedelta(days=5), now)
        rows = payload.get("candles", []) if isinstance(payload, dict) else []
        candles: list[Candle] = []
        for row in rows[-120:]:
            if len(row) < 6:
                continue
            candles.append(
                Candle(
                    ts=self._parse_kite_ts(row[0]),
                    open=float(row[1]),
                    high=float(row[2]),
                    low=float(row[3]),
                    close=float(row[4]),
                    volume=float(row[5]),
                    oi=float(row[6]) if len(row) > 6 and row[6] is not None else None,
                )
            )
        return candles

    def _option_snapshots(
        self,
        contracts: list[OptionContract],
        quote_payload: dict[str, Any],
        fallback_ts: datetime,
    ) -> list[OptionSnapshot]:
        snapshots: list[OptionSnapshot] = []
        for contract in contracts:
            key = f"NFO:{contract.tradingsymbol}"
            quote = quote_payload.get(key)
            if not quote:
                continue
            last_price = float(quote.get("last_price") or 0.0)
            ohlc = quote.get("ohlc") or {}
            previous_close = float(ohlc.get("close") or last_price)
            timestamp = quote.get("timestamp") or fallback_ts
            raw_oi = quote.get("oi")
            open_interest = float(raw_oi) if raw_oi is not None else self.previous_option_oi.get(contract.instrument_token, 0.0)
            oi_delta = self._track_option_oi(contract.instrument_token, open_interest) if raw_oi is not None else 0.0
            snapshots.append(
                OptionSnapshot(
                    contract=contract,
                    last_price=last_price,
                    open_interest=open_interest,
                    oi_delta=oi_delta,
                    price_delta=last_price - previous_close,
                    volume=float(quote.get("volume") or 0.0),
                    ts=self._parse_kite_ts(timestamp),
                )
            )
        return snapshots

    async def _historical_option_snapshots(
        self,
        kite_client: KiteClientProtocol,
        contracts: list[OptionContract],
        spot: float,
        now: datetime,
    ) -> list[OptionSnapshot]:
        snapshots: list[OptionSnapshot] = []
        ordered = sorted(contracts, key=lambda contract: (abs(contract.strike - spot), contract.strike, contract.option_type))
        for contract in ordered[: self.settings.kite_option_history_fallback_limit]:
            try:
                payload = await kite_client.historical(contract.instrument_token, "minute", now - timedelta(days=5), now, oi=True)
            except Exception:
                continue
            rows = payload.get("candles", []) if isinstance(payload, dict) else []
            if not rows:
                continue
            row = rows[-1]
            if len(row) < 6:
                continue
            close = float(row[4])
            open_price = float(row[1])
            open_interest = float(row[6]) if len(row) > 6 and row[6] is not None else self.previous_option_oi.get(contract.instrument_token, 0.0)
            previous_oi = self._previous_historical_oi(contract.instrument_token, rows)
            oi_delta = open_interest - previous_oi if previous_oi is not None else 0.0
            self.previous_option_oi[contract.instrument_token] = open_interest
            snapshots.append(
                OptionSnapshot(
                    contract=contract,
                    last_price=close,
                    open_interest=open_interest,
                    oi_delta=oi_delta,
                    price_delta=close - open_price,
                    volume=float(row[5]),
                    ts=self._parse_kite_ts(row[0]),
                )
            )
        return snapshots

    def _track_option_oi(self, instrument_token: int, open_interest: float) -> float:
        previous = self.previous_option_oi.get(instrument_token)
        self.previous_option_oi[instrument_token] = open_interest
        return 0.0 if previous is None else open_interest - previous

    def _previous_historical_oi(self, instrument_token: int, rows: list[list[object]]) -> float | None:
        if len(rows) >= 2 and len(rows[-2]) > 6 and rows[-2][6] is not None:
            return float(rows[-2][6])
        return self.previous_option_oi.get(instrument_token)

    def _parse_kite_ts(self, raw: object) -> datetime:
        if isinstance(raw, datetime):
            return raw if raw.tzinfo else raw.replace(tzinfo=timezone.utc)
        text = str(raw)
        for parser in (
            lambda value: datetime.fromisoformat(value),
            lambda value: datetime.strptime(value, "%Y-%m-%dT%H:%M:%S%z"),
            lambda value: datetime.strptime(value, "%Y-%m-%d %H:%M:%S"),
        ):
            try:
                parsed = parser(text)
                return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        return datetime.now(timezone.utc)

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

    def _spot_seed_candles(self, now: datetime, spot: float) -> list[Candle]:
        return [
            Candle(ts=now - timedelta(minutes=1), open=spot, high=spot, low=spot, close=spot, volume=1),
            Candle(ts=now, open=spot, high=spot, low=spot, close=spot, volume=1),
        ]

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
