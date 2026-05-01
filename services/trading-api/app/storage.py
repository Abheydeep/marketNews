from __future__ import annotations

import json
from typing import Any


class HotStateCache:
    def __init__(self, redis_url: str) -> None:
        self.redis_url = redis_url
        self._redis = None

    async def connect(self) -> None:
        try:
            from redis.asyncio import from_url  # type: ignore
        except ImportError:
            self._redis = None
            return
        self._redis = from_url(self.redis_url, decode_responses=True)

    async def set_json(self, key: str, payload: dict[str, Any], ttl_seconds: int = 30) -> None:
        if self._redis is None:
            return
        await self._redis.set(key, json.dumps(payload, default=str), ex=ttl_seconds)

    async def get_json(self, key: str) -> dict[str, Any] | None:
        if self._redis is None:
            return None
        raw = await self._redis.get(key)
        return json.loads(raw) if raw else None


class TradingPostgresRecorder:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        self._pool = None

    async def connect(self) -> None:
        try:
            import asyncpg  # type: ignore
        except ImportError:
            self._pool = None
            return
        self._pool = await asyncpg.create_pool(self.database_url)

    async def record_signal(self, signal: dict[str, Any]) -> None:
        if self._pool is None:
            return
        async with self._pool.acquire() as connection:
            await connection.execute(
                """
                insert into trading.signals
                  (index_symbol, action, entry_price, target_price, stop_loss, confidence, reasons, generated_at)
                values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
                """,
                signal["index"],
                signal["action"],
                signal.get("entry_price"),
                signal.get("target_price"),
                signal.get("stop_loss"),
                signal["confidence"],
                json.dumps(signal["reasons"]),
                signal["generated_at"],
            )
