from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Protocol

from app.schemas import NewsEvent


class NewsProvider(Protocol):
    async def fetch(self) -> list[dict[str, object]]:
        ...


class MockNewsProvider:
    async def fetch(self) -> list[dict[str, object]]:
        now = datetime.now(timezone.utc)
        return [
            {
                "headline": "Banks hold firm as index futures trade above VWAP",
                "source": "Mock Tape",
                "published_at": now.isoformat(),
                "url": "https://example.local/mock/banks-hold-firm",
            },
            {
                "headline": "Rupee volatility keeps traders cautious before policy commentary",
                "source": "Mock Tape",
                "published_at": now.isoformat(),
                "url": "https://example.local/mock/rupee-volatility",
            },
        ]


class SentimentAnalysisService:
    def __init__(self, enable_finbert: bool = False) -> None:
        self.enable_finbert = enable_finbert
        self._pipeline = None

    def score_headline(self, headline: str) -> tuple[str, float]:
        if self.enable_finbert:
            try:
                return self._finbert_score(headline)
            except Exception:
                pass
        return self._keyword_score(headline)

    def map_finbert_score(self, label: str, confidence: float) -> float:
        normalized_label = label.lower()
        bounded = max(0.0, min(float(confidence), 1.0))
        if "positive" in normalized_label:
            return bounded
        if "negative" in normalized_label:
            return -bounded
        return 0.0

    async def ingest(self, providers: list[NewsProvider]) -> list[NewsEvent]:
        seen: set[str] = set()
        events: list[NewsEvent] = []
        for provider in providers:
            for raw in await provider.fetch():
                headline = str(raw.get("headline", "")).strip()
                if not headline:
                    continue
                digest = hashlib.sha256(headline.lower().encode("utf-8")).hexdigest()
                if digest in seen:
                    continue
                seen.add(digest)
                label, score = self.score_headline(headline)
                events.append(
                    NewsEvent(
                        id=digest[:16],
                        headline=headline,
                        source=str(raw.get("source", "Unknown")),
                        published_at=self._parse_date(raw.get("published_at")),
                        url=str(raw.get("url")) if raw.get("url") else None,
                        sentiment_label=label,  # type: ignore[arg-type]
                        sentiment_score=score,
                    )
                )
        return events

    def _finbert_score(self, headline: str) -> tuple[str, float]:
        if self._pipeline is None:
            from transformers import pipeline  # type: ignore

            self._pipeline = pipeline("sentiment-analysis", model="ProsusAI/finbert")
        result = self._pipeline(headline)[0]
        score = self.map_finbert_score(str(result["label"]), float(result["score"]))
        if score > 0:
            return "positive", score
        if score < 0:
            return "negative", score
        return "neutral", 0.0

    def _keyword_score(self, headline: str) -> tuple[str, float]:
        text = headline.lower()
        positive = ["firm", "rally", "gain", "support", "breakout", "above", "strong", "upgrade", "inflow"]
        negative = ["fall", "weak", "selloff", "below", "cut", "downgrade", "volatility", "stress", "loss"]
        score = sum(word in text for word in positive) - sum(word in text for word in negative)
        if score > 0:
            return "positive", min(0.25 + score * 0.2, 0.95)
        if score < 0:
            return "negative", max(-0.25 + score * 0.2, -0.95)
        return "neutral", 0.0

    def _parse_date(self, raw: object) -> datetime:
        if isinstance(raw, datetime):
            return raw if raw.tzinfo else raw.replace(tzinfo=timezone.utc)
        if raw:
            try:
                parsed = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
                return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        return datetime.now(timezone.utc)

