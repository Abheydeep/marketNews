# AI Workflow Rules

These rules apply to agents and humans using agents.

## Root Cause Before Fix

For bugs or unexpected behavior:

1. Reproduce the expected vs actual behavior.
2. Trace the data path to the exact function or boundary where it diverges.
3. Write one sentence before code changes:
   `ROOT CAUSE: [function/file] does [behavior] when [condition] because [reason], causing [symptom].`
4. Fix that root cause directly.
5. Add or identify regression coverage and run the required gates.

Patch-only fixes are not acceptable unless the patch is the root-cause fix.

## One Unit At A Time

Work on one task at a time. If unrelated breakage is found, record it in
`progress-tracker.md` instead of widening the task, unless it blocks the current
work.

## Architecture Changes

Update diagrams when a change modifies:

- data flow
- public/private boundaries
- deployment behavior
- external dependencies
- module ownership
- LLM provider flow

## Testing Discipline

- Normal tests mock LLMs.
- Real LLM behavior is checked only through explicit local-prod commands.
- If a gate was passing before the change, it must pass after the change.
- Do not deploy first and debug live unless the problem only exists in
  production infrastructure.

## Progress Tracker

After meaningful implementation, update `progress-tracker.md` with:

- what changed
- which regression baseline items were verified
- commands run and results
- architecture diagrams changed, if any
- any debt found but not fixed

