# Advanced Architecture

## Frontend Monorepo

The production frontend is split into deployable apps and shared packages:

- `apps/public-portal` - SEO-first Next.js public summary portal.
- `apps/admin-studio` - private React SPA for digest runs, script edits, asset generation, and publish controls.
- `packages/ui` - shared visual primitives and market design tokens.
- `packages/api-client` - typed public/admin API contracts and permission types.

This keeps admin code out of the public bundle while preserving a single design system and data model.

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

- Architected a multi-package React/Next.js monorepo that separates a public SEO portal from a private AI studio while sharing a typed UI and API package.
- Built a Java Spring Boot backend with permission-scoped JWT/RBAC controls, mapping Auth0 custom claims into method-level authorities.
- Designed an Agentic RAG pipeline that separates retrieval, quantitative validation, and compliance-aware narrative generation.
- Added Redis-backed digest publication and a PostgreSQL monthly partitioning plan for high-volume market news ingestion.
