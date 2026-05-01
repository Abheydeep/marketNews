from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.config import Settings
from app.schemas import IndexSymbol, OptionChain, OrderProposal, OrderResult, RiskState, TradingSignal


class RiskManager:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.state = RiskState(
            live_orders_enabled=settings.enable_live_orders,
            daily_loss_limit=settings.daily_loss_limit,
            open_positions_by_index={"NIFTY": 0, "BANKNIFTY": 0},
        )

    def set_kill_switch(self, enabled: bool) -> RiskState:
        self.state.kill_switch_enabled = enabled
        return self.state

    def create_proposal(self, signal: TradingSignal, option_chain: OptionChain) -> OrderProposal:
        if signal.action not in {"BUY", "SELL"}:
            raise ValueError("Only directional BUY/SELL signals can create order proposals")
        option_type = "CE" if signal.action == "BUY" else "PE"
        candidates = [snapshot for snapshot in option_chain.snapshots if snapshot.contract.option_type == option_type]
        if not candidates:
            raise ValueError(f"No {option_type} ATM option is available for {signal.index}")
        selected = min(candidates, key=lambda snapshot: abs(snapshot.contract.strike - option_chain.spot))
        now = datetime.now(timezone.utc)
        return OrderProposal(
            proposal_id=str(uuid4()),
            index=signal.index,
            signal_action=signal.action,  # type: ignore[arg-type]
            tradingsymbol=selected.contract.tradingsymbol,
            quantity=selected.contract.lot_size,
            limit_price=max(round(selected.last_price, 2), 0.05),
            target_price=signal.target_price,
            stop_loss=signal.stop_loss,
            created_at=now,
            expires_at=now + timedelta(seconds=self.settings.stale_tick_seconds),
            reasons=signal.reasons,
        )

    def validate_confirmation(
        self,
        proposal: OrderProposal,
        manual_confirm: bool,
        token_valid: bool,
        quote_present: bool,
        margin_present: bool,
        now: datetime | None = None,
    ) -> OrderResult:
        current_time = now or datetime.now(timezone.utc)
        blocks: list[str] = []
        if not self.state.live_orders_enabled:
            blocks.append("ENABLE_LIVE_ORDERS is not true")
        if not manual_confirm:
            blocks.append("manual confirmation is required")
        if self.state.kill_switch_enabled:
            blocks.append("global kill switch is enabled")
        if current_time > proposal.expires_at:
            blocks.append("order proposal has expired because market data is stale")
        if not token_valid:
            blocks.append("Kite session token is missing or expired")
        if not quote_present:
            blocks.append("latest option quote is missing")
        if not margin_present:
            blocks.append("margin data is missing")
        if self.state.daily_realized_pnl <= -abs(self.state.daily_loss_limit):
            blocks.append("daily loss lockout is active")
        open_positions = self.state.open_positions_by_index.get(proposal.index, 0)
        if open_positions >= self.settings.max_open_positions_per_index:
            blocks.append(f"max open positions reached for {proposal.index}")
        if blocks:
            return OrderResult(proposal_id=proposal.proposal_id, status="BLOCKED", reasons=blocks)
        return OrderResult(proposal_id=proposal.proposal_id, status="PROPOSED", reasons=["risk checks passed"])

    def register_placed_order(self, index: IndexSymbol) -> RiskState:
        self.state.open_positions_by_index[index] = self.state.open_positions_by_index.get(index, 0) + 1
        return self.state

