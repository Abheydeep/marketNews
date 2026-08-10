from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Any

from fastapi import Header, HTTPException, WebSocket

from app.config import Settings, settings


@dataclass(frozen=True)
class TradingAdmin:
    email: str
    name: str
    permissions: list[str]


class TradingAuthService:
    def __init__(self, config: Settings) -> None:
        self.config = config

    def validate_bearer(self, authorization: str | None) -> TradingAdmin:
        if not self.config.auth_required:
            return TradingAdmin(self.config.trading_admin_email, "Dev Trading Admin", ["trade:read", "trade:execute"])
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Trading admin token is required")
        return self.validate_token(authorization[7:])

    def validate_token(self, token: str) -> TradingAdmin:
        try:
            header_b64, payload_b64, signature = token.split(".")
        except ValueError as exc:
            raise HTTPException(status_code=401, detail="Invalid token shape") from exc

        unsigned = f"{header_b64}.{payload_b64}"
        expected = self._sign(unsigned)
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=401, detail="Invalid token signature")

        payload = self._json_from_b64(payload_b64)
        if payload.get("iss") != self.config.jwt_issuer:
            raise HTTPException(status_code=401, detail="Invalid token issuer")
        if int(payload.get("exp", 0)) < int(time.time()):
            raise HTTPException(status_code=401, detail="Expired token")

        email = str(payload.get("sub", "")).lower()
        permissions = [str(permission) for permission in payload.get("permissions", [])]
        role = str(payload.get("role", ""))
        if email != self.config.trading_admin_email.lower() or role != "ADMIN" or "trade:execute" not in permissions:
            raise HTTPException(status_code=403, detail="Only the desk trading admin can access this service")
        return TradingAdmin(email=email, name=str(payload.get("name", "Trading Admin")), permissions=permissions)

    def websocket_admin(self, websocket: WebSocket) -> TradingAdmin:
        token = websocket.query_params.get("token")
        if not self.config.auth_required:
            return TradingAdmin(self.config.trading_admin_email, "Dev Trading Admin", ["trade:read", "trade:execute"])
        if not token:
            raise HTTPException(status_code=401, detail="Trading admin token is required")
        return self.validate_token(token)

    def _sign(self, unsigned: str) -> str:
        digest = hmac.new(self.config.jwt_secret.encode("utf-8"), unsigned.encode("utf-8"), hashlib.sha256).digest()
        return base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")

    def _json_from_b64(self, value: str) -> dict[str, Any]:
        padded = value + "=" * (-len(value) % 4)
        return json.loads(base64.urlsafe_b64decode(padded.encode("utf-8")))


auth_service = TradingAuthService(settings)


async def require_trading_admin(authorization: str | None = Header(default=None)) -> TradingAdmin:
    return auth_service.validate_bearer(authorization)
