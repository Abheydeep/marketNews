# Production Roadmap

## Phase 2 Integrations

- Replace mock market adapters with Alpha Vantage, Yahoo Finance, and exchange-safe market feeds.
- Replace mock news adapters with MarketAux and NewsData.io.
- Replace deterministic script templates with an LLM adapter using structured JSON output.
- Replace prompt package records with a GPU-hosted Stable Diffusion/ControlNet job runner.
- Move auth from local JWT to Auth0 with permissions claims mapped to Spring authorities.

## Data Scaling

- Partition `market_news` by `published_at` monthly.
- Add source reliability scoring and exclusion lists.
- Add job status tables for retryable ingestion and asset generation.
- Add historical setup outcome tracking for hit-rate analysis.

## Live Market Upgrade

- Integrate Zerodha Kite Connect WebSocket streaming.
- Add Kafka or Flink for high-volume tick processing.
- Add alerting when validated setups reach entry, stop, or target.
- Keep order placement explicitly out of scope unless a regulated execution workflow is added.

## Observability

- Add OpenTelemetry tracing across ingestion, analysis, narrative, and publishing.
- Track digest run duration, adapter latency, setup counts, cache hit rate, and API error rate.
- Alert if the 8:30 AM IST digest fails or stale content is still public after a configurable cutoff.
