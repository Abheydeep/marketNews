from __future__ import annotations

import csv
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from io import StringIO
from typing import Iterable

from app.schemas import IndexSymbol, OptionChain, OptionContract, OptionSnapshot, PCRSnapshot


OI_LONG_BUILDUP = "Long Build-up"
OI_SHORT_BUILDUP = "Short Build-up"
OI_LONG_LIQUIDATION = "Long Liquidation"
OI_SHORT_COVERING = "Short Covering"
OI_NEUTRAL = "Neutral"


@dataclass(frozen=True)
class InstrumentMasterParser:
    banknifty_radius: float = 500.0
    nifty_radius: float = 500.0
    max_strikes: int = 10

    def parse_csv(self, payload: str) -> list[dict[str, str]]:
        return list(csv.DictReader(StringIO(payload)))

    def contracts_from_records(self, records: Iterable[dict[str, object]], today: datetime | None = None) -> list[OptionContract]:
        now = today or datetime.now(timezone.utc)
        contracts: list[OptionContract] = []
        for record in records:
            segment = str(record.get("segment", ""))
            instrument_type = str(record.get("instrument_type", ""))
            name = str(record.get("name", "")).upper()
            if segment != "NFO-OPT" or instrument_type not in {"CE", "PE"} or name not in {"NIFTY", "BANKNIFTY"}:
                continue
            expiry = self._parse_expiry(record.get("expiry"))
            if expiry is None or expiry.date() < now.date():
                continue
            try:
                contracts.append(
                    OptionContract(
                        instrument_token=int(record.get("instrument_token", 0)),
                        tradingsymbol=str(record.get("tradingsymbol") or record.get("trading_symbol")),
                        exchange=str(record.get("exchange", "NFO") or "NFO"),
                        name=name,  # type: ignore[arg-type]
                        expiry=expiry,
                        strike=float(record.get("strike", 0.0)),
                        option_type=instrument_type,  # type: ignore[arg-type]
                        lot_size=int(record.get("lot_size", 0) or 0),
                    )
                )
            except (TypeError, ValueError):
                continue
        return contracts

    def build_chain_contracts(
        self,
        contracts: list[OptionContract],
        index: IndexSymbol,
        spot: float,
        today: datetime | None = None,
    ) -> list[OptionContract]:
        now = today or datetime.now(timezone.utc)
        index_contracts = [contract for contract in contracts if contract.name == index and contract.expiry.date() >= now.date()]
        if not index_contracts:
            return []
        nearest_expiry = min(contract.expiry for contract in index_contracts)
        radius = self.banknifty_radius if index == "BANKNIFTY" else self.nifty_radius
        expiry_contracts = [
            contract
            for contract in index_contracts
            if contract.expiry == nearest_expiry and abs(contract.strike - spot) <= radius
        ]
        nearest_strikes = sorted({contract.strike for contract in expiry_contracts}, key=lambda strike: abs(strike - spot))[
            : self.max_strikes
        ]
        selected = [contract for contract in expiry_contracts if contract.strike in set(nearest_strikes)]
        return sorted(selected, key=lambda contract: (contract.strike, contract.option_type))

    def _parse_expiry(self, raw: object) -> datetime | None:
        if isinstance(raw, datetime):
            return raw if raw.tzinfo else raw.replace(tzinfo=timezone.utc)
        if raw is None:
            return None
        text = str(raw).strip()
        for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d-%b-%Y"):
            try:
                return datetime.strptime(text, fmt).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        try:
            parsed = datetime.fromisoformat(text)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return None


class PCRTracker:
    def __init__(self, window: timedelta = timedelta(minutes=5)) -> None:
        self.window = window
        self.history: dict[IndexSymbol, deque[PCRSnapshot]] = {"NIFTY": deque(), "BANKNIFTY": deque()}

    def update(self, index: IndexSymbol, snapshots: list[OptionSnapshot], ts: datetime) -> PCRSnapshot:
        put_oi = sum(snapshot.open_interest for snapshot in snapshots if snapshot.contract.option_type == "PE")
        call_oi = sum(snapshot.open_interest for snapshot in snapshots if snapshot.contract.option_type == "CE")
        pcr = put_oi / call_oi if call_oi else 0.0
        bucket = self.history[index]
        cutoff = ts - self.window
        while bucket and bucket[0].ts < cutoff:
            bucket.popleft()
        baseline = bucket[0].pcr if bucket else pcr
        current = PCRSnapshot(index=index, put_oi=put_oi, call_oi=call_oi, pcr=pcr, velocity_5m=pcr - baseline, ts=ts)
        bucket.append(current)
        return current


def classify_oi(spot_delta: float, oi_delta: float, epsilon: float = 0.0001) -> str:
    price_up = spot_delta > epsilon
    price_down = spot_delta < -epsilon
    oi_up = oi_delta > epsilon
    oi_down = oi_delta < -epsilon
    if price_up and oi_up:
        return OI_LONG_BUILDUP
    if price_down and oi_up:
        return OI_SHORT_BUILDUP
    if price_down and oi_down:
        return OI_LONG_LIQUIDATION
    if price_up and oi_down:
        return OI_SHORT_COVERING
    return OI_NEUTRAL


class OptionsMicrostructureEngine:
    def __init__(self, pcr_tracker: PCRTracker | None = None) -> None:
        self.pcr_tracker = pcr_tracker or PCRTracker()

    def build_chain(
        self,
        index: IndexSymbol,
        spot: float,
        snapshots: list[OptionSnapshot],
        spot_delta: float,
        ts: datetime,
    ) -> OptionChain:
        pcr = self.pcr_tracker.update(index, snapshots, ts)
        total_oi_delta = sum(snapshot.oi_delta for snapshot in snapshots)
        oi_status = classify_oi(spot_delta, total_oi_delta)
        expiry = min(snapshot.contract.expiry for snapshot in snapshots) if snapshots else ts
        return OptionChain(index=index, spot=spot, expiry=expiry, snapshots=snapshots, pcr=pcr, oi_status=oi_status)

