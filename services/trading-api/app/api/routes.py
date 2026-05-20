from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.adapters.kite.auth import KiteAuthService
from app.adapters.kite.client import KiteHttpClient
from app.auth import auth_service as trading_auth_service
from app.auth import require_trading_admin
from app.config import settings
from app.schemas import IndexSymbol, OrderConfirmation, OrderResult
from app.state import trading_state


admin_only = [Depends(require_trading_admin)]
router = APIRouter()
auth_service = KiteAuthService(settings)
kite_client = KiteHttpClient(settings, auth_service)


class KiteSessionRequest(BaseModel):
    request_token: str


class KillSwitchRequest(BaseModel):
    enabled: bool = True


class ProposalRequest(BaseModel):
    index: IndexSymbol


@router.get("/api/kite/login-url", dependencies=admin_only)
async def kite_login_url() -> dict[str, str]:
    if not settings.kite_api_key:
        raise HTTPException(status_code=400, detail="KITE_API_KEY is not configured")
    return {"login_url": auth_service.login_url()}


@router.post("/api/kite/session", dependencies=admin_only)
async def kite_session(request: KiteSessionRequest) -> dict[str, object]:
    if not settings.kite_api_key or not settings.kite_api_secret:
        raise HTTPException(status_code=400, detail="Kite API credentials are not configured")
    payload = await kite_client.exchange_request_token(request.request_token)
    status = await trading_state.refresh_from_kite(kite_client)
    return {
        "user_id": payload.get("user_id"),
        "login_time": payload.get("login_time"),
        "expires_at": payload.get("expires_at"),
        "market_status": status.model_dump(mode="json"),
    }


@router.get("/api/kite/status", dependencies=admin_only)
async def kite_status() -> dict[str, object]:
    return {
        "market_mode": settings.trading_market_mode,
        "kite_configured": bool(settings.kite_api_key),
        "secret_configured": bool(settings.kite_api_secret),
        "token_valid": auth_service.token_store.token_valid(),
        "login_url": auth_service.login_url() if settings.kite_api_key else None,
    }


@router.post("/api/instruments/refresh", dependencies=admin_only)
async def refresh_instruments() -> dict[str, object]:
    if not auth_service.token_store.token_valid():
        raise HTTPException(status_code=401, detail="Kite token is missing or expired")
    contracts = await trading_state.refresh_instruments(kite_client)
    return {"contracts": len(contracts), "source": "kite"}


@router.get("/api/options/chain", dependencies=admin_only)
async def option_chain(index: IndexSymbol) -> object:
    return trading_state.option_chains[index]


@router.get("/api/signals/latest", dependencies=admin_only)
async def latest_signal(index: IndexSymbol) -> object:
    signal = trading_state.signals.get(index)
    if signal is None:
        raise HTTPException(status_code=503, detail=f"Signal for {index} not yet available — Kite session may still be loading")
    return signal


@router.get("/api/market/envelope", dependencies=admin_only)
async def market_envelope() -> object:
    await trading_state.refresh_if_due(kite_client)
    return trading_state.envelope()


@router.post("/api/market/refresh", dependencies=admin_only)
async def refresh_market() -> object:
    return await trading_state.refresh_from_kite(kite_client)


@router.post("/api/orders/proposals", dependencies=admin_only)
async def create_order_proposal(request: ProposalRequest) -> object:
    signal = trading_state.signals[request.index]
    if signal.action == "WAIT":
        raise HTTPException(status_code=409, detail="Latest signal is WAIT; no order proposal created")
    proposal = trading_state.risk_manager.create_proposal(signal, trading_state.option_chains[request.index])
    trading_state.proposals[proposal.proposal_id] = proposal
    return proposal


@router.post("/api/orders/confirm", dependencies=admin_only)
async def confirm_order(request: OrderConfirmation) -> OrderResult:
    proposal = trading_state.proposals.get(request.proposal_id)
    if proposal is None:
        raise HTTPException(status_code=404, detail="Order proposal not found")
    token_valid = auth_service.token_store.token_valid()
    quote_present = False
    margin_present = False
    if token_valid and trading_state.risk_manager.state.live_orders_enabled:
        try:
            quotes = await kite_client.ltp([f"NFO:{proposal.tradingsymbol}"])
            quote_present = f"NFO:{proposal.tradingsymbol}" in quotes
            margin_present = bool(await kite_client.margins())
        except Exception:
            quote_present = False
            margin_present = False
    risk_result = trading_state.risk_manager.validate_confirmation(
        proposal=proposal,
        manual_confirm=request.manual_confirm,
        token_valid=token_valid,
        quote_present=quote_present,
        margin_present=margin_present,
    )
    if risk_result.status == "BLOCKED":
        return risk_result
    order_payload = {
        "tradingsymbol": proposal.tradingsymbol,
        "exchange": proposal.exchange,
        "transaction_type": proposal.transaction_type,
        "order_type": proposal.order_type,
        "quantity": proposal.quantity,
        "product": proposal.product,
        "validity": "DAY",
        "price": proposal.limit_price,
        "tag": "trading-cockpit",
    }
    broker_order_id = await kite_client.place_order(order_payload)
    trading_state.risk_manager.register_placed_order(proposal.index)
    return OrderResult(
        proposal_id=proposal.proposal_id,
        status="PLACED",
        broker_order_id=broker_order_id,
        reasons=["order placed after manual confirmation and risk checks"],
    )


@router.post("/api/orders/kill-switch", dependencies=admin_only)
async def kill_switch(request: KillSwitchRequest) -> object:
    return trading_state.risk_manager.set_kill_switch(request.enabled)


@router.websocket("/ws/market")
async def market_socket(websocket: WebSocket) -> None:
    try:
        trading_auth_service.websocket_admin(websocket)
    except HTTPException:
        await websocket.close(code=1008)
        return
    await websocket.accept()
    try:
        while True:
            await trading_state.refresh_if_due(kite_client)
            envelope = trading_state.envelope().model_dump(mode="json")
            envelope["server_ts"] = datetime.now(timezone.utc).isoformat()
            await websocket.send_json(envelope)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        return
