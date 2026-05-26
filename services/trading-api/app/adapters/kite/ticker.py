from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from concurrent.futures import Future
from typing import Any


TickCallback = Callable[[list[dict[str, Any]]], Awaitable[None]]
StatusCallback = Callable[[str], None]


class KiteTickerBridge:
    """Threaded KiteTicker bridge that forwards full-mode ticks into asyncio code."""

    def __init__(
        self,
        api_key: str,
        access_token: str,
        on_ticks: TickCallback,
        on_status: StatusCallback | None = None,
    ) -> None:
        self.api_key = api_key
        self.access_token = access_token
        self.on_ticks = on_ticks
        self.on_status = on_status
        self.instrument_tokens: list[int] = []
        self._ticker = None

    def start(self, instrument_tokens: list[int], loop: asyncio.AbstractEventLoop | None = None) -> None:
        try:
            from kiteconnect import KiteTicker  # type: ignore
        except ImportError as exc:
            raise RuntimeError("kiteconnect is required for live ticker streaming") from exc

        loop = loop or asyncio.get_running_loop()
        ticker = KiteTicker(self.api_key, self.access_token)
        self.instrument_tokens = list(instrument_tokens)

        def emit_status(message: str) -> None:
            if self.on_status is None:
                return
            loop.call_soon_threadsafe(self.on_status, message)

        def handle_connect(ws: Any, _response: Any) -> None:
            ws.subscribe(instrument_tokens)
            ws.set_mode(ws.MODE_FULL, instrument_tokens)
            emit_status(f"connected: subscribed {len(instrument_tokens)} instruments in full mode")

        def handle_ticks(_ws: Any, ticks: list[dict[str, Any]]) -> None:
            future = asyncio.run_coroutine_threadsafe(self.on_ticks(ticks), loop)

            def handle_tick_error(completed: Future[Any]) -> None:
                try:
                    completed.result()
                except Exception as exc:  # pragma: no cover - defensive callback
                    emit_status(f"tick handler failed: {exc}")

            future.add_done_callback(handle_tick_error)

        def handle_error(_ws: Any, code: Any, reason: Any) -> None:
            emit_status(f"error: {code} {reason}")

        def handle_close(_ws: Any, code: Any, reason: Any) -> None:
            emit_status(f"closed: {code} {reason}")

        def handle_reconnect(_ws: Any, attempts_count: int) -> None:
            emit_status(f"reconnecting: attempt {attempts_count}")

        def handle_noreconnect(_ws: Any) -> None:
            emit_status("closed: reconnect attempts exhausted")

        ticker.on_connect = handle_connect
        ticker.on_ticks = handle_ticks
        ticker.on_error = handle_error
        ticker.on_close = handle_close
        ticker.on_reconnect = handle_reconnect
        ticker.on_noreconnect = handle_noreconnect
        ticker.connect(threaded=True)
        self._ticker = ticker

    def stop(self) -> None:
        if self._ticker is not None:
            self._ticker.close()
            self._ticker = None
