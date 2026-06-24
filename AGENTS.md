# AGENTS.md — Market Narrative
# READ THIS ENTIRE FILE BEFORE OPENING ANY OTHER FILE.
# Every session starts here. No exceptions.

---

## MANDATORY SESSION START PROTOCOL

You must complete ALL steps in this checklist before writing, editing,
running, or suggesting any code. If you skip any step, stop and restart
from the top.

### Step 1 — Read the six context files in exact order

Read each file completely, not just the headings.

```
1. context/project-overview.md
2. context/architecture-context.md
3. context/ui-context.md
4. context/code-standards.md
5. context/ai-workflow-rules.md
6. context/progress-tracker.md
```

### Step 2 — Prove you read them by outputting this block

Copy this template exactly, fill in each blank, and output it
before doing anything else:

```
CONTEXT READ — [date and time]

project-overview:    Product is [X]. Out of scope: [Y].
architecture:        Runtime is [X]. File size limit is [X] lines.
                     Number of active invariants: [N].
                     Last architecture diagram updated: [filename].
ui-context:          Theme: [X]. Theme-color value: [X].
code-standards:      Language: [X]. Test command: [X].
                     NPM scripts must match code-standards.md or
                     context:verify fails.
ai-workflow-rules:   RCA format required: [paste the one-sentence format].
                     Max patch attempts before stopping: [N].
progress-tracker:    Current phase: [X].
                     Last verified working: [list 3 items from baseline].
                     Open tasks: [first 2 items from Next].
```

If you cannot fill in any blank, go back and re-read the corresponding file.

### Step 3 — Run context verify

```bash
npm run context:verify
```

Output the result. If it fails, fix the failure before proceeding.
Do not work around the failure. Fix what it reports.

### Step 4 — State what you are about to do in one sentence

Write:
```
TASK: I will [specific action] in [specific file(s)] to fix/implement [specific thing].
```

If you cannot write this sentence precisely, you do not understand the task.
Ask for clarification before proceeding.

---

## SECURITY — NON-NEGOTIABLE

**Never echo, log, print, or display any value that contains a secret.**

This includes:
- API keys (NVIDIA_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, KITE_API_KEY)
- Tokens (GITHUB_TOKEN, VERCEL_TOKEN)
- Passwords

If you run a curl command with an Authorization header, mask the key:
```bash
# CORRECT
curl -H "Authorization: Bearer $NVIDIA_API_KEY" ...

# WRONG — never do this
curl -H "Authorization: Bearer nvapi-abc123..." ...
```

If a secret appears in a command output, do not include that output in your response.
If a secret appears in a file you are viewing, do not include it in your response.

**Rotate any key that was exposed in plain text immediately.**
Past sessions exposed an NVIDIA key in a curl command. That key must be rotated
before it is used again.

---

## ROOT CAUSE PROTOCOL — ENFORCED

This is the single most important rule. Violations cause cascading failures.

### Before touching any file when investigating a bug:

1. **Reproduce** — state exactly what the expected behaviour is and what the
   actual behaviour is. If you cannot reproduce it, say so.

2. **Trace** — follow the execution path. Name the exact file, function, and
   line number where behaviour diverges. Do not guess. Read the file.

3. **State root cause** — write this sentence before any edit:
   ```
   ROOT CAUSE: [function] in [file] at line [N] does [X] when [condition]
   because [underlying reason], which causes [symptom].
   ```
   If you cannot write this sentence with all fields filled, you have not
   found the root cause. Keep tracing.

4. **Fix the root cause** — the edit must be in the same location as the
   root cause statement. If the fix is elsewhere, explain why in writing.

5. **Verify** — run the verification commands. Check the live site.
   Do not declare success until the live site shows the fix.

### The patch limit rule

If you have attempted the same class of fix more than **2 times** without
the symptom resolving:

```
STOP. Do not make a third attempt.
Write: "I have attempted this fix 2 times without resolution.
       The root cause statement was [paste it]. My attempts were [list them].
       I need to re-examine the root cause before proceeding."
```

Then re-read the relevant files and start the RCA from step 1.

### What happened in the June 17–23 session (learn from this)

The Vercel deployment was broken because `tools/vercel-build.mjs` had a regex
that did not match the project name `marketnews`. This was a 2-line fix.

Instead of finding this, the agent:
- Introduced a Python streaming proxy (violates Node.js-only rule)
- Made 13 separate `rm publish-lock && node generate-daily-summary` attempts
- Exposed the NVIDIA API key in a curl command in the session
- Patched the symptom (generation crashing) instead of the cause (wrong regex)
- Only read the context files when explicitly challenged by the user

The correct approach:
1. Read context files first
2. Reproduce the failure locally with `npm run vercel:build`
3. Read the error output carefully
4. Trace to `tools/vercel-build.mjs` and the `inferVercelTarget` function
5. Write ROOT CAUSE statement
6. Fix the regex
7. Verify with simulated Vercel env + live site check

---

## LANGUAGE AND STACK — HARD RULES

This project is Node.js ESM only. Every pipeline file is `.mjs`.

**Never introduce:**
- Python files of any kind (no `.py` files in tools/)
- Shell scripts that replace Node.js logic (no `.sh` pipeline files)
- New npm dependencies without documenting them in context/progress-tracker.md
- `require()` or CommonJS patterns
- TypeScript in pipeline scripts (TypeScript is only in `apps/`)

If you think a Python script would solve a problem faster, stop.
Find the Node.js solution. The constraint exists to keep the stack uniform.

---

## FILE SIZE RULE — ENFORCED BY context:verify

New `.mjs` files: maximum **200 lines**.
Legacy files: must not grow beyond their current line count in LEGACY_LIMITS
in `tools/context-verify.mjs`.

If adding code would push a file past its limit:
1. Split the file first
2. Document the split in context/progress-tracker.md
3. Then add the new code to the appropriate module

Do not ask permission. Do not explain why splitting is hard.
Split the file, then proceed.

---

## VERIFICATION GATES — RUN THESE IN ORDER

After any code change, before declaring the work complete:

```bash
# Gate 1 — context invariants
npm run context:verify

# Gate 2 — all tests
npm test

# Gate 3 — deploy simulation (for pipeline changes)
npm run test:deploy

# Gate 4 — content QA (for briefing changes)
npm run public:copy:qa

# Gate 5 — live site check (always, even for "small" changes)
# Fetch the live URL and confirm the expected change is visible.
# Do not skip this. The June 23 session skipped this and declared
# success before verifying the site was updated.
```

Output the result of each gate in your response.
If a gate fails, fix it before running the next gate.
Never skip a gate "because the change is small."

---

## LIVE SITE VERIFICATION

After any change is deployed to Vercel, fetch these URLs and confirm:

```
https://www.marketnarrative.in/           — homepage shows today's briefing
https://www.marketnarrative.in/latest/    — redirects to today's briefing slug
https://www.marketnarrative.in/[slug]/   — briefing page loads, not 404
```

State what you see at each URL. If any URL is wrong, the task is not complete.

---

## ARCHITECTURE DIAGRAM RULE

If your change modifies any of the following, update the relevant diagram
in `context/architecture-diagrams/` before committing:

- Data flow between tools
- A new file that owns a responsibility
- A new external dependency or API
- A new Vercel route, serverless function, or cron
- The LLM provider chain

Reference the diagram filename in your progress-tracker.md update.
If no diagram needed updating, write "No architecture diagrams changed."

---

## PROGRESS TRACKER UPDATE — MANDATORY

After completing any unit of work, append to `context/progress-tracker.md`:

```
- [DATE]: [What changed]. ROOT CAUSE: [if fixing a bug].
  Verified: [commands run and their results].
  Architecture diagrams changed: [filenames or "none"].
  Debt found but not fixed: [or "none"].
```

If you cannot fill in "Verified" with actual command output, you have not
finished the task.

---

## WHAT TO DO IF YOU ARE CONFUSED

If you are unsure about any of the following:
- What the correct file to edit is
- Whether a change is in scope
- Whether a fix is a root cause fix or a patch
- Whether a new dependency is acceptable

**Stop. Do not guess. Ask.**

Write:
```
BLOCKED: I need clarification on [specific question] before proceeding.
The options I see are [A] and [B]. Which is correct?
```

Guessing and being wrong costs more time than asking.
The June 17 session demonstrated this clearly.
