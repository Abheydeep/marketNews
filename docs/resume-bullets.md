# Resume Bullets

- Architected a multi-package React/Next.js monorepo separating a public SEO news portal from a private AI Studio, sharing a typed UI system and API client without leaking admin logic into the public bundle.
- Designed an Agentic RAG pipeline with dedicated retrieval, quantitative analysis, and compliance narrative agents, grounding teleprompter scripts in source-attributed market data and deterministic risk calculations.
- Implemented permission-scoped RBAC using Auth0-style JWT custom claims mapped into Spring Security authorities, protecting high-compute workflows such as script generation, publishing, and AI asset generation.
- Designed a Spring Boot modular monolith for an automated financial media engine, separating ingestion, technical analysis, narrative generation, asset prompting, identity, and publishing domains.
- Implemented concurrent pre-market data orchestration with `CompletableFuture`, reducing mock overnight digest aggregation from sequential calls to the duration of the slowest adapter.
- Engineered a rule-based technical scanner that validates Nifty and Bank Nifty setups only when EMA, RSI, volume, and mandatory 1:2 risk-reward constraints pass.
- Built a JWT-protected admin studio and SEO-ready public news portal with source-attributed market summaries and `NewsArticle` structured data.
- Created a mock-first AI asset pipeline that emits Stable Diffusion/ControlNet-ready prompt packages while preserving a clean adapter boundary for future GPU generation.
