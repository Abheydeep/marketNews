import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchLiveMarketSnapshots, markSnapshotsAsFallback } from "./market-data.mjs";
import { resolveNewsArticles } from "./news-sources.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const seedDir = join(rootDir, "backend", "src", "main", "resources", "seed");

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
  const { marketSnapshots, marketDataError } = await resolveMarketSnapshots(seedMarketSnapshots, marketDataMode);
  const { articles, sourceVerification } = await resolveNewsArticles(date, {
    mode: newsDataMode,
    seedNews: news.map((article) => ({
      ...article,
      thumbnail: normalizeArticleThumbnail(article)
    })),
    previousDigest: options.previousDigest,
    fetcher: options.fetcher,
    strictFetch: options.strictFetch
  });
  const themes = clusterThemes(date, articles);
  const rawTradeSetups = scanPriceSeries(date, priceSeriesSeed);
  const setupAudit = auditTradeSetupsWithMarketSnapshots(rawTradeSetups, marketSnapshots);
  const tradeSetups = setupAudit
    .filter((item) => item.status === "ACTIVE")
    .map((item) => item.setup);
  const overallSentiment = weightedSentiment(articles);
  const sentimentLabel = labelFromScore(overallSentiment);
  const script = generateScript(date, sentimentLabel, marketSnapshots, themes, tradeSetups, overallSentiment, articles, options.previousDigest);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const archiveSummary = archiveSummaryForDigest(date, articles, themes, options.previousDigest);
  const deskNote = deskNoteForDigest(date, articles, tradeSetups, marketSnapshots, overallSentiment, options.previousDigest);
  const watchItems = watchItemsForDigest(date, articles, tradeSetups, options.previousDigest);
  assertDigestEditorialIntegrity({
    title: script.title,
    archiveSummary,
    deskNote,
    watchItems
  }, options.previousDigest);
  const asset = generateAsset(date, sentimentLabel, {
    snapshots: marketSnapshots,
    themes,
    setups: tradeSetups,
    articles
  });

  return {
    scriptId: 1,
    digestDate: date,
    title: script.title,
    status: "DRAFT",
    generatedAt,
    archiveSummary,
    deskNote,
    watchItems,
    overallSentiment: round(overallSentiment, 3),
    sentimentLabel,
    onePageSummary: script.onePageSummary,
    teleprompterScript: script.teleprompterScript,
    reelScript: script.reelScript,
    publishedAt: null,
    marketSnapshots,
    news: articles,
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
}

async function resolveMarketSnapshots(seedMarketSnapshots, marketDataMode) {
  if (marketDataMode !== "live") {
    return { marketSnapshots: seedMarketSnapshots, marketDataError: null };
  }

  try {
    return {
      marketSnapshots: await fetchLiveMarketSnapshots(),
      marketDataError: null
    };
  } catch (error) {
    return {
      marketSnapshots: markSnapshotsAsFallback(seedMarketSnapshots, error.message),
      marketDataError: error.message
    };
  }
}

export function scanPriceSeries(date, priceSeriesSeed) {
  return priceSeriesSeed.flatMap((series) => {
    const setup = evaluateSeries(date, series.symbol, series.bars);
    return setup ? [setup] : [];
  });
}

export function reconcileTradeSetupsWithMarketSnapshots(setups, marketSnapshots) {
  return auditTradeSetupsWithMarketSnapshots(setups, marketSnapshots)
    .filter((item) => item.status === "ACTIVE")
    .map((item) => item.setup);
}

export function auditTradeSetupsWithMarketSnapshots(setups, marketSnapshots) {
  const snapshotsBySymbol = new Map(marketSnapshots.map((snapshot) => [snapshot.symbol, snapshot]));
  return setups.map((setup) => setupAuditEntry(setup, snapshotsBySymbol.get(setup.symbol)));
}

function setupAuditEntry(setup, snapshot) {
  const base = {
    symbol: setup.symbol,
    direction: setup.direction,
    entry: setup.entry,
    stopLoss: setup.stopLoss,
    target: setup.target,
    riskReward: setup.riskReward,
    setup
  };

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
    digestDate: date
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

export function generateScript(date, sentimentLabel, snapshots, themes, setups, overallSentiment, articles = [], previousDigest = null) {
  const title = uniqueTitleForDigest(date, sentimentLabel, articles, themes, previousDigest);
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
    "Educational note: This summary is for market research and content preparation only, not financial advice."
  ].join("\n\n");

  const opening = {
    BULLISH: "Good morning. Global cues are supportive, but we still want confirmation after the open.",
    BEARISH: "Good morning. The overnight setup is cautious, with global pressure visible before the Indian open.",
    VOLATILE: "Good morning. The setup is mixed, so today is about selectivity and levels.",
    NEUTRAL: "Good morning. The market is balanced, and the first hour should define direction."
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
    "[RISK DISCLAIMER]\nThis is educational analysis for content planning. It is not investment advice, and no automated order execution is enabled."
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

function generateReelScript({ date, sentimentLabel, snapshots, themes, setups, articles }) {
  const pressure = strongestArticle(articles, (article) => Number(article.sentimentScore) < 0) ?? articles[0];
  const support = strongestArticle(articles, (article) => Number(article.sentimentScore) > 0);
  const usLine = speechRegionLine(snapshots, "US Overnight");
  const asiaLine = speechRegionLine(snapshots, "Asia Watch", { limit: 5, includeCountry: true });
  const indiaLine = speechRegionLine(snapshots, "India Open");
  const macroLine = speechRegionLine(snapshots, "Macro Hedges");
  const setup = setups.find((item) => item.symbol === "NIFTY") ?? setups[0];
  const setupLine = setup
    ? `If ${setup.symbol} accepts near ${formatNumber(setup.entry)}, the plan is clean: invalidation below ${formatNumber(setup.stopLoss)}, target near ${formatNumber(setup.target)}, and no entry unless the reward stays at least twice the risk.`
    : "No forced trade at the open. Let the first-hour range form, then only take a setup that gives at least twice the reward for the risk.";
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
    `VOICEOVER: ${pressureLine} ${supportLine} ${sourceLine ? `This read is backed by ${sourceLine}.` : ""}`,
    "",
    "[28-40s | INDIA OPEN]",
    "ON SCREEN: Nifty + Bank Nifty game plan",
    `VOICEOVER: ${indiaLine || "Nifty and Bank Nifty need confirmation after the bell."} If banks hold VWAP and breadth improves, dips can stay selective. If breadth breaks, reduce size and wait.`,
    "",
    "[40-52s | TRADE PLAN]",
    "ON SCREEN: No chase. Only 1:2+ setups.",
    `VOICEOVER: ${setupLine}`,
    "",
    "[52-58s | WATCH NEXT]",
    `ON SCREEN: Watch this after 9:15`,
    `VOICEOVER: The next tell is this: ${watchLine}`,
    "",
    "[58-60s | CLOSE]",
    "ON SCREEN: Save before the open",
    "VOICEOVER: Save this for the open. This is market education, not investment advice; trade only your own plan."
  ].join("\n");
}

export function generateAsset(date, sentimentLabel, context = {}) {
  const promptMood = {
    BULLISH: "emerald market screens, rising candles, confident financial presenter",
    BEARISH: "crimson risk dashboard, falling candles, serious financial presenter",
    VOLATILE: "slate and gold trading floor, split-direction candles, focused financial presenter",
    NEUTRAL: "clean market studio, balanced chart grid, composed financial presenter"
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
    positivePrompt: `photorealistic Indian financial news thumbnail, identity-locked creator portrait, ${promptMood}, cinematic studio lighting, sharp facial features, realistic skin texture, 8k editorial detail`,
    negativePrompt: "plastic skin, distorted eyes, extra fingers, cartoonish, low resolution, blurry text, deformed hands",
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
      `Use an identity-locked Indian financial creator as presenter.`,
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

export function newsArticleJsonLd(digest) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: digest.title,
    image: "https://marketnarrative.in/og-card.svg",
    datePublished: digest.publishedAt ?? `${digest.digestDate}T07:15:00+05:30`,
    author: {
      "@type": "Person",
      name: "Market Narrative Engine",
      url: "https://marketnarrative.in"
    }
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
    BEARISH: "Global Pressure Meets Domestic Selectivity",
    VOLATILE: "Mixed Cues Put Levels in Focus",
    NEUTRAL: "Balanced Start Ahead of First-Hour Confirmation"
  }[label];
}

function uniqueTitleForDigest(date, sentimentLabel, articles, themes, previousDigest = null) {
  const lead = leadMarketArticle(articles, date) ?? strongestArticle(articles, (article) => Number.isFinite(Number(article.sentimentScore))) ?? articles[0];
  const headline = String(lead?.headline || themes[0]?.title || sentimentLabel || "Market").toLowerCase();
  const force = dominantForceLabel(lead, headline);
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

function archiveSummaryForDigest(date, articles, themes, previousDigest) {
  const lead = leadMarketArticle(articles, date) ?? strongestArticle(articles, (article) => Number.isFinite(Number(article.sentimentScore))) ?? articles[0];
  const force = dominantForceLabel(lead, String(lead?.headline || "").toLowerCase());
  const text = editorialLeadSentence(lead) || lead?.summary || lead?.headline || themes[0]?.summary || "Opening range needs confirmation from source-led market cues.";
  const summary = compactWords(cleanSentence(`${force}: ${text}`), 20);
  if (summary && normalizeEditorial(summary) !== normalizeEditorial(previousDigest?.archiveSummary)) {
    return summary;
  }
  const fallback = lead?.headline ? `${lead.headline} is today's main source-led difference for the India open.` : "Today needs fresh confirmation from verified source cues.";
  return compactWords(cleanSentence(fallback), 20);
}

function deskNoteForDigest(date, articles, setups, marketSnapshots = [], overallSentiment = 0, previousDigest) {
  const lead = leadMarketArticle(articles, date) ?? strongestArticle(articles, (article) => Number.isFinite(Number(article.sentimentScore))) ?? articles[0];
  const sector = leadSectorArticle(articles, date) ?? lead;
  const setup = setups.find((item) => item.symbol === "NIFTY") ?? setups[0];
  const force = dominantForceLabel(lead, String(lead?.headline || "").toLowerCase());
  const sectorLabel = sectorFocusLabel(sector);
  const keyInstrument = deskNoteInstrument(lead);
  const indiaSnapshot = marketSnapshots.find((item) => item.symbol === "NIFTY") ?? marketSnapshots.find((item) => item.marketRegion === "India Open");
  const first = `${force} ${forceVerb(force)} today's first filter because ${becauseFragment(editorialLeadSentence(lead) || lead?.summary || lead?.headline || "the verified source mix changed from the last edition")}.`;
  const second = setup
    ? `Track ${setup.symbol} ${formatNumber(setup.entry)} first; holding that zone keeps ${formatNumber(setup.target)} in play.`
    : `Track ${keyInstrument}${indiaSnapshot?.closeValue ? ` against ${formatNumber(indiaSnapshot.closeValue)}` : ""}; sentiment at ${round(overallSentiment, 2)} says the first range must prove direction.`;
  const third = `${sectorLabel} confirms the headline only if ${becauseFragment(editorialBecause(sector) || sector?.indiaImpact || sector?.summary || "sector breadth follows the same direction")}.`;
  const fourth = setup
    ? `Trade the first 15 minutes only if price holds VWAP and the stop at ${formatNumber(setup.stopLoss)} stays respected.`
    : "Let the first 15 minutes print, then trade only the side that holds VWAP with breadth behind it.";
  const note = [first, second, third, fourth].map(cleanSentence).join(" ");
  if (normalizeEditorial(note) !== normalizeEditorial(previousDigest?.deskNote)) {
    return note;
  }
  return `${first} ${second} ${third} Use the first 15 minutes to demand a fresh level that still pays at least twice the risk.`;
}

function deskNoteInstrument(article) {
  const text = `${article?.headline || ""} ${article?.summary || ""} ${article?.entityName || ""}`.toLowerCase();
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
  if (/\b(crude|oil|brent|strait of hormuz)\b/.test(text)) score += 8;
  if (/\b(yield|bond|fed|rate|inflation)\b/.test(text)) score += 7;
  if (/\b(jobs day|payroll|employment|jobless|labor market)\b/.test(text)) score += 7;
  if (/\b(opec|production|output cut|output boost)\b/.test(text)) score += 7;
  if (/\b(nasdaq|s&p|dow|wall street|futures|stocks?|shares?)\b/.test(text)) score += 6;
  if (/\b(semiconductor|chip|chips|sox)\b/.test(text)) score += 5;
  if (/\b(tariff|trade|exports?|imports?)\b/.test(text)) score += 5;
  if (/\b(rupee|dollar|currency)\b/.test(text)) score += 4;
  if (/\b(earnings|revenue|profit|guidance|outlook)\b/.test(text)) score += 3;
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
      "Opening breadth after 10:15 AM IST and whether Bank Nifty confirms the first move.",
      "Rupee and crude behavior before the Europe open; a reversal changes import-risk sentiment.",
      "Nifty VWAP acceptance during the first hour; failed acceptance keeps the plan defensive."
    ][unique.length]);
  }
  return unique.slice(0, 3);
}

function specificWatchItem(article) {
  const headline = String(article?.headline || "").toLowerCase();
  if (/\b(jobs day|payroll|employment|jobless|labor market)\b/.test(headline)) return "US jobs-week positioning and Nasdaq futures before India opens; a weak risk tape keeps Nifty in confirmation mode.";
  if (/\b(opec|production|output)\b/.test(headline)) return "Brent reaction to OPEC supply headlines before Europe opens; aviation, OMCs, paints and upstream energy are the first India checks.";
  if (/\b(crude|oil|brent)\b/.test(headline)) return "Brent direction before the Europe open and whether oil-import sensitivity hits India breadth.";
  if (/\b(yield|bond|rate|fed|inflation)\b/.test(headline)) return "US yield direction into the afternoon and whether Bank Nifty holds VWAP.";
  if (/\b(dollar|rupee|currency|yen)\b/.test(headline)) return "USD/INR and DXY behavior through the first hour; currency pressure can cap risk appetite.";
  if (/\b(bank|banks|credit|deposit)\b/.test(headline)) return "Bank Nifty follow-through after 10:15 AM IST and whether private-bank breadth confirms.";
  if (/\b(indian it|nifty it|infosys|tcs|wipro|hcltech|tech mahindra)\b/.test(headline)) return "Nifty IT breadth after the open and whether exporters confirm the currency read-through.";
  if (/\b(tech|ai|software|semiconductor|chip|chips)\b/.test(headline)) return "Nasdaq and semiconductor futures into the cash open; use them as risk-appetite context, not an automatic Nifty IT call.";
  if (/\b(asia|china|japan|hong kong|korea|taiwan)\b/.test(headline)) return "Asia breadth into the Indian first hour and whether regional risk stays supportive.";
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
  if (/\b(jobs day|payroll|employment|jobless|labor market)\b/.test(text)) {
    return "US jobs data and semiconductor earnings will test whether last week's risk-on momentum can carry into India";
  }
  if (/\b(opec|production|output)\b/.test(text) && /\b(oil|crude|brent)\b/.test(text)) {
    return "OPEC supply headlines keep crude as the key import-cost variable for India";
  }
  if (/\b(crude|oil|brent)\b/.test(text)) {
    return "Crude remains the key transmission line for import costs, aviation fuel, OMC margins and inflation expectations";
  }
  if (/\b(yield|bond|rate|fed|inflation)\b/.test(text)) {
    return "Rates remain the hurdle-rate input for banks, realty and high-multiple growth pockets";
  }
  if (/\b(semiconductor|chip|ai|software|tech)\b/.test(text)) {
    return "Global technology breadth is a risk-appetite cue, but India still needs currency and sector confirmation";
  }
  return "";
}

function editorialBecause(article) {
  const text = `${article?.headline || ""} ${article?.summary || ""}`.toLowerCase();
  if (/\b(jobs day|payroll|employment|jobless|labor market)\b/.test(text)) {
    return "jobs data, chip earnings and US momentum can decide whether global risk appetite survives the open";
  }
  if (/\b(semiconductor|chip|ai|software|tech)\b/.test(text)) {
    return "semiconductor and AI headlines are driving global risk appetite, but they still need Nasdaq and USD/INR confirmation";
  }
  if (/\b(bank|credit|financial)\b/.test(text)) {
    return "financial breadth decides whether a Nifty move becomes a trend or just a gap reaction";
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
