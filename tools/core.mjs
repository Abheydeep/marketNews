import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

export async function buildDigest(date = todayIso()) {
  const started = performance.now();
  const [marketSnapshots, news, priceSeriesSeed] = await Promise.all([
    delayedRead("market-snapshots.json", 35),
    delayedRead("news.json", 55),
    delayedRead("price-bars.json", 45)
  ]);

  const articles = news.map((article) => ({
    publishedAt: `${date}T${article.publishedTime}+05:30`,
    sourceId: article.sourceId,
    sourceName: article.sourceName,
    headline: article.headline,
    summary: article.summary,
    sourceUrl: article.sourceUrl,
    sentimentScore: article.sentimentScore,
    entityName: article.entityName,
    entityMatchScore: article.entityMatchScore,
    category: article.category
  }));
  const themes = clusterThemes(date, articles);
  const tradeSetups = scanPriceSeries(date, priceSeriesSeed);
  const overallSentiment = weightedSentiment(articles);
  const sentimentLabel = labelFromScore(overallSentiment);
  const script = generateScript(date, sentimentLabel, marketSnapshots, themes, tradeSetups, overallSentiment);
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
    publishedAt: null,
    marketSnapshots,
    news: articles,
    themes,
    tradeSetups,
    asset,
    durationMillis: Math.round(performance.now() - started)
  };
}

export function scanPriceSeries(date, priceSeriesSeed) {
  return priceSeriesSeed.flatMap((series) => {
    const setup = evaluateSeries(date, series.symbol, series.bars);
    return setup ? [setup] : [];
  });
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

export function generateScript(date, sentimentLabel, snapshots, themes, setups, overallSentiment) {
  const title = `Nifty Pre-Market: ${titleSuffix(sentimentLabel)}`;
  const marketLine = snapshots
    .map((snapshot) => `${snapshot.name} ${formatChange(snapshot.changePercent)}`)
    .join(", ");
  const themeLines = themes
    .map((theme) => `- ${theme.title}: ${theme.summary}`)
    .join("\n");
  const setupLines = setups.length === 0
    ? "- No 1:2 RR setup passed all filters."
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
    ? "No trade setup qualifies under the 1:2 risk-reward framework yet."
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

  return {
    digestDate: date,
    title,
    onePageSummary,
    teleprompterScript,
    overallSentiment: round(overallSentiment, 3)
  };
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
