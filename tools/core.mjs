import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchLiveMarketSnapshots, markSnapshotsAsFallback } from "./market-data.mjs";

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
  const { marketSnapshots, marketDataError } = await resolveMarketSnapshots(seedMarketSnapshots, marketDataMode);

  const articles = news.map((article) => ({
    publishedAt: `${date}T${article.publishedTime}+05:30`,
    sourceId: article.sourceId,
    sourceName: article.sourceName,
    headline: article.headline,
    summary: article.summary,
    takeaway: article.takeaway,
    whyItMatters: article.whyItMatters,
    indiaImpact: article.indiaImpact,
    watchFor: article.watchFor,
    thumbnail: normalizeArticleThumbnail(article),
    sourceUrl: article.sourceUrl,
    sentimentScore: article.sentimentScore,
    entityName: article.entityName,
    entityMatchScore: article.entityMatchScore,
    category: article.category
  }));
  const themes = clusterThemes(date, articles);
  const rawTradeSetups = scanPriceSeries(date, priceSeriesSeed);
  const tradeSetups = reconcileTradeSetupsWithMarketSnapshots(rawTradeSetups, marketSnapshots);
  const overallSentiment = weightedSentiment(articles);
  const sentimentLabel = labelFromScore(overallSentiment);
  const script = generateScript(date, sentimentLabel, marketSnapshots, themes, tradeSetups, overallSentiment, articles);
  const asset = generateAsset(date, sentimentLabel);

  return {
    scriptId: 1,
    digestDate: date,
    title: script.title,
    status: "DRAFT",
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
    asset,
    marketDataMode,
    marketDataError,
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
  const snapshotsBySymbol = new Map(marketSnapshots.map((snapshot) => [snapshot.symbol, snapshot]));
  return setups.filter((setup) => setupIsStillActive(setup, snapshotsBySymbol.get(setup.symbol)));
}

function setupIsStillActive(setup, snapshot) {
  if (!snapshot || snapshot.dataQuality !== "live" || !Number.isFinite(Number(snapshot.closeValue))) {
    return true;
  }

  const current = Number(snapshot.closeValue);
  if (setup.direction === "BULLISH") {
    if (current <= setup.stopLoss || current >= setup.target) {
      return false;
    }
    if (current > setup.entry) {
      return bullishRiskReward(current, setup.stopLoss, setup.target) >= 2;
    }
    return true;
  }

  if (setup.direction === "BEARISH") {
    if (current >= setup.stopLoss || current <= setup.target) {
      return false;
    }
    if (current < setup.entry) {
      const risk = setup.stopLoss - current;
      const reward = current - setup.target;
      return risk > 0 && reward / risk >= 2;
    }
  }

  return true;
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

export function generateScript(date, sentimentLabel, snapshots, themes, setups, overallSentiment, articles = []) {
  const title = `Nifty Pre-Market: ${titleSuffix(sentimentLabel)}`;
  const marketLine = snapshots
    .map((snapshot) => `${snapshot.name} ${formatChange(snapshot.changePercent)}`)
    .join(", ");
  const themeLines = themes
    .map((theme) => `- ${theme.title}: ${theme.summary}`)
    .join("\n");
  const setupLines = setups.length === 0
    ? "- No active 1:2 RR setup passed all scanner and live-quote filters."
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
    .map((snapshot) => `${snapshot.name} closed ${formatChange(snapshot.changePercent)}`)
    .join(". ");
  const themesText = themes
    .map((theme) => `Theme: ${theme.title}. ${theme.summary}`)
    .join("\n\n");
  const setupsText = setups.length === 0
    ? "No trade setup qualifies under the 1:2 risk-reward framework after live quote validation."
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
  const usLine = conciseRegionLine(snapshots, "US Overnight");
  const asiaLine = conciseRegionLine(snapshots, "Asia Watch");
  const indiaLine = conciseRegionLine(snapshots, "India Open");
  const macroLine = conciseRegionLine(snapshots, "Macro Hedges");
  const setup = setups.find((item) => item.symbol === "NIFTY") ?? setups[0];
  const setupLine = setup
    ? `For trades, I am only interested if ${setup.symbol} accepts near ${formatNumber(setup.entry)}. Stop is ${formatNumber(setup.stopLoss)}, target is ${formatNumber(setup.target)}, so the risk-reward stays above 1:2.`
    : "For trades, there is no fresh 1:2 setup yet. That means no chasing the first candle; I want the first-hour range to form first.";
  const toneLine = {
    BULLISH: "The tone is constructive, but I still want confirmation after the open.",
    BEARISH: "The tone is cautious, so the open is about risk control first.",
    VOLATILE: "The tone is mixed, so today is a level-by-level market.",
    NEUTRAL: "The tone is balanced, so the first hour should define direction."
  }[sentimentLabel] ?? "The tone is mixed, so the first hour matters.";
  const pressureLine = pressure
    ? `${pressure.takeaway || pressure.summary} Source check: ${pressure.sourceName}.`
    : themes[0]?.summary || "Global cues are mixed.";
  const supportLine = support
    ? `The offset is ${support.takeaway || support.summary} Source check: ${support.sourceName}.`
    : "The offset is selective domestic support, but it needs breadth confirmation.";
  const watchLine = pressure?.watchFor || support?.watchFor || "Watch opening breadth, Bank Nifty behavior, and whether Nifty holds the first-hour range.";

  return [
    `[REEL SCRIPT | ${date} | 45-60 sec]`,
    "",
    "[HOOK]",
    `Before the market opens, here is the one thing Indian traders need to know: ${toneLine}`,
    "",
    "[GLOBAL CUES]",
    `US setup: ${usLine || "US data is awaiting refresh"}. Asia check: ${asiaLine || "Asia is mixed"}. Macro hedge: ${macroLine || "Dollar and crude need monitoring"}.`,
    "",
    "[WHY IT MATTERS]",
    `${pressureLine} ${supportLine}`,
    "",
    "[INDIA OPEN]",
    `For India, ${indiaLine || "Nifty and Bank Nifty need first-hour confirmation"}. If banks support and crude cools, dips can stay selective. If breadth weakens, respect the risk-off signal.`,
    "",
    "[TRADE PLAN]",
    setupLine,
    "",
    "[WATCH NEXT]",
    watchLine,
    "",
    "[CLOSE]",
    "This is for education and market preparation, not investment advice. Save this before the open and trade only your own plan."
  ].join("\n");
}

export function generateAsset(date, sentimentLabel) {
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

  return {
    sentimentLabel,
    positivePrompt: `photorealistic Indian financial news thumbnail, identity-locked creator portrait, ${promptMood}, cinematic studio lighting, sharp facial features, realistic skin texture, 8k editorial detail`,
    negativePrompt: "plastic skin, distorted eyes, extra fingers, cartoonish, low resolution, blurry text, deformed hands",
    palette,
    referenceImageId: "creator-ref-001",
    controlNetMode: "ControlNet Canny + Depth identity lock",
    assetUrl: `/assets/mock/daily-thumbnail-${date}.webp`
  };
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
    image: `https://marketnarrative.local${digest.asset?.assetUrl ?? "/assets/mock/daily-thumbnail.webp"}`,
    datePublished: digest.publishedAt ?? `${digest.digestDate}T08:30:00+05:30`,
    author: {
      "@type": "Person",
      name: "Market Narrative Engine",
      url: "https://marketnarrative.local/profile"
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
    macro_positive: "Positive Macro Tailwind",
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

function strongestArticle(articles, predicate) {
  return articles
    .filter(predicate)
    .sort((left, right) =>
      Math.abs(Number(right.sentimentScore || 0) * Number(right.entityMatchScore || 0)) -
      Math.abs(Number(left.sentimentScore || 0) * Number(left.entityMatchScore || 0))
    )[0];
}

function conciseRegionLine(snapshots, region) {
  const selected = snapshots.filter((snapshot) => snapshot.marketRegion === region);
  if (!selected.length) {
    return "";
  }
  const positives = selected.filter((snapshot) => Number(snapshot.changePercent) >= 0).length;
  const leader = selected
    .slice()
    .sort((left, right) => Math.abs(Number(right.changePercent)) - Math.abs(Number(left.changePercent)))[0];
  const label = region === "Asia Watch"
    ? `${positives} of ${selected.length} top Asian country markets are higher`
    : `${positives} of ${selected.length} tracked markets are higher`;
  return `${label}; lead move is ${leader.name} ${formatChange(leader.changePercent)}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2
  }).format(Number(value));
}

function formatChange(changePercent) {
  return `${changePercent >= 0 ? "+" : ""}${changePercent}%`;
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
