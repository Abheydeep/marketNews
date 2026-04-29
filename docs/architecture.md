# Architecture

## Shape

The MVP is a Spring Boot modular monolith with a multi-package frontend workspace. Each backend domain is isolated in its own package so the system can later be split into services without rewriting business logic. The frontend is split into separate public/admin deployment targets while sharing typed UI and API packages.

See `docs/advanced-architecture.md` for the production-grade version of this architecture.

## Modules

- `identity` - local JWT login and role enforcement for admin routes.
- `marketdata` - market snapshot adapter contracts and mock data ingestion.
- `news` - article ingestion, source attribution, and sentiment metadata.
- `analysis` - indicator math and 1:2 risk-reward trade setup validation.
- `narrative` - theme clustering and deterministic teleprompter generation.
- `assets` - Stable Diffusion/ControlNet prompt package generation.
- `publishing` - public/admin digest APIs and Redis-backed public summary caching.
- `ai` - agentic RAG extension points for retrieval, quantitative validation, and compliance-aware script generation.

## Frontend Packages

- `apps/public-portal` - Next.js SEO portal for the public one-page digest.
- `apps/admin-studio` - private React SPA for script, asset, and publishing workflows.
- `packages/ui` - shared visual primitives and market design tokens.
- `packages/api-client` - typed API contracts and permission definitions.

## Request Flow

1. `POST /api/admin/digest/run` starts the digest orchestration.
2. Mock adapters load market snapshots, news, and price bars concurrently through `CompletableFuture`.
3. Normalized records are persisted in PostgreSQL.
4. News articles become narrative themes.
5. Price bars become validated trade setups only when the 1:2 risk-reward rule and indicator checks pass.
6. Daily script and thumbnail prompt package are stored.
7. Public APIs assemble the persisted daily digest and cache it for repeated morning reads.
8. Published digests are pushed into Redis keys and a sorted set for fast public feed lookup.

## Production Split

The future microservice split should map directly to the MVP modules:

- ingestion service
- technical analysis service
- identity/access service
- narrative/script service
- asset pipeline service
- public news portal

Kafka can be introduced between ingestion, analysis, narrative, and asset generation once the workflow needs independent scaling.

Monthly PostgreSQL partitioning for `market_news` is documented in `docs/postgresql-partitioning.md`.
