# Code Standards

## Runtime

- Node.js ESM for pipeline scripts (`.mjs`).
- Plain JavaScript with focused helpers; no new framework unless approved.
- Python stays in `services/trading-api/`.
- Secrets always come from environment variables.

## File Size Ratchet

- New `.mjs` files must be under 200 lines.
- Existing oversized files listed in `architecture-context.md` must not grow.
- If an oversized touched file cannot shrink in a task, document the reason in
  `context/progress-tracker.md`.

## Design Rules

- Keep files single-purpose.
- Add behavior through focused modules rather than more branches in large files.
- Exported functions should have clear names and narrow inputs.
- Catch blocks must log context and either retry, rethrow, or return an explicit
  safe fallback.

## Logging

- New pipeline functions use `tools/logger.mjs`.
- Logs are structured JSON with `timestamp`, `level`, `message`, and context.
- Never log secrets, tokens, API keys, or raw broker payloads.
- Local runtime summaries can be written under ignored `.local/`.

## Required Scripts

These package scripts must stay in sync with `package.json`:

- `context:verify`: `node tools/context-verify.mjs`
- `test`: `node tools/verify.mjs`
- `test:deploy`: `npm run context:verify && node tools/predeploy-verify.mjs`
- `public:copy:qa`: `node tools/public-copy-qa.mjs`
- `vercel:build`: `node tools/vercel-build.mjs`
- `prod:smoke`: `node tools/production-smoke.mjs`
- `reliability:smoke`: `node tools/reliability-smoke.mjs`
- `prod:qa`: `node tools/production-qa-gate.mjs`
- `local:prod`: `node tools/local-prod-run.mjs`
- `local:prod:smoke`: `node tools/local-prod-smoke.mjs`

## Release Command Order

1. `npm run context:verify`
2. `npm test`
3. `npm run test:deploy`
4. `MARKET_NARRATIVE_DEPLOY_TARGET=public npm run vercel:build`
5. `npm run public:copy:qa -- public`
6. For content or pipeline changes with real keys: `npm run local:prod`

