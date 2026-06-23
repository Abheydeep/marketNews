# Progress Tracker

Update this file after meaningful implementation changes. It is the dynamic
state file for future sessions.

## Current Phase

Public reliability, mobile quality, SEO, and context guardrails after June 12
release.

## Regression Baseline

These must remain true after changes:

- [ ] `npm run context:verify` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:deploy` passes, with Maven either installed or explicitly
      reported as skipped locally.
- [ ] Public Vercel build succeeds for deploy target `public`.
- [ ] `npm run public:copy:qa -- public` passes after build.
- [ ] `/latest/` resolves to the latest sitemap briefing by redirect or static
      shell.
- [ ] Latest public page has no repeated India read-through source cards.
- [ ] LLM reranking/enrichment remains wired for real-key local-prod runs.
- [ ] Public pages do not expose private admin, studio, prompt, broker, or
      trading-control data.
- [ ] Mobile public routes do not have obvious horizontal-overflow regressions.
- [ ] Architecture diagrams are updated for boundary, flow, or dependency
      changes.

## Completed

- 2026-06-16: Added Vercel watchdog retries and simplified public market context
  surfaces. ROOT CAUSE: the morning publish path depended on GitHub scheduled
  workflow creation, so a dropped schedule left no independent process checking
  whether the archive or `/latest/` had become current by 07:30 IST. Vercel
  Cron now hits `/api/cron/premarket-publish` every five minutes from
  07:00-09:00 IST; the endpoint checks the tracked archive and live `/latest/`,
  skips if a workflow is already active, dispatches `pages.yml` without fixture,
  non-trading-day, or late-publish bypasses, and emits a structured error log
  once the alert threshold is crossed. ROOT CAUSE: public index rows still sent
  readers to TradingView even though Market Narrative already has captured
  Yahoo price-series snapshots; briefing rows and pre-open tiles now link to
  internal `/indices/#symbol` cards, `/indices/` expands captured charts in
  place, refresh cadence is five minutes, India Pre-Open includes Bank Nifty
  and Brent, and Evidence & Sources is collapsed by default. Updated the static
  publish/deploy diagram. Verified: `node --check` for changed JS modules,
  `npm run context:verify`, `npm test` (75 passed), public artifact build,
  `npm run public:copy:qa -- public`, targeted generated HTML checks,
  `npm run mobile:smoke -- public`, `npm run test:deploy` unsandboxed
  (Spring Maven tests skipped locally because `mvn` is unavailable), and
  `git diff --check`.
- 2026-06-14: Added OpenAI image-provider support and local env wiring for
  article imagery. ROOT CAUSE: `generateArticleImage()` only routed NVIDIA and
  Gemini providers, so an OpenAI image key could not be tested without sending
  it to the wrong API or falling back silently. The helper now supports
  `ARTICLE_IMAGE_PROVIDER=openai`, `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL`, and
  JPEG output options, with mocked unit coverage and the LLM/image pipeline
  diagram updated. Real provider checks: NVIDIA image endpoint still returns
  404 for visible models, Gemini `gemini-3.1-flash-image` reaches the correct
  model but returns quota 429, and OpenAI `gpt-image-1` reaches the API but
  returns `billing_hard_limit_reached`. Verified: syntax check for
  `tools/generate-article-image.mjs`, `node tools/generate-article-image.test.mjs`,
  `npm run context:verify`, and real OpenAI probe without logging secrets.
- 2026-06-14: Rechecked NVIDIA Build Qwen image access with a fresh key.
  ROOT CAUSE: our NVIDIA image default used `qwen/qwen-image`, but NVIDIA's
  OpenAI-compatible image docs list `qwen-image` / `qwen-image-2512`; the code
  now defaults to `qwen-image`. Real hosted checks still return 404 for
  `/v1/images/generations`, and the key's `/v1/models` list exposes Qwen text
  models plus `google/diffusiongemma-26b-a4b-it`, but not hosted Qwen image.
- 2026-06-14: Added best-effort NVIDIA qwen-image article imagery for daily
  briefing and move article pages. ROOT CAUSE: briefing and move pages only knew
  the static `/og-card.svg`, so social previews and hero imagery could not
  reflect the day's market theme; generation now builds compliant no-text
  prompts, calls NVIDIA image generation with a 45s timeout, writes JPEG assets
  under `out/vercel/assets/og`, copies them into the public artifact, and falls
  back to the static SVG without blocking publish. ROOT CAUSE:
  `newsArticleJsonLd()` ignored generated image URLs, so structured data could
  diverge from page-level OG metadata; JSON-LD now prefers `digest.ogImageUrl`.
  Also corrected the pre-open gold tile from "Gold (MCX proxy)" to "Gold
  (COMEX)" to match the TradingView/Yahoo source, and added a display-side
  USD/INR sanity guard so out-of-band FX prints do not appear as valid
  pre-open data. Updated diagrams 02, 03, and
  04 for the new image-provider and artifact flow. Verified:
  `node --check` on changed modules, `node tools/generate-article-image.test.mjs`,
  `npm test` (73 passed), `npm run context:verify`, public Vercel artifact build,
  `npm run public:copy:qa -- public`, targeted generated HTML checks, and
  `git diff --check`.
- 2026-06-14: Local prod closed-day runner fix. ROOT CAUSE: `npm run local:prod`
  always ran `daily:generate` before the public build, so a weekend/manual
  prod-like test stopped at the non-trading-day guard instead of serving the
  correct market-closed public artifact. The runner now skips daily generation
  for weekend/holiday dates, unless explicitly forced with
  `--force-non-trading-day-digest` or `ALLOW_NON_TRADING_DAY_DIGEST=true`, then
  continues through public build, copy QA, and local serving. Verified:
  `node --check tools/local-prod-run.mjs`, `npm run context:verify`,
  `npm run local:prod -- --port 4197`, and
  `LOCAL_PROD_ORIGIN=http://127.0.0.1:4197 npm run local:prod:smoke`
  (13 public routes passed).
- 2026-06-14: Local prod content rehearsal made strict. ROOT CAUSE:
  `local:prod` treated weekend dates like production and then allowed image
  fallback, so it could serve an old market-closed archive or hide a broken
  image provider during the exact local run meant to test fresh Pulse, NVIDIA
  LLM, and OG-image changes. Default `local:prod` now forces a fresh local
  preview digest, enables Pulse/live source mode, allows insufficient sources
  only for preview rendering, includes the generated `out/daily` digest in the
  local public artifact without archiving it, and requires an article image.
  `--production-calendar` keeps the true market-closed behavior, and
  `--allow-image-fallback` is the explicit escape hatch. Provider check found
  NVIDIA chat/reranking/enrichment succeeds, but
  `POST /v1/images/generations` returns `404 page not found` for
  `qwen/qwen-image`; the helper now logs the safe response snippet and supports
  `NVIDIA_IMAGE_ENDPOINT` / `NVIDIA_IMAGE_MODEL` overrides. Verified:
  `node --check` on changed modules, `node tools/generate-article-image.test.mjs`,
  `npm run context:verify`, and a strict `npm run local:prod -- --port 4199`
  failing loudly at the missing NVIDIA image endpoint after real LLM calls.
- 2026-06-14: Unit 4 production hardening pass for scheduler, Vercel build,
  move-detect, LLM provider boundaries, structured logs, and mobile artifact
  smoke. ROOT CAUSE: scheduled Pages runs allowed late generation and fixture
  fallback automatically, so a delayed 10:30/recovery run could publish stale or
  mock content as a real public brief; late, fixture, and non-trading-day
  overrides are now manual-only. ROOT CAUSE: `public:copy:qa -- out/vercel`
  could pass without scanning because missing explicit targets were ignored; the
  QA target is now `public` and explicit missing targets fail. ROOT CAUSE:
  serverless move detection wrote generated pages to ephemeral Vercel storage;
  it now dispatches a GitHub Actions move-publish workflow that writes tracked
  `archive/moves` pages. ROOT CAUSE: non-NVIDIA polishing providers had
  unbounded calls and widened failure modes; article enrichment/reranking is now
  NVIDIA-only with timeout/retry/backoff and structured logs. Added 07:00-08:00
  retry slots and 08:00-09:00 incremental slots, public ISO slug headers,
  stable move JSON-LD dates/origin, GIFT mock source label sanitization, dark
  theme color on briefing pages, workflow install safety, and mobile smoke.
  Verified: `node --check` on changed API/pipeline helpers,
  `npm run context:verify`, `npm test` (67 passed), `npm run test:deploy`
  (passed unsandboxed; Maven unavailable locally but non-fatal), public Vercel
  artifact build, `npm run public:copy:qa -- public`,
  `npm run mobile:smoke -- public`, and `git diff --check`.
- 2026-06-14: Unit 1 guardrail follow-up started after baseline commit. Added
  richer architecture diagrams and structured stage logs for daily generation,
  public Vercel build fallback paths, static publishing completion, predeploy
  checks, and reliability smoke. Oversized touched files did not grow. Verified:
  `npm run context:verify`, `npm test`, `npm run test:deploy`,
  `MARKET_NARRATIVE_DEPLOY_TARGET=public npm run vercel:build`,
  `npm run public:copy:qa -- public`, and `git diff --check`.
- 2026-06-14: Unit 2 architecture debt split started with the reliability smoke
  script. Moved fetch, parsing, sitemap, latest, and IST date helpers into
  `tools/reliability-smoke-helpers.mjs`; `tools/reliability-smoke.mjs` is now
  under 200 lines. Verified: `node --check` on both files,
  `npm run context:verify`, `npm test`, and `npm run reliability:smoke`
  (19/19 live checks passed).
- 2026-06-14: Unit 3 split the predeploy release gate into a small runner,
  check factory, artifact assertions, and Vercel artifact groups. ROOT CAUSE:
  the first split moved `SKIP_ARCHIVE_WRITE` out of `predeploy-verify.mjs`
  while a contract test still inspected that runner for the archive-write safety
  marker; added an explicit runner marker pointing to the helper module. Verified:
  `node --check` on all four modules, `npm run context:verify`, `npm test`, and
  `npm run test:deploy`.
- 2026-06-14: Context guardrail system implemented. Added `AGENTS.md`,
  six-file `context/` workflow, Mermaid diagrams, `context:verify`, structured
  logger, local-prod commands, pre-push/CI/predeploy integration, and docs.
  Verified: `npm run context:verify`, `npm test` (66 passed),
  `npm run test:deploy`, public build, public copy QA, and
  `npm run local:prod:smoke` against a local public artifact server. Also ran
  `npm run local:prod -- --date 2026-06-12`; it used the immutable tracked
  archive and served locally, so the command path is verified but no new LLM
  content was generated.
- 2026-06-12: Mobile/public release hardened and merged to `main`
  (`c572378`). Local deploy artifact, 15-route smoke, full deploy gate, and live
  reliability smoke passed.

## In Progress

- Continue architecture debt split in safe units: QA probes first, then public
  model pages, publisher, briefing page, content engine, and test modules.

## Found During Work

- The repository has legacy oversized files. Apply the ratchet rule immediately
  and refactor them in focused follow-up work.
- `tools/logger.mjs` did not exist before this guardrail work; new pipeline code
  should use it going forward.
- The production-bugs report still lists data/content RCAs outside this unit:
  deeper USD/INR normalization, stale multibagger quote
  refresh, repeated crude archive titles, stale archive snapshot fallbacks,
  richer FII/DII data depth, unified public navigation, and trading-guide logo
  destination consistency.

## Next

- Split large public rendering files into focused modules.
- Add richer local-prod smoke coverage for real LLM output quality.
- Keep architecture diagrams current as the publish and LLM pipelines evolve.
- 2026-06-23: Fixed Vercel deployment crash for public site. ROOT CAUSE: `tools/vercel-build.mjs` failed to infer the public deploy target from the default Vercel project name (`marketnews`), causing an immediate exit with status 1 and aborting all deployments since the Vercel CLI migration. Updated the inference regex to match `^marketnews$` and its Vercel domains. Verified: `npm run context:verify`, `npm test` (75 passed), simulated Vercel build via `VERCEL="1" VERCEL_PROJECT_NAME="marketnews" VERCEL_URL="marketnews.vercel.app" node tools/vercel-build.mjs`. No architecture diagrams changed.
