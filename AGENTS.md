# Market Narrative Agent Entry Point

Before implementation, read these files in order:

1. `context/project-overview.md`
2. `context/architecture-context.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

These files define product scope, architecture boundaries, UI rules, code
standards, root-cause workflow, regression baseline, and current project state.

## Non-Negotiables

- Do root-cause analysis before fixes: reproduce, trace, write `ROOT CAUSE:`,
  then fix and verify.
- Run `npm run context:verify` before changing code and before committing.
- New `.mjs` files must stay under 200 lines.
- Existing oversized legacy files must not grow unless the reason is documented
  in `context/progress-tracker.md`.
- Architecture changes must update the relevant Mermaid diagram under
  `context/architecture-diagrams/`.
- Public output must remain educational market research, not investment advice.
- Do not hardcode secrets. Use environment variables and local `.env.local`.

