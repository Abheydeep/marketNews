"""
FVG Paper Trade Journal — Redis-backed durable log
====================================================
Holds the multi-week record of every FVG paper signal the strategy emits
and tracks each one forward through the 5-min candles until it hits its
stop, its target, or the 48-bar (4-hour) timeout.

This is the piece that turns the live FVG Paper Lab from "current snapshot"
into a real, auditable paper-trade record. It is observe-only — no broker
orders are ever placed for any entry in this journal.

Storage: a single Redis key holding a JSON list of FVGPaperTrade records.
Capped at `limit` newest by entry timestamp. Survives container restarts on
Render free tier; falls back to an in-process dict if Redis is unreachable
(useful for tests and local mock mode).
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from app.schemas import Candle, FVGPaperTrade, IndexSymbol, TradingSignal

if TYPE_CHECKING:
    pass

logger = logging.getLogger("trading.fvg.journal")

_HOLD_BARS = 48   # 4 hours of 5-min candles before a TIMEOUT verdict


class FVGJournal:
    """Durable journal of FVG paper trades. Reads/writes a single Redis key."""

    def __init__(self, redis_url: str, redis_key: str, limit: int = 500) -> None:
        self.redis_url = redis_url
        self.redis_key = redis_key
        self.limit = max(50, limit)
        self._redis = None
        self._trades: dict[str, FVGPaperTrade] = {}
        self._load()

    # ── connection ──────────────────────────────────────────────────────────

    def _connect(self):
        if self._redis is not None:
            return self._redis
        if not self.redis_url:
            return None
        try:
            import redis  # type: ignore[import-not-found]
            self._redis = redis.from_url(self.redis_url, socket_timeout=2.5)
            self._redis.ping()
            return self._redis
        except Exception as exc:
            logger.warning("FVG journal: Redis unavailable (%s) — using in-memory only", exc)
            self._redis = None
            return None

    def _load(self) -> None:
        client = self._connect()
        if client is None:
            return
        try:
            raw = client.get(self.redis_key)
            if not raw:
                return
            data = json.loads(raw)
            self._trades = {
                row["id"]: FVGPaperTrade.model_validate(row) for row in data
            }
            logger.info("FVG journal: loaded %d paper trades from Redis", len(self._trades))
        except Exception as exc:
            logger.warning("FVG journal: failed to load from Redis (%s)", exc)

    def _save(self) -> None:
        client = self._connect()
        if client is None:
            return
        try:
            payload = json.dumps(
                [t.model_dump(mode="json") for t in self._trades.values()]
            )
            client.set(self.redis_key, payload)
        except Exception as exc:
            logger.warning("FVG journal: failed to save to Redis (%s)", exc)

    # ── public API ──────────────────────────────────────────────────────────

    def record(self, index: IndexSymbol, observation: TradingSignal) -> bool:
        """Persist a fresh BUY/SELL paper signal. Returns True if it was new."""
        if observation.action not in ("BUY", "SELL"):
            return False
        if observation.entry_price is None or observation.stop_loss is None or observation.target_price is None:
            return False

        ts = self._ensure_tz(observation.generated_at)
        tid = self._trade_id(index, ts)
        if tid in self._trades:
            return False   # already journaled (same bar dedup)

        self._trades[tid] = FVGPaperTrade(
            id=tid,
            index=index,
            direction=observation.action,
            entry_price=observation.entry_price,
            stop_loss=observation.stop_loss,
            target_price=observation.target_price,
            entry_ts=ts,
            status="OPEN",
            confidence=observation.confidence,
            reasons=list(observation.reasons),
        )
        self._trim()
        self._save()
        logger.info(
            "FVG journal: new paper trade [%s] %s entry=%.2f stop=%.2f target=%.2f",
            index, observation.action,
            observation.entry_price, observation.stop_loss, observation.target_price,
        )
        return True

    def update_open(self, candles_by_index: dict[IndexSymbol, list[Candle]]) -> int:
        """For each OPEN trade, walk subsequent candles to resolve outcome.
        Returns the number of trades that closed in this update."""
        closed = 0
        for trade in list(self._trades.values()):
            if trade.status != "OPEN":
                continue
            candles = candles_by_index.get(trade.index, [])
            entry_ts = self._ensure_tz(trade.entry_ts)
            future = [c for c in candles if self._ensure_tz(c.ts) > entry_ts]
            if not future:
                continue
            verdict = self._resolve(trade, future)
            if verdict is not None:
                status, exit_price, exit_ts = verdict
                trade.status = status
                trade.exit_price = exit_price
                trade.exit_ts = exit_ts
                closed += 1
        if closed:
            self._save()
        return closed

    def recent(self, limit: int = 50) -> list[FVGPaperTrade]:
        """Newest-first slice of the journal for UI / API display."""
        ordered = sorted(
            self._trades.values(),
            key=lambda t: self._ensure_tz(t.entry_ts),
            reverse=True,
        )
        return ordered[:limit]

    def summary(self) -> dict[str, int | float]:
        """Aggregate stats — useful sanity gauge as the journal grows."""
        closed = [t for t in self._trades.values() if t.status != "OPEN"]
        wins = sum(1 for t in closed if t.status == "WIN")
        losses = sum(1 for t in closed if t.status == "LOSS")
        timeouts = sum(1 for t in closed if t.status == "TIMEOUT")
        open_ = sum(1 for t in self._trades.values() if t.status == "OPEN")
        return {
            "total":   len(self._trades),
            "open":    open_,
            "win":     wins,
            "loss":    losses,
            "timeout": timeouts,
            "win_rate": round(wins / len(closed) * 100, 1) if closed else 0.0,
        }

    # ── internals ───────────────────────────────────────────────────────────

    def _resolve(self, trade: FVGPaperTrade, future: list[Candle]) -> tuple[str, float, datetime] | None:
        """Walk `future` (up to HOLD_BARS) and return (status, exit_price, exit_ts)
        when stop/target/timeout fires, else None (still open)."""
        for k, bar in enumerate(future[:_HOLD_BARS]):
            ts = self._ensure_tz(bar.ts)
            if trade.direction == "BUY":
                if bar.low <= trade.stop_loss:
                    return ("LOSS", trade.stop_loss, ts)
                if bar.high >= trade.target_price:
                    return ("WIN", trade.target_price, ts)
            else:   # SELL
                if bar.high >= trade.stop_loss:
                    return ("LOSS", trade.stop_loss, ts)
                if bar.low <= trade.target_price:
                    return ("WIN", trade.target_price, ts)
        if len(future) >= _HOLD_BARS:
            last = future[_HOLD_BARS - 1]
            return ("TIMEOUT", last.close, self._ensure_tz(last.ts))
        return None

    def _trim(self) -> None:
        if len(self._trades) <= self.limit:
            return
        ordered = sorted(
            self._trades.values(),
            key=lambda t: self._ensure_tz(t.entry_ts),
            reverse=True,
        )
        self._trades = {t.id: t for t in ordered[: self.limit]}

    @staticmethod
    def _trade_id(index: IndexSymbol, ts: datetime) -> str:
        return f"{index}:{ts.isoformat()}"

    @staticmethod
    def _ensure_tz(ts: datetime) -> datetime:
        return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
