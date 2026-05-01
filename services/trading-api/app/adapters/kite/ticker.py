from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from typing import Any


TickCallback = Callable[[list[dict[str, Any]]], Awaitable[None]]


class KiteTickerBridge:
    """Threaded KiteTicker bridge that forwards full-mode ticks into asyncio code."""

    def __init__(self, api_key: str, access_token: str, on_ticks: TickCallback) -> None:
        self.api_key = api_key
        self.access_token = access_token
        self.on_ticks = on_ticks
        self._ticker = None

    def start(self, instrument_tokens: list[int]) -> None:
        try:
            from kiteconnect import KiteTicker  # type: ignore
        except ImportError as exc:
            raise RuntimeError("kiteconnect is required for live ticker streaming") from exc

        loop = asyncio.get_running_loop()
        ticker = KiteTicker(self.api_key, self.access_token)

        def handle_connect(ws: Any, _response: Any) -> None:
            ws.subscribe(instrument_tokens)
            ws.set_mode(ws.MODE_FULL, instrument_tokens)

        def handle_ticks(_ws: Any, ticks: list[dict[str, Any]]) -> None:
            asyncio.run_coroutine_threadsafe(self.on_ticks(ticks), loop)

        ticker.on_connect = handle_connect
        ticker.on_ticks = handle_ticks
        ticker.connect(threaded=True)
        self._ticker = ticker

    def stop(self) -> None:
        if self._ticker is not None:
            self._ticker.close()
            self._ticker = None

