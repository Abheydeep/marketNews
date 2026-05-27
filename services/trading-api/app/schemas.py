from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


IndexSymbol = Literal["NIFTY", "BANKNIFTY"]
SignalAction = Literal["BUY", "SELL", "WAIT"]
OptionType = Literal["CE", "PE"]
OrderStatus = Literal["PROPOSED", "BLOCKED", "PLACED", "REJECTED"]


class Candle(BaseModel):
    ts: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    oi: float | None = None


class IndicatorSnapshot(BaseModel):
    ema: float
    rsi: float
    macd: float
    macd_signal: float
    vwap: float


class PivotPoint(BaseModel):
    index: int
    ts: datetime
    price: float
    kind: Literal["support", "resistance"]
    strength: float = 0.0


class PriceZone(BaseModel):
    lower: float
    upper: float
    center: float
    kind: Literal["support", "resistance"]
    strength: float


class Trendline(BaseModel):
    kind: Literal["support", "resistance"]
    slope: float
    intercept: float
    start_index: int
    end_index: int


class TechnicalSnapshot(BaseModel):
    indicators: IndicatorSnapshot
    pivots: list[PivotPoint]
    wick_zones: list[PriceZone]
    kde_zones: list[PriceZone]
    trendlines: list[Trendline]


class OptionContract(BaseModel):
    instrument_token: int
    tradingsymbol: str
    exchange: str = "NFO"
    name: IndexSymbol
    expiry: datetime
    strike: float
    option_type: OptionType
    lot_size: int


class OptionSnapshot(BaseModel):
    contract: OptionContract
    last_price: float
    open_interest: float
    oi_delta: float = 0.0
    price_delta: float = 0.0
    volume: float = 0.0
    ts: datetime


class PCRSnapshot(BaseModel):
    index: IndexSymbol
    put_oi: float
    call_oi: float
    pcr: float
    velocity_5m: float
    ts: datetime


class OptionChain(BaseModel):
    index: IndexSymbol
    spot: float
    expiry: datetime
    snapshots: list[OptionSnapshot]
    pcr: PCRSnapshot
    oi_status: str


class NewsEvent(BaseModel):
    id: str
    headline: str
    source: str
    published_at: datetime
    url: str | None = None
    sentiment_label: Literal["positive", "neutral", "negative"] = "neutral"
    sentiment_score: float = Field(0.0, ge=-1.0, le=1.0)


class TradingSignal(BaseModel):
    index: IndexSymbol
    action: SignalAction
    entry_price: float | None = None
    target_price: float | None = None
    stop_loss: float | None = None
    confidence: float = Field(0.0, ge=0.0, le=100.0)
    reasons: list[str]
    generated_at: datetime


class FVGPaperTrade(BaseModel):
    """A durable journal entry for an FVG paper signal.

    Tracked from entry through stop/target/timeout against subsequent 5-min
    candles. Observe-only — no broker orders are ever placed for these.
    """
    id: str
    index: IndexSymbol
    direction: Literal["BUY", "SELL"]
    entry_price: float
    stop_loss: float
    target_price: float
    entry_ts: datetime
    status: Literal["OPEN", "WIN", "LOSS", "TIMEOUT"] = "OPEN"
    exit_price: float | None = None
    exit_ts: datetime | None = None
    confidence: float = 0.0
    reasons: list[str] = Field(default_factory=list)


class RiskState(BaseModel):
    live_orders_enabled: bool
    kill_switch_enabled: bool = False
    daily_realized_pnl: float = 0.0
    daily_loss_limit: float = 2500.0
    open_positions_by_index: dict[IndexSymbol, int] = Field(default_factory=dict)


class MarketDataStatus(BaseModel):
    mode: Literal["mock", "kite"]
    is_live: bool
    kite_configured: bool
    kite_session_valid: bool
    message: str
    updated_at: datetime
    last_refresh_at: datetime | None = None


class OrderProposal(BaseModel):
    proposal_id: str
    status: OrderStatus = "PROPOSED"
    index: IndexSymbol
    signal_action: Literal["BUY", "SELL"]
    tradingsymbol: str
    exchange: str = "NFO"
    transaction_type: Literal["BUY"] = "BUY"
    product: Literal["MIS"] = "MIS"
    order_type: Literal["LIMIT"] = "LIMIT"
    quantity: int
    limit_price: float
    target_price: float | None = None
    stop_loss: float | None = None
    created_at: datetime
    expires_at: datetime
    reasons: list[str] = Field(default_factory=list)


class OrderConfirmation(BaseModel):
    proposal_id: str
    manual_confirm: bool


class OrderResult(BaseModel):
    proposal_id: str
    status: OrderStatus
    broker_order_id: str | None = None
    reasons: list[str]


class MarketEnvelope(BaseModel):
    status: MarketDataStatus
    candles: dict[IndexSymbol, list[Candle]]
    technicals: dict[IndexSymbol, TechnicalSnapshot]
    option_chains: dict[IndexSymbol, OptionChain]
    news: list[NewsEvent]
    signals: dict[IndexSymbol, TradingSignal]
    # Observe-only FVG paper signals — recorded for live validation, never traded.
    fvg_observations: dict[IndexSymbol, TradingSignal] = Field(default_factory=dict)
    # Durable history of FVG paper trades (entered, plus WIN/LOSS/TIMEOUT outcomes).
    fvg_journal: list[FVGPaperTrade] = Field(default_factory=list)
    risk: RiskState
