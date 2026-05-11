import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchLiveMarketSnapshots, markSnapshotsAsFallback } from "./market-data.mjs";
import { resolveNewsArticles } from "./news-sources.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const seedDir = join(rootDir, "backend", "src", "main", "resources", "seed");
const PUBLIC_SOURCE_LIMIT = 8;
const MIN_PUBLIC_SOURCE_COUNT = 3;

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
  const sourceSelection = publicSourceSelectionForDigest(date, articles, { marketSnapshots });
  const publicArticles = sourceSelection.visibleArticles;
  const publicSourceSelection = sourceSelection.publicSummary;
  const dailyLead = dailyLeadForDigest(date, publicArticles, { marketSnapshots });
  const themes = clusterThemes(date, publicArticles);
  const rawTradeSetups = scanPriceSeries(date, priceSeriesSeed);
  const setupAudit = auditTradeSetupsWithMarketSnapshots(rawTradeSetups, marketSnapshots);
  const tradeSetups = setupAudit
    .filter((item) => item.status === "ACTIVE")
    .map((item) => item.setup);
  const overallSentiment = weightedSentiment(articles);
  const sentimentLabel = labelFromScore(overallSentiment);
  const script = generateScript(date, sentimentLabel, marketSnapshots, themes, tradeSetups, overallSentiment, publicArticles, options.previousDigest, dailyLead);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const archiveSummary = archiveSummaryForDigest(date, publicArticles, themes, options.previousDigest, dailyLead);
  const deskNote = deskNoteForDigest(date, publicArticles, tradeSetups, marketSnapshots, overallSentiment, options.previousDigest, dailyLead);
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

  return {
    scriptId: 1,
    digestDate: date,
    title: script.title,
    status: "DRAFT",
    generatedAt,
    dailyLead,
    publicSourceSelection,
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

export function newsArticleJsonLd(digest) {
  const canonicalPath = String(digest.canonicalPath || `/${digest.digestDate}/`);
  const canonicalUrl = `https://marketnarrative.in${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;
  const description = digest.archiveSummary || digest.deskNote || "Daily Market Narrative pre-market briefing for Nifty, Bank Nifty, global cues, and India read-through.";
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: digest.title,
    description,
    image: "https://marketnarrative.in/og-card.svg",
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
  const force = dailyLead?.label || dominantForceLabel(lead, headline);
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
  const shortlist = uniqueSourceArticles(articles)
    .filter((article) => isWithinDigestWindow(article, date, 24))
    .sort((left, right) => sourceSelectionScore(right, date, marketSnapshots) - sourceSelectionScore(left, date, marketSnapshots))
    .slice(0, 25);
  const indiaLinked = shortlist.filter(hasIndiaReadThrough);
  const visiblePool = indiaLinked.length >= MIN_PUBLIC_SOURCE_COUNT ? indiaLinked : shortlist;
  const targetCount = Math.min(PUBLIC_SOURCE_LIMIT, visiblePool.length);
  const visibleArticles = diverseVisibleArticles(visiblePool, targetCount, { preferIndiaSources: true });
  if (visibleArticles.length < MIN_PUBLIC_SOURCE_COUNT) {
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
  const ranked = uniqueSourceArticles(articles)
    .map((article, index) => ({
      article,
      index,
      score: dailyLeadScore(article, date, marketSnapshots)
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index);
  const lead = ranked.find((item) => hasIndiaReadThrough(item.article) && !isLeadSuppressedArticle(item.article))?.article
    ?? ranked.find((item) => hasIndiaReadThrough(item.article))?.article
    ?? ranked[0]?.article
    ?? null;
  const support = ranked.find((item) => item.article !== lead && Number(item.article.sentimentScore) > 0.05 && hasIndiaReadThrough(item.article))?.article;
  const risk = ranked.find((item) => item.article !== lead && Number(item.article.sentimentScore) < -0.05 && hasIndiaReadThrough(item.article))?.article;
  const driverType = driverTypeForArticle(lead);
  const indirectLead = hasIndirectIndiaImpact(lead);
  const leadImpact = dailyLeadImpact(lead);
  const leadText = articleTextForLead(lead);
  return {
    label: indiaFuelForexPolicyText(leadText)
      ? "India fuel / forex stress"
      : indirectLead && driverType === "crude" ? "Crude supply watch" : driverLabelForType(driverType),
    sourceArticleId: articleLeadId(lead),
    driverType,
    headline: lead?.headline || "Source-led market cue",
    indiaImpact: leadImpact,
    riskSide: risk ? cleanLeadImpact(risk.indiaImpact) : defaultRiskSide(driverType, leadImpact),
    supportSide: cleanSentence(support?.indiaImpact || defaultSupportSide(driverType))
  };
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
  return selected;
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
  return /\b(moneycontrol|livemint|mint|business-standard|financialexpress|economic-times|economictimes|etmarkets|nseindia|bseindia|rbi\.org|sebi\.gov|thehindubusinessline|businessline)\b/.test(text);
}

function isOfficialIndiaSourceArticle(article) {
  const text = `${article?.sourceName || ""} ${article?.sourceId || ""} ${article?.sourceUrl || ""}`.toLowerCase();
  return /\b(nseindia|bseindia|sebi\.gov|rbi\.org|pib\.gov|mca\.gov|finmin|dea\.gov)\b/.test(text);
}

function isDomesticCatalystArticle(article) {
  const text = `${article?.headline || ""} ${article?.summary || ""} ${article?.takeaway || ""} ${article?.indiaImpact || ""} ${article?.watchFor || ""} ${article?.entityName || ""} ${article?.sourceName || ""} ${article?.sourceUrl || ""}`.toLowerCase();
  return hasIndiaReadThrough(article) &&
    (isOfficialIndiaSourceArticle(article) || isIndiaPublisherArticle(article)) &&
    /\b(nifty|bank nifty|nse|bse|sebi|rbi|fii|dii|fpi|rupee|usd\/inr|india|indian|banks?|nbfc|omc|bpcl|hpcl|iocl|tcs|infosys|wipro|hcltech|reliance|hdfc|icici|sbi|earnings|results|filing|policy|circular)\b/.test(text);
}

function indiaSourceScore(article, date) {
  const text = `${article?.headline || ""} ${article?.summary || ""} ${article?.takeaway || ""} ${article?.indiaImpact || ""} ${article?.watchFor || ""} ${article?.entityName || ""}`.toLowerCase();
  let score = Math.abs(Number(article?.sentimentScore) || 0) * 5 + (Number(article?.entityMatchScore) || 0);
  if (isIndiaPublisherArticle(article)) score += 9;
  if (hasIndiaReadThrough(article)) score += 8;
  if (["macro_negative", "global_risk"].includes(article?.category)) score += 4;
  if (["sector_positive", "macro_positive", "sector_negative"].includes(article?.category)) score += 3;
  if (/\b(nifty|bank nifty|india|indian|rupee|omc|bpcl|hpcl|iocl|aviation|banks|nbfc|it exporters|nifty it)\b/.test(text)) score += 6;
  if (/\b(crude|oil|brent|opec|hormuz|fed|rates?|yields?|inflation|dollar|dxy|usd\/inr|nasdaq|semiconductor|chip|ai)\b/.test(text)) score += 4;
  if (crudeGeopoliticalText(text)) score += 8;
  if (indiaFuelForexPolicyText(text)) score += 10;
  if (marketwideStressText(text)) score += 7;
  if (isStockLiveblogArticle(article)) score -= hasMarketwideDriverText(text) ? 8 : 16;
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
  let score = indiaSourceScore(article, date)
    + marketLeadScore(article) * 1.35
    + indiaAudienceScore(article) * 1.4
    + marketDriverSeverityScore(article, marketSnapshots)
    + sourceQualityScore(article);
  if (isLeadSuppressedArticle(article)) score -= 24;
  if (isStockLiveblogArticle(article) && !hasMarketwideDriverText(text)) score -= 18;
  if (isWeakStockListArticle(article) && !hasMarketwideDriverText(text)) score -= 12;
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
  const text = articleTextForLead(article);
  return (isStockLiveblogArticle(article) || isWeakStockListArticle(article)) && !hasMarketwideDriverText(text);
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
  return crudeGeopoliticalText(text) || indiaFuelForexPolicyText(text) || marketwideStressText(text) ||
    /\b(gift nifty|nifty futures|sensex|bank nifty|fii|dii|rupee|usd\/inr|brent|crude|yield|dxy|inflation|current account)\b/i.test(text);
}

function crudeGeopoliticalText(text) {
  const value = String(text || "").toLowerCase();
  return /\b(crude|oil|brent|hormuz|opec|energy supply|supply disruption)\b/.test(value) &&
    /\b(iran|trump|war|military|missile|strike|airstrike|conflict|geopolit|israel|red sea|sanctions|ceasefire|peace proposal|totally unacceptable)\b/.test(value);
}

function indiaFuelForexPolicyText(text) {
  const value = String(text || "").toLowerCase();
  return /\b(modi|narendra modi|pm modi|prime minister modi|indian prime minister|pmo|petroleum minister|hardeep singh puri|ministry of petroleum|government of india|indian government|centre)\b/.test(value) &&
    /\b(fuel|petrol|diesel|gasoline|gas|lpg|crude|oil|energy|foreign exchange|forex|current account|gold|foreign travel|work[-\s]?from[-\s]?home|remote work|conserve|conservation|import bill|oil imports?)\b/.test(value);
}

function marketwideStressText(text) {
  return /\b(sensex|nifty|bank nifty|indian equities|stock market|markets?)\b.*\b(falls?|fell|slumps?|tumbles?|crashes?|selloff|bloodbath|pressure|down)\b|\b(falls?|fell|slumps?|tumbles?|crashes?|selloff|bloodbath|pressure|down)\b.*\b(sensex|nifty|bank nifty|indian equities|stock market|markets?)\b/i.test(String(text || ""));
}

function driverTypeForArticle(article) {
  const text = `${article?.headline || ""} ${article?.summary || ""} ${article?.takeaway || ""} ${article?.indiaImpact || ""}`.toLowerCase();
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
    rates: "Rates / Fed path",
    currency: "Currency pressure",
    tech: "Global tech breadth",
    banks: "Bank Nifty breadth",
    asia: "Asia risk appetite",
    market: "Market breadth"
  }[type] || "Market breadth";
}

function articleLeadId(article) {
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
  const text = dailyLead?.indiaImpact || editorialLeadSentence(lead) || lead?.summary || lead?.headline || themes[0]?.summary || "Opening range needs confirmation from source-led market cues.";
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
  if (/\b(yield|bond|fed|rate|inflation)\b/.test(text)) score += 7;
  if (/\b(jobs day|payroll|employment|jobless|labor market)\b/.test(text)) score += 7;
  if (/\b(opec|production|output cut|output boost)\b/.test(text)) score += 7;
  if (/\b(nasdaq|s&p|dow|wall street|futures|stocks?|shares?)\b/.test(text)) score += 6;
  if (/\b(semiconductor|chip|chips|sox)\b/.test(text)) score += 5;
  if (/\b(tariff|trade|exports?|imports?)\b/.test(text)) score += 5;
  if (/\b(gst|sebi|pli|production[-\s]?linked incentive|union budget|finance ministry|mpc|stt|capital gains tax)\b/.test(text)) score += 6;
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
