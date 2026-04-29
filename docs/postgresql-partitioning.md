# PostgreSQL Partitioning Plan

The MVP migration keeps `market_news` as a normal table so local H2/Flyway checks stay simple. Production should replace it with a monthly range-partitioned table keyed by `published_at`.

```sql
CREATE TABLE market_news (
    id BIGSERIAL,
    published_at TIMESTAMPTZ NOT NULL,
    source_id VARCHAR(128) NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    headline VARCHAR(500) NOT NULL,
    summary TEXT NOT NULL,
    source_url TEXT NOT NULL,
    sentiment_score NUMERIC(6, 3) NOT NULL,
    entity_name VARCHAR(128) NOT NULL,
    entity_match_score NUMERIC(6, 3) NOT NULL,
    category VARCHAR(64) NOT NULL,
    PRIMARY KEY (id, published_at)
) PARTITION BY RANGE (published_at);

CREATE TABLE market_news_2026_04
PARTITION OF market_news
FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE INDEX idx_market_news_2026_04_feed
ON market_news_2026_04 (published_at DESC, category, sentiment_score);
```

Operational rule: create the next month partition before the first market day of that month, either through a Flyway migration or a scheduled maintenance job. The 8:30 AM feed query should always filter by `published_at >= start_of_day` and `published_at < end_of_day`, which lets PostgreSQL prune old partitions and scan only the active month.
