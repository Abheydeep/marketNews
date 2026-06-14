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

## Next

- Split large public rendering files into focused modules.
- Add richer local-prod smoke coverage for real LLM output quality.
- Keep architecture diagrams current as the publish and LLM pipelines evolve.
