# Advanced Architecture

## Distributed Frontends

The frontend services are split into standalone repositories:

- **Public Briefing Site** (housed in this repo): Static public briefing portal built by Node ESM scripts and deployed via Vercel/GitHub Pages.
- [marketnarrative-admin](https://github.com/marketnarrative/marketnarrative-admin) (Vite + React 19): Private admin studio for digest runs, script edits, asset generation, and publish controls.
- [marketnarrative-trade](https://github.com/marketnarrative/marketnarrative-trade) (Next.js 15): Private trading cockpit for live order proposals, technical scan checks, and options heatmaps.

This keeps admin/trade code out of the public bundle and isolates execution safety.

## Agentic RAG Pipeline

The backend now has an explicit `ai` package for a staged RAG workflow:

1. `InformationRetrievalAgent` gathers source-attributed news, entities, sentiment, and URLs.
2. `QuantAnalysisAgent` validates technical setups using deterministic math before the narrative stage.
3. `ComplianceNarrativeAgent` produces grounded script sections and keeps the educational disclaimer in place.

`MarketNarrativeRagPipeline` orders the agents and passes prior findings forward. The current implementation is deterministic and mock-first; the next production step is plugging these agents into an MCP-compatible tool layer and an LLM provider.

## Security

Local JWTs remain for no-dependency demos, but the authority model now matches Auth0-style permission claims:

- `create:script`
- `edit:script`
- `generate:assets`
- `publish:digest`
- `admin:read`

`Auth0JwtAuthenticationConverter` maps Auth0 `permissions` claims into Spring Security authorities. Admin methods use permission-specific `@PreAuthorize` checks, so expensive operations such as asset generation can be isolated from broader script editing access.

## Data And Cache

The MVP table layout remains portable, while production partitioning is documented in `docs/postgresql-partitioning.md`.

The public digest has two cache layers:

- Spring `@Cacheable("publicDigest")` for normal API reads.
- `PublicDigestCachePublisher` writes published digests into Redis value keys and records the latest digest keys in a sorted set, enabling fast public feed lookup during the 9:00 AM traffic spike.

## Resume Framing

Use this architecture phrasing:

- Architected a distributed frontend layout (React 19 SPA + Next.js 15) that separates a public SEO portal from a private AI studio and real-time trading cockpit, communicating with Spring Boot and FastAPI backends.
- Built a Java Spring Boot backend with permission-scoped JWT/RBAC controls, mapping Auth0 custom claims into method-level authorities.
- Designed an Agentic RAG pipeline that separates retrieval, quantitative validation, and compliance-aware narrative generation.
- Added Redis-backed digest publication and a PostgreSQL monthly partitioning plan for high-volume market news ingestion.
