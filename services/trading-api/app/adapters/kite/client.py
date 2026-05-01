from __future__ import annotations

import asyncio
import time
from datetime import datetime
from typing import Any

from app.adapters.kite.auth import KiteAuthService
from app.config import Settings


class AsyncRateLimiter:
    def __init__(self, calls_per_second: float) -> None:
        self.interval = 1.0 / calls_per_second
        self._last_call = 0.0
        self._lock = asyncio.Lock()

    async def wait(self) -> None:
        async with self._lock:
            now = time.monotonic()
            wait_for = self.interval - (now - self._last_call)
            if wait_for > 0:
                await asyncio.sleep(wait_for)
            self._last_call = time.monotonic()


class KiteHttpClient:
    def __init__(self, settings: Settings, auth: KiteAuthService) -> None:
        self.settings = settings
        self.auth = auth
        self.historical_limiter = AsyncRateLimiter(3)
        self.quote_limiter = AsyncRateLimiter(1)

    def headers(self) -> dict[str, str]:
        token = self.auth.token_store.access_token()
        if not token:
            raise RuntimeError("Kite access token is missing or expired")
        return {"X-Kite-Version": "3", "Authorization": f"token {self.settings.kite_api_key}:{token}"}

    async def exchange_request_token(self, request_token: str) -> dict[str, Any]:
        import httpx

        checksum = self.auth.checksum(request_token)
        async with httpx.AsyncClient(base_url=self.settings.kite_base_url, timeout=10) as client:
            response = await client.post(
                "/session/token",
                data={
                    "api_key": self.settings.kite_api_key,
                    "request_token": request_token,
                    "checksum": checksum,
                },
                headers={"X-Kite-Version": "3"},
            )
            response.raise_for_status()
            payload = response.json()["data"]
        payload["expires_at"] = self.auth.session_expiry().isoformat()
        self.auth.token_store.save(payload)
        return payload

    async def instruments(self) -> str:
        import httpx

        async with httpx.AsyncClient(base_url=self.settings.kite_base_url, timeout=30) as client:
            response = await client.get("/instruments", headers=self.headers())
            response.raise_for_status()
            return response.text

    async def historical(
        self,
        instrument_token: int,
        interval: str,
        from_ts: datetime,
        to_ts: datetime,
        continuous: bool = False,
        oi: bool = False,
    ) -> dict[str, Any]:
        import httpx

        await self.historical_limiter.wait()
        params = {
            "from": from_ts.strftime("%Y-%m-%d %H:%M:%S"),
            "to": to_ts.strftime("%Y-%m-%d %H:%M:%S"),
            "continuous": 1 if continuous else 0,
            "oi": 1 if oi else 0,
        }
        path = f"/instruments/historical/{instrument_token}/{interval}"
        async with httpx.AsyncClient(base_url=self.settings.kite_base_url, timeout=20) as client:
            response = await client.get(path, params=params, headers=self.headers())
            response.raise_for_status()
            return response.json()["data"]

    async def ltp(self, instruments: list[str]) -> dict[str, Any]:
        import httpx

        await self.quote_limiter.wait()
        params = [("i", instrument) for instrument in instruments]
        async with httpx.AsyncClient(base_url=self.settings.kite_base_url, timeout=10) as client:
            response = await client.get("/quote/ltp", params=params, headers=self.headers())
            response.raise_for_status()
            return response.json()["data"]

    async def margins(self) -> dict[str, Any]:
        import httpx

        async with httpx.AsyncClient(base_url=self.settings.kite_base_url, timeout=10) as client:
            response = await client.get("/user/margins", headers=self.headers())
            response.raise_for_status()
            return response.json()["data"]

    async def place_order(self, payload: dict[str, Any]) -> str:
        import httpx

        async with httpx.AsyncClient(base_url=self.settings.kite_base_url, timeout=10) as client:
            response = await client.post("/orders/regular", data=payload, headers=self.headers())
            response.raise_for_status()
            return str(response.json()["data"]["order_id"])

