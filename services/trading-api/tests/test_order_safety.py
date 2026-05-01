from datetime import datetime, timezone

from app.config import Settings
from app.domain.risk import RiskManager
from app.schemas import OrderProposal


def proposal():
    now = datetime.now(timezone.utc)
    return OrderProposal(
        proposal_id="p1",
        index="BANKNIFTY",
        signal_action="BUY",
        tradingsymbol="BANKNIFTYCE",
        quantity=15,
        limit_price=100,
        created_at=now,
        expires_at=now.replace(year=now.year + 1),
    )


def test_live_orders_are_blocked_without_env_unlock_and_manual_confirm():
    risk = RiskManager(Settings(enable_live_orders=False))
    result = risk.validate_confirmation(proposal(), manual_confirm=False, token_valid=True, quote_present=True, margin_present=True)
    assert result.status == "BLOCKED"
    assert "ENABLE_LIVE_ORDERS is not true" in result.reasons
    assert "manual confirmation is required" in result.reasons


def test_live_orders_pass_only_when_all_gates_pass():
    risk = RiskManager(Settings(enable_live_orders=True))
    result = risk.validate_confirmation(proposal(), manual_confirm=True, token_valid=True, quote_present=True, margin_present=True)
    assert result.status == "PROPOSED"

