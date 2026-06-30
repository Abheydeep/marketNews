# LLM-First Article Pipeline — Implementation Plan

## Problem

The current pipeline runs ~60 articles through a regex rule filter (`articleLooksMarketRelevant`) before LLM enrichment. The rules can never be comprehensive enough — Anubhav Plast SME IPO slipped through because `\bipo\b` matched. Of the 60 rule-survivors, only 8 get LLM enrichment (sequential cap). The remaining 52 go into the digest with zero LLM judgment, and then compete for the 10 visible article slots with no editorial intelligence applied.

**Root cause:** Rules cannot keep up. LLM judgment is the only reliable filter.

---

## What Changes

| | Before | After |
|---|---|---|
| Relevance filter | 400+ lines of regex rules | 5-parallel LLM triage calls |
| Enrichment | Sequential, capped at 8 | Parallel (concurrency=4), no cap |
| Garbage exclusion | 0% (Anubhav Plast slipped through) | 100% (proven in test) |
| Articles enriched | 8 of 60 | All survivors (~15–20) |
| Pipeline time | ~13 min | ~9.5 min |

---

## Test Results (June 29, 2026)

Tested with 35 articles (18 real, 17 garbage).

**Triage accuracy:**
- Garbage exclusion: **17/17 (100%)** — SME IPOs, crypto, sports, retirement all scored 0.00 across all 5 calls
- Real articles included: **16/18** — the 2 "missed" were correctly downscored by the LLM (a ₹39.7cr small IPO and a weak US AI-debt article)
- Overall accuracy: **94%**
- Consistency: perfect on clear cases — GIFT Nifty [5,5,5,5,5], Man Utd [0,0,0,0,0]

**Enrichment timing (test environment, low load):**
- Sequential 8 articles: 86 seconds
- Parallel 4-concurrent 8 articles: 67 seconds (1.3x)
- In production (high API load, 30–90s per call): expected ~2x speedup

**Key finding:** Don't wait for all 5 triage calls. First 3 valid responses arrived in 24s, 26s, 38s. Waiting for all 5 cost 131s. Proceed-after-3 cuts triage wall time to ~38s.

---

## New Pipeline Flow

```
All RSS/HTML feeds fetched
        ↓
sourceUrlLooksArticleLevel     ← KEEP (URL structure only, no content judgment)
articleIsFreshForDigest        ← KEEP (date/time math only)
        ↓  ~60–100 raw articles
triageArticlesWithLLM          ← NEW: 5 parallel calls, proceed after 3 valid
        ↓  ~15–20 survivors (avg score ≥ 2.0 / 5.0)
enrichArticlesWithEditorialLLM ← CHANGED: parallel, concurrency=4, NO cap
        ↓  all survivors enriched
dailyLeadForDigest reranker    ← unchanged
generateFullScriptWithAI       ← unchanged
```

---

## File Plan

### New file: `tools/article-triage.mjs`
Single responsibility: batch LLM triage. Gets its own LEGACY_LIMIT (~280 lines).

Exports one function: `triageArticlesWithLLM(articles, options)`

### Modified: `tools/news-sources.mjs`
- **Remove** `articleLooksMarketRelevant` and all its helper functions (~400 lines deleted)
- **Remove** the 7 regex pattern constants at the top (DIRECT_MARKET_MOVING_PATTERN, OFF_TOPIC_ALWAYS_PATTERN, LOW_SIGNAL_MARKET_CONTENT_PATTERN, etc.)
- **Wire in** `triageArticlesWithLLM` replacing the `articleLooksMarketRelevant` filter call
- **Change** `enrichArticlesWithEditorialLLM` from sequential loop to parallel batches
- **Remove** the `maxEnrichmentCalls` cap and `shouldUseAgentArticleEnrichment` check
- Net: file shrinks significantly despite new additions

### Modified: `tools/context-verify.mjs`
- Add `article-triage.mjs` to LEGACY_LIMITS
- Reduce `news-sources.mjs` limit (it will shrink)

---

## `article-triage.mjs` — Detailed Spec

### Triage prompt

**System:**
```
You are an editorial filter for Market Narrative, a pre-market briefing for
Indian equity traders who trade Nifty, Bank Nifty, large-cap stocks, and macro
instruments. Your job is to rate article relevance. Be strict.
```

**User:**
```
Rate each article's relevance for Indian equity pre-market readers. Score 0–5.

5 = Must-include: directly moves Indian markets — RBI/MPC action, GIFT Nifty,
    major FII/DII flows, large-cap earnings, oil/gold macro driver, Nifty/Sensex catalyst
4 = High: strong macro or sector read-through (Fed, US yields, global PMI,
    major commodity move, India policy)
3 = Moderate: useful background context for Indian traders
2 = Low: generic business news, weak India relevance
1 = Very low: barely connected
0 = Irrelevant: SME/small-cap IPO allotment/GMP/subscription, US lifestyle,
    retirement, sports, medical, crypto, US single-stock without India link,
    "how to invest" pieces, celebrity/royals, gadget reviews

Respond ONLY with a valid JSON array — no explanation, no markdown:
[{"id":1,"score":4},{"id":2,"score":0},...]

Articles:
#1 | "Headline" | Summary preview (first 110 chars)...
#2 | ...
```

**Include threshold:** average score ≥ 2.0 across valid calls

### Score parsing (two-pass)
1. Regex-extract `[...]` from anywhere in the response, `JSON.parse` it
2. If that fails, regex-scan for `"id":N..."score":M` pairs
3. Accept the parse if ≥ 80% of articles have a score; otherwise discard the call

### Proceed-after-3 logic
```
Start 5 calls with individual AbortControllers
As each call settles, push to validScores[]
When validScores.length >= 3 → compute decisions, abort remaining calls, proceed
If all 5 settle before 3 are valid → use however many are valid
If 0 valid → log error, return all articles (fail-open, never block publishing)
```

### Logs emitted
```
[triage] start: 67 raw articles, 5 parallel calls
[triage] call=1 status=completed scores=67 durationMs=24021
[triage] call=2 status=completed scores=67 durationMs=26441
[triage] call=3 status=completed scores=67 durationMs=38102 — threshold reached, proceeding
[triage] call=4 aborted (3-of-5 threshold reached)
[triage] call=5 aborted (3-of-5 threshold reached)
[triage] #1  avg=5.00 [5,5,5] "GIFT Nifty signals flat open..."       → INCLUDE
[triage] #7  avg=0.00 [0,0,0] "Anubhav Plast SME IPO allotment..."    → EXCLUDE
...
[triage] complete: 67 → 18 included, 49 excluded (3 valid calls used)
```

### Failure modes
| Failure | Behaviour |
|---|---|
| < 3 calls return valid scores | Log error, return ALL articles (fail-open) |
| Individual call timeout / error | Log warn, skip that call |
| Malformed JSON (both parse passes fail) | Log warn, discard that call's scores |
| Article has no score in any call | Treat as score 2.5 → included (warn logged) |

---

## `enrichArticlesWithEditorialLLM` — Parallel Rewrite

### What changes
Remove the sequential `for...of` loop with the `enrichmentCalls >= maxEnrichmentCalls` gate.
Replace with bounded parallel batches.

### New structure
```javascript
const ENRICH_CONCURRENCY = 4;
log.info("enrich start", { total: articles.length, concurrency: ENRICH_CONCURRENCY });

const enriched = [];
for (let i = 0; i < articles.length; i += ENRICH_CONCURRENCY) {
  const batch = articles.slice(i, i + ENRICH_CONCURRENCY);
  const batchNum = Math.floor(i / ENRICH_CONCURRENCY) + 1;
  const totalBatches = Math.ceil(articles.length / ENRICH_CONCURRENCY);
  log.info("enrich batch start", {
    batch: batchNum, of: totalBatches,
    headlines: batch.map(a => a.headline?.slice(0, 50))
  });
  const batchStart = Date.now();
  const settled = await Promise.allSettled(batch.map(article => enrichOneArticle(article)));
  log.info("enrich batch complete", { batch: batchNum, durationMs: Date.now() - batchStart });
  for (let j = 0; j < batch.length; j++) {
    const result = settled[j];
    if (result.status === "fulfilled") {
      enriched.push(result.value);
      log.info("enrich article ok", { headline: batch[j].headline?.slice(0, 60) });
    } else {
      enriched.push(batch[j]); // push unenriched
      log.warn("enrich article failed", { headline: batch[j].headline?.slice(0, 60), error: result.reason?.message });
    }
  }
}

log.info("enrich complete", {
  total: articles.length,
  enriched: enriched.filter(a => a.takeaway).length,
  fallback: enriched.filter(a => !a.takeaway).length
});
return enriched;
```

### What's removed
- `maxEnrichmentCalls` variable and the `enrichmentCalls >= maxEnrichmentCalls` guard
- `shouldUseAgentArticleEnrichment` check (triage already did selectivity work)
- `seenTemplateSignatures` dedup logic (no longer needed without cap)
- `agentMode` branching inside enrichment

---

## What's Deleted from `news-sources.mjs`

### Constants removed (top of file, lines 10–18)
- `MARKET_RELEVANCE_PATTERN`
- `STRICT_MARKET_RELEVANCE_PATTERN`
- `DIRECT_MARKET_MOVING_PATTERN`
- `OFF_TOPIC_WITHOUT_MARKET_PATTERN`
- `OFF_TOPIC_ALWAYS_PATTERN`
- `LEGAL_POLITICAL_WITHOUT_POLICY_PATTERN`
- `MARKET_POLICY_PATTERN`
- `LOW_SIGNAL_MARKET_CONTENT_PATTERN`
- `LOW_SIGNAL_LIVE_HEADLINE_PATTERN`

### Functions removed
- `articleLooksMarketRelevant` (~40 lines)
- `isWeakNeutralVolatileArticle`
- `hasSpecificMarketDriverText`
- `isLowRelevanceUsSingleStockStory`
- `isIndiaStartupFundingStory`
- `isGenericEarningsCallSummary`
- `isImportantEarningsStory`
- `isSmeIpoStory` (just added — no longer needed)
- `isTradePolicyStory`, `isIndiaPolicyStory`, `isIndiaPreciousMetalsPolicyStory`
- `isIndiaFuelForexPolicyStory`, `isGeopoliticalRiskStory`, `isMarketInfrastructureStory`
- `isIndexRebalancingStory`, `isMonsoonStory`, `isIndiaInfrastructureStory`
- `isFuelInflationStory`, `isIndiaTelecomStory`, `isCorporateActionStory`
- `isPrivateMarketStory`, `isOilStory`, `isIndiaEnergyStory`
- `isLowRelevanceUsSingleStockStory`
- ~400 lines total

### `verifySourceArticles` (QA function)
Currently calls `articleLooksMarketRelevant`. Replace that call with a check that the article has a non-empty headline (since triage already judged relevance at generation time; QA just checks structure).

---

## What Does NOT Change

- `articleIsFreshForDigest` — date math, keep as-is
- `sourceUrlLooksArticleLevel` — URL structure check, keep as-is
- `dailyLeadForDigest` and the daily reranker — unchanged
- `generateFullScriptWithAI` — unchanged
- `publicSourceSelectionForDigest` — unchanged
- All of the publish pipeline — unchanged

---

## Projected Timeline

| Stage | Current | New |
|---|---|---|
| Triage (proceed-after-3) | — | ~40s |
| Article enrichment | ~8 min (8×60s sequential) | ~4 min (batches of 4, parallel) |
| Script generation | ~5 min | ~5 min |
| **Total** | **~13 min** | **~9.5 min** |

---

## Open Questions Before Implementation

1. **Threshold tuning:** Test used 2.0. Should borderline articles like "Tech Equity Sales Renew AI Debt-Binge Worries" (avg=2.20) be included? Consider 2.0 vs 2.5.
2. **`verifySourceArticles` QA check:** What should replace `articleLooksMarketRelevant` there? Simple headline-exists check, or drop the relevance part entirely since triage already handled it?
3. **Triage when NVIDIA_API_KEY missing:** Fail-open (return all articles) or fail the whole generation? Currently generation already requires the API key for other calls, so failing is acceptable.
4. **`isSmeIpoStory` I added yesterday:** Delete it as part of this work, since triage replaces it.
