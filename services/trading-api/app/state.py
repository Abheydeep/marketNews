from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from random import Random
from typing import Any, Protocol

from app.config import settings
from app.domain.fvg import FVGPaperStrategy
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

logger = logging.getLogger("trading.fvg")


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
        self.fvg_strategy = FVGPaperStrategy()
        self.risk_manager = RiskManager(self.settings)
        self.candles: dict[IndexSymbol, list[Candle]] = {"NIFTY": [], "BANKNIFTY": []}
        self.candles_5m: dict[IndexSymbol, list[Candle]] = {"NIFTY": [], "BANKNIFTY": []}
        self.technicals = {}
        self.option_chains: dict[IndexSymbol, OptionChain] = {}
        self.news = []
        self.signals: dict[IndexSymbol, TradingSignal] = {}
        # Observe-only FVG paper signals — kept entirely separate from
        # self.signals so they can never reach the order-proposal path.
        self.fvg_observations: dict[IndexSymbol, TradingSignal] = {}
        self._fvg_last_logged: dict[IndexSymbol, str] = {}
        self.proposals: dict[str, OrderProposal] = {}
        self.contracts: list[OptionContract] = []
        self.contracts_by_token: dict[int, OptionContract] = {}
        self.previous_option_oi: dict[int, float] = {}
        self.last_ticks_by_token: dict[int, datetime] = {}
        self.last_volume_by_token: dict[int, float] = {}
        self.websocket_started_at: datetime | None = None
        self.websocket_error: str | None = None
        self._ticker_bridge = None
        self._ticker_tokens: set[int] = set()
        self._ticker_access_token: str | None = None
        self._last_ticker_restart_at: datetime | None = None
        self._refresh_lock = asyncio.Lock()
        self._refresh_task: asyncio.Task[None] | None = None
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
            self.candles_5m[index] = self._mock_candles(now, spot, 85 if index == "NIFTY" else 190)  # type: ignore[index]
            technical = self.technical_engine.analyze(self.candles[index])  # type: ignore[index]
            self.technicals[index] = technical
            avg_sentiment = sum(event.sentiment_score for event in self.news) / len(self.news)
            self.signals[index] = self.signal_generator.generate(index, spot, technical, self.option_chains[index], avg_sentiment)  # type: ignore[index]
            self.fvg_observations[index] = self.fvg_strategy.evaluate(index, self.candles_5m[index], now)  # type: ignore[index]
        self.last_refresh_at = now

    async def refresh_if_due(self, kite_client: KiteClientProtocol) -> None:
        if self.settings.trading_market_mode != "kite":
            return
        now = datetime.now(timezone.utc)
        if self.last_refresh_at and (now - self.last_refresh_at).total_seconds() < self.settings.kite_refresh_seconds:
            return
        if self._refresh_lock.locked():
            return
        async with self._refresh_lock:
            now = datetime.now(timezone.utc)
            if self.last_refresh_at and (now - self.last_refresh_at).total_seconds() < self.settings.kite_refresh_seconds:
                return
            await self._refresh_from_kite_with_timeout(kite_client)

    def schedule_refresh_if_due(self, kite_client: KiteClientProtocol) -> None:
        if self.settings.trading_market_mode != "kite":
            return
        now = datetime.now(timezone.utc)
        if self.last_refresh_at and (now - self.last_refresh_at).total_seconds() < self.settings.kite_refresh_seconds:
            return
        if self._refresh_lock.locked():
            return
        if self._refresh_task and not self._refresh_task.done():
            return
        self._refresh_task = asyncio.create_task(self.refresh_if_due(kite_client))
        self._refresh_task.add_done_callback(self._handle_refresh_task_done)

    async def _refresh_from_kite_with_timeout(self, kite_client: KiteClientProtocol) -> MarketDataStatus:
        try:
            return await asyncio.wait_for(
                self.refresh_from_kite(kite_client),
                timeout=self.settings.kite_refresh_timeout_seconds,
            )
        except asyncio.TimeoutError:
            self.status = self._status(
                "kite",
                False,
                f"Kite refresh timed out after {self.settings.kite_refresh_timeout_seconds}s; keeping last market snapshot.",
                kite_session_valid=True,
                last_refresh_at=self.last_refresh_at,
            )
            logger.warning("Kite refresh timed out after %ss", self.settings.kite_refresh_timeout_seconds)
            return self.status

    def _handle_refresh_task_done(self, task: asyncio.Task[None]) -> None:
        try:
            task.result()
        except Exception as exc:  # pragma: no cover - defensive background guard
            logger.warning("Kite background refresh failed: %s", exc)

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
                    try:
                        self.technicals[index] = self.technical_engine.analyze(candles)
                    except ValueError as exc:
                        # NSE indices return zero-volume bars; don't bring the whole
                        # refresh down — leave technicals stale and keep going so
                        # signals and FVG paper observations can still populate.
                        notes.append(f"{index} technicals unavailable: {exc}")
                elif self.candles[index]:
                    notes.append(f"{index} using last good candles")
                else:
                    self.candles[index] = self._spot_seed_candles(now, spot)
                    try:
                        self.technicals[index] = self.technical_engine.analyze(self.candles[index])
                    except ValueError as exc:
                        notes.append(f"{index} technicals unavailable: {exc}")
                    notes.append(f"{index} seeded from index LTP until historical candles arrive")

                # 5-minute candles drive the observe-only FVG paper strategy.
                try:
                    candles_5m = await self._kite_candles_5m(kite_client, index, now)
                    if candles_5m:
                        self.candles_5m[index] = candles_5m
                except Exception as exc:
                    notes.append(f"{index} 5-min candle fetch failed: {exc}")

            await self._ensure_ticker(kite_client, selected_contracts, notes)

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
                    candles_for_index = self.candles.get(index, [])
                    current_vol = candles_for_index[-1].volume if candles_for_index else 0.0
                    recent_vols = [c.volume for c in candles_for_index[-20:] if c.volume > 0]
                    avg_vol_20 = sum(recent_vols) / len(recent_vols) if recent_vols else 0.0
                    ist_offset = timedelta(hours=5, minutes=30)
                    is_expiry = now.weekday() == 3  # Thursday
                    self.signals[index] = self.signal_generator.generate(
                        index, spot, technical, self.option_chains[index], avg_sentiment,
                        current_volume=current_vol,
                        avg_volume_20=avg_vol_20,
                        ts=now,
                        is_expiry_day=is_expiry,
                    )
                self.last_spots[index] = spot

                # ── FVG paper strategy: observe-only, never touches the order path ──
                candles_5m = self.candles_5m.get(index, [])
                if candles_5m:
                    observation = self.fvg_strategy.evaluate(
                        index, candles_5m, now, is_expiry_day=(now.weekday() == 3),
                    )
                    self.fvg_observations[index] = observation
                    self._log_fvg_observation(index, observation)

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
        records = await asyncio.to_thread(self.instrument_parser.parse_csv, payload)
        self.contracts = await asyncio.to_thread(self.instrument_parser.contracts_from_records, records)
        self.contracts_by_token = {contract.instrument_token: contract for contract in self.contracts}
        return self.contracts

    async def _ensure_ticker(
        self,
        kite_client: KiteClientProtocol,
        selected_contracts: dict[IndexSymbol, list[OptionContract]],
        notes: list[str],
    ) -> None:
        if not self.settings.kite_websocket_enabled:
            if self._ticker_bridge is not None:
                self._stop_ticker("Kite WebSocket is disabled")
            return
        access_token_fn = getattr(kite_client.auth.token_store, "access_token", None)
        access_token = access_token_fn() if callable(access_token_fn) else None
        if not access_token:
            self._stop_ticker("Kite access token is missing")
            notes.append("Kite WebSocket not started: access token is missing")
            return
        tokens = {self.settings.nifty_index_token, self.settings.banknifty_index_token}
        for contracts in selected_contracts.values():
            tokens.update(contract.instrument_token for contract in contracts)
        now = datetime.now(timezone.utc)
        restart_reason = self._ticker_restart_reason(tokens, access_token, now)
        if restart_reason is None:
            return
        try:
            if self._ticker_bridge is not None:
                notes.append(f"Kite WebSocket restarting: {restart_reason}")
                self._stop_ticker(restart_reason)
            from app.adapters.kite.ticker import KiteTickerBridge

            bridge = KiteTickerBridge(self.settings.kite_api_key, access_token, self.handle_kite_ticks, self._record_ticker_status)
            try:
                await asyncio.to_thread(bridge.start, sorted(tokens), asyncio.get_running_loop())
            except TypeError:
                await asyncio.to_thread(bridge.start, sorted(tokens))
            self._ticker_bridge = bridge
            self._ticker_tokens = set(tokens)
            self._ticker_access_token = access_token
            self._last_ticker_restart_at = now
            self.websocket_started_at = now
            self.websocket_error = None
            notes.append(f"Kite WebSocket starting: {restart_reason}")
        except Exception as exc:
            self._stop_ticker("Kite WebSocket start failed")
            self.websocket_error = str(exc)
            notes.append(f"Kite WebSocket not active: {exc}")

    def _ticker_restart_reason(self, tokens: set[int], access_token: str, now: datetime) -> str | None:
        if self._ticker_bridge is None:
            return "not started"
        if self._ticker_access_token != access_token:
            return "Kite access token changed"
        if self._ticker_tokens != tokens:
            return "subscription universe changed"

        cooldown_active = (
            self._last_ticker_restart_at is not None
            and (now - self._last_ticker_restart_at).total_seconds() < 30
        )
        if self.websocket_error and not cooldown_active:
            return f"Kite WebSocket reported {self.websocket_error}"
        if self.websocket_started_at is None:
            return "Kite WebSocket start time is missing"
        if (now - self.websocket_started_at).total_seconds() < 30 or cooldown_active:
            return None

        stale_cutoff = max(float(self.settings.stale_tick_seconds) * 2.0, 30.0)
        fresh_ticks = {
            token
            for token in tokens
            if token in self.last_ticks_by_token and (now - self.last_ticks_by_token[token]).total_seconds() <= stale_cutoff
        }
        if not fresh_ticks:
            return "Kite WebSocket is connected but silent"
        required_index_tokens = {self.settings.nifty_index_token, self.settings.banknifty_index_token} & tokens
        missing_index_tokens = required_index_tokens - fresh_ticks
        if missing_index_tokens:
            missing = ", ".join(str(token) for token in sorted(missing_index_tokens))
            return f"Kite WebSocket is missing fresh index ticks for {missing}"
        option_tokens = tokens - {self.settings.nifty_index_token, self.settings.banknifty_index_token}
        if option_tokens and not (option_tokens & fresh_ticks):
            return "Kite WebSocket is missing fresh option ticks"
        return None

    def _record_ticker_status(self, message: str) -> None:
        if message.startswith("connected"):
            self.websocket_error = None
            return
        self.websocket_error = message

    def _stop_ticker(self, reason: str) -> None:
        if self._ticker_bridge is not None:
            try:
                self._ticker_bridge.stop()
            except Exception as exc:
                self.websocket_error = f"Kite WebSocket stop failed after {reason}: {exc}"
        self._ticker_bridge = None
        self._ticker_tokens = set()
        self._ticker_access_token = None

    async def handle_kite_ticks(self, ticks: list[dict[str, Any]]) -> None:
        now = datetime.now(timezone.utc)
        affected: set[IndexSymbol] = set()
        for tick in ticks:
            token = int(tick.get("instrument_token") or tick.get("instrumentToken") or 0)
            if not token:
                continue
            ts = self._parse_kite_ts(tick.get("exchange_timestamp") or tick.get("timestamp") or now)
            self.last_ticks_by_token[token] = ts
            price = float(tick.get("last_price") or tick.get("last_traded_price") or 0.0)
            if price <= 0:
                continue
            index = self._index_for_token(token)
            if index:
                cumulative_volume = float(tick.get("volume_traded") or tick.get("volume") or 1.0)
                self._append_tick_candle(index, ts, price, self._volume_delta(token, cumulative_volume))
                self.last_spots[index] = price
                affected.add(index)
                continue
            contract = self.contracts_by_token.get(token)
            if contract:
                self._apply_option_tick(contract, tick, ts, price)
                affected.add(contract.name)

        for index in affected:
            self._refresh_live_outputs(index, now)

    def _refresh_live_outputs(self, index: IndexSymbol, now: datetime) -> None:
        candles = self.candles.get(index, [])
        if candles:
            try:
                self.technicals[index] = self.technical_engine.analyze(candles)
            except ValueError as exc:
                self.status = self._status(
                    "kite",
                    True,
                    f"Kite live ticks active, but {index} technicals are waiting: {exc}",
                    kite_session_valid=True,
                    last_refresh_at=self.last_refresh_at,
                )
        technical = self.technicals.get(index)
        chain = self.option_chains.get(index)
        spot = self.last_spots.get(index, candles[-1].close if candles else 0.0)
        if technical and chain and spot > 0:
            current_vol = candles[-1].volume if candles else 0.0
            recent_vols = [c.volume for c in candles[-20:] if c.volume > 0]
            avg_vol_20 = sum(recent_vols) / len(recent_vols) if recent_vols else 0.0
            self.signals[index] = self.signal_generator.generate(
                index,
                spot,
                technical,
                chain,
                0.0,
                current_volume=current_vol,
                avg_volume_20=avg_vol_20,
                ts=now,
                is_expiry_day=now.weekday() == 3,
            )
        candles_5m = self._best_fvg_candles(index)
        if candles_5m:
            observation = self.fvg_strategy.evaluate(index, candles_5m, now, is_expiry_day=now.weekday() == 3)
            self.fvg_observations[index] = observation
            self._log_fvg_observation(index, observation)

    def _volume_delta(self, token: int, cumulative_volume: float) -> float:
        previous = self.last_volume_by_token.get(token)
        self.last_volume_by_token[token] = cumulative_volume
        if previous is None:
            return 1.0
        return max(cumulative_volume - previous, 1.0)

    def _index_for_token(self, token: int) -> IndexSymbol | None:
        if token == self.settings.nifty_index_token:
            return "NIFTY"
        if token == self.settings.banknifty_index_token:
            return "BANKNIFTY"
        return None

    def _append_tick_candle(self, index: IndexSymbol, ts: datetime, price: float, volume: float) -> None:
        bucket = ts.astimezone(timezone.utc).replace(second=0, microsecond=0)
        existing = self.candles[index][-1] if self.candles[index] else None
        if existing and existing.ts.astimezone(timezone.utc).replace(second=0, microsecond=0) == bucket:
            existing.high = max(existing.high, price)
            existing.low = min(existing.low, price)
            existing.close = price
            existing.volume += max(volume, 1.0)
        else:
            self.candles[index].append(Candle(ts=bucket, open=price, high=price, low=price, close=price, volume=max(volume, 1.0)))
            self.candles[index] = self.candles[index][-240:]
        live_five = self._aggregate_intraday(self.candles[index], 5)
        if live_five:
            self.candles_5m[index] = self._merge_candles(self.candles_5m.get(index, []), live_five)[-200:]

    def _apply_option_tick(self, contract: OptionContract, tick: dict[str, Any], ts: datetime, price: float) -> None:
        chain = self.option_chains.get(contract.name)
        if chain is None:
            return
        previous = next((snapshot for snapshot in chain.snapshots if snapshot.contract.instrument_token == contract.instrument_token), None)
        oi = float(tick.get("oi") or (previous.open_interest if previous else 0.0))
        cumulative_volume = float(tick.get("volume_traded") or tick.get("volume") or (previous.volume if previous else 0.0))
        updated = OptionSnapshot(
            contract=contract,
            last_price=price,
            open_interest=oi,
            oi_delta=oi - previous.open_interest if previous else 0.0,
            price_delta=price - previous.last_price if previous else 0.0,
            volume=cumulative_volume,
            ts=ts,
        )
        snapshots = [updated if snapshot.contract.instrument_token == contract.instrument_token else snapshot for snapshot in chain.snapshots]
        spot = self.last_spots.get(contract.name, chain.spot)
        self.option_chains[contract.name] = self.options_engine.build_chain(
            contract.name,
            spot,
            snapshots,
            spot_delta=spot - chain.spot,
            ts=ts,
        )

    def _aggregate_intraday(self, candles: list[Candle], minutes: int) -> list[Candle]:
        buckets: dict[datetime, list[Candle]] = {}
        for candle in candles:
            local = candle.ts.astimezone(timezone.utc)
            minute = (local.minute // minutes) * minutes
            key = local.replace(minute=minute, second=0, microsecond=0)
            buckets.setdefault(key, []).append(candle)
        rows: list[Candle] = []
        for key, bucket in sorted(buckets.items()):
            ordered = sorted(bucket, key=lambda candle: candle.ts)
            rows.append(
                Candle(
                    ts=key,
                    open=ordered[0].open,
                    high=max(candle.high for candle in ordered),
                    low=min(candle.low for candle in ordered),
                    close=ordered[-1].close,
                    volume=sum(candle.volume for candle in ordered),
                )
            )
        return rows

    def _merge_candles(self, old: list[Candle], new: list[Candle]) -> list[Candle]:
        merged = {candle.ts.astimezone(timezone.utc): candle for candle in old}
        for candle in new:
            merged[candle.ts.astimezone(timezone.utc)] = candle
        return [merged[key] for key in sorted(merged)]

    def _best_fvg_candles(self, index: IndexSymbol) -> list[Candle]:
        live_five = self._aggregate_intraday(self.candles.get(index, []), 5)
        return self._merge_candles(self.candles_5m.get(index, []), live_five)[-200:]

    def envelope(self) -> MarketEnvelope:
        return MarketEnvelope(
            status=self.status,
            candles=self.candles,
            technicals=self.technicals,
            option_chains=self.option_chains,
            news=self.news,
            signals=self.signals,
            fvg_observations=self.fvg_observations,
            risk=self.risk_manager.state,
        )

    def _clear_market_data(self, keep_last: bool = False) -> None:
        if keep_last and any(self.candles.values()):
            return
        self.candles = {"NIFTY": [], "BANKNIFTY": []}
        self.candles_5m = {"NIFTY": [], "BANKNIFTY": []}
        self.technicals = {}
        self.option_chains = {}
        self.news = []
        self.signals = {}
        self.fvg_observations = {}
        self.last_ticks_by_token = {}
        self.last_volume_by_token = {}

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
                    try:
                        self.technicals[index] = self.technical_engine.analyze(candles)
                    except ValueError:
                        # zero-volume index bars — keep candles, skip indicators
                        pass
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
                    volume=self._normalized_volume(token, row[5]),
                    oi=float(row[6]) if len(row) > 6 and row[6] is not None else None,
                )
            )
        return candles

    async def _kite_candles_5m(self, kite_client: KiteClientProtocol, index: IndexSymbol, now: datetime) -> list[Candle]:
        """5-minute index candles for the observe-only FVG paper strategy."""
        token = self.settings.banknifty_index_token if index == "BANKNIFTY" else self.settings.nifty_index_token
        payload = await kite_client.historical(token, "5minute", now - timedelta(days=12), now)
        rows = payload.get("candles", []) if isinstance(payload, dict) else []
        candles: list[Candle] = []
        for row in rows[-200:]:
            if len(row) < 6:
                continue
            candles.append(
                Candle(
                    ts=self._parse_kite_ts(row[0]),
                    open=float(row[1]),
                    high=float(row[2]),
                    low=float(row[3]),
                    close=float(row[4]),
                    volume=self._normalized_volume(token, row[5]),
                    oi=float(row[6]) if len(row) > 6 and row[6] is not None else None,
                )
            )
        return candles

    def _normalized_volume(self, instrument_token: int, raw_volume: object) -> float:
        volume = float(raw_volume)
        if instrument_token in {self.settings.nifty_index_token, self.settings.banknifty_index_token} and volume <= 0:
            return 1.0
        return volume

    def _log_fvg_observation(self, index: IndexSymbol, observation: TradingSignal) -> None:
        """Record a fresh FVG paper signal. Logging only — no order is placed."""
        if observation.action == "WAIT":
            return
        key = observation.generated_at.isoformat()
        if self._fvg_last_logged.get(index) == key:
            return
        self._fvg_last_logged[index] = key
        logger.info(
            "FVG PAPER SIGNAL [%s] %s entry=%.2f stop=%.2f target=%.2f bar=%s "
            "— observe-only, no order placed",
            index, observation.action,
            observation.entry_price or 0.0,
            observation.stop_loss or 0.0,
            observation.target_price or 0.0,
            key,
        )

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
