from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode

from app.config import Settings


class RedisKiteTokenStore:
    """Persists the Kite session token in Redis so it survives container restarts."""

    def __init__(self, redis_url: str, redis_key: str, encryption_key: str = "") -> None:
        self.redis_url = redis_url
        self.redis_key = redis_key
        self.encryption_key = encryption_key
        self._redis = None

    def _connect(self):
        if self._redis is not None:
            return self._redis
        try:
            from redis import from_url  # type: ignore
            self._redis = from_url(self.redis_url, decode_responses=True)
        except Exception:
            self._redis = None
        return self._redis

    def save(self, payload: dict[str, object]) -> None:
        client = self._connect()
        if client is None:
            return
        text = json.dumps(payload, indent=2, sort_keys=True)
        if self.encryption_key:
            text = json.dumps({"encrypted": True, "payload": self._encrypt(text)}, sort_keys=True)
        # Keep for 30 hours — covers the 6 AM daily expiry + buffer
        client.set(self.redis_key, text, ex=30 * 3600)

    def load(self) -> dict[str, object] | None:
        client = self._connect()
        if client is None:
            return None
        try:
            raw = client.get(self.redis_key)
            if not raw:
                return None
            payload = json.loads(raw)
            if payload.get("encrypted"):
                return json.loads(self._decrypt(str(payload["payload"])))
            return payload
        except Exception:
            return None

    def token_valid(self) -> bool:
        payload = self.load()
        if not payload:
            return False
        expires_at = payload.get("expires_at")
        if not expires_at:
            return False
        try:
            parsed = datetime.fromisoformat(str(expires_at))
        except ValueError:
            return False
        parsed = parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        return parsed > datetime.now(timezone.utc)

    def access_token(self) -> str | None:
        payload = self.load()
        if not payload or not self.token_valid():
            return None
        token = payload.get("access_token")
        return str(token) if token else None

    def _encrypt(self, text: str) -> str:
        try:
            from cryptography.fernet import Fernet  # type: ignore
        except ImportError as exc:
            raise RuntimeError("TRADING_TOKEN_KEY requires cryptography to be installed") from exc
        return Fernet(self.encryption_key.encode("utf-8")).encrypt(text.encode("utf-8")).decode("utf-8")

    def _decrypt(self, token: str) -> str:
        try:
            from cryptography.fernet import Fernet  # type: ignore
        except ImportError as exc:
            raise RuntimeError("TRADING_TOKEN_KEY requires cryptography to be installed") from exc
        return Fernet(self.encryption_key.encode("utf-8")).decrypt(token.encode("utf-8")).decode("utf-8")


class KiteTokenStore:
    def __init__(self, path: Path, encryption_key: str = "") -> None:
        self.path = path
        self.encryption_key = encryption_key

    def save(self, payload: dict[str, object]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        text = json.dumps(payload, indent=2, sort_keys=True)
        if self.encryption_key:
            text = json.dumps({"encrypted": True, "payload": self._encrypt(text)}, sort_keys=True)
        self.path.write_text(text, encoding="utf-8")
        self.path.chmod(0o600)

    def load(self) -> dict[str, object] | None:
        if not self.path.exists():
            return None
        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
            if payload.get("encrypted"):
                return json.loads(self._decrypt(str(payload["payload"])))
            return payload
        except json.JSONDecodeError:
            return None

    def token_valid(self) -> bool:
        payload = self.load()
        if not payload:
            return False
        expires_at = payload.get("expires_at")
        if not expires_at:
            return False
        try:
            parsed = datetime.fromisoformat(str(expires_at))
        except ValueError:
            return False
        parsed = parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        return parsed > datetime.now(timezone.utc)

    def access_token(self) -> str | None:
        payload = self.load()
        if not payload or not self.token_valid():
            return None
        token = payload.get("access_token")
        return str(token) if token else None

    def _encrypt(self, text: str) -> str:
        try:
            from cryptography.fernet import Fernet  # type: ignore
        except ImportError as exc:
            raise RuntimeError("TRADING_TOKEN_KEY requires cryptography to be installed") from exc
        return Fernet(self.encryption_key.encode("utf-8")).encrypt(text.encode("utf-8")).decode("utf-8")

    def _decrypt(self, token: str) -> str:
        try:
            from cryptography.fernet import Fernet  # type: ignore
        except ImportError as exc:
            raise RuntimeError("TRADING_TOKEN_KEY requires cryptography to be installed") from exc
        return Fernet(self.encryption_key.encode("utf-8")).decrypt(token.encode("utf-8")).decode("utf-8")


class KiteAuthService:
    def __init__(self, settings: Settings, token_store=None) -> None:
        self.settings = settings
        if token_store is not None:
            self.token_store = token_store
        elif settings.kite_token_backend == "redis" and settings.redis_url:
            self.token_store = RedisKiteTokenStore(
                redis_url=settings.redis_url,
                redis_key=settings.kite_token_redis_key,
                encryption_key=settings.token_encryption_key,
            )
        else:
            self.token_store = KiteTokenStore(settings.token_store_path, settings.token_encryption_key)

    def login_url(self) -> str:
        query = urlencode({"v": "3", "api_key": self.settings.kite_api_key})
        return f"{self.settings.kite_login_url}?{query}"

    def checksum(self, request_token: str) -> str:
        raw = f"{self.settings.kite_api_key}{request_token}{self.settings.kite_api_secret}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def session_expiry(self, now: datetime | None = None) -> datetime:
        current = now or datetime.now(timezone.utc)
        ist_offset = timedelta(hours=5, minutes=30)
        ist_now = current + ist_offset
        expiry_ist = ist_now.replace(hour=6, minute=0, second=0, microsecond=0)
        if ist_now >= expiry_ist:
            expiry_ist += timedelta(days=1)
        return expiry_ist - ist_offset
