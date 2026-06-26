import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DAILY_LEAD_RERANK_PROMPT } from "./editorial-guardrails.mjs";
import { log } from "./logger.mjs";
import { fetchFiiDiiFlows, fetchLiveMarketSnapshots, markSnapshotsAsFallback } from "./market-data.mjs";
import { resolveNewsArticles } from "./news-sources.mjs";

const NIM_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NIM_MODEL = process.env.NVIDIA_MODEL ?? "nvidia/nemotron-3-ultra-550b-a55b";

let _skillsCache = null;
async function loadSkills() {
  if (_skillsCache) return _skillsCache;
  try {
    const skillsPath = join(rootDir, "tools", "skills.md");
    _skillsCache = await readFile(skillsPath, "utf8");
  } catch {
    _skillsCache = "";
  }
  return _skillsCache;
}

export async function nimCall(systemPrompt, userPrompt, { maxTokens = 1024, retries = 2, temperature = 0.65 } = {}) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;
  console.error("nimCall called with prompt:", userPrompt.substring(0, 100));
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 3000 * attempt));
      const response = await fetch(NIM_API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: NIM_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: maxTokens,
          temperature
        }),
        signal: AbortSignal.timeout(Number(process.env.NVIDIA_TIMEOUT_MS ?? 120000))
      });
      if (response.status === 429 || response.status >= 500) {
        process.stderr.write(`[agent] NIM ${response.status} on attempt ${attempt + 1}\n`);
        continue;
      }
      if (!response.ok) {
        process.stderr.write(`[agent] NIM ${response.status}: ${await response.text()}\n`);
        return null;
      }
      const data = await response.json();
      const raw = data?.choices?.[0]?.message?.content?.trim() ?? null;
      return raw ? cleanAIOutput(raw) : null;
    } catch (err) {
      process.stderr.write(`[agent] NIM fetch failed (attempt ${attempt + 1}): ${err.message}\n`);
    }
  }
  return null;
}

function cleanAIOutput(text) {
  // Strip conversational preamble lines the model adds before the actual format
  const preamblePattern = /^(here is|below is|sure[,!]|certainly[,!]|of course[,!]|here's|i've|i have|as requested)[^\n]*\n+/i;
  let cleaned = text.replace(preamblePattern, "").trimStart();
  // Strip trailing sign-off lines ("Let me know if...", "Feel free to...")
  cleaned = cleaned.replace(/\n+(let me know if[^\n]*|feel free to[^\n]*|hope this helps[^\n]*)$/i, "");
  return cleaned.trim();
}

async function generateFullScriptWithAI({ date, sentimentLabel, snapshots, themes, setups, articles, overallSentiment, dailyLead }) {
  if (!process.env.NVIDIA_API_KEY) return null;
  const skills = await loadSkills();

  const marketSummary = snapshots
    .map((s) => `${s.name} ${s.changePercent >= 0 ? "+" : ""}${s.changePercent}%`)
    .join(", ");
  const themesSummary = themes
    .map((t) => `- ${t.title}: ${t.summary}`)
    .join("\n");
  const setupsSummary = setups.length === 0
    ? "No active setups today."
    : setups.map((s) => `${s.symbol} ${s.direction} — entry ${s.entry}, stop ${s.stopLoss}, target ${s.target} (RR ${s.riskReward}) — ${s.confidenceReason}`).join("\n");
  const topArticles = articles.slice(0, 6)
    .map((a) => `[${a.sentimentScore > 0 ? "+" : ""}${a.sentimentScore?.toFixed(2)}] ${a.headline} — ${a.summary || a.takeaway || ""}`)
    .join("\n");

  const context = `DATE: ${date}
SENTIMENT: ${sentimentLabel} (score: ${overallSentiment})
MARKETS: ${marketSummary}
${dailyLead?.headline ? `\nPRIMARY STORY (lead with this): ${dailyLead.headline}\n` : ""}
KEY THEMES:
${themesSummary}

SETUPS:
${setupsSummary}

TOP NEWS (${articles.length} total articles):
${topArticles}`;

  const systemPrompt = skills || "You are the Market Narrative daily briefing agent for Indian retail traders.";
  const noWrap = "Output ONLY the formatted content. Do NOT write any introduction, preamble, or sign-off. Start your response directly with the first line of the format.";

  // Sequential calls — parallel hits NVIDIA NIM rate limits and silently drops 2 of 3
  const onePageSummary = await nimCall(
    systemPrompt,
    `${noWrap}\n\nWrite the One-Page Summary. Start directly with "Market Mood:".\nFormat: Market Mood, Global Cues, Narrative Themes (sharp specific titles, not generic labels), Validated Trading Setups, Educational note.\n\n${context}`,
    { maxTokens: 512 }
  );
  const teleprompterScript = await nimCall(
    systemPrompt,
    `${noWrap}\n\nWrite the Teleprompter Script. Start directly with "[OPENING]".\nSections: [OPENING], [GLOBAL CUES], [NARRATIVE THEMES], [NIFTY AND BANK NIFTY VIEW], [VALIDATED SETUPS], [RISK DISCLAIMER].\nMax 20 words per sentence. Calm, confident delivery tone.\n\n${context}`,
    { maxTokens: 900 }
  );
  const reelScript = await nimCall(
    systemPrompt,
    `${noWrap}\n\nWrite the Reel Script (45–60 sec). Start directly with "[0-03s | HOOK]".\nSections: [0-03s | HOOK], [03-14s | OVERNIGHT STORY], [14-28s | WHY INDIA CARES], [28-40s | WHAT TO WATCH], [40-52s | BIGGER PICTURE], [52-58s | FOLLOW CTA], [58-60s | CLOSE].\n\nRULES:\n- This is a FINANCIAL NEWS STORY reel, not a trading brief. Zero trading advice, zero entry/exit levels, zero buy/sell calls.\n- Every line must make the viewer want to hear the next line.\n- Find the most counterintuitive or surprising fact in the data — lead with that.\n- Tell a story: connect events as cause → effect → India impact.\n- Numbers only appear after you explain why they matter.\n- Natural Hinglish throughout. Group chat energy, not newsreader.\n- VOICEOVER lines max 12 words each.\n- End CLOSE with: "Poora briefing — marketnarrative.in. Roz 7:15 AM. Miss mat karo."\n- If MSCI rebalancing, index reshuffle, or passive fund flows appear in the data — LEAD WITH THAT. It is the most important explainer when markets move without an obvious reason.\n- If monsoon forecast or IMD data appears — include it in WHY INDIA CARES.\n\n${context}`,
    { maxTokens: 800 }
  );

  const editorialBriefing = await nimCall(
    systemPrompt,
    `${noWrap}\n\nWrite the Editorial Briefing.\nSections: [TWO-MINUTE SUMMARY], [DESK NOTE].\n\nRULES for TWO-MINUTE SUMMARY:\n- Exactly 4 paragraphs, one story per paragraph.\n- Each paragraph is 3 to 4 full sentences (roughly 45-70 words), not a one-line note.\n- Structure each paragraph as: what happened -> why it matters for India (name the sectors, stocks, or the rupee it touches) -> what to watch next.\n- Plain, everyday English a non-trader can follow. NO market jargon: do not use "VWAP", "first-range", "breadth", "tradable", "RR", or specific index levels/numbers as levels.\n- Facts and clear cause-and-effect read-throughs. No opinions, no buy/sell/hold/target calls.\n\nRULES for DESK NOTE:\n- An editor's opinion column with a distinct point of view.\n- It can be wrong, that's fine, but it must have a strong narrative.\n- ABSOLUTELY NO trading levels (e.g. no 22,400) and NO trading calls (e.g. no "buy the dip" or "hold VWAP").\n- Focus entirely on market narrative and structural read-throughs.\n\n${context}`,
    { maxTokens: 2000 }
  );

  let twoMinuteSummary = null;
  let deskNote = null;
  if (editorialBriefing) {
    const lines = editorialBriefing.split('\n');
    let mode = null;
    let tmsLines = [];
    let dnLines = [];
    for (const line of lines) {
      if (line.includes('[TWO-MINUTE SUMMARY]')) { mode = 'tms'; continue; }
      if (line.includes('[DESK NOTE]')) { mode = 'dn'; continue; }
      if (mode === 'tms') tmsLines.push(line);
      if (mode === 'dn') dnLines.push(line);
    }
    twoMinuteSummary = tmsLines.join('\n').trim();
    deskNote = dnLines.join('\n').trim();
  }

  if (!teleprompterScript && !onePageSummary && !reelScript && !twoMinuteSummary && !deskNote) return null;
  return { teleprompterScript, onePageSummary, reelScript, twoMinuteSummary, deskNote };
}

// Plain-language description of today's open, derived only from real data. Used to lock
// the LLM headline's tone to the actual market direction (no bearish title on an up day).
export function marketBiasWord(dailyLead, marketSnapshots = []) {
  const giftBias = dailyLead?.giftNiftyBias?.bias;
  if (giftBias === "gap_up") return "POSITIVE — GIFT Nifty signals a gap-up / firm open";
  if (giftBias === "gap_down") return "NEGATIVE — GIFT Nifty signals a gap-down / weak open";
  const nifty = marketSnapshots.find((s) => s.symbol === "NIFTY");
  const pct = Number(nifty?.changePercent);
  if (Number.isFinite(pct) && pct > 0.3) return "POSITIVE — overnight cues point to a firm open";
  if (Number.isFinite(pct) && pct < -0.3) return "NEGATIVE — overnight cues point to a weak open";
  return "MIXED — no clear directional edge into the open";
}

// Punchy, SEO-friendly H1 written by the model, grounded strictly in the chosen lead and
// real market data so it cannot drift to an off-lead story, fabricate flows, or contradict
// the day's direction. Falls back to the deterministic templated title on failure.
export async function generateEditorialHeadline({ dailyLead, marketSnapshots = [], marketUpdate = false } = {}) {
  if (!process.env.NVIDIA_API_KEY) return null;
  const story = dailyLead?.headline || dailyLead?.label || "";
  if (!story) return null;
  const bias = marketBiasWord(dailyLead, marketSnapshots);
  const price = (symbol, label, unit = "%") => {
    const s = marketSnapshots.find((x) => x.symbol === symbol);
    if (!s) return "";
    const pct = Number(s.changePercent);
    const pctStr = Number.isFinite(pct) ? `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` : "";
    const lvl = unit === "$" && Number.isFinite(Number(s.closeValue)) ? ` ($${Math.round(Number(s.closeValue))})` : "";
    return `${label}${lvl} ${pctStr}`.trim();
  };
  const pricesLine = [price("NIFTY", "Nifty"), price("BANKNIFTY", "Bank Nifty"), price("BRENT", "Brent crude", "$"), price("USDINR", "USD/INR")]
    .filter(Boolean).join(", ");
  const system = marketUpdate
    ? "You are the headline editor for Market Narrative's Indian stock market update. You write accurate, grounded headlines — never sensational and never invented."
    : "You are the headline editor for Market Narrative, a pre-market briefing for Indian equity traders and investors. You write accurate, grounded headlines — never sensational and never invented.";
  const user = marketUpdate
    ? `Write ONE H1 headline for today's India market update. Indian stock markets are CLOSED today, so this is a general market update — NOT a pre-market or opening-bell piece.

PRIMARY STORY (the headline MUST be about THIS story, nothing else): ${story}
INDIA READ-THROUGH: ${dailyLead?.indiaImpact || ""}
PRICES (latest close): ${pricesLine}

RULES:
- 8 to 13 words. One line only. No surrounding quotes, no date, no publisher name.
- The headline MUST be about the PRIMARY STORY and its India relevance.
- Markets are CLOSED: do NOT reference "the open", "gap-up", "gap-down", "9:15", "pre-market", or trading the session.
- Use ONLY the facts above. Do NOT invent events, FII/FPI flows, named stocks, or numbers that are not listed.
- Engaging, punchy, factual. SEO: include "Nifty", "Sensex", or "stock market" plus the named driver.
- No sensational or clickbait words. No buy/sell/hold, no price targets, no index levels.
- Output ONLY the headline text.`
    : `Write ONE H1 headline for today's India pre-market briefing.

PRIMARY STORY (the headline MUST be about THIS story, nothing else): ${story}
INDIA READ-THROUGH: ${dailyLead?.indiaImpact || ""}
MARKET DIRECTION TODAY: ${bias}
PRICES: ${pricesLine}

RULES:
- 8 to 13 words. One line only. No surrounding quotes, no date, no publisher name.
- The headline MUST be about the PRIMARY STORY and its India read-through — do not switch to a different topic.
- The tone MUST match MARKET DIRECTION. If POSITIVE, do not imply selling, caution, or a weak open. If NEGATIVE, do not imply a rally.
- Use ONLY the facts above. Do NOT invent events, FII/FPI flows, named stocks, or numbers that are not listed.
- Make it engaging and punchy with a clear angle — connect the story to its India market impact, not a flat wire headline.
- SEO: name the driver (e.g. "Brent crude", "bond yields", a sector) AND, where it fits naturally, add an India-equity hook readers search — "Nifty", "Sensex", or "stock market today".
- Plain, confident, factual. No sensational or clickbait words ("spree", "shocking", "panic", "you won't believe").
- No trading calls: no buy/sell/hold, no price targets, no index levels, no "VWAP".
- Output ONLY the headline text.`;
  const raw = await nimCall(system, user, { maxTokens: 60, retries: 3, temperature: 0.3 });
  return sanitizeEditorialHeadline(raw);
}

function sanitizeEditorialHeadline(raw) {
  if (!raw) return null;
  let h = String(raw).split("\n").map((line) => line.trim()).filter(Boolean)[0] || "";
  h = h.replace(/^["'“”\s]+|["'“”\s]+$/g, "").replace(/\s+/g, " ").replace(/[.]+$/, "").trim();
  if (!h) return null;
  // Reject trading-call / level language so the H1 always clears editorial guardrails.
  if (/\b(buy|sell|hold)\b/i.test(h)) return null;
  if (/\btarget price\b|\bvwap\b/i.test(h)) return null;
  if (/\b\d{2},?\d{3}\b/.test(h)) return null; // index levels like 24,114 / 24114 / 80000
  // Reject sensational / clickbait language we explicitly forbid.
  if (/\b(spree|shocking|panic|jaw-dropping|unbelievable)\b/i.test(h)) return null;
  if (/you won'?t believe|will shock/i.test(h)) return null;
  if (h.length < 18 || h.length > 90) return null;
  return h;
}

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const seedDir = join(rootDir, "backend", "src", "main", "resources", "seed");
const PUBLIC_SOURCE_LIMIT = 10;
const MIN_PUBLIC_SOURCE_COUNT = 3;
export const PUBLIC_DISPLAY_LIMIT = 10;

export async function loadSeeds() {
  const [marketSnapshots, news, priceSeries, creator] = await Promise.all([
    readJson(join(seedDir, "market-snapshots.json")),
    readJson(join(seedDir, "news.json")),
    readJson(join(seedDir, "price-bars.json")),
    readJson(join(seedDir, "sample-creator.json"))
  ]);
  return { marketSnapshots, news, priceSeries, creator };
}

export async function buildDigest(date = todayIso(), options = {}) {
  const started = performance.now();
  const [seedMarketSnapshots, news, priceSeriesSeed] = await Promise.all([
    delayedRead("market-snapshots.json", 35),
    delayedRead("news.json", 55),
    delayedRead("price-bars.json", 45)
  ]);
  const marketDataMode = options.marketDataMode ?? process.env.MARKET_DATA_MODE ?? "mock";
  const newsDataMode = options.newsDataMode ?? process.env.NEWS_DATA_MODE ?? "fixture";
  const { marketSnapshots, marketDataError, fiiDiiFlows } = await resolveMarketSnapshots(seedMarketSnapshots, marketDataMode);
  const { articles, sourceVerification } = await resolveNewsArticles(date, {
    mode: newsDataMode,
    seedNews: news.map((article) => ({
      ...article,
      thumbnail: normalizeArticleThumbnail(article)
    })),
    previousDigest: options.previousDigest,
    fetcher: options.fetcher,
    strictFetch: options.strictFetch,
    llmFetcher: options.llmFetcher,
    articleEditorialEnricher: options.articleEditorialEnricher,
    llmArticleEnrichment: options.llmArticleEnrichment,
    agentArticleEnrichment: options.agentArticleEnrichment,
    maxArticleEditorialEnrichmentCalls: options.maxArticleEditorialEnrichmentCalls,
    anthropicApiKey: options.anthropicApiKey,
    anthropicModel: options.anthropicModel,
    openaiApiKey: options.openaiApiKey,
    openaiModel: options.openaiModel,
    geminiApiKey: options.geminiApiKey,
    geminiModel: options.geminiModel,
    nvidiaApiKey: options.nvidiaApiKey,
    nvidiaModel: options.nvidiaModel,
    nvidiaBaseUrl: options.nvidiaBaseUrl,
    nvidiaMaxTokens: options.nvidiaMaxTokens,
    nvidiaTemperature: options.nvidiaTemperature,
    nvidiaTopP: options.nvidiaTopP
  });
  const sourceSelection = publicSourceSelectionForDigest(date, articles, { marketSnapshots });
  const PHANTOM_LABEL_PATTERN = /^(Negative Macro Impact|Global Risk-Off Cue|Volatile Opening Bias|Hook|Global Cue|India Read|Market Driver|Opening Bias|Sector Watch)$/i;
  const publicArticles = sourceSelection.visibleArticles.filter(a => 
    a.sourceUrl && 
    a.headline && 
    a.headline.length > 20 &&
    !PHANTOM_LABEL_PATTERN.test(a.headline)
  );
  const publicSourceSelection = sourceSelection.publicSummary;
  const dailyLead = await dailyLeadForDigestWithAgent(date, publicArticles, {
    marketSnapshots,
    dailyLeadReranker: options.dailyLeadReranker,
    llmFetcher: options.llmFetcher,
    agentLeadRerank: options.agentLeadRerank,
    nvidiaApiKey: options.nvidiaApiKey,
    nvidiaModel: options.nvidiaModel,
    nvidiaBaseUrl: options.nvidiaBaseUrl,
    nvidiaMaxTokens: options.nvidiaMaxTokens,
    nvidiaTemperature: options.nvidiaTemperature,
    nvidiaTopP: options.nvidiaTopP
  });
  const themes = clusterThemes(date, publicArticles);
  const rawTradeSetups = scanPriceSeries(date, priceSeriesSeed);
  const setupAudit = auditTradeSetupsWithMarketSnapshots(date, rawTradeSetups, marketSnapshots);
  const tradeSetups = setupAudit
    .filter((item) => item.status === "ACTIVE")
    .filter((item) => item.setup?.lastBarDate && 
      (new Date(date) - new Date(item.setup.lastBarDate)) / 86400000 < 14)
    .map((item) => item.setup);
  const overallSentiment = weightedSentiment(articles);
  const sentimentLabel = labelFromScore(overallSentiment);
  const script = generateScript(date, sentimentLabel, marketSnapshots, themes, tradeSetups, overallSentiment, publicArticles, options.previousDigest, dailyLead);
  const aiScript = await generateFullScriptWithAI({ date, sentimentLabel, snapshots: marketSnapshots, themes, setups: tradeSetups, articles: publicArticles, overallSentiment, dailyLead });
  let twoMinuteSummary = null;
  let aiDeskNote = null;
  if (aiScript) {
    if (aiScript.teleprompterScript) script.teleprompterScript = aiScript.teleprompterScript;
    if (aiScript.onePageSummary) script.onePageSummary = aiScript.onePageSummary;
    if (aiScript.reelScript) script.reelScript = aiScript.reelScript;
    if (aiScript.twoMinuteSummary) twoMinuteSummary = aiScript.twoMinuteSummary;
    if (aiScript.deskNote) aiDeskNote = aiScript.deskNote;
  }
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const archiveSummary = archiveSummaryForDigest(date, publicArticles, themes, options.previousDigest, dailyLead);
  const deskNote = aiDeskNote || deskNoteForDigest(date, publicArticles, tradeSetups, marketSnapshots, overallSentiment, options.previousDigest, dailyLead);
  const watchItems = watchItemsForDigest(date, publicArticles, tradeSetups, options.previousDigest);
  assertDigestEditorialIntegrity({
    title: script.title,
    archiveSummary,
    deskNote,
    watchItems,
    dailyLead
  }, options.previousDigest);
  const asset = generateAsset(date, sentimentLabel, {
    snapshots: marketSnapshots,
    themes,
    setups: tradeSetups,
    articles: publicArticles
  });

  const digest = {
    scriptId: 1,
    digestDate: date,
    title: script.title,
    status: "DRAFT",
    generatedAt,
    dailyLead,
    publicSourceSelection,
    archiveSummary,
    twoMinuteSummary,
    deskNote,
    watchItems,
    overallSentiment: round(overallSentiment, 3),
    sentimentLabel,
    onePageSummary: script.onePageSummary,
    teleprompterScript: script.teleprompterScript,
    reelScript: script.reelScript,
    publishedAt: null,
    marketSnapshots,
    fiiDiiFlows: fiiDiiFlows ?? null,
    giftNiftyBias: dailyLead.giftNiftyBias ?? null,
    todaysReadArticle: null,
    news: publicArticles,
    themes,
    tradeSetups,
    setupAudit,
    asset,
    marketDataMode,
    marketDataError,
    newsDataMode,
    sourceVerification,
    durationMillis: Math.round(performance.now() - started)
  };

  digest.todaysReadArticle = await synthesizeTodaysReadArticle(date, publicArticles, marketSnapshots, { ...options, dailyLead });

  return digest;
}

async function resolveMarketSnapshots(seedMarketSnapshots, marketDataMode) {
  if (marketDataMode !== "live") {
    return { marketSnapshots: seedMarketSnapshots, marketDataError: null, fiiDiiFlows: null };
  }

  const [snapshotResult, fiiDiiFlows] = await Promise.all([
    fetchLiveMarketSnapshots().then(
      (snapshots) => ({ snapshots, error: null }),
      (error) => ({ snapshots: null, error: error.message })
    ),
    fetchFiiDiiFlows()
  ]);

  if (snapshotResult.snapshots) {
    // Merge seed-only symbols (GIFTNIFTY isn't on Yahoo Finance) into the live set
    // so GIFT Nifty gap computation always has data.
    const liveSymbols = new Set(snapshotResult.snapshots.map((s) => s.symbol));
    const seedOnlyExtras = seedMarketSnapshots.filter((s) => !liveSymbols.has(s.symbol));
    const merged = seedOnlyExtras.length > 0
      ? [...snapshotResult.snapshots, ...seedOnlyExtras.map((s) => ({ ...s, dataQuality: "seed-merged" }))]
      : snapshotResult.snapshots;
    return { marketSnapshots: merged, marketDataError: null, fiiDiiFlows };
  }
  return {
    marketSnapshots: markSnapshotsAsFallback(seedMarketSnapshots, snapshotResult.error),
    marketDataError: snapshotResult.error,
    fiiDiiFlows
  };
}

export function scanPriceSeries(date, priceSeriesSeed) {
  return priceSeriesSeed.flatMap((series) => {
    const setup = evaluateSeries(date, series.symbol, series.bars);
    return setup ? [setup] : [];
  });
}

export function reconcileTradeSetupsWithMarketSnapshots(date, setups, marketSnapshots) {
  return auditTradeSetupsWithMarketSnapshots(date, setups, marketSnapshots)
    .filter((item) => item.status === "ACTIVE")
    .map((item) => item.setup);
}

export function auditTradeSetupsWithMarketSnapshots(date, setups, marketSnapshots) {
  const snapshotsBySymbol = new Map(marketSnapshots.map((snapshot) => [snapshot.symbol, snapshot]));
  return setups.map((setup) => setupAuditEntry(date, setup, snapshotsBySymbol.get(setup.symbol)));
}

function setupAuditEntry(date, setup, snapshot) {
  const base = {
    symbol: setup.symbol,
    direction: setup.direction,
    entry: setup.entry,
    stopLoss: setup.stopLoss,
    target: setup.target,
    riskReward: setup.riskReward,
    setup
  };

  const lastBarDate = setup.lastBarDate;
  const setupAgeInDays = lastBarDate
    ? (new Date(date) - new Date(lastBarDate)) / 86400000
    : 999;

  if (setupAgeInDays > 14) {
    return {
      ...base,
      status: "STALE",
      reason: `${setup.symbol} setup is ${Math.floor(setupAgeInDays)} days old. Price-bars seed needs updating.`,
      currentPrice: null,
      remainingRiskReward: 0
    };
  }

  if (!snapshot || snapshot.dataQuality !== "live" || !Number.isFinite(Number(snapshot.closeValue))) {
    return {
      ...base,
      status: "ACTIVE",
      reason: "Prepared market data is in use, so the setup remains on the watchlist until a live price check is available.",
      currentPrice: Number.isFinite(Number(snapshot?.closeValue)) ? round(Number(snapshot.closeValue), 2) : null,
      remainingRiskReward: setup.riskReward
    };
  }

  const current = Number(snapshot.closeValue);
  if (setup.direction === "BULLISH") {
    if (current <= setup.stopLoss || current >= setup.target) {
      const crossedStop = current <= setup.stopLoss;
      return {
        ...base,
        status: crossedStop ? "STOP_INVALIDATED" : "TARGET_REACHED",
        reason: crossedStop
          ? `${setup.symbol} is below the invalidation line, so the bullish plan is no longer valid.`
          : `${setup.symbol} has already crossed the target. It is not shown as a fresh entry.`,
        currentPrice: round(current, 2),
        remainingRiskReward: 0
      };
    }
    if (current > setup.entry) {
      const remainingRiskReward = bullishRiskReward(current, setup.stopLoss, setup.target);
      if (remainingRiskReward < 2) {
        return {
          ...base,
          status: "RISK_REWARD_COMPRESSED",
          reason: `${setup.symbol} moved away from the entry zone; the reward left is only ${round(remainingRiskReward, 2)}R.`,
          currentPrice: round(current, 2),
          remainingRiskReward: round(remainingRiskReward, 3)
        };
      }
    }
    return {
      ...base,
      status: "ACTIVE",
      reason: current < setup.entry
        ? `${setup.symbol} is still below the entry zone, so this remains a conditional pullback plan.`
        : `${setup.symbol} still preserves at least 2R from the current price to target.`,
      currentPrice: round(current, 2),
      remainingRiskReward: current > setup.entry
        ? round(bullishRiskReward(current, setup.stopLoss, setup.target), 3)
        : setup.riskReward
    };
  }

  if (setup.direction === "BEARISH") {
    if (current >= setup.stopLoss || current <= setup.target) {
      const crossedStop = current >= setup.stopLoss;
      return {
        ...base,
        status: crossedStop ? "STOP_INVALIDATED" : "TARGET_REACHED",
        reason: crossedStop
          ? `${setup.symbol} is above the invalidation line, so the bearish plan is no longer valid.`
          : `${setup.symbol} has already crossed the target. It is not shown as a fresh entry.`,
        currentPrice: round(current, 2),
        remainingRiskReward: 0
      };
    }
    if (current < setup.entry) {
      const risk = setup.stopLoss - current;
      const reward = current - setup.target;
      const remainingRiskReward = risk > 0 ? reward / risk : 0;
      if (remainingRiskReward < 2) {
        return {
          ...base,
          status: "RISK_REWARD_COMPRESSED",
          reason: `${setup.symbol} moved away from the entry zone; the reward left is only ${round(remainingRiskReward, 2)}R.`,
          currentPrice: round(current, 2),
          remainingRiskReward: round(remainingRiskReward, 3)
        };
      }
    }
    return {
      ...base,
      status: "ACTIVE",
      reason: current > setup.entry
        ? `${setup.symbol} is still above the entry zone, so this remains a conditional pullback plan.`
        : `${setup.symbol} still preserves at least 2R from the current price to target.`,
      currentPrice: round(current, 2),
      remainingRiskReward: setup.riskReward
    };
  }

  return {
    ...base,
    status: "UNKNOWN",
    reason: `${setup.symbol} direction is not supported by the current scanner.`,
    currentPrice: round(current, 2),
    remainingRiskReward: 0
  };
}

export function evaluateSeries(date, symbol, bars) {
  if (bars.length < 21) {
    return null;
  }

  const latest = bars[bars.length - 1];
  const currentEma = ema(bars, 20);
  const currentRsi = rsi(bars, 14);
  const previousRsi = rsi(bars.slice(0, -1), 14);
  const priorAverageVolume = averageVolume(bars.slice(0, -1), 20);

  const trendPass = latest.close > currentEma;
  const momentumPass = currentRsi > 50 && currentRsi > previousRsi;
  const volumePass = latest.volume >= priorAverageVolume * 1.5;

  if (!trendPass || !momentumPass || !volumePass) {
    return null;
  }

  const entry = latest.close;
  const stopLoss = Math.min(latest.low, currentEma * 0.992);
  const target = entry + (entry - stopLoss) * 2.2;
  const riskReward = bullishRiskReward(entry, stopLoss, target);

  if (riskReward < 2) {
    return null;
  }

  return {
    symbol,
    direction: "BULLISH",
    entry: round(entry, 2),
    stopLoss: round(stopLoss, 2),
    target: round(target, 2),
    riskReward: round(riskReward, 3),
    confidenceReason: "Price is above the 20-period EMA, RSI-14 is above 50 and rising, and latest volume is at least 1.5x the prior average.",
    invalidationReason: `Invalidate the setup if price closes below ${round(stopLoss, 2)}.`,
    digestDate: date,
    lastBarDate: latest.date
  };
}

export function ema(bars, period) {
  if (!bars.length) {
    throw new Error("EMA requires at least one bar");
  }
  const effectivePeriod = Math.min(period, bars.length);
  const multiplier = 2 / (effectivePeriod + 1);
  let value = bars[0].close;
  for (let i = 1; i < bars.length; i += 1) {
    value = (bars[i].close - value) * multiplier + value;
  }
  return value;
}

export function rsi(bars, period) {
  if (bars.length <= period) {
    throw new Error("RSI requires more bars than the period");
  }
  let gains = 0;
  let losses = 0;
  const start = bars.length - period;
  for (let i = start; i < bars.length; i += 1) {
    const change = bars[i].close - bars[i - 1].close;
    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }
  if (losses === 0) {
    return 100;
  }
  const relativeStrength = (gains / period) / (losses / period);
  return 100 - 100 / (1 + relativeStrength);
}

export function averageVolume(bars, period) {
  const selected = bars.slice(-Math.min(period, bars.length));
  return selected.reduce((sum, bar) => sum + bar.volume, 0) / selected.length;
}

export function bullishRiskReward(entry, stopLoss, target) {
  if (entry <= stopLoss) {
    throw new Error("Bullish entry must be above stop loss");
  }
  return (target - entry) / (entry - stopLoss);
}

export function clusterThemes(date, articles) {
  const groups = new Map();
  for (const article of articles) {
    groups.set(article.category, [...(groups.get(article.category) ?? []), article]);
  }
  return [...groups.entries()]
    .map(([category, groupedArticles]) => {
      const lead = groupedArticles
        .slice()
        .sort((left, right) =>
          Math.abs(right.sentimentScore * right.entityMatchScore) -
          Math.abs(left.sentimentScore * left.entityMatchScore)
        )[0];
      return {
        digestDate: date,
        themeType: category,
        title: titleForCategory(category),
        summary: lead.summary,
        sentimentScore: round(weightedSentiment(groupedArticles), 3),
        evidenceCount: groupedArticles.length
      };
    })
    .sort((left, right) => left.sentimentScore - right.sentimentScore);
}

export function weightedSentiment(articles) {
  const weights = articles.reduce((sum, article) => sum + article.entityMatchScore, 0);
  if (weights === 0) {
    return 0;
  }
  return articles.reduce(
    (sum, article) => sum + article.sentimentScore * article.entityMatchScore,
    0
  ) / weights;
}

export function labelFromScore(score) {
  if (score >= 0.25) {
    return "BULLISH";
  }
  if (score <= -0.25) {
    return "BEARISH";
  }
  if (Math.abs(score) < 0.1) {
    return "NEUTRAL";
  }
  return "VOLATILE";
}

const PUBLIC_MARKET_DISCLAIMER = "Educational market research only. This is not SEBI-registered investment advice, a research recommendation, or a solicitation to buy or sell securities or derivatives. No returns are assured; use your own risk plan.";

export function generateScript(date, sentimentLabel, snapshots, themes, setups, overallSentiment, articles = [], previousDigest = null, dailyLead = null) {
  const title = uniqueTitleForDigest(date, sentimentLabel, articles, themes, previousDigest, dailyLead);
  const marketLine = snapshots
    .map((snapshot) => `${snapshot.name} ${formatSnapshotChange(snapshot)}`)
    .join(", ");
  const themeLines = themes
    .map((theme) => `- ${theme.title}: ${theme.summary}`)
    .join("\n");
  const setupLines = setups.length === 0
    ? "- No clean 1:2 RR setup is active yet; wait for fresh opening-range confirmation."
    : setups
      .map((setup) =>
        `- ${setup.symbol} ${setup.direction} entry ${setup.entry}, stop ${setup.stopLoss}, target ${setup.target} (RR ${setup.riskReward})`
      )
      .join("\n");

  const onePageSummary = [
    `Market Mood: ${sentimentLabel}`,
    `Global Cues: ${marketLine}`,
    `Narrative Themes:\n${themeLines}`,
    `Validated Trading Setups:\n${setupLines}`,
    `Educational note: ${PUBLIC_MARKET_DISCLAIMER}`
  ].join("\n\n");

  const openingCue = openingMarketCue(snapshots);
  const opening = {
    BULLISH: `Good morning. ${openingCue} The bias is constructive, but Nifty and Bank Nifty still need acceptance after the bell.`,
    BEARISH: `Good morning. ${openingCue} The pre-open tape is cautious, so protect size until Nifty and Bank Nifty confirm support.`,
    VOLATILE: `Good morning. ${openingCue} This is a two-way setup; levels and breadth matter more than the first tick.`,
    NEUTRAL: `Good morning. ${openingCue} The tape is balanced, and the first range should define direction.`
  }[sentimentLabel];
  const cues = snapshots
    .map((snapshot) => `${snapshot.name} closed ${formatSnapshotChange(snapshot)}`)
    .join(". ");
  const themesText = themes
    .map((theme) => `Theme: ${theme.title}. ${theme.summary}`)
    .join("\n\n");
  const setupsText = setups.length === 0
    ? "No clean 1:2 setup is active yet; wait for the opening range to confirm direction."
    : setups
      .map((setup) =>
        `${setup.symbol}: watch ${setup.entry} as entry, ${setup.stopLoss} as invalidation, and ${setup.target} as target. ${setup.confidenceReason}`
      )
      .join("\n\n");

  const teleprompterScript = [
    `[OPENING]\n${opening}`,
    `[GLOBAL CUES]\n${cues}.`,
    `[NARRATIVE THEMES]\n${themesText}`,
    "[NIFTY AND BANK NIFTY VIEW]\nLet price confirm the opening bias. Do not chase the first candle; wait for acceptance around the levels.",
    `[VALIDATED SETUPS]\n${setupsText}`,
    `[RISK DISCLAIMER]\n${PUBLIC_MARKET_DISCLAIMER}`
  ].join("\n\n");
  const reelScript = generateReelScript({
    date,
    sentimentLabel,
    snapshots,
    themes,
    setups,
    articles
  });

  return {
    digestDate: date,
    title,
    onePageSummary,
    teleprompterScript,
    reelScript,
    overallSentiment: round(overallSentiment, 3)
  };
}

function openingMarketCue(snapshots = []) {
  const gift = snapshots.find((snapshot) => snapshot.symbol === "GIFTNIFTY");
  const nifty = snapshots.find((snapshot) => snapshot.symbol === "NIFTY");
  const bank = snapshots.find((snapshot) => snapshot.symbol === "BANKNIFTY");
  const parts = [
    gift ? `GIFT Nifty is ${directionWord(gift.changePercent)} ${formatAbsChange(gift.changePercent)}` : "",
    nifty ? `Nifty reference is ${formatNumber(nifty.closeValue)} (${formatSnapshotChange(nifty)})` : "",
    bank ? `Bank Nifty reference is ${formatNumber(bank.closeValue)} (${formatSnapshotChange(bank)})` : ""
  ].filter(Boolean);
  return parts.length ? parts.join("; ") + "." : "Nifty and Bank Nifty need confirmation at the open.";
}

function directionWord(value) {
  const change = Number(value || 0);
  if (Math.abs(change) < 0.05) return "flat near";
  return change > 0 ? "up" : "down";
}

function generateReelScript({ date, sentimentLabel, snapshots, themes, setups, articles }) {
  const pressure = strongestArticle(articles, (article) => Number(article.sentimentScore) < 0) ?? articles[0];
  const support = strongestArticle(articles, (article) => Number(article.sentimentScore) > 0);
  const usLine = speechRegionLine(snapshots, "US Overnight");
  const asiaLine = speechRegionLine(snapshots, "Asia Watch", { limit: 5, includeCountry: true });
  const indiaLine = speechRegionLine(snapshots, "India Open");
  const macroLine = speechRegionLine(snapshots, "Macro Hedges");
  const setup = setups.find((item) => item.symbol === "NIFTY") ?? setups[0];
  const bankSetup = setups.find((item) => item.symbol === "BANKNIFTY");
  const setupLine = setup
    ? `If ${setup.symbol} accepts near ${formatNumber(setup.entry)}, the plan is clean: invalidation below ${formatNumber(setup.stopLoss)}, target near ${formatNumber(setup.target)}, and no entry unless the reward stays at least twice the risk.`
    : "No forced trade at the open. Let the first-hour range form, then only take a setup that gives at least twice the reward for the risk.";
  const bankSetupLine = bankSetup
    ? `Bank Nifty confirmation sits near ${formatNumber(bankSetup.entry)}; below ${formatNumber(bankSetup.stopLoss)}, the risk-on read loses authority.`
    : bankNiftyConfirmationLine(snapshots);
  const toneLine = {
    BULLISH: "The setup has a constructive bias, but the first candle still has to prove it.",
    BEARISH: "This is not a clean risk-on morning; protect capital first and let levels confirm.",
    VOLATILE: "This is a two-way market; the edge is in waiting for confirmation, not guessing the gap.",
    NEUTRAL: "The market is balanced enough that the first thirty minutes can change the whole read."
  }[sentimentLabel] ?? "The first thirty minutes matter more than the headline gap.";
  const pressureLine = pressure
    ? `${pressure.takeaway || pressure.summary} That is the pressure point to respect.`
    : themes[0]?.summary || "Global cues are mixed.";
  const supportLine = support
    ? `${support.takeaway || support.summary} That is the counterweight if breadth improves.`
    : "The counterweight has to come from banks, defensives, or stronger market breadth.";
  const sectorStake = sectorStakeLine(pressure ?? support ?? themes[0]);
  const watchLine = pressure?.watchFor || support?.watchFor || "Watch opening breadth, Bank Nifty behavior, and whether Nifty holds the first-hour range.";
  const firstTheme = themes[0]?.title ? themes[0].title.toLowerCase() : "macro pressure";
  const sourceLine = [pressure?.sourceName, support?.sourceName].filter(Boolean).join(" and ");

  return [
    `[REEL SCRIPT | ${date} | 45-60 sec]`,
    "",
    "FORMAT: 9:16 vertical reel. Delivery should be sharp, conversational, and calm. Do not read the bracketed directions out loud.",
    "",
    "[0-03s | HOOK]",
    `ON SCREEN: ${sentimentLabel} pre-market read`,
    `VOICEOVER: Do not trade the open like a simple green-or-red signal. ${toneLine}`,
    "",
    "[03-14s | OVERNIGHT STORY]",
    `ON SCREEN: US, Asia, crude, banks`,
    `VOICEOVER: ${usLine || "US cues are mixed."} ${asiaLine || "Asia is selective, not one-way."} ${macroLine || "Crude and the dollar decide whether this pressure spreads."}`,
    "",
    "[14-28s | WHY INDIA CARES]",
    `ON SCREEN: ${firstTheme}`,
    `VOICEOVER: ${pressureLine} ${supportLine} India sector at stake: ${sectorStake}. ${sourceLine ? `This read is backed by ${sourceLine}.` : ""}`,
    "",
    "[28-40s | INDIA OPEN]",
    "ON SCREEN: Nifty + Bank Nifty game plan",
    `VOICEOVER: ${indiaLine || "Nifty and Bank Nifty need confirmation after the bell."} If banks hold VWAP and breadth improves, dips can stay selective. If breadth breaks, reduce size and wait.`,
    "",
    "[40-52s | TRADE PLAN]",
    "ON SCREEN: No chase. Only 1:2+ setups.",
    `VOICEOVER: ${setupLine} ${bankSetupLine}`,
    "",
    "[52-58s | WATCH NEXT]",
    `ON SCREEN: Watch this after 9:15`,
    `VOICEOVER: The next tell is this: ${watchLine}`,
    "",
    "[58-60s | CLOSE]",
    "ON SCREEN: Save before the open",
    "VOICEOVER: This is the Market Narrative pre-open map. Save it, respect the first range, and trade only your own risk plan."
  ].join("\n");
}

function bankNiftyConfirmationLine(snapshots = []) {
  const bank = snapshots.find((snapshot) => snapshot.symbol === "BANKNIFTY");
  if (!bank?.closeValue) {
    return "Bank Nifty must confirm with private-bank breadth and VWAP acceptance before any Nifty bias gets size.";
  }
  return `Bank Nifty confirmation is the filter: hold ${formatNumber(bank.closeValue)} and VWAP for risk-on; lose it and keep the Nifty plan defensive.`;
}

function sectorStakeLine(input) {
  const text = `${input?.headline || ""} ${input?.summary || ""} ${input?.takeaway || ""} ${input?.indiaImpact || ""} ${input?.title || ""}`.toLowerCase();
  if (/\b(oil|crude|brent|opec|hormuz)\b/.test(text)) return "OMCs, aviation, paints, tyres, and upstream energy";
  if (/\b(yield|rate|fed|inflation|bond)\b/.test(text)) return "Bank Nifty, realty, autos, and high-PE growth";
  if (/\b(dollar|rupee|currency|dxy|usd\/inr)\b/.test(text)) return "IT exporters versus import-cost sectors";
  if (/\b(bank|credit|nbfc|financial)\b/.test(text)) return "private banks, NBFCs, and Bank Nifty breadth";
  if (/\b(tech|ai|software|semiconductor|chip|nasdaq)\b/.test(text)) return "Nifty IT exporters and Nasdaq-sensitive risk appetite";
  if (/\b(airline|aviation|travel)\b/.test(text)) return "IndiGo, SpiceJet, aviation fuel costs, and travel demand";
  return "Bank Nifty confirmation, market breadth, and sector leadership";
}

export function generateAsset(date, sentimentLabel, context = {}) {
  const promptMood = {
    BULLISH: "green candlestick chart overlay, NSE ticker strip, Bank Nifty breadth tile, confident financial presenter",
    BEARISH: "red risk dashboard, rupee and DXY tiles, Nifty support band, serious financial presenter",
    VOLATILE: "split green-red candlestick grid, PCR and OI panels, focused financial presenter",
    NEUTRAL: "balanced chart grid, opening-range levels, composed financial presenter"
  }[sentimentLabel];
  const palette = {
    BULLISH: "emerald, charcoal, bright white",
    BEARISH: "crimson, graphite, cool white",
    VOLATILE: "slate blue, gold, neutral grey",
    NEUTRAL: "steel, white, muted green"
  }[sentimentLabel];
  const videoPackage = generateReelVideoPackage(date, sentimentLabel, context);

  return {
    sentimentLabel,
    positivePrompt: `photorealistic Indian male financial creator portrait, ControlNet reference, consistent face, NSE and BSE style market boards, Nifty and Bank Nifty ticker wall, ${promptMood}, cinematic studio lighting, sharp facial features, realistic skin texture, 8k editorial detail`,
    negativePrompt: "plastic skin, distorted eyes, extra fingers, cartoonish, low resolution, blurry text, deformed hands, generic Wall Street floor, NYSE trading pit, US flag backdrop, suit-and-tie corporate headshot, unreadable ticker text",
    palette,
    referenceImageId: "creator-ref-001",
    controlNetMode: "ControlNet Canny + Depth identity lock",
    assetUrl: `/assets/generated/daily-thumbnail-${date}.webp`,
    reelVideo: videoPackage
  };
}

function generateReelVideoPackage(date, sentimentLabel, { snapshots = [], themes = [], setups = [], articles = [] } = {}) {
  const pressure = strongestArticle(articles, (article) => Number(article.sentimentScore) < 0) ?? articles[0];
  const setup = setups.find((item) => item.symbol === "NIFTY") ?? setups[0];
  const macro = speechRegionLine(snapshots, "Macro Hedges");
  const india = speechRegionLine(snapshots, "India Open");
  const setupCaption = setup
    ? `${setup.symbol}: ${formatNumber(setup.entry)} / ${formatNumber(setup.stopLoss)} / ${formatNumber(setup.target)}`
    : "No chase: wait for first-hour range";
  const moodCaption = {
    BULLISH: "Constructive, but confirm",
    BEARISH: "Risk control first",
    VOLATILE: "Levels over prediction",
    NEUTRAL: "Opening range decides"
  }[sentimentLabel] ?? "Opening range decides";
  const scenes = [
    {
      time: "0-03s",
      title: "Hook",
      caption: moodCaption,
      visual: "Creator close-up, dark glass trading wall, bold sentiment badge."
    },
    {
      time: "03-14s",
      title: "Global Cue",
      caption: macro || pressure?.takeaway || "Macro pressure decides the open",
      visual: "US futures, Asia map, crude and dollar tiles moving behind the creator."
    },
    {
      time: "14-34s",
      title: "India Read",
      caption: india || themes[0]?.title || "Banks and breadth are the tell",
      visual: "Nifty and Bank Nifty cards, VWAP line, breadth meter."
    },
    {
      time: "34-52s",
      title: "Trade Plan",
      caption: setupCaption,
      visual: "Entry, stop, target cards with 1:2 risk-reward emphasis."
    },
    {
      time: "52-60s",
      title: "Close",
      caption: "Save before the open",
      visual: "Clean closing card with disclaimer microcopy."
    }
  ];

  return {
    durationSeconds: 60,
    aspectRatio: "9:16",
    style: "premium dark glassmorphism financial reel",
    captionStack: scenes.map((scene) => scene.caption),
    scenes,
    videoPrompt: [
      `Create a 60-second vertical financial market reel for ${date}.`,
      `Mood: ${sentimentLabel}. Style: premium dark glassmorphism, sharp typography, Indian market desk energy.`,
      `Use a photorealistic Indian male financial creator as presenter with a ControlNet reference and consistent face.`,
      `Set the scene in an Indian market studio with NSE/BSE-style boards, Nifty, Bank Nifty, GIFT Nifty, rupee, DXY, Brent, PCR and OI visual tiles where relevant.`,
      `Main story: ${trimTerminalPunctuation(pressure?.takeaway || themes[0]?.summary || "opening range confirmation matters")}.`,
      `Trade framing: ${setupCaption}.`,
      "No exaggerated profit claims, no guaranteed calls, no investment advice."
    ].join(" ")
  };
}

function trimTerminalPunctuation(value) {
  return String(value || "").trim().replace(/[.?!]+$/u, "");
}

function normalizeArticleThumbnail(article) {
  const fallbackLabel = String(article.entityName || "Macro").slice(0, 14);
  return {
    label: article.thumbnail?.label || fallbackLabel,
    theme: article.thumbnail?.theme || article.category || "market",
    accent: article.thumbnail?.accent || (Number(article.sentimentScore) >= 0 ? "#059669" : "#dc2626"),
    alt: article.thumbnail?.alt || `${article.headline} thumbnail`
  };
}

export function newsArticleJsonLd(digest, options = {}) {
  const canonicalPath = String(digest.canonicalPath || `/${digest.digestDate}/`);
  const canonicalUrl = `https://marketnarrative.in${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;
  const description = digest.archiveSummary || digest.deskNote || "Daily Market Narrative pre-market briefing for Nifty, Bank Nifty, global cues, and India read-through.";
  // JSON-LD headline MUST equal the page <h1> (hookTitle) — Google News and the Article
  // rich-result explicitly compare them and will demote mismatched signals. Fall back to
  // digest.title only when the caller has not computed a hook title yet.
  const headline = options.h1Override || digest.title;
  // Real raster ≥ 1200×675 is required for Google News discoverability. SVG OG cards
  // are fine for social but are ignored by the News image picker.
  const image = digest.ogImageUrl || "https://marketnarrative.in/og-card-1200x675.png";
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline,
    alternativeHeadline: digest.title,
    description,
    image: digest.ogImageUrl ? [image] : [image, "https://marketnarrative.in/og-card.svg"],
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl
    },
    datePublished: digest.publishedAt ?? `${digest.digestDate}T07:15:00+05:30`,
    dateModified: digest.generatedAt ?? digest.publishedAt ?? `${digest.digestDate}T07:15:00+05:30`,
    author: {
      "@type": "Person",
      name: "Abhey Deep",
      url: "https://marketnarrative.in/about/"
    },
    publisher: {
      "@type": "Organization",
      name: "Market Narrative",
      url: "https://marketnarrative.in",
      logo: {
        "@type": "ImageObject",
        url: "https://marketnarrative.in/favicon.svg"
      }
    },
    isAccessibleForFree: true,
    keywords: "Market Narrative, Abhey Deep, Nifty pre-market briefing, Bank Nifty, Indian stock market, 7:15 AM IST market brief",
    about: ["Nifty 50", "Bank Nifty", "Indian stock market", "pre-market briefing", "global market cues"]
  };
}

export function reelScriptMarkdown(digest) {
  return [
    `# ${digest.title}`,
    "",
    `Date: ${digest.digestDate}`,
    `Sentiment: ${digest.sentimentLabel}`,
    `Sources: ${digest.news?.length ?? 0}`,
    "",
    "## Daily Reel Script",
    "",
    digest.reelScript || digest.teleprompterScript || "",
    "",
    "## Source Anchors",
    "",
    ...(digest.news ?? []).slice(0, 8).map((article) =>
      `- ${article.sourceName}: ${article.headline} (${article.sourceUrl})`
    ),
    "",
    "Educational market preparation only. Not investment advice.",
    ""
  ].join("\n");
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function titleForCategory(category) {
  return {
    macro_negative: "Negative Macro Impact",
    macro_positive: "Global Earnings & Risk Appetite",
    sector_positive: "Sector-Specific Cushion",
    sector_negative: "Sector-Specific Pressure",
    global_risk: "Global Risk-Off Cue",
    neutral_volatile: "Volatile Opening Bias"
  }[category] ?? "Market Narrative Theme";
}

function titleSuffix(label) {
  return {
    BULLISH: "Positive Global Cues Support Gap-Up Watch",
    BEARISH: "Risk-Off Cues Test Nifty Support",
    VOLATILE: "Mixed Cues Put Levels in Focus",
    NEUTRAL: "Balanced Start Ahead of First-Hour Confirmation"
  }[label];
}

function uniqueTitleForDigest(date, sentimentLabel, articles, themes, previousDigest = null, dailyLead = null) {
  const lead = leadArticleForDailyLead(dailyLead, articles)
    ?? leadMarketArticle(articles, date)
    ?? strongestArticle(articles, (article) => Number.isFinite(Number(article.sentimentScore)))
    ?? articles[0];
  const headline = String(dailyLead?.headline || lead?.headline || themes[0]?.title || sentimentLabel || "Market").toLowerCase();
  // The lead label is sometimes a verbose market-bias sentence (e.g. "Nifty overnight:
  // +1.27% — gap-up bias" or "GIFT Nifty: ..."). That reads badly as a title force word,
  // so fall back to the driver label in those cases.
  const rawLabel = dailyLead?.label || "";
  const verboseLabel = /overnight|gift nifty|[:%]|\d/i.test(rawLabel);
  const force = (rawLabel && !verboseLabel) ? rawLabel : dominantForceLabel(lead, headline);
  const verb = dominantVerb(headline, lead?.category, sentimentLabel);
  const consequence = titleConsequence(lead, sentimentLabel);
  const previousTitle = normalizeEditorial(previousDigest?.title);
  const candidates = [
    `${force} ${verb} ${consequence}`,
    lead?.headline ? `${lead.headline} Sets Nifty Lens` : "",
    themes[0]?.title ? `${themes[0].title} Shapes The Open` : "",
    themes[1]?.title ? `${themes[1].title} Frames Bank Nifty` : ""
  ]
    .map(compactTitle)
    .filter(Boolean);
  return candidates.find((candidate) => normalizeEditorial(candidate) !== previousTitle)
    || compactTitle(`${force} ${verb} ${date} Open`);
}

function dominantForceLabel(article, headline) {
  if (/\b(jobs day|payroll|employment|jobless|labor market|semiconductor|chip|chips)\b/.test(headline)) return "Jobs And Chips";
  if (/\b(crude|oil|brent)\b/.test(headline)) return "Crude";
  if (/\b(yield|bond|rate|fed|inflation)\b/.test(headline)) return "Yields";
  if (/\b(dollar|rupee|currency|forex|yen)\b/.test(headline)) return "Currency";
  if (/\b(bank|banks|banking|credit)\b/.test(headline)) return "Banks";
  if (/\b(it|tech|ai|software|semiconductor)\b/.test(headline)) return "Tech";
  if (/\b(wall street|nasdaq|dow|s&p|futures)\b/.test(headline)) return "Global Risk";
  if (/\b(asia|china|japan|korea|hong kong|taiwan)\b/.test(headline)) return "Asia";
  if (/\b(commodity|commodities|metals|gold)\b/.test(headline)) return "Commodities";
  const entity = String(article?.entityName || "").replace(/\b50\b/g, "").trim();
  return entity && entity !== "Market" ? compactTitle(entity) : "Market Cues";
}

function dominantVerb(headline, category, sentimentLabel) {
  if (/\b(jobs day|payroll|employment|jobless|labor market|semiconductor|chip|chips)\b/.test(headline)) return "Test";
  if (/\b(crude|oil|brent)\b/.test(headline) && String(category).includes("risk")) return "Tests";
  if (/\b(spike|surge|jump|rise|rally|gain|firm|lift)\b/.test(headline)) return "Lift";
  if (/\b(fall|drop|slide|slip|ease|cool|weaken)\b/.test(headline)) return "Ease";
  if (/\b(pressure|risk|volatile|mixed|pause|stall|cautious)\b/.test(headline)) return "Test";
  if (String(category).includes("positive") || sentimentLabel === "BULLISH") return "Support";
  if (String(category).includes("negative") || sentimentLabel === "BEARISH") return "Weighs On";
  return "Shape";
}

function titleConsequence(article, sentimentLabel) {
  const headline = String(article?.headline || "").toLowerCase();
  const entity = String(article?.entityName || "").toLowerCase();
  if (/\b(jobs day|payroll|employment|jobless|labor market)\b/.test(headline)) return "Nifty Open";
  if (entity.includes("bank")) return "Bank Nifty Open";
  if (entity.includes("it") || entity.includes("tech")) {
    return /\b(indian it|nifty it|infosys|tcs|wipro|hcltech|tech mahindra)\b/.test(headline) ? "IT Breadth" : "Risk Appetite";
  }
  if (entity.includes("brent") || entity.includes("crude")) return "India Inflation Watch";
  if (sentimentLabel === "BULLISH") return "Nifty Upside Watch";
  if (sentimentLabel === "BEARISH") return "Nifty Open";
  return "Opening Range";
}

export function publicSourceSelectionForDigest(date, articles = [], options = {}) {
  const marketSnapshots = options.marketSnapshots ?? [];
  const allUnique = uniqueSourceArticles(articles).map(a => {
    if (hasPositiveIndiaReadthrough(a)) {
      return { ...a, sentimentScore: Math.max(0.35, Number(a.sentimentScore) || 0) };
    }
    return a;
  }).filter((article) => isWithinDigestWindow(article, date, 24));
  // Garbage rejection first — remove clearly irrelevant articles before any scoring
  const cleaned = allUnique.filter((article) => !isGarbageArticle(article));
  const pool = cleaned.length >= MIN_PUBLIC_SOURCE_COUNT ? cleaned : allUnique; // fallback to unfiltered if too few remain
  const scored = pool
    .slice()
    .sort((left, right) => tractionScore(right, date, pool, marketSnapshots) - tractionScore(left, date, pool, marketSnapshots));
  // Guarantee up to 3 India publisher articles reach the shortlist even on global-heavy days
  const indiaPublisherGuarantee = scored.filter(isIndiaPublisherArticle).slice(0, 3);
  const shortlist = uniqueSourceArticles([...indiaPublisherGuarantee, ...scored]).slice(0, 25);
  const indiaLinked = shortlist.filter(hasIndiaReadThrough);
  const visiblePool = indiaLinked.length >= MIN_PUBLIC_SOURCE_COUNT ? indiaLinked : shortlist;
  const targetCount = Math.min(PUBLIC_SOURCE_LIMIT, visiblePool.length);
  const visibleArticles = diverseVisibleArticles(visiblePool, targetCount, { preferIndiaSources: true });
  if (visibleArticles.length < MIN_PUBLIC_SOURCE_COUNT && process.env.ALLOW_INSUFFICIENT_SOURCES !== "true") {
    throw new Error(`Public source selection failed: only ${visibleArticles.length} public source articles inside the 24-hour window; need at least ${MIN_PUBLIC_SOURCE_COUNT}`);
  }
  const evidenceProfile = evidenceProfileForArticles(visibleArticles, shortlist);
  const visibleIndiaPublisherCount = evidenceProfile.directIndiaSourceCount;
  const shortlistIndiaPublisherCount = shortlist.filter(isIndiaPublisherArticle).length;
  return {
    visibleArticles,
    publicSummary: {
      visibleCount: visibleArticles.length,
      shortlistCount: shortlist.length,
      windowHours: 24,
      excludedNoDirectIndiaCount: shortlist.filter((article) => !hasIndiaReadThrough(article)).length,
      indiaPublisherCount: visibleIndiaPublisherCount,
      shortlistIndiaPublisherCount,
      directIndiaSourceCount: evidenceProfile.directIndiaSourceCount,
      officialIndiaSourceCount: evidenceProfile.officialIndiaSourceCount,
      domesticCatalystCount: evidenceProfile.domesticCatalystCount,
      globalContextCount: evidenceProfile.globalContextCount,
      globalOnlySourceRatio: evidenceProfile.globalOnlySourceRatio,
      evidenceGrade: evidenceProfile.evidenceGrade,
      publishMode: evidenceProfile.publishMode,
      indiaPublisherCoverage: evidenceProfile.summaryLine,
      visibleSourceUrls: visibleArticles.map((article) => article.sourceUrl).filter(Boolean)
    }
  };
}

function evidenceProfileForArticles(visibleArticles, shortlist) {
  const directIndiaSourceCount = visibleArticles.filter(isIndiaPublisherArticle).length;
  const officialIndiaSourceCount = visibleArticles.filter(isOfficialIndiaSourceArticle).length;
  const domesticCatalystCount = visibleArticles.filter(isDomesticCatalystArticle).length;
  const globalContextCount = visibleArticles.filter((article) => !isIndiaPublisherArticle(article)).length;
  const globalOnlySourceRatio = visibleArticles.length
    ? Math.round((visibleArticles.filter((article) => !isIndiaPublisherArticle(article) && !isOfficialIndiaSourceArticle(article)).length / visibleArticles.length) * 100)
    : 0;
  const fullGateCleared = directIndiaSourceCount >= 5 && officialIndiaSourceCount >= 3 && domesticCatalystCount >= 3 && globalOnlySourceRatio <= 60;
  const evidenceGrade = fullGateCleared
    ? "full"
    : directIndiaSourceCount > 0 || officialIndiaSourceCount > 0 || domesticCatalystCount > 0
      ? "limited"
      : "global_cue_only";
  return {
    directIndiaSourceCount,
    officialIndiaSourceCount,
    domesticCatalystCount,
    globalContextCount,
    globalOnlySourceRatio,
    evidenceGrade,
    publishMode: evidenceGrade === "full" ? "full_brief" : "limited_brief",
    summaryLine: sourceGateSummary({
      directIndiaSourceCount,
      officialIndiaSourceCount,
      domesticCatalystCount,
      globalOnlySourceRatio,
      evidenceGrade,
      shortlistIndiaPublisherCount: shortlist.filter(isIndiaPublisherArticle).length
    })
  };
}

function sourceGateSummary(profile) {
  if (profile.evidenceGrade === "full") {
    return `Full India-source gate: Cleared; ${profile.directIndiaSourceCount} direct India sources, ${profile.officialIndiaSourceCount} official sources, ${profile.domesticCatalystCount} domestic catalysts.`;
  }
  if (profile.directIndiaSourceCount > 0 || profile.officialIndiaSourceCount > 0 || profile.domesticCatalystCount > 0) {
    return `Full India-source gate: Limited; ${profile.directIndiaSourceCount} direct India sources, ${profile.officialIndiaSourceCount} official sources, ${profile.domesticCatalystCount} domestic catalysts.`;
  }
  return "Full India-source gate: Not cleared; this edition is global-cue context, not a full India-source briefing.";
}

export function dailyLeadForDigest(date, articles = [], options = {}) {
  const marketSnapshots = options.marketSnapshots ?? [];
  const ranked = rankedDailyLeadCandidates(date, articles, marketSnapshots);
  const lead = deterministicLeadArticleFromRanked(ranked);
  return dailyLeadFromArticle(date, lead, ranked, marketSnapshots);
}

export async function dailyLeadForDigestWithAgent(date, articles = [], options = {}) {
  const marketSnapshots = options.marketSnapshots ?? [];
  const ranked = rankedDailyLeadCandidates(date, articles, marketSnapshots);
  const deterministicLead = deterministicLeadArticleFromRanked(ranked);
  const deterministicDailyLead = dailyLeadFromArticle(date, deterministicLead, ranked, marketSnapshots);
  const candidates = dailyLeadRerankCandidates(ranked).slice(0, 8);
  const reranker = options.dailyLeadReranker ?? configuredDailyLeadReranker(options);

  if (typeof reranker !== "function" || candidates.length < 2) {
    return deterministicDailyLead;
  }

  try {
    const deterministicLeadId = articleLeadId(deterministicLead);
    const userPrompt = dailyLeadRerankUserPrompt({
      date,
      candidates,
      deterministicLeadId,
      marketSnapshots
    });
    const rawRerank = await reranker({
      date,
      prompt: DAILY_LEAD_RERANK_PROMPT,
      userPrompt,
      candidates: candidates.map(candidateForAgent),
      deterministicLeadId,
      marketSnapshots: dailyLeadMarketContext(marketSnapshots)
    });
    const rerank = parseDailyLeadRerank(rawRerank);
    const selection = validateDailyLeadRerank(rerank, candidates, deterministicLead);
    if (!selection) {
      return deterministicDailyLead;
    }
    return dailyLeadFromArticle(date, selection.article, ranked, marketSnapshots, {
      selectionMethod: "agent_rerank",
      selectionReason: selection.leadReason,
      selectionConfidence: selection.confidence,
      deterministicSourceArticleId: deterministicLeadId,
      driverType: selection.driverType
    });
  } catch (error) {
    if (options.strictLeadRerank) {
      throw error;
    }
    return deterministicDailyLead;
  }
}

function rankedDailyLeadCandidates(date, articles = [], marketSnapshots = []) {
  const allArticles = uniqueSourceArticles(articles);
  return allArticles
    .map((article, index) => ({
      article,
      index,
      score: tractionScore(article, date, allArticles, marketSnapshots)
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index);
}

function deterministicLeadArticleFromRanked(ranked = []) {
  const lead = ranked.find((item) => hasIndiaReadThrough(item.article) && !isLeadSuppressedArticle(item.article))?.article
    ?? ranked.find((item) => hasIndiaReadThrough(item.article))?.article
    ?? ranked[0]?.article
    ?? null;
  return lead;
}

function dailyLeadFromArticle(date, lead, ranked = [], marketSnapshots = [], selection = {}) {
  const support = ranked.find((item) => item.article !== lead && Number(item.article.sentimentScore) > 0.05 && hasIndiaReadThrough(item.article))?.article;
  const risk = ranked.find((item) => item.article !== lead && Number(item.article.sentimentScore) < -0.05 && hasIndiaReadThrough(item.article))?.article;
  const driverType = normalizeAgentLeadDriverType(selection.driverType, driverTypeForArticle(lead));
  const indirectLead = hasIndirectIndiaImpact(lead);
  const leadImpact = dailyLeadImpact(lead);
  const leadText = articleTextForLead(lead);
  const giftBias = computeGiftNiftyBias(marketSnapshots);

  // GIFT Nifty as the primary label when live; fall back to Nifty overnight change otherwise
  const niftySnap = marketSnapshots.find((s) => s.symbol === "NIFTY");
  const niftyChangePct = Number(niftySnap?.changePercent) || 0;
  const niftyBiasLabel = niftyChangePct > 0.3
    ? `Nifty overnight: +${round(Math.abs(niftyChangePct), 2)}% — gap-up bias`
    : niftyChangePct < -0.3
    ? `Nifty overnight: -${round(Math.abs(niftyChangePct), 2)}% — gap-down bias`
    : null;

  const giftLabel = giftBias
    ? `GIFT Nifty: ${giftBias.biasLabel}`
    : niftyBiasLabel;
  const fallbackLabel = indiaFuelForexPolicyText(leadText)
    ? "India fuel / forex stress"
    : indirectLead && driverType === "crude" ? "Crude supply watch" : driverLabelForType(driverType);

  // Prepend GIFT Nifty context to the India impact when gap is meaningful
  let enrichedImpact = leadImpact;
  if (giftBias && giftBias.bias !== "flat") {
    const giftCtx = giftBias.bias === "gap_up"
      ? `GIFT Nifty at ${giftBias.giftPrice} (+${giftBias.gapPts} pts, +${giftBias.gapPct}%) signals gap-up open. `
      : `GIFT Nifty at ${giftBias.giftPrice} (${giftBias.gapPts} pts, ${giftBias.gapPct}%) signals gap-down open. `;
    enrichedImpact = giftCtx + (leadImpact || "Confirm with Bank Nifty breadth and advance-decline before adding positions.");
  }

  return {
    label: giftLabel ?? fallbackLabel,
    sourceArticleId: articleLeadId(lead),
    driverType,
    headline: lead?.headline || "Source-led market cue",
    indiaImpact: enrichedImpact,
    riskSide: risk ? cleanLeadImpact(risk.indiaImpact) : defaultRiskSide(driverType, leadImpact),
    supportSide: cleanSentence(support?.indiaImpact || defaultSupportSide(driverType)),
    giftNiftyBias: giftBias ?? null,
    ...dailyLeadSelectionMetadata(selection)
  };
}

function dailyLeadSelectionMetadata(selection = {}) {
  if (selection.selectionMethod !== "agent_rerank") {
    return {};
  }
  const confidence = Number(selection.selectionConfidence);
  return {
    selectionMethod: "agent_rerank",
    selectionReason: compactWords(selection.selectionReason || "Agent reranked the deterministic source shortlist.", 24),
    selectionConfidence: Number.isFinite(confidence) ? round(confidence, 2) : null,
    deterministicSourceArticleId: selection.deterministicSourceArticleId || ""
  };
}

function dailyLeadRerankCandidates(ranked = []) {
  return ranked
    .filter((item) => item?.article)
    .map((item, index) => ({
      ...item,
      deterministicRank: index + 1,
      id: articleLeadId(item.article),
      driverType: driverTypeForArticle(item.article),
      hasIndiaReadThrough: hasIndiaReadThrough(item.article),
      leadSuppressed: isLeadSuppressedArticle(item.article),
      indiaPublisher: isIndiaPublisherArticle(item.article)
    }))
    .filter((item) => item.id);
}

function candidateForAgent(item) {
  const article = item.article;
  return {
    id: item.id,
    deterministicRank: item.deterministicRank,
    deterministicScore: round(item.score, 2),
    headline: cleanSentence(article?.headline || ""),
    publisher: cleanSentence(article?.sourceName || article?.sourceId || ""),
    category: article?.category || "",
    entityName: article?.entityName || "",
    driverType: item.driverType,
    indiaImpact: compactWords(article?.indiaImpact || "", 34),
    takeaway: compactWords(article?.takeaway || article?.summary || "", 28),
    watchFor: compactWords(article?.watchFor || "", 20),
    sentimentScore: Number(article?.sentimentScore) || 0,
    indiaViewCount: Number(article?.indiaViewCount) || 0,
    hasIndiaReadThrough: item.hasIndiaReadThrough,
    indiaPublisher: item.indiaPublisher,
    leadSuppressed: item.leadSuppressed,
    sourceUrl: article?.sourceUrl || ""
  };
}

function dailyLeadRerankUserPrompt({ date, candidates, deterministicLeadId, marketSnapshots }) {
  const payload = {
    date,
    deterministicLeadId,
    marketContext: dailyLeadMarketContext(marketSnapshots),
    instruction: "Return the best lead order for the India cash-market open. Keep all ids exact.",
    candidates: candidates.map(candidateForAgent)
  };
  return `Re-rank these candidate source cards for the Market Narrative daily lead.\n${JSON.stringify(payload, null, 2)}`;
}

function dailyLeadMarketContext(marketSnapshots = []) {
  const keep = /\b(gift|nifty|banknifty|bank nifty|sensex|brent|crude|dxy|usd|inr|rupee|vix|nasdaq|s&p|dow|kospi|hang seng)\b/i;
  return (marketSnapshots ?? [])
    .filter((snapshot) => keep.test(`${snapshot?.symbol || ""} ${snapshot?.name || ""}`))
    .slice(0, 12)
    .map((snapshot) => ({
      symbol: snapshot?.symbol || "",
      name: snapshot?.name || "",
      closeValue: snapshot?.closeValue ?? snapshot?.price ?? null,
      changePercent: snapshot?.changePercent ?? snapshot?.changePct ?? snapshot?.percentChange ?? null
    }));
}

function parseDailyLeadRerank(value) {
  if (!value) {
    return null;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  const text = String(value || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(text);
}

function validateDailyLeadRerank(rerank, candidates = [], deterministicLead = null) {
  const ids = new Set(candidates.map((candidate) => candidate.id));
  const validRankedIds = (Array.isArray(rerank?.rankedIds) ? rerank.rankedIds : [])
    .map((id) => String(id || "").trim())
    .filter((id, index, list) => ids.has(id) && list.indexOf(id) === index);
  const selectedId = validRankedIds[0];
  if (!selectedId) {
    return null;
  }
  const selected = candidates.find((candidate) => candidate.id === selectedId);
  if (!selected?.article) {
    return null;
  }
  const hasCleanIndiaCandidate = candidates.some((candidate) => candidate.hasIndiaReadThrough && !candidate.leadSuppressed);
  if (hasCleanIndiaCandidate && (!selected.hasIndiaReadThrough || selected.leadSuppressed)) {
    return null;
  }
  const deterministicId = articleLeadId(deterministicLead);
  const confidence = Number(rerank?.confidence);
  return {
    article: selected.article,
    leadReason: cleanSentence(rerank?.leadReason || (selectedId === deterministicId
      ? "The deterministic lead remains the strongest pre-open driver."
      : "The reranker promoted a stronger India-open driver from the shortlist.")),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : null,
    driverType: normalizeAgentLeadDriverType(rerank?.driverType, selected.driverType)
  };
}

function configuredDailyLeadReranker(options = {}) {
  if (!shouldUseAgentLeadRerank(options)) {
    return null;
  }
  const apiKey = options.nvidiaApiKey ?? process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return null;
  }
  const fetcher = options.llmFetcher ?? fetch;
  const model = options.nvidiaLeadModel ?? process.env.NVIDIA_LEAD_MODEL ?? options.nvidiaArticleModel ?? process.env.NVIDIA_ARTICLE_MODEL ?? options.nvidiaModel ?? process.env.NVIDIA_MODEL ?? "nvidia/nemotron-3-ultra-550b-a55b";
  const baseUrl = String(options.nvidiaBaseUrl ?? process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");
  return async ({ prompt, userPrompt }) => {
    const startTime = Date.now();
    log.info("daily lead reranker request started", { provider: "nvidia", model });
    const response = await fetcher(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: Number(options.nvidiaMaxTokens ?? process.env.NVIDIA_LEAD_MAX_TOKENS ?? 1200),
        temperature: Number(options.nvidiaTemperature ?? process.env.NVIDIA_LEAD_TEMPERATURE ?? 0.2),
        top_p: Number(options.nvidiaTopP ?? process.env.NVIDIA_LEAD_TOP_P ?? 0.9),
        chat_template_kwargs: { enable_thinking: true },
        stream: false
      }),
      signal: AbortSignal.timeout(Number(options.nvidiaTimeoutMs ?? process.env.NVIDIA_LEAD_TIMEOUT_MS ?? 60000))
    });
    log.info("daily lead reranker request completed", { provider: "nvidia", model, status: response?.status, durationMs: Date.now() - startTime });
    if (!response?.ok) {
      throw new Error(`NVIDIA daily lead rerank failed with status ${response?.status ?? "unknown"}`);
    }
    const data = await response.json();
    return nvidiaChatResponseText(data);
  };
}

function shouldUseAgentLeadRerank(options = {}) {
  if (options.agentLeadRerank === true || process.env.PUBLIC_BRIEFING_AGENT_RERANK === "true") {
    return true;
  }
  if (options.agentLeadRerank === false || process.env.PUBLIC_BRIEFING_AGENT_RERANK === "false") {
    return false;
  }
  return Boolean(options.nvidiaApiKey ?? process.env.NVIDIA_API_KEY);
}

function nvidiaChatResponseText(data) {
  return (data?.choices ?? [])
    .map((choice) => choice?.message?.content ?? "")
    .filter(Boolean)
    .join("\n");
}

function normalizeAgentLeadDriverType(value, fallback = "market") {
  const driver = String(value || "").toLowerCase().replace(/[^a-z_]+/g, "_");
  if (driver === "trade") return "geopolitical";
  if (driver === "market_breadth") return "market";
  if (driver === "policy") return fallback && fallback !== "market" ? fallback : "market";
  if (["crude", "rates", "currency", "banks", "tech", "tech_move", "asia", "geopolitical", "precious_metals", "market"].includes(driver)) {
    return driver;
  }
  return fallback || "market";
}

function hasIndirectIndiaImpact(article) {
  return /^No direct Indian\b|^No direct India read-through|^Global-only context/i.test(String(article?.indiaImpact || ""));
}

function dailyLeadImpact(article) {
  const impact = cleanSentence(article?.indiaImpact || article?.takeaway || article?.summary || "");
  if (/^No direct Indian pipeline read-through/i.test(impact)) {
    return "Not a direct India trade; watch Brent first because only a price reaction matters for OMCs, aviation, paints, and inflation expectations.";
  }
  if (/^No direct India read-through|^Global-only context/i.test(impact)) {
    return "Global cue only; India impact needs confirmation through index futures, sector breadth, currency, or rates.";
  }
  return cleanLeadImpact(impact || "India read-through needs opening breadth confirmation.");
}

function cleanLeadImpact(value) {
  return cleanSentence(value)
    .replace(/^No direct Indian pipeline read-through;\s*/i, "Pipeline flow news matters through Brent; ")
    .replace(/^No direct India read-through for this story\.\s*/i, "")
    .replace(/^Global-only context:\s*/i, "");
}

function defaultRiskSide(driverType, leadImpact) {
  if (driverType === "crude") {
    return "Brent staying bid would pressure OMCs, aviation, paints, tyres, and inflation expectations.";
  }
  if (driverType === "rates") {
    return "Higher yields would pressure banks, realty, autos, and long-duration growth shares.";
  }
  if (driverType === "tech") {
    return "Weak Nasdaq futures or poor IT breadth would turn the global tech cue into risk, not support.";
  }
  if (driverType === "geopolitical") {
    return "Any breakdown in talks or re-escalation would hit IT exports, metals demand, and FII risk appetite — watch USD/INR and India VIX.";
  }
  return cleanSentence(leadImpact || "The first range must confirm whether the source risk matters for India.");
}

function defaultSupportSide(driverType) {
  if (driverType === "crude") {
    return "Softer Brent and stronger Indian breadth are the confirmation checks.";
  }
  if (driverType === "rates") {
    return "Stable yields plus bank breadth is the offset.";
  }
  if (driverType === "tech") {
    return "Nasdaq futures, USD/INR, and Nifty IT breadth must confirm the offset.";
  }
  if (driverType === "geopolitical") {
    return "A positive outcome lifts global risk appetite — Nifty IT, metals and mid-caps are the India plays; FII flows confirm.";
  }
  return "Support needs Indian breadth, sector leadership, or softer macro confirmation.";
}

function leadArticleForDailyLead(dailyLead, articles = []) {
  if (!dailyLead?.sourceArticleId) {
    return null;
  }
  return (articles ?? []).find((article) => articleLeadId(article) === dailyLead.sourceArticleId) ?? null;
}

function uniqueSourceArticles(articles = []) {
  const seen = new Set();
  const unique = [];
  for (const article of articles ?? []) {
    const key = article.sourceUrl || article.headline;
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(article);
  }
  return unique;
}

function diverseVisibleArticles(articles, limit, options = {}) {
  const selected = [];
  const selectedKeys = new Set();
  const categoryOrder = ["macro_negative", "global_risk", "sector_positive", "macro_positive", "sector_negative", "neutral_volatile"];
  const categoryCount = new Map();
  const categoryUniverse = new Set((articles ?? []).map((article) => article.category || "market"));
  const maxPerCategory = Math.max(2, Math.ceil(limit / Math.max(2, categoryUniverse.size)));
  if (options.preferIndiaSources) {
    for (const article of (articles ?? []).filter(isIndiaPublisherArticle)) {
      addVisibleSource(article, selected, selectedKeys, limit, categoryCount, maxPerCategory);
      if (selected.filter(isIndiaPublisherArticle).length >= 2) {
        break;
      }
    }
  }
  for (const category of categoryOrder) {
    addVisibleSource((articles ?? []).find((article) => (article.category || "market") === category), selected, selectedKeys, limit, categoryCount, maxPerCategory);
  }
  for (const article of articles ?? []) {
    const category = article.category || "market";
    const allowOverCap = selected.length >= Math.min(limit, categoryUniverse.size * maxPerCategory);
    addVisibleSource(article, selected, selectedKeys, limit, categoryCount, allowOverCap ? limit : maxPerCategory);
  }
  if (selected.length < limit) {
    for (const article of articles ?? []) {
      addVisibleSource(article, selected, selectedKeys, limit, categoryCount, limit);
    }
  }
  return rebalanceVisibleArticleDrivers(selected, articles, limit);
}

function rebalanceVisibleArticleDrivers(selected = [], articles = [], limit = PUBLIC_SOURCE_LIMIT) {
  const caps = new Map([
    ["crude_geo", 2],
    ["index_setup", 2],
    ["flows", 1],
    ["policy", 1],
    ["currency", 1],
    ["asia", 1],
    ["rates", 1],
    ["sector", 2],
    ["earnings", 1],
    ["other", 1]
  ]);
  const priority = ["crude_geo", "index_setup", "flows", "policy", "currency", "asia", "rates", "sector", "earnings", "other"];
  const byDriver = new Map();
  for (const article of articles ?? []) {
    const driver = visibleArticleDriver(article);
    if (!byDriver.has(driver)) byDriver.set(driver, []);
    byDriver.get(driver).push(article);
  }
  const output = [];
  const seen = new Set();
  const counts = new Map();
  const add = (article, enforceCap = true) => {
    if (!article || output.length >= limit) return false;
    const key = article.sourceUrl || article.headline;
    if (!key || seen.has(key)) return false;
    const driver = visibleArticleDriver(article);
    const cap = caps.get(driver) ?? 1;
    if (enforceCap && (counts.get(driver) || 0) >= cap) return false;
    output.push(article);
    seen.add(key);
    counts.set(driver, (counts.get(driver) || 0) + 1);
    return true;
  };
  for (const article of selected) add(article, true);
  for (const driver of priority) {
    if (output.length >= limit) break;
    if ((counts.get(driver) || 0) > 0) continue;
    add((byDriver.get(driver) || [])[0], true);
  }
  for (const driver of priority) {
    for (const article of byDriver.get(driver) || []) {
      if (output.length >= limit) break;
      add(article, true);
    }
  }
  const driverUniverseSize = new Set((articles ?? []).map(visibleArticleDriver)).size;
  const overfillTarget = driverUniverseSize >= 4 ? output.length : limit;
  for (const article of articles ?? []) {
    if (output.length >= overfillTarget) break;
    add(article, false);
  }
  return output;
}

function visibleArticleDriver(article) {
  const text = [article?.headline, article?.summary, article?.takeaway, article?.indiaImpact, article?.watchFor, article?.entityName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/\b(fii|dii|fpi|foreign portfolio|foreign institutional|institutional flow|provisional flow|outflow|inflow)\b/.test(text)) return "flows";
  if (/\b(rbi|sebi|finance ministry|government|modi|pib|excise|gst|pli|policy|fuel conservation|forex|current account)\b/.test(text)) return "policy";
  if (/\b(usd\/inr|rupee|dollar|dxy|currency)\b/.test(text)) return "currency";
  if (/\b(gift nifty|trade setup|nifty.*support|nifty.*resistance|bank nifty|sensex today|inflection|vwap|opening range)\b/.test(text)) return "index_setup";
  if (/\b(crude|brent|oil|opec|hormuz|iran|israel|missile|strike|war|geopolitical)\b/.test(text)) return "crude_geo";
  if (/\b(kospi|hang seng|nikkei|asian markets|asia|china|korea|japan)\b/.test(text)) return "asia";
  if (/\b(fed|yield|bond|rate cut|rate hike|inflation|cpi)\b/.test(text)) return "rates";
  if (/\b(results|earnings|profit|revenue|guidance)\b/.test(text)) return "earnings";
  if (/\b(bank|it |nifty it|auto|fmcg|metal|pharma|realty|energy|omc|aviation|tyres|paints)\b/.test(text)) return "sector";
  return "other";
}

function addVisibleSource(article, selected, selectedKeys, limit, categoryCount = new Map(), maxPerCategory = limit) {
  if (!article || selected.length >= limit) {
    return;
  }
  const key = article.sourceUrl || article.headline;
  if (!key || selectedKeys.has(key)) {
    return;
  }
  const category = article.category || "market";
  if ((categoryCount.get(category) || 0) >= maxPerCategory) {
    return;
  }
  selected.push(article);
  selectedKeys.add(key);
  categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
}

function isWithinDigestWindow(article, date, hours) {
  const published = Date.parse(article?.publishedAt || "");
  const digestTime = Date.parse(`${date}T07:15:00+05:30`);
  if (!Number.isFinite(published) || !Number.isFinite(digestTime)) {
    return false;
  }
  const ageHours = (digestTime - published) / (60 * 60 * 1000);
  return ageHours >= -1 && ageHours <= hours;
}

function hasIndiaReadThrough(article) {
  return !/^no direct indian\b|^no direct india read-through|^global-only context/i.test(String(article?.indiaImpact || "").trim());
}

function isIndiaPublisherArticle(article) {
  const text = `${article?.sourceName || ""} ${article?.sourceId || ""} ${article?.sourceUrl || ""}`.toLowerCase();
  return /\b(moneycontrol|livemint|mint|business-standard|financialexpress|financial-express|economic-times|economictimes|etmarkets|nseindia|bseindia|rbi\.org|sebi\.gov|thehindubusinessline|businessline|ndtv.?profit|bqprime|bq-prime|pib-finance|pib\.gov)\b/.test(text);
}

/**
 * Reject articles that are clearly irrelevant to the Indian pre-market briefing.
 * Applied before scoring so garbage doesn't pollute the ranking.
 */
export function isGarbageArticle(article) {
  const text = `${article?.headline || ""} ${article?.summary || ""}`.toLowerCase();
  // Hard reject: entertainment / lifestyle / non-finance
  if (/\b(artwork?s?|auction house|Christie's|Sotheby's|celebrity|fashion week|lifestyle|travel tips?|recipe|home improvement|real estate listing|interior design|movie|film review|gaming|esport|sports score|nfl|nba|mlb|cricket score|tennis|golf score)\b/i.test(text)) return true;
  // Soft reject: no market-relevant keyword at all
  const hasMarketKeyword = /\b(nifty|sensex|bank nifty|rupee|rbi|sebi|crude|oil|brent|fed|yield|rate|inflation|nasdaq|s&p|dow|gift nifty|fii|dii|fpi|foreign portfolio|earnings|profit|revenue|ipo|gdp|cpi|opec|trump|tariff|china|india|market|stock|share|equity|dollar|gold|silver|interest rate|bond|currency|kospi|hang seng|nikkei|asian markets|asia breadth|semiconductor|chip|ai model|llm|tech earnings)\b/i.test(text);
  return !hasMarketKeyword;
}

/**
 * Traction score: how many OTHER articles in the same batch share 2+ significant
 * words from this article's headline. Cross-source coverage = genuine news signal.
 */
function crossSourceTractionScore(article, allArticles) {
  const STOPWORDS = new Set(["the","and","of","in","a","an","to","for","on","at","is","are","was","were","as","by","with","from","that","this","be","or","it","its","he","she","they","we","you","but","not","have","has","had","will","would","could","should","may","might","do","did","does","after","before","when","over","under","up","down","out","into","than","then","so","if","while","about","against","between","through","during","about","after","before","some","more","most","such","no","what","which","who","whom","been","being","their","there","these","those","here","how","why","all","both","each","few","very","just","also","other","own","same","than","too","can","per","new","says","say","said"]);
  const words = (article?.headline || "").toLowerCase().split(/\W+/).filter((w) => w.length > 3 && !STOPWORDS.has(w));
  if (words.length < 2) return 0;
  let matches = 0;
  for (const other of allArticles) {
    if (other === article || other?.sourceId === article?.sourceId) continue;
    const otherText = `${other?.headline || ""} ${other?.summary || ""}`.toLowerCase();
    const sharedWords = words.filter((w) => otherText.includes(w));
    if (sharedWords.length >= 2) matches++;
  }
  return matches * 8;
}

/**
 * Traction-based article score.
 * Replaces the regex-heavy dailyLeadScore as the primary ranking signal.
 */
function tractionScore(article, date, allArticles = [], marketSnapshots = []) {
  const text = `${article?.headline || ""} ${article?.summary || ""} ${article?.indiaImpact || ""} ${article?.takeaway || ""}`.toLowerCase();
  const sourceText = articleSourceTextForLeadSuppression(article);
  let score = 0;
  // Cross-source coverage is the strongest traction proxy
  score += crossSourceTractionScore(article, allArticles);
  // India-specific direct mentions (trader relevance)
  if (/\b(nifty|bank nifty|gift nifty|sensex)\b/.test(text)) score += 15;
  if (/\b(fii|dii|provisional flow)\b/.test(text)) score += 12;
  if (/\b(rbi|sebi|mpc|repo rate)\b/.test(text)) score += 10;
  // India publisher premium — ET/Mint/NDTV Profit beat global feeds
  if (isIndiaPublisherArticle(article)) score += 10;
  // Market magnitude: specific % moves mentioned
  if (marketMoveMagnitudeText(text)) score += 8;
  if (largeTechSectorMoveText(text)) score += 12;
  // Geopolitical / macro events with high India transmission
  if (/trump.{0,25}(xi|jinping|beijing)|us.?china (trade deal|tariff truce)/.test(text)) score += 10;
  if (/\b(crude|brent|opec|hormuz)\b/.test(text)) score += 6;
  if (/\b(fed|yield|inflation|rate cut|rate hike)\b/.test(text)) score += 5;
  // Freshness
  score += freshnessScore(article, date);
  // Entity match quality from LLM enrichment
  score += (Number(article?.entityMatchScore) || 0) * 6;
  // India view count (when populated)
  const vc = Number(article?.indiaViewCount) || 0;
  if (vc > 50000) score += 20;
  else if (vc > 20000) score += 12;
  else if (vc > 5000) score += 6;
  // Penalties
  if (isLeadSuppressedArticle(article)) score -= 24;
  if (isStockLiveblogArticle(article) && !hasMarketwideDriverText(sourceText)) score -= 18;
  if (isWeakStockListArticle(article) && !hasMarketwideDriverText(sourceText)) score -= 12;
  if (isGarbageArticle(article)) score -= 40;
  if (!hasIndiaReadThrough(article)) score -= 8;
  return score;
}

/**
 * GIFT Nifty bias: computes the implied gap for the opening session.
 */
export function computeGiftNiftyBias(marketSnapshots = []) {
  const gift = marketSnapshots.find((s) => s.symbol === "GIFTNIFTY");
  const nifty = marketSnapshots.find((s) => s.symbol === "NIFTY");
  if (!gift || !nifty) return null;
  // Skip if GIFTNIFTY is seed/stale — gap would be meaningless
  if (gift.dataQuality === "seed-merged" || gift.dataQuality === "mock-fallback" || gift.source?.includes("Mock")) return null;
  const niftyClose = Number(nifty.previousClose ?? nifty.closeValue);
  const giftPrice = Number(gift.closeValue);
  if (!Number.isFinite(niftyClose) || !Number.isFinite(giftPrice) || niftyClose === 0) return null;
  const gapPts = Math.round(giftPrice - niftyClose);
  const gapPct = round(((giftPrice - niftyClose) / niftyClose) * 100, 2);
  const bias = gapPct > 0.3 ? "gap_up" : gapPct < -0.3 ? "gap_down" : "flat";
  const sign = gapPts > 0 ? "+" : "";
  return {
    giftPrice,
    niftyClose,
    gapPts,
    gapPct,
    bias,
    biasLabel: bias === "flat" ? "flat open" : `${sign}${gapPts} pt gap-${bias === "gap_up" ? "up" : "down"}`
  };
}

function isOfficialIndiaSourceArticle(article) {
  const text = `${article?.sourceName || ""} ${article?.sourceId || ""} ${article?.sourceUrl || ""}`.toLowerCase();
  return /\b(nseindia|bseindia|sebi\.gov|rbi\.org|pib\.gov|pib-finance|mca\.gov|finmin|dea\.gov)\b/.test(text);
}

function isDomesticCatalystArticle(article) {
  const text = `${article?.headline || ""} ${article?.summary || ""} ${article?.takeaway || ""} ${article?.indiaImpact || ""} ${article?.watchFor || ""} ${article?.entityName || ""} ${article?.sourceName || ""} ${article?.sourceUrl || ""}`.toLowerCase();
  return hasIndiaReadThrough(article) &&
    (isOfficialIndiaSourceArticle(article) || isIndiaPublisherArticle(article)) &&
    /\b(nifty|bank nifty|nse|bse|sebi|rbi|fii|dii|fpi|rupee|usd\/inr|india|indian|banks?|nbfc|omc|bpcl|hpcl|iocl|tcs|infosys|wipro|hcltech|reliance|hdfc|icici|sbi|earnings|results|filing|policy|circular)\b/.test(text);
}

function hasPositiveIndiaReadthrough(article) {
  const text = `${article?.headline || ""} ${article?.indiaImpact || ""}`.toLowerCase();
  return (
    /\b(inflows?|buying|net buy|fii.*buy|bullish|rally|surge|upside)\b/.test(text) &&
    /\b(india|nifty|bank nifty|inr|rupee|sensex)\b/.test(text)
  ) || (
    /\b(rbi|rate cut|liquidity|repo)\b/.test(text) &&
    /\b(positive|supportive|bullish|eases?)\b/.test(text)
  );
}

function indiaSourceScore(article, date) {
  const text = `${article?.headline || ""} ${article?.summary || ""} ${article?.takeaway || ""} ${article?.indiaImpact || ""} ${article?.watchFor || ""} ${article?.entityName || ""}`.toLowerCase();
  const sourceText = articleSourceTextForLeadSuppression(article);
  let score = Math.abs(Number(article?.sentimentScore) || 0) * 5 + (Number(article?.entityMatchScore) || 0);
  if (isIndiaPublisherArticle(article)) score += 16;
  if (hasIndiaReadThrough(article)) score += 8;
  if (hasPositiveIndiaReadthrough(article)) score += 12;
  if (["macro_negative", "global_risk"].includes(article?.category)) score += 4;
  if (["sector_positive", "macro_positive", "sector_negative"].includes(article?.category)) score += 3;
  if (/\b(nifty|bank nifty|india|indian|rupee|omc|bpcl|hpcl|iocl|aviation|banks|nbfc|it exporters|nifty it)\b/.test(text)) score += 6;
  if (/\b(crude|oil|brent|opec|hormuz|fed|rates?|yields?|inflation|dollar|dxy|usd\/inr|nasdaq|semiconductor|chip|ai)\b/.test(text)) score += 4;
  if (indiaAuthorityText(text)) score += 10;
  if (crudeGeopoliticalText(text)) score += 8;
  if (indiaFuelForexPolicyText(text)) score += 10;
  if (indiaPreciousMetalsPolicyText(text)) score += 20;
  if (marketMoveMagnitudeText(text)) score += 6;
  if (largeTechSectorMoveText(text)) score += 10;
  if (marketwideStressText(text)) score += 7;
  if (isStockLiveblogArticle(article)) score -= hasMarketwideDriverText(sourceText) ? 8 : 16;
  if (isWeakStockListArticle(article)) score -= 8;
  if (/\b(carvana|private market|spacex|used car|single-stock)\b/.test(text)) score -= 8;
  if (!hasIndiaReadThrough(article)) score -= 10;
  return score + freshnessScore(article, date);
}

function sourceSelectionScore(article, date, marketSnapshots = []) {
  return indiaSourceScore(article, date)
    + indiaAudienceScore(article) * 0.8
    + marketDriverSeverityScore(article, marketSnapshots) * 0.6
    + sourceQualityScore(article);
}

function dailyLeadScore(article, date, marketSnapshots = []) {
  const text = articleTextForLead(article);
  const sourceText = articleSourceTextForLeadSuppression(article);
  let score = indiaSourceScore(article, date)
    + marketLeadScore(article) * 1.35
    + indiaAudienceScore(article) * 1.4
    + marketDriverSeverityScore(article, marketSnapshots)
    + sourceQualityScore(article);
  if (isLeadSuppressedArticle(article)) score -= 24;
  if (isStockLiveblogArticle(article) && !hasMarketwideDriverText(sourceText)) score -= 18;
  if (isWeakStockListArticle(article) && !hasMarketwideDriverText(sourceText)) score -= 12;
  return score;
}

function articleTextForLead(article) {
  return [
    article?.headline,
    article?.summary,
    article?.takeaway,
    article?.indiaImpact,
    article?.watchFor,
    article?.entityName,
    article?.sourceName,
    article?.sourceUrl
  ].filter(Boolean).join(" ").toLowerCase();
}

function indiaAudienceScore(article) {
  const views = firstFiniteNumber(article, [
    "indiaViewCount",
    "viewsFromIndia",
    "indiaPageViews",
    "indiaViews",
    "viewsIndia",
    "indianViews"
  ]);
  const rank = firstFiniteNumber(article, [
    "indiaViewRank",
    "indiaAudienceRank",
    "indiaTrafficRank",
    "articleRankIndia"
  ]);
  let score = 0;
  if (views > 0) {
    score += Math.min(28, Math.log10(views + 1) * 5);
  }
  if (rank > 0) {
    score += Math.max(0, 24 - Math.min(rank, 60) * 0.4);
  }
  return score;
}

function firstFiniteNumber(source, keys) {
  for (const key of keys) {
    const value = Number(source?.[key]);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return 0;
}

function sourceQualityScore(article) {
  if (isOfficialIndiaSourceArticle(article)) return 18;
  if (isIndiaPublisherArticle(article)) return 9;
  const text = `${article?.sourceName || ""} ${article?.sourceId || ""} ${article?.sourceUrl || ""}`.toLowerCase();
  if (/\b(reuters|pti|ani|spglobal|s&p global|theweek|marketwatch|cnbc|dowjones|wall street journal|wsj)\b/.test(text)) return 6;
  return 0;
}

function marketDriverSeverityScore(article, marketSnapshots = []) {
  const text = articleTextForLead(article);
  let score = 0;
  const brentMove = snapshotChangePercent(marketSnapshots, /\b(brent|crude|oil)\b/i);
  const niftyMove = snapshotChangePercent(marketSnapshots, /\b(nifty 50|nifty)\b/i);
  const bankMove = snapshotChangePercent(marketSnapshots, /\b(bank nifty)\b/i);
  if (crudeGeopoliticalText(text)) {
    score += 18;
    if (brentMove >= 2) score += 16;
    if (brentMove >= 4) score += 10;
  }
  if (indiaFuelForexPolicyText(text)) {
    score += 20;
    if (brentMove >= 2) score += 8;
  }
  if (indiaPreciousMetalsPolicyText(text)) {
    score += 22;
  }
  if (marketMoveMagnitudeText(text)) {
    score += 8;
  }
  if (largeTechSectorMoveText(text)) {
    score += 20;
  }
  if (marketwideStressText(text)) {
    score += 12;
  }
  if ((niftyMove <= -0.75 || bankMove <= -0.75) && /\b(risk|pressure|crude|brent|iran|hormuz|forex|rupee|fii|selloff|fall|slump|tumble|crash)\b/.test(text)) {
    score += 10;
  }
  return score;
}

function snapshotChangePercent(snapshots = [], pattern) {
  const snapshot = (snapshots ?? []).find((item) => pattern.test(`${item?.name || ""} ${item?.symbol || ""}`));
  const raw = snapshot?.changePercent ?? snapshot?.changePct ?? snapshot?.percentChange ?? snapshot?.change;
  const value = Number(String(raw ?? "").replace("%", ""));
  return Number.isFinite(value) ? value : 0;
}

function isLeadSuppressedArticle(article) {
  const text = articleSourceTextForLeadSuppression(article);
  return (isStockLiveblogArticle(article) || isWeakStockListArticle(article)) && !hasMarketwideDriverText(text);
}

function articleSourceTextForLeadSuppression(article) {
  return [
    article?.headline,
    article?.summary,
    article?.sourceName,
    article?.sourceId,
    article?.sourceUrl
  ].filter(Boolean).join(" ").toLowerCase();
}

function isStockLiveblogArticle(article) {
  const text = articleTextForLead(article);
  return /\bshare price live updates?\b|\bstock-liveblog\b|\/stock-liveblog\//i.test(text);
}

function isWeakStockListArticle(article) {
  const text = articleTextForLead(article);
  return /\b(stocks? to watch|recommend(?:s|ed)? .* stocks?|stock picks?|shares? in focus|buy or sell)\b/i.test(text);
}

function hasMarketwideDriverText(text) {
  return crudeGeopoliticalText(text) || indiaFuelForexPolicyText(text) || indiaPreciousMetalsPolicyText(text) || marketwideStressText(text) ||
    /\b(gift nifty|nifty futures|sensex|bank nifty|fii|dii|rupee|usd\/inr|brent|crude|yield|dxy|inflation|current account)\b/i.test(text);
}

function indiaAuthorityText(text) {
  return /\b(modi|narendra modi|pm modi|prime minister modi|indian prime minister|nirmala sitharaman|finance minister|rbi governor|shaktikanta das|sanjay malhotra|pib|press information bureau|ministry of finance|niti aayog|sebi circular|sebi notification|pmo|petroleum minister|hardeep singh puri)\b/i.test(String(text || ""));
}

function crudeGeopoliticalText(text) {
  const value = String(text || "").toLowerCase();
  return /\b(crude|oil|brent|hormuz|opec|energy supply|supply disruption)\b/.test(value) &&
    /\b(iran|trump|war|military|missile|strike|airstrike|conflict|geopolit|israel|red sea|sanctions|ceasefire|peace proposal|totally unacceptable)\b/.test(value);
}

function marketMoveMagnitudeText(text) {
  const value = String(text || "").toLowerCase();
  const movement = /\b(surge|surges|surged|soar|soars|soared|spike|spikes|spiked|jump|jumps|jumped|crash|crashes|crashed|plunge|plunges|plunged|collapse|collapses|collapsed|slump|slumps|slumped|tumble|tumbles|tumbled|drops?|fell|falls?|rises?|rose|gains?|gained)\b/.test(value) ||
    /\b(?:[3-9](?:\.\d+)?|[1-9]\d+(?:\.\d+)?)%/.test(value);
  const instrument = /\b(crude|oil|brent|nifty|sensex|bank nifty|market|markets|index|rupee|dollar|usd\/inr|dxy|yield|gold|nasdaq|s&p|dow|semiconductor|chip|chips|tech\s+stocks?|it\s+stocks?)\b/.test(value);
  return movement && instrument;
}

function largeTechSectorMoveText(text) {
  const value = String(text || "").toLowerCase();
  // Large (≥5%) move in a tech stock with India IT read-through implication
  const bigMove = /\b(?:[5-9](?:\.\d+)?|[1-9]\d+(?:\.\d+)?)%/.test(value);
  const techName = /\b(qualcomm|nvidia|intel|tsmc|broadcom|amd|arm|mediatek|samsung|asml|applied materials|lam research|kla|marvell|micron|apple|microsoft|meta|alphabet|google|amazon|microsoft)\b/.test(value);
  const moveVerb = /\b(drops?|fell|falls?|surge|plunge|crash|tumble|slump|sink|sank|soar)\b/.test(value);
  return bigMove && techName && moveVerb;
}

function indiaFuelForexPolicyText(text) {
  const value = String(text || "").toLowerCase();
  return /\b(modi|narendra modi|pm modi|prime minister modi|indian prime minister|pmo|petroleum minister|hardeep singh puri|ministry of petroleum|government of india|indian government|centre)\b/.test(value) &&
    /\b(fuel|petrol|diesel|gasoline|gas|lpg|crude|oil|energy|foreign exchange|forex|current account|gold|silver|foreign travel|work[-\s]?from[-\s]?home|remote work|conserve|conservation|import bill|oil imports?)\b/.test(value);
}

function indiaPreciousMetalsPolicyText(text) {
  const value = String(text || "").toLowerCase();
  return /\b(gold|silver|bullion|precious metal|sovereign gold bond|sgb|gold etf|mcx gold|mcx silver|jeweller(?:y|s)?)\b/.test(value) &&
    /\b(tariff|import duty|customs duty|basic customs duty|bcd|import tax|import levy|import on gold|gold duty|silver duty|import on silver|tax on gold|tax on silver|export duty)\b/.test(value);
}

function marketwideStressText(text) {
  return /\b(sensex|nifty|bank nifty|indian equities|stock market|markets?)\b.*\b(falls?|fell|slumps?|tumbles?|crashes?|selloff|bloodbath|pressure|down)\b|\b(falls?|fell|slumps?|tumbles?|crashes?|selloff|bloodbath|pressure|down)\b.*\b(sensex|nifty|bank nifty|indian equities|stock market|markets?)\b/i.test(String(text || ""));
}

function driverTypeForArticle(article) {
  const text = `${article?.headline || ""} ${article?.summary || ""} ${article?.takeaway || ""} ${article?.indiaImpact || ""}`.toLowerCase();
  if (indiaPreciousMetalsPolicyText(text)) return "precious_metals";
  if (largeTechSectorMoveText(text)) return "tech_move";
  // Geopolitical / trade-deal check BEFORE crude — Trump-Xi bilateral summit or US-China
  // trade deal articles mention oil as context but the primary driver is diplomacy.
  // Iran/war/conflict stays as crude (those stories drive Brent, not risk-on for IT/metals).
  if (/trump.{0,25}(xi|jinping|beijing)|xi.{0,25}(trump|beijing)|us.?china (trade deal|tariff deal|tariff truce|trade truce)|trade (deal|truce|ceasefire|agreement) .{0,40}(china|tariff|trump|xi)|tariff (deal|truce|cut|pause|rollback) .{0,40}(china|trump|xi)|bilateral (summit|talks?|meeting) .{0,40}(china|trump|xi|us)/.test(text)) return "geopolitical";
  if (indiaFuelForexPolicyText(text) || /\b(crude|oil|brent|opec|hormuz|pipeline|keystone|fuel|petrol|diesel|gasoline|lpg)\b/.test(text)) return "crude";
  if (/\b(fed|fomc|yield|yields|bond|bonds|rate|rates|inflation|boe)\b/.test(text)) return "rates";
  if (/\b(dollar|rupee|currency|dxy|usd\/inr|yen)\b/.test(text)) return "currency";
  if (/\b(nasdaq|semiconductor|chip|ai|software|tech|nifty it|it exporters)\b/.test(text)) return "tech";
  if (/\b(bank|banks|credit|nbfc|financial)\b/.test(text)) return "banks";
  if (/\b(asia|china|japan|korea|taiwan|hong kong)\b/.test(text)) return "asia";
  return "market";
}

function driverLabelForType(type) {
  return {
    crude: "Crude / energy risk",
    precious_metals: "Gold / precious metals policy",
    rates: "Rates / Fed path",
    currency: "Currency pressure",
    tech_move: "Tech sector magnitude move",
    tech: "Global tech breadth",
    banks: "Bank Nifty breadth",
    asia: "Asia risk appetite",
    geopolitical: "Geopolitical / trade diplomacy",
    market: "Market breadth"
  }[type] || "Market breadth";
}

export function articleLeadId(article) {
  if (!article) {
    return "";
  }
  return `${String(article.sourceId || article.sourceName || "source").toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${hashString(article.sourceUrl || article.headline || "")}`;
}

function hashString(value) {
  let hash = 0;
  for (const char of String(value || "")) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function archiveSummaryForDigest(date, articles, themes, previousDigest, dailyLead = null) {
  const lead = leadArticleForDailyLead(dailyLead, articles)
    ?? leadMarketArticle(articles, date)
    ?? strongestArticle(articles, (article) => Number.isFinite(Number(article.sentimentScore)))
    ?? articles[0];
  const force = dailyLead?.label || dominantForceLabel(lead, String(lead?.headline || "").toLowerCase());
  const rawText = dailyLead?.indiaImpact || editorialLeadSentence(lead) || lead?.summary || lead?.headline || themes[0]?.summary || "Opening range needs confirmation from source-led market cues.";
  const text = rawText.replace(/^Direct\s+(index|India)\s+read-through:\s*/i, "");
  const summary = compactWords(cleanSentence(`${force}: ${text}`), 20);
  if (summary && normalizeEditorial(summary) !== normalizeEditorial(previousDigest?.archiveSummary)) {
    return summary;
  }
  const fallback = lead?.headline ? `${lead.headline} is today's main source-led difference for the India open.` : "Today needs fresh confirmation from verified source cues.";
  return compactWords(cleanSentence(fallback), 20);
}

function deskNoteForDigest(date, articles, setups, marketSnapshots = [], overallSentiment = 0, previousDigest, dailyLead = null) {
  const lead = leadArticleForDailyLead(dailyLead, articles)
    ?? leadMarketArticle(articles, date)
    ?? strongestArticle(articles, (article) => Number.isFinite(Number(article.sentimentScore)))
    ?? articles[0];
  const sector = leadSectorArticle(articles, date) ?? lead;
  const setup = setups.find((item) => item.symbol === "NIFTY") ?? setups[0];
  const force = dailyLead?.label || dominantForceLabel(lead, String(lead?.headline || "").toLowerCase());
  const sectorLabel = sectorFocusLabel(sector);
  const keyInstrument = deskNoteInstrument(lead);
  const indiaSnapshot = marketSnapshots.find((item) => item.symbol === "NIFTY") ?? marketSnapshots.find((item) => item.marketRegion === "India Open");
  const first = `${force} ${forceVerb(force)} today's first filter because ${becauseFragment(editorialLeadSentence(lead) || lead?.summary || lead?.headline || "the verified source mix changed from the last edition")}.`;
  const second = setup
    ? `Track ${setup.symbol} ${formatNumber(setup.entry)} first; holding that zone keeps ${formatNumber(setup.target)} in play.`
    : `Track ${keyInstrument}${indiaSnapshot?.closeValue ? ` against ${formatNumber(indiaSnapshot.closeValue)}` : ""}; sentiment at ${round(overallSentiment, 2)} says the first range must prove direction.`;
  const third = deskNoteConfirmationLine(
    sectorLabel,
    editorialBecause(sector) || sector?.indiaImpact || sector?.summary || "sector breadth follows the same direction",
    date
  );
  const fourth = setup
    ? `Trade the first 15 minutes only if price holds VWAP and the stop at ${formatNumber(setup.stopLoss)} stays respected.`
    : "Let the first 15 minutes print, then trade only the side that holds VWAP with breadth behind it.";
  const note = [first, second, third, fourth].map(cleanSentence).join(" ");
  if (normalizeEditorial(note) !== normalizeEditorial(previousDigest?.deskNote)) {
    return note;
  }
  return `${first} ${second} ${third} Use the first 15 minutes to demand a fresh level that still pays at least twice the risk.`;
}

function deskNoteConfirmationLine(sectorLabel, reason, date) {
  const fragment = becauseFragment(reason);
  const label = `${sectorLabel || ""} ${reason || ""}`.toLowerCase();
  if (/\b(crude|oil|omc|energy|brent|aviation|paints|tyres)\b/.test(label)) {
    return cleanSentence(`${sectorLabel} is the confirmation layer: Brent must hold its morning direction before OMCs, aviation and paints deserve follow-through weight.`);
  }
  if (/\b(tech|it|exporter|nasdaq|semiconductor|chip|software|ai)\b/.test(label)) {
    return cleanSentence(`${sectorLabel} needs Nasdaq futures and USD/INR to align; treat exporter breadth as the tell, not the trade by itself.`);
  }
  if (/\b(financ|bank|nbfc|credit|deposit)\b/.test(label)) {
    return cleanSentence(`${sectorLabel} decides whether a Nifty move becomes a trend; Bank Nifty VWAP hold is the minimum bar.`);
  }
  if (/\b(auto|consumer|fmcg|retail|discretionary)\b/.test(label)) {
    return cleanSentence(`${sectorLabel} needs domestic demand breadth after the first range; isolated global consumer cues are not enough.`);
  }
  if (/\b(metal|steel|copper|china)\b/.test(label)) {
    return cleanSentence(`${sectorLabel} needs China and commodity-price confirmation before it becomes broad-index evidence.`);
  }
  if (/\b(pharma|healthcare|defensive)\b/.test(label)) {
    return cleanSentence(`${sectorLabel} is useful as defensive leadership only if banks and broad breadth fail to confirm risk appetite.`);
  }
  return cleanSentence(`${sectorLabel} needs matching sector breadth and Nifty VWAP acceptance before it becomes a trading input.`);
}

function deskNoteInstrument(article) {
  const text = `${article?.headline || ""} ${article?.summary || ""} ${article?.entityName || ""}`.toLowerCase();
  if (/\b(gift nifty|sgx nifty|nifty futures|index futures)\b/.test(text)) return "Gift Nifty";
  if (/\b(brent|crude|oil|opec)\b/.test(text)) return "Brent";
  if (/\b(yield|bond|rate|fed|inflation)\b/.test(text)) return "US 10Y yield";
  if (/\b(dollar|rupee|currency|yen|forex)\b/.test(text)) return "USD/INR";
  if (/\b(bank|credit|financial)\b/.test(text)) return "Bank Nifty";
  if (/\b(tech|ai|semiconductor|software|nasdaq)\b/.test(text)) return "Nasdaq futures";
  return "Nifty VWAP";
}

function sentenceFragment(value) {
  return cleanSentence(value).replace(/[.!?]+$/g, "");
}

function forceVerb(force) {
  return /\b(yields|banks|commodities|market cues|jobs and chips)\b/i.test(String(force || "")) ? "are" : "is";
}

function becauseFragment(value) {
  const text = sentenceFragment(value);
  const withoutArticle = text.replace(/^(A|An|The)\b/, (match) => match.toLowerCase());
  if (/^[A-Z]{2,}\b/.test(withoutArticle)) {
    return withoutArticle;
  }
  return withoutArticle ? `${withoutArticle.charAt(0).toLowerCase()}${withoutArticle.slice(1)}` : withoutArticle;
}

function leadMarketArticle(articles, date) {
  return [...(articles ?? [])]
    .map((article, index) => ({ article, index, score: marketLeadScore(article) + freshnessScore(article, date) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.article;
}

function leadSectorArticle(articles, date) {
  return [...(articles ?? [])]
    .map((article, index) => ({ article, index, score: sectorLeadScore(article) + freshnessScore(article, date) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.article;
}

function marketLeadScore(article) {
  const text = `${article?.headline || ""} ${article?.summary || ""}`.toLowerCase();
  let score = 0;
  if (/\b(gift nifty|sgx nifty|nifty futures|index futures|futures premium|futures discount)\b/.test(text)) score += 9;
  if (/\b(crude|oil|brent|strait of hormuz)\b/.test(text)) score += 8;
  if (/\b(war|military|missile|strike|airstrike|conflict|geopolit|iran|israel|russia|ukraine|taiwan strait|south china sea|nato|sanctions|red sea|hormuz)\b/.test(text)) score += 8;
  if (/trump.{0,25}(xi|jinping|beijing)|xi.{0,25}trump|us.?china (trade|talks?|deal|truce|tariff)|trade (deal|truce|ceasefire|agreement)|tariff (deal|truce|cut|pause|rollback)|bilateral (summit|talks?|meeting)/.test(text)) score += 10;
  if (/\b(yield|bond|fed|rate|inflation)\b/.test(text)) score += 7;
  if (/\b(jobs day|payroll|employment|jobless|labor market)\b/.test(text)) score += 7;
  if (/\b(opec|production|output cut|output boost)\b/.test(text)) score += 7;
  if (/\b(nasdaq|s&p|dow|wall street|futures|stocks?|shares?)\b/.test(text)) score += 6;
  if (/\b(semiconductor|chip|chips|sox)\b/.test(text)) score += 5;
  if (largeTechSectorMoveText(text)) score += 12;
  if (/\b(tariff|trade|exports?|imports?)\b/.test(text)) score += 5;
  if (/\b(gst|sebi|pli|production[-\s]?linked incentive|union budget|finance ministry|mpc|stt|capital gains tax)\b/.test(text)) score += 6;
  if (indiaAuthorityText(text)) score += 8;
  if (/\b(rupee|dollar|currency)\b/.test(text)) score += 4;
  if (/\b(earnings|revenue|profit|guidance|outlook)\b/.test(text)) score += 3;
  if (marketMoveMagnitudeText(text)) score += 5;
  if (/\b(investigation|legal advice|traveler|tickets|lazy millionaire|retirement|top wall street analysts?|berkshire|greg abel|chipotle|paypal)\b/.test(text)) score -= 8;
  return score;
}

function sectorLeadScore(article) {
  const text = `${article?.headline || ""} ${article?.summary || ""}`.toLowerCase();
  let score = 0;
  if (/\b(earnings|revenue|profit|guidance|outlook|sales)\b/.test(text)) score += 6;
  if (/\b(tech|ai|semiconductor|software|mag 7|alphabet|nvidia)\b/.test(text)) score += 5;
  if (/\b(bank|credit|private credit|financial)\b/.test(text)) score += 4;
  if (/\b(stocks?|shares?|wall street analysts?)\b/.test(text)) score += 4;
  if (/\b(airfare|travelers|tickets|legal advice|lazy millionaire|retirement|top wall street analysts?|berkshire|greg abel|chipotle|paypal)\b/.test(text)) score -= 8;
  return score;
}

function sectorFocusLabel(article) {
  const headline = String(article?.headline || "").toLowerCase();
  if (/\b(gst|sebi|pli|budget|finance ministry|mpc|rbi policy)\b/.test(headline)) return "India policy";
  if (/\b(tech|ai|semiconductor|software|mag 7|alphabet|nvidia)\b/.test(headline)) return "Tech breadth";
  if (/\b(bank|credit|financial)\b/.test(headline)) return "Financials";
  if (/\b(pharma|lilly|healthcare)\b/.test(headline)) return "Healthcare";
  if (/\b(auto|airline|travel)\b/.test(headline)) return "Consumer cyclicals";
  return "Sector breadth";
}

function watchItemsForDigest(date, articles, setups, previousDigest) {
  const rankedArticles = [...articles].sort((left, right) =>
    marketLeadScore(right) + sectorLeadScore(right) + freshnessScore(right, date) -
    (marketLeadScore(left) + sectorLeadScore(left) + freshnessScore(left, date))
  );
  const candidates = [
    ...rankedArticles.map((article) => specificWatchItem(article)).filter(Boolean),
    ...setups.map((setup) => `${setup.symbol} acceptance near ${formatNumber(setup.entry)} with invalidation at ${formatNumber(setup.stopLoss)}.`)
  ];
  const previous = new Set((previousDigest?.watchItems || []).map(normalizeEditorial));
  const unique = [];
  for (const item of candidates) {
    const cleaned = cleanSentence(item);
    const key = normalizeEditorial(cleaned);
    if (!key || previous.has(key) || unique.some((existing) => normalizeEditorial(existing) === key)) {
      continue;
    }
    unique.push(cleaned);
    if (unique.length === 3) break;
  }
  while (unique.length < 3) {
    unique.push([
      "Gift Nifty premium or discount versus the previous Nifty close; this sets the gap direction before 9:15 AM.",
      "Bank Nifty VWAP hold through 9:45 AM IST; failed hold keeps the session defensive regardless of global cues.",
      "FII provisional flow, especially selling above Rs 1,500 Cr; heavy outflow can fade a firm open."
    ][unique.length]);
  }
  return unique.slice(0, 3);
}

function specificWatchItem(article) {
  const headline = String(article?.headline || "").toLowerCase();
  if (/\b(gift nifty|sgx nifty|nifty futures|index futures|futures premium|futures discount)\b/.test(headline)) return "Gift Nifty premium/discount versus the previous Nifty close, then Nifty VWAP and Bank Nifty breadth after 9:15 AM.";
  if (/\b(jobs day|payroll|employment|jobless|labor market)\b/.test(headline)) return "US jobs-week positioning and Nasdaq futures before India opens; a weak risk tape keeps Nifty in confirmation mode.";
  if (/\b(opec|production|output)\b/.test(headline)) return "Brent reaction to OPEC supply headlines before Europe opens; aviation, OMCs, paints and upstream energy are the first India checks.";
  if (/\b(crude|oil|brent)\b/.test(headline)) return "Brent direction before the Europe open and whether oil-import sensitivity hits India breadth.";
  if (/\b(war|military|missile|strike|airstrike|conflict|geopolit|iran|israel|russia|ukraine|taiwan strait|south china sea|nato|sanctions|red sea|hormuz)\b/.test(headline)) return "Brent, USD/INR, gold and FII flow at the open; geopolitics needs risk-off confirmation before it becomes an index bias.";
  if (/\b(gst|sebi|pli|production[-\s]?linked incentive|union budget|finance ministry|mpc|stt|capital gains tax)\b/.test(headline)) return "Affected-sector breadth, Bank Nifty VWAP and official circular follow-through; policy stories need sector confirmation.";
  if (/\b(yield|bond|rate|fed|inflation)\b/.test(headline)) return "US yield direction into the afternoon and whether Bank Nifty holds VWAP.";
  if (/\b(dollar|rupee|currency|yen|usd.?inr|forex|dxy)\b/.test(headline)) return "USD/INR and DXY behavior through the first hour; currency pressure can cap risk appetite.";
  if (/\b(fii|dii|fpi|foreign institutional|domestic institutional|institutional flow|provisional flow)\b/.test(headline)) return "FII/DII provisional flow and Bank Nifty VWAP; heavy FII selling can blunt a firm global open.";
  if (/\b(bank|banks|credit|deposit)\b/.test(headline)) return "Bank Nifty follow-through through 9:45-10:00 AM IST and whether private-bank breadth confirms.";
  if (/\b(indian it|nifty it|infosys|tcs|wipro|hcltech|tech mahindra)\b/.test(headline)) return "Nifty IT breadth after the open and whether exporters confirm the currency read-through.";
  if (/\b(tech|ai|software|semiconductor|chip|chips)\b/.test(headline)) return "Nasdaq and semiconductor futures into the cash open; use them as risk-appetite context, not an automatic Nifty IT call.";
  if (/\b(asia|china|japan|hong kong|korea|taiwan)\b/.test(headline)) return "Asia breadth into the Indian first hour and whether regional risk stays supportive.";
  if (/\b(apple|amazon|meta|alphabet|microsoft|big tech|faang|mega-cap|mag.?7)\b/.test(headline)) return "Nasdaq futures and Nifty IT advance-decline at open; mega-cap earnings must translate into exporter participation.";
  if (/\b(tariff|trade war|export ban|import duty|export restriction|protectionist|trade policy)\b/.test(headline)) return "Metals, pharma, IT and auto-ancillary breadth separately; trade policy stories split sectors, not the whole index.";
  if (/\b(rbi|repo rate|monetary policy|liquidity|g-sec|gsec)\b/.test(headline)) return "G-sec yield and Bank Nifty VWAP; RBI signals travel fastest to banks, realty and autos.";
  if (/\b(metal|metals|steel|copper|aluminium|aluminum|iron ore)\b/.test(headline)) return "Nifty Metal breadth, China futures and commodity prices; cyclicals need Bank Nifty support before becoming broad risk-on.";
  if (/\b(monsoon|rainfall|agri|agriculture|rural|crop|fertili[sz]er)\b/.test(headline)) return "FMCG, tractors, fertilisers and rural lenders after the first range; monsoon cues need domestic breadth confirmation.";
  if (/\b(consumer|retail|spending|sentiment|fmcg|rural demand)\b/.test(headline)) return "FMCG, auto and retail-lender breadth after the first range; skip the read if banks lag.";
  if (/\b(volatility|vix|options?|pcr|oi buildup|put writing|call resistance)\b/.test(headline)) return "India VIX, PCR, put writing and call resistance through 9:45 AM; size only after the option tape confirms.";
  const fallback = article?.watchFor || "";
  if (/\bnifty it\b/i.test(fallback) && !/\b(indian it|nifty it|infosys|tcs|wipro|hcltech|tech mahindra)\b/.test(headline)) {
    return "";
  }
  return fallback;
}

function freshnessScore(article, date) {
  const published = Date.parse(article?.publishedAt || "");
  const digestTime = Date.parse(`${date}T07:15:00+05:30`);
  if (!Number.isFinite(published) || !Number.isFinite(digestTime)) return 0;
  const ageHours = (digestTime - published) / (60 * 60 * 1000);
  if (ageHours < -2) return -2;
  if (ageHours <= 18) return 5;
  if (ageHours <= 36) return 3;
  if (ageHours <= 60) return 1;
  if (ageHours <= 96) return -2;
  return -5;
}

function editorialLeadSentence(article) {
  const text = `${article?.headline || ""} ${article?.summary || ""}`.toLowerCase();
  if (/\b(gift nifty|sgx nifty|nifty futures|index futures)\b/.test(text)) {
    return "Gift Nifty premium or discount sets the opening gap, but cash-market breadth decides whether the gap holds";
  }
  if (/\b(jobs day|payroll|employment|jobless|labor market)\b/.test(text)) {
    return "US jobs data and semiconductor earnings will test whether last week's risk-on momentum can carry into India";
  }
  if (/\b(apple|amazon|meta|alphabet|microsoft|google|nvidia|big tech|faang|mega-cap|mag.?7)\b/.test(text)) {
    return "Mega-cap tech sets the global risk tone; India needs Nifty IT and exporter breadth to confirm the read-through";
  }
  if (/\b(opec|production|output)\b/.test(text) && /\b(oil|crude|brent)\b/.test(text)) {
    return "OPEC supply headlines keep crude as the key import-cost variable for India";
  }
  if (/\b(crude|oil|brent)\b/.test(text)) {
    return "Crude remains the key transmission line for import costs, aviation fuel, OMC margins and inflation expectations";
  }
  if (/trump.{0,25}(xi|jinping|beijing)|xi.{0,25}trump|us.?china (trade|talks?|deal|truce|tariff)|trade (deal|truce|ceasefire|agreement)|tariff (deal|truce|cut|pause|rollback)/.test(text)) {
    return "US-China diplomacy is the single largest global risk variable right now — a positive outcome is risk-on for IT exports, metals and mid-cap India; watch FII flows and USD/INR to confirm";
  }
  if (/\b(war|military|missile|strike|airstrike|conflict|geopolit|iran|israel|russia|ukraine|taiwan strait|south china sea|nato|sanctions|red sea|hormuz)\b/.test(text)) {
    return "Geopolitical escalation is a risk-off cue that India must verify through crude, gold, USD/INR, FII flow and breadth";
  }
  if (/\b(gst|sebi|pli|production[-\s]?linked incentive|union budget|finance ministry|budget|stt|capital gains tax)\b/.test(text)) {
    return "India policy is a direct domestic catalyst; affected sectors need breadth confirmation before the index inherits it";
  }
  if (/\b(yield|bond|rate|fed|inflation)\b/.test(text)) {
    return "Rates remain the hurdle-rate input for banks, realty and high-multiple growth pockets";
  }
  if (/\b(rbi|repo rate|monetary policy|liquidity|g-sec|gsec|government bond)\b/.test(text)) {
    return "RBI and local-liquidity cues travel first through Bank Nifty, NBFCs, realty and autos";
  }
  if (/\b(semiconductor|chip|ai|software|tech)\b/.test(text)) {
    return "Global technology breadth is a risk-appetite cue, but India still needs currency and sector confirmation";
  }
  if (/\b(rupee|usd.?inr|currency|forex|dollar|dxy)\b/.test(text)) {
    return "Currency pressure splits exporters from importers and can reset the FII flow narrative";
  }
  if (/\b(fii|dii|fpi|foreign institutional|domestic institutional|institutional flow|provisional flow)\b/.test(text)) {
    return "Institutional flow is the domestic risk check that decides whether global cues get absorbed or rejected";
  }
  if (/\b(bank|credit|nbfc|deposit|financial)\b/.test(text)) {
    return "Indian bank breadth decides whether a Nifty move becomes a trend or just a gap reaction";
  }
  if (/\b(metal|metals|steel|copper|aluminium|aluminum|iron ore|china demand)\b/.test(text)) {
    return "Metals need China, commodity prices and domestic sector breadth aligned before becoming broad-index evidence";
  }
  if (/\b(pharma|drug|fda|healthcare|hospital|diagnostic)\b/.test(text)) {
    return "Healthcare cues belong first to defensives and stock-specific read-through unless breadth broadens";
  }
  if (/\b(monsoon|rainfall|agri|agriculture|rural|crop|fertili[sz]er)\b/.test(text)) {
    return "Monsoon and rural cues travel through FMCG, tractors, fertilisers, rural lenders and inflation expectations";
  }
  if (/\b(tariff|trade war|import duty|export ban|trade policy)\b/.test(text)) {
    return "Trade policy risk splits exporters, autos, metals and pharma instead of moving the whole index together";
  }
  if (/\b(consumer|retail|spending|sentiment|fmcg|rural demand)\b/.test(text)) {
    return "Consumer demand cues matter only if FMCG, autos and retail lenders confirm after the opening range";
  }
  if (/\b(volatility|vix|options?|pcr|oi buildup|put writing|call resistance)\b/.test(text)) {
    return "Options and volatility cues define sizing discipline before the cash market proves direction";
  }
  return "";
}

function editorialBecause(article) {
  const text = `${article?.headline || ""} ${article?.summary || ""}`.toLowerCase();
  if (/\b(gift nifty|sgx nifty|nifty futures|index futures)\b/.test(text)) {
    return "Gift Nifty sets the gap direction, but cash-market breadth decides whether the open has follow-through";
  }
  if (/\b(jobs day|payroll|employment|jobless|labor market)\b/.test(text)) {
    return "jobs data, chip earnings and US momentum can decide whether global risk appetite survives the open";
  }
  if (/\b(apple|amazon|meta|alphabet|microsoft|google|nvidia|big tech|faang|mega-cap|mag.?7)\b/.test(text)) {
    return "mega-cap tech sets Nasdaq tone, but Nifty IT and exporter breadth must confirm the India read-through";
  }
  if (/\b(opec|production|output)\b/.test(text) && /\b(oil|crude|brent)\b/.test(text)) {
    return "OPEC supply news changes the crude-import cost check for OMCs, aviation, paints and inflation expectations";
  }
  if (/\b(crude|oil|brent)\b/.test(text)) {
    return "Brent direction decides whether import-cost pressure or margin relief leads the India open";
  }
  if (/\b(war|military|missile|strike|airstrike|conflict|geopolit|iran|israel|russia|ukraine|taiwan strait|south china sea|nato|sanctions|red sea|hormuz)\b/.test(text)) {
    return "geopolitical escalation travels through crude, gold, USD/INR and FII risk appetite before equities";
  }
  if (/\b(rbi|repo rate|monetary policy|liquidity|g-sec|gsec|government bond|mpc)\b/.test(text)) {
    return "RBI and local liquidity cues travel first through Bank Nifty, NBFCs, realty and autos";
  }
  if (/\b(gst|sebi|pli|production[-\s]?linked incentive|union budget|finance ministry|budget|stt|capital gains tax)\b/.test(text)) {
    return "India policy can directly change sector earnings, liquidity or positioning before global cues matter";
  }
  if (/\b(yield|bond|rate|fed|inflation)\b/.test(text)) {
    return "rates reset the hurdle for banks, realty and high-multiple growth pockets";
  }
  if (/\b(semiconductor|chip|ai|software|tech)\b/.test(text)) {
    return "semiconductor and AI headlines are driving global risk appetite, but they still need Nasdaq and USD/INR confirmation";
  }
  if (/\b(rupee|usd.?inr|currency|forex|dollar|dxy)\b/.test(text)) {
    return "currency pressure can split exporters from importers and reset the FII flow assumption";
  }
  if (/\b(fii|dii|fpi|foreign institutional|domestic institutional|institutional flow|provisional flow)\b/.test(text)) {
    return "institutional flow decides whether global cues are being absorbed or rejected by domestic cash demand";
  }
  if (/\b(bank|credit|financial)\b/.test(text)) {
    return "financial breadth decides whether a Nifty move becomes a trend or just a gap reaction";
  }
  if (/\b(metal|metals|steel|copper|aluminium|aluminum|iron ore|china demand)\b/.test(text)) {
    return "metals need China, commodity prices and domestic sector breadth aligned before becoming broad-index evidence";
  }
  if (/\b(pharma|drug|fda|healthcare|hospital|diagnostic)\b/.test(text)) {
    return "healthcare can act as defensive leadership, but it needs broader breadth to affect index risk appetite";
  }
  if (/\b(monsoon|rainfall|agri|agriculture|rural|crop|fertili[sz]er)\b/.test(text)) {
    return "monsoon and rural cues travel through FMCG, tractors, fertilisers, rural lenders and inflation expectations";
  }
  if (/\b(tariff|trade war|import duty|export ban|trade policy)\b/.test(text)) {
    return "trade policy splits exporters, autos, metals and pharma instead of moving the whole index together";
  }
  if (/\b(consumer|retail|spending|sentiment|fmcg|rural demand)\b/.test(text)) {
    return "consumer demand needs FMCG, auto and retail-lender breadth after the opening range";
  }
  if (/\b(volatility|vix|options?|pcr|oi buildup|put writing|call resistance)\b/.test(text)) {
    return "options and volatility cues define sizing discipline before cash-market direction is proven";
  }
  return "";
}

function assertDigestEditorialIntegrity(current, previousDigest) {
  const stale = ["Global Pressure Meets Domestic Selectivity", "clearest macro headwind", "Selectivity"];
  const publicText = [current.title, current.archiveSummary, current.deskNote, ...(current.watchItems || [])].join(" ");
  const banned = stale.find((phrase) => publicText.includes(phrase));
  if (banned) {
    throw new Error(`Digest editorial integrity failed: stale phrase "${banned}"`);
  }
  assertDailyLeadCoherence(current);
  if (!previousDigest) {
    return;
  }
  const duplicateChecks = [
    ["title", current.title, previousDigest.title],
    ["archive summary", current.archiveSummary, previousDigest.archiveSummary],
    ["desk note", current.deskNote, previousDigest.deskNote]
  ];
  for (const [label, left, right] of duplicateChecks) {
    if (right && normalizeEditorial(left) === normalizeEditorial(right)) {
      throw new Error(`Digest editorial integrity failed: ${label} repeats the previous verified edition`);
    }
  }
  const previousWatch = new Set((previousDigest.watchItems || []).map(normalizeEditorial));
  const repeatedWatch = (current.watchItems || []).filter((item) => previousWatch.has(normalizeEditorial(item)));
  if (repeatedWatch.length) {
    throw new Error("Digest editorial integrity failed: watch items repeat the previous verified edition");
  }
}

function assertDailyLeadCoherence(current) {
  const lead = current.dailyLead;
  if (!lead) {
    throw new Error("Digest editorial integrity failed: missing dailyLead");
  }
  const labelKey = normalizeEditorial(lead.label).split(" ")[0];
  const text = normalizeEditorial([current.title, current.archiveSummary, current.deskNote].join(" "));
  if (labelKey && !text.includes(labelKey)) {
    throw new Error(`Digest editorial integrity failed: dailyLead "${lead.label}" does not drive title, summary, and desk note`);
  }
}

function cleanSentence(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

function compactTitle(value) {
  return compactWords(cleanSentence(value).replace(/\bSelectivity\b/gi, "Focus"), 9)
    .replace(/[.?!]$/, "");
}

function compactWords(value, maxWords) {
  const words = cleanSentence(value).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(" ");
  }
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function normalizeEditorial(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an|to|of|and|for|in|on|as|with|after|before|is|are|this|that)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function strongestArticle(articles, predicate) {
  return articles
    .filter(predicate)
    .sort((left, right) =>
      Math.abs(Number(right.sentimentScore || 0) * Number(right.entityMatchScore || 0)) -
      Math.abs(Number(left.sentimentScore || 0) * Number(left.entityMatchScore || 0))
    )[0];
}

function conciseRegionLine(snapshots, region) {
  return speechRegionLine(snapshots, region, region === "Asia Watch" ? { limit: 5, includeCountry: true } : {});
}

function speechRegionLine(snapshots, region, options = {}) {
  const selected = snapshots
    .filter((snapshot) => snapshot.marketRegion === region)
    .filter((snapshot) => Number.isFinite(Number(snapshot.changePercent)));
  if (!selected.length) {
    return "";
  }

  const display = selected
    .slice()
    .sort((left, right) => Math.abs(Number(right.changePercent)) - Math.abs(Number(left.changePercent)))
    .slice(0, options.limit ?? selected.length);
  const positives = selected.filter((snapshot) => Number(snapshot.changePercent) > 0.05);
  const negatives = selected.filter((snapshot) => Number(snapshot.changePercent) < -0.05);
  const flat = selected.length - positives.length - negatives.length;
  const leader = display[0];
  const counter = display.find((snapshot) => Math.sign(Number(snapshot.changePercent)) !== Math.sign(Number(leader.changePercent)));
  const regionName = {
    "US Overnight": "US markets",
    "Asia Watch": "Asia",
    "India Open": "India",
    "Macro Hedges": "Macro hedges"
  }[region] ?? region;
  const verb = ["US Overnight", "Macro Hedges"].includes(region) ? "are" : "is";

  if (positives.length && !negatives.length) {
    return `${regionName} ${verb} firm, led by ${speechMove(leader, options)}.`;
  }
  if (negatives.length && !positives.length) {
    return `${regionName} ${verb} under pressure, with ${speechMove(leader, options)}.`;
  }
  if (flat === selected.length) {
    return `${regionName} ${verb} almost flat, with ${display.slice(0, 2).map((item) => speechMove(item, options)).join(" and ")}.`;
  }

  const counterLine = counter ? `, while ${speechMove(counter, options)}` : "";
  return `${regionName} ${verb} mixed: ${speechMove(leader, options)}${counterLine}.`;
}

function speechMove(snapshot, options = {}) {
  const name = options.includeCountry && snapshot.country
    ? `${snapshot.country} ${snapshot.name}`
    : snapshot.name;
  const change = Number(snapshot.changePercent);
  if (Math.abs(change) < 0.05) {
    return `${name} flat at ${formatChange(round(change, 2))}`;
  }
  return `${name} ${change > 0 ? "up" : "down"} ${formatAbsChange(change)}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2
  }).format(Number(value));
}

function formatChange(changePercent) {
  return `${changePercent >= 0 ? "+" : ""}${changePercent}%`;
}

function formatSnapshotChange(snapshot) {
  const change = Number(snapshot?.changePercent);
  if (snapshot?.symbol === "BRENT" && Math.abs(change || 0) < 0.005) {
    return `last close ${formatNumber(snapshot.closeValue)}`;
  }
  return formatChange(snapshot.changePercent);
}

function formatAbsChange(changePercent) {
  return `${Math.abs(Number(changePercent)).toFixed(2)}%`;
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function delayedRead(fileName, delayMs) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return readJson(join(seedDir, fileName));
}

export async function synthesizeTodaysReadArticle(date, articles, marketSnapshots, options = {}) {
  const nvidiaApiKey = options.nvidiaApiKey ?? process.env.NVIDIA_API_KEY;
  const strictDeskEditor = options.strictDeskEditor ?? (process.env.PUBLIC_BRIEFING_DESK_STRICT === "true" || process.env.PUBLIC_BRIEFING_AGENT_STRICT === "true");
  if (!nvidiaApiKey) {
    if (strictDeskEditor) {
      throw new Error("Todays Read synthesis requires NVIDIA_API_KEY");
    }
    return null;
  }

  const topArticles = articles.slice(0, 8);
  const articleContext = topArticles
    .map((a, i) => `[${i + 1}] ${a.headline}\nTakeaway: ${a.takeaway || a.summary || ""}\nIndia angle: ${a.indiaImpact || ""}`)
    .join("\n\n");

  const nifty = marketSnapshots.find(s => s.symbol === "NIFTY");
  const bankNifty = marketSnapshots.find(s => s.symbol === "BANKNIFTY");
  const brent = marketSnapshots.find(s => s.symbol === "BRENT");
  const usdinr = marketSnapshots.find(s => s.symbol === "USDINR");

  const marketCtx = [
    nifty ? `Nifty 50: ${nifty.closeValue} (${Number(nifty.changePercent) >= 0 ? "+" : ""}${nifty.changePercent}%)` : "",
    bankNifty ? `Bank Nifty: ${bankNifty.closeValue} (${Number(bankNifty.changePercent) >= 0 ? "+" : ""}${bankNifty.changePercent}%)` : "",
    brent ? `Brent crude: $${brent.closeValue} (${Number(brent.changePercent) >= 0 ? "+" : ""}${brent.changePercent}%)` : "",
    usdinr ? `USD/INR: ${usdinr.closeValue}` : ""
  ].filter(Boolean).join(", ");

  const model = options.deskEditorModel ?? process.env.NVIDIA_DESK_MODEL ?? process.env.NVIDIA_ARTICLE_MODEL ?? process.env.NVIDIA_PULSE_MODEL ?? NIM_MODEL;
  const baseUrl = String(options.nvidiaBaseUrl ?? process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");
  const fetcher = options.llmFetcher ?? fetch;

  const systemPrompt = `You are a senior financial journalist writing the "Today's Read" feature article for an India pre-open briefing. Write a highly detailed, engaging, and narrative-driven market article that synthesizes the last 20 hours of news into a cohesive story. Use direct, authoritative prose. No bullet points, no headers, no markdown. Write exactly four substantial paragraphs separated by a blank line. Always lead with the PRIMARY STORY.`;

  const userPrompt = `Key overnight news (last 20 hours):\n\n${articleContext}\n\nMarket snapshot: ${marketCtx}\n${options.dailyLead?.headline ? `\nPRIMARY STORY (your article must lead with and centre on this): ${options.dailyLead.headline}\n` : ""}\nWrite a cohesive 4-paragraph article. Paragraph 1 must open with the PRIMARY STORY and establish its significance. Paragraphs 2-3 weave in the supporting global and domestic context. Paragraph 4 sets up what traders must watch at the Indian market open. Be highly detailed and analytical. No preamble, no sign-off. Return exactly four paragraphs.`;

  log.info("desk editor synthesis started", { provider: "nvidia", model });
  const startTime = Date.now();
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 3000));
      const response = await fetcher(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${nvidiaApiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: Number(options.deskEditorMaxTokens ?? process.env.NVIDIA_DESK_MAX_TOKENS ?? 2000),
          temperature: Number(options.deskEditorTemperature ?? process.env.NVIDIA_DESK_TEMPERATURE ?? 0.35),
          top_p: Number(options.deskEditorTopP ?? process.env.NVIDIA_DESK_TOP_P ?? 0.9),
          stream: false
        }),
        signal: AbortSignal.timeout(Number(options.nvidiaTimeoutMs ?? process.env.NVIDIA_DESK_TIMEOUT_MS ?? 120000))
      });

      if (response.status === 429 || response.status >= 500) {
        log.warn("desk editor retryable response", { provider: "nvidia", model, status: response.status, attempt: attempt + 1 });
        continue;
      }
      if (!response.ok) {
        log.warn("desk editor request rejected", { provider: "nvidia", model, status: response.status });
        if (strictDeskEditor) {
          throw new Error(`Desk editor API returned ${response.status}`);
        }
        return null;
      }
      const data = await response.json();
      const raw = (data?.choices ?? []).map(c => c?.message?.content ?? "").filter(Boolean).join("\n").trim();
      const text = raw ? cleanAIOutput(raw) : null;
      log.info("desk editor synthesis completed", { provider: "nvidia", model, durationMs: Date.now() - startTime, chars: text?.length ?? 0 });
      return text || null;
    } catch (error) {
      log.warn("desk editor attempt failed", { provider: "nvidia", model, attempt: attempt + 1, error: error.message });
    }
  }
  if (strictDeskEditor) {
    throw new Error("Todays Read synthesis failed after retries");
  }
  return null;
}
