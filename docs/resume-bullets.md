# Resume Bullets

- Designed a Spring Boot modular monolith for an automated financial media engine, separating ingestion, technical analysis, narrative generation, asset prompting, identity, and publishing domains.
- Implemented concurrent pre-market data orchestration with `CompletableFuture`, reducing mock overnight digest aggregation from sequential calls to the duration of the slowest adapter.
- Engineered a rule-based technical scanner that validates Nifty and Bank Nifty setups only when EMA, RSI, volume, and mandatory 1:2 risk-reward constraints pass.
- Built a JWT-protected admin studio and SEO-ready public news portal with source-attributed market summaries and `NewsArticle` structured data.
- Created a mock-first AI asset pipeline that emits Stable Diffusion/ControlNet-ready prompt packages while preserving a clean adapter boundary for future GPU generation.
