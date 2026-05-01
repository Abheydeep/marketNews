from __future__ import annotations

from app.config import Settings


class NewsApiAiProvider:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def fetch(self) -> list[dict[str, object]]:
        if not self.settings.newsapi_key:
            return []
        import httpx

        params = {
            "apiKey": self.settings.newsapi_key,
            "keyword": "Nifty OR Bank Nifty OR RBI OR Indian markets",
            "lang": "eng",
            "articlesSortBy": "date",
        }
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get("https://eventregistry.org/api/v1/article/getArticles", params=params)
            response.raise_for_status()
            articles = response.json().get("articles", {}).get("results", [])
        return [
            {
                "headline": article.get("title", ""),
                "source": article.get("source", {}).get("title", "NewsAPI.ai"),
                "published_at": article.get("dateTimePub"),
                "url": article.get("url"),
            }
            for article in articles
        ]


class EodhdProvider:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def fetch(self) -> list[dict[str, object]]:
        if not self.settings.eodhd_key:
            return []
        import httpx

        params = {"api_token": self.settings.eodhd_key, "s": "NSEBANK.INDX,NSEI.INDX", "limit": 50, "fmt": "json"}
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get("https://eodhd.com/api/news", params=params)
            response.raise_for_status()
            articles = response.json()
        return [
            {
                "headline": article.get("title", ""),
                "source": article.get("source", "EODHD"),
                "published_at": article.get("date"),
                "url": article.get("link"),
            }
            for article in articles
        ]

