import base64
import hashlib
import hmac
import json
import time

import pytest
from fastapi import HTTPException

from app.auth import TradingAuthService
from app.config import Settings


def make_token(secret, issuer, email, permissions):
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "iss": issuer,
        "sub": email,
        "name": "Test Admin",
        "role": "ADMIN",
        "permissions": permissions,
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    }
    unsigned = ".".join([b64(header), b64(payload)])
    signature = base64.urlsafe_b64encode(hmac.new(secret.encode(), unsigned.encode(), hashlib.sha256).digest()).decode().rstrip("=")
    return f"{unsigned}.{signature}"


def b64(payload):
    return base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")


def test_auth_allows_only_desk_trading_admin():
    settings = Settings(
        jwt_secret="test-secret",
        jwt_issuer="market-narrative-test",
        trading_admin_email="desk@marketnarrative.local",
    )
    service = TradingAuthService(settings)
    token = make_token(settings.jwt_secret, settings.jwt_issuer, "desk@marketnarrative.local", ["admin:read", "trade:execute"])
    admin = service.validate_bearer(f"Bearer {token}")
    assert admin.email == "desk@marketnarrative.local"


def test_auth_rejects_other_admin_without_trade_permission():
    settings = Settings(
        jwt_secret="test-secret",
        jwt_issuer="market-narrative-test",
        trading_admin_email="desk@marketnarrative.local",
    )
    service = TradingAuthService(settings)
    token = make_token(settings.jwt_secret, settings.jwt_issuer, "admin@marketnarrative.local", ["admin:read"])
    with pytest.raises(HTTPException) as exc:
        service.validate_bearer(f"Bearer {token}")
    assert exc.value.status_code == 403
