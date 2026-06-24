# AI Workflow Rules — Market Narrative
# This file is the behavioural contract for every agent session.

---

## Rule 1 — Root cause before fix (hardest rule, most violated)

**Never edit a file to fix a bug until you have written the ROOT CAUSE statement.**

The statement format is mandatory:
```
ROOT CAUSE: [function name] in [file] at line [N] does [X] when [condition]
because [underlying reason], which causes [symptom].
```

Every field must be specific. "Something in core.mjs does something wrong"
is not a root cause. Keep tracing until all fields are specific.

### Five steps — all required, in order

**Step 1 — Reproduce**
State exactly: what input produces what wrong output.
If you cannot reproduce deterministically, say so.

**Step 2 — Trace**
Open the actual files. Read the actual functions.
Name the exact line number where expected and actual diverge.

**Step 3 — Write ROOT CAUSE**
One sentence, all fields specific, before any edit.

**Step 4 — Fix**
Edit must correspond to the ROOT CAUSE location.
If edit is elsewhere, explain in writing why.

**Step 5 — Verify**
Run gates. Check live site. Write output. Declare done only after this.

### Patch limit — enforced

After **2 failed attempts** at the same fix class, STOP and write:
```
PATCH LIMIT REACHED after 2 attempts.
Root cause statement was: [paste it]
Attempts made: [list them]
Re-examining root cause from step 1.
```

The June 2026 session made 13 attempts to fix a generation crash.
The actual fix was a 2-line regex change in vercel-build.mjs.
13 attempts happened because the root cause was never traced.

---

## Rule 2 — One unit at a time

If you find a different bug while working, write it in progress-tracker.md
under "Found during work." Do not fix it unless it directly blocks the current task.

---

## Rule 3 — Stack discipline — Node.js ESM only

Never introduce `.py` files in tools/, shell scripts replacing pipeline logic,
`require()`, or new npm packages without documenting them.

If a streaming/timeout problem occurs with Node.js fetch:
- `AbortSignal.timeout(N)` for timeouts
- `response.body` and async iteration for SSE streaming
- A retry wrapper in the same .mjs file

A Python proxy is never the answer in this codebase.

---

## Rule 4 — Security protocol

Never show secret values. Keys appear only as variable names.

```bash
# CORRECT
curl -H "Authorization: Bearer $NVIDIA_API_KEY" https://...

# WRONG — never do this
curl -H "Authorization: Bearer nvapi-abc123..." https://...
```

If a secret is visible in output, do not include it in your response.
Flag: "A secret was visible in the output. It should be rotated."

---

## Rule 5 — Context files are law

Context files define hard constraints, not guidelines.
200-line limit = hard. Node.js only = hard. Listed invariants must hold.

Before doing anything that might violate a context rule, re-read that file.

---

## Rule 6 — Verification gates — no skipping

Run after every change, in order, output the result:

```bash
npm run context:verify    # before any commit
npm test                  # before any commit
npm run test:deploy       # for pipeline/deploy changes
npm run public:copy:qa    # for content generation changes
```

Then check the live site:
1. Fetch https://www.marketnarrative.in/ — state what you see
2. Fetch https://www.marketnarrative.in/latest/ — confirm it redirects
3. Fetch the specific page affected by your fix — confirm the change is visible

If the live site does not show the expected change, the task is not complete.
"The fix has been deployed" must be verified, not assumed.

---

## Rule 7 — Architecture diagrams

Update the relevant Mermaid diagram in context/architecture-diagrams/ if
your change affects data flow, new files, new APIs, new Vercel routes, or
the LLM provider chain. Reference the filename in progress-tracker.md.
If no diagram changed, write "No architecture diagrams changed."

---

## Rule 8 — Progress tracker is mandatory

After every completed unit, append to context/progress-tracker.md:

```markdown
- YYYY-MM-DD: [What changed and why].
  ROOT CAUSE (if bug): [one-sentence ROOT CAUSE].
  Verified: [each gate and result].
  Architecture diagrams changed: [filenames or "none"].
  Debt found but deferred: [description or "none"].
```

---

## Rule 9 — When to stop and ask

Stop and ask when:
- Root cause unclear after tracing 3 files
- Fix attempted twice without resolving symptom
- Context constraint seems to conflict with task
- Live site shows a different problem than being fixed

Write:
```
NEED CLARIFICATION: [specific question]
Context: [what I've traced so far]
Options: [A] or [B]
```

Do not guess. Do not proceed. Wait for the answer.

---

## Reference: What the June 2026 session should have looked like

### What happened (wrong)

1. Patched the generation script immediately without reading context
2. Introduced nims-proxy.py (violates Node.js-only rule)
3. Made 13 rm-lock + generate attempts (patch limit violation)
4. Exposed NVIDIA API key in plain text curl command (security violation)
5. Only read context files when user challenged the agent (context violation)
6. Declared fix complete without checking live site (verification violation)

### What should have happened

```
1. CONTEXT READ block filled in [all 6 files]
2. npm run context:verify — PASS
3. TASK: Trace why Vercel deployments fail.
4. [Reproduce] VERCEL="1" VERCEL_PROJECT_NAME="marketnews" node tools/vercel-build.mjs
   — exits code 1: "Could not infer target"
5. [Trace] Read inferVercelTarget() in tools/vercel-build.mjs line N.
   Regex does not match "marketnews".
6. ROOT CAUSE: inferVercelTarget() in tools/vercel-build.mjs at line N
   does not match project name "marketnews" because the regex was written
   for a different naming convention, causing exit code 1 before generation runs.
7. [Fix] Update regex to match "marketnews".
8. [Verify] context:verify PASS, 75 tests PASS, simulated build PASS,
   git push, wait for deploy, fetch live site — June 22 briefing visible ✓
9. [Progress tracker] entry written with ROOT CAUSE and verified outputs.
Total time: ~20 minutes.
Actual time taken: multiple sessions over several days.
```
