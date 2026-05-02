from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    app_name: str = "Nifty/Bank Nifty Trading API"
    api_host: str = os.getenv("TRADING_API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("TRADING_API_PORT", "8090"))
    cors_origin: str = os.getenv("TRADING_CORS_ORIGIN", "http://localhost:3002")
    auth_required: bool = _bool_env("TRADING_AUTH_REQUIRED", True)
    jwt_secret: str = os.getenv("JWT_SECRET", "change-this-local-demo-secret-change-this-local-demo-secret")
    jwt_issuer: str = os.getenv("JWT_ISSUER", "market-narrative-local")
    trading_admin_email: str = os.getenv("TRADING_ADMIN_EMAIL", "abhey@marketnarrative.local")
    kite_api_key: str = os.getenv("KITE_API_KEY", "")
    kite_api_secret: str = os.getenv("KITE_API_SECRET", "")
    kite_redirect_url: str = os.getenv("KITE_REDIRECT_URL", "http://localhost:3002/kite/callback")
    kite_base_url: str = os.getenv("KITE_BASE_URL", "https://api.kite.trade")
    kite_login_url: str = os.getenv("KITE_LOGIN_URL", "https://kite.zerodha.com/connect/login")
    trading_market_mode: str = os.getenv("TRADING_MARKET_MODE", "mock").strip().lower()
    kite_refresh_seconds: int = int(os.getenv("KITE_REFRESH_SECONDS", "60"))
    nifty_index_token: int = int(os.getenv("NIFTY_INDEX_TOKEN", "256265"))
    banknifty_index_token: int = int(os.getenv("BANKNIFTY_INDEX_TOKEN", "260105"))
    token_store_path: Path = Path(os.getenv("KITE_TOKEN_STORE", ".local/kite-session.json"))
    token_encryption_key: str = os.getenv("TRADING_TOKEN_KEY", "")
    enable_live_orders: bool = _bool_env("ENABLE_LIVE_ORDERS", False)
    daily_loss_limit: float = float(os.getenv("TRADING_DAILY_LOSS_LIMIT", "2500"))
    max_open_positions_per_index: int = int(os.getenv("TRADING_MAX_OPEN_POSITIONS_PER_INDEX", "1"))
    stale_tick_seconds: int = int(os.getenv("TRADING_STALE_TICK_SECONDS", "10"))
    newsapi_key: str = os.getenv("NEWSAPI_AI_KEY", "")
    eodhd_key: str = os.getenv("EODHD_API_KEY", "")
    enable_finbert: bool = _bool_env("ENABLE_FINBERT", False)
    database_url: str = os.getenv(
        "TRADING_DATABASE_URL",
        "postgresql://narrative:narrative@localhost:5432/market_narrative",
    )
    redis_url: str = os.getenv("TRADING_REDIS_URL", "redis://localhost:6379/1")


settings = Settings()
