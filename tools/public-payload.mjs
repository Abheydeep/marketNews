import { articleThumbnailMeta } from "./source-thumbnails.mjs";

export function publicDigestPayload(digest) {
  const {
    teleprompterScript,
    reelScript,
    asset,
    marketSnapshots,
    news,
    themes,
    tradeSetups,
    setupAudit,
    sourceDebug,
    rejectedSources,
    ...publicFields
  } = digest;

  const newsCards = (news ?? []).map(publicNewsCardDto);

  return {
    ...publicFields,
    dailyLead: publicDailyLeadDto(publicFields.dailyLead),
    status: "PUBLISHED",
    marketSnapshots: (marketSnapshots ?? []).map(publicMarketSnapshotDto),
    news: newsCards,
    newsCards,
    themes: (themes ?? []).map(publicThemeDto),
    tradeSetups: (tradeSetups ?? []).map(publicTradeSetupDto),
    setupAudit: (setupAudit ?? []).map(publicSetupAuditDto),
    sourceVerification: publicSourceVerification(publicFields.sourceVerification),
    sourceStats: sourceStats(news ?? []),
    asset: asset
      ? {
        sentimentLabel: asset.sentimentLabel,
        assetUrl: asset.assetUrl
      }
      : null
  };
}

export function redactedDigestPayload(digest) {
  const {
    teleprompterScript,
    reelScript,
    asset,
    news,
    setupAudit,
    sourceDebug,
    rejectedSources,
    ...publicFields
  } = digest;
  const newsCards = (news ?? []).map(publicNewsCardDto);

  return {
    ...publicFields,
    dailyLead: publicDailyLeadDto(publicFields.dailyLead),
    status: "PUBLISHED",
    news: (news ?? []).map(publicSourceArticleDto),
    newsCards,
    setupAudit: (setupAudit ?? []).map(publicSetupAuditDto),
    sourceVerification: publicSourceVerification(publicFields.sourceVerification),
    asset: asset
      ? {
        sentimentLabel: asset.sentimentLabel,
        assetUrl: asset.assetUrl
      }
      : null
  };
}

function publicDailyLeadDto(dailyLead) {
  if (!dailyLead || typeof dailyLead !== "object" || Array.isArray(dailyLead)) {
    return dailyLead;
  }
  const {
    selectionMethod,
    selectionReason,
    selectionConfidence,
    deterministicSourceArticleId,
    ...publicLead
  } = dailyLead;
  return publicLead;
}

function publicSourceVerification(verification) {
  if (!verification) {
    return undefined;
  }
  return {
    mode: verification.mode,
    verifiedArticleCount: verification.verifiedArticleCount,
    publisherCount: verification.publisherCount,
    categoryCount: verification.categoryCount,
    duplicateWithPreviousPercent: verification.duplicateWithPreviousPercent,
    blockedReason: verification.blockedReason ?? null,
    isVerifiedForPublicArchive: verification.isVerifiedForPublicArchive ?? !verification.blockedReason
  };
}

export function publicNewsCardDto(article) {
  return {
    title: article.headline,
    publisherName: article.sourceName,
    timestamp: article.publishedAt,
    sourceUrl: article.sourceUrl,
    thumbnailUrl: article.thumbnail?.url ?? thumbnailDataUrl(article),
    thumbnailAlt: article.thumbnail?.alt ?? article.headline,
    sentimentLabel: sentimentLabel(article.sentimentScore),
    category: article.category ?? "market"
  };
}

function publicSourceArticleDto(article) {
  return {
    publishedAt: article.publishedAt,
    sourceId: article.sourceId,
    sourceName: article.sourceName,
    headline: article.headline,
    summary: article.summary,
    takeaway: article.takeaway,
    whyItMatters: article.whyItMatters,
    indiaImpact: article.indiaImpact,
    watchFor: article.watchFor,
    sourceUrl: article.sourceUrl,
    sentimentLabel: sentimentLabel(article.sentimentScore),
    entityName: article.entityName,
    category: article.category ?? "market",
    thumbnail: article.thumbnail
  };
}

function thumbnailDataUrl(article) {
  const thumbnail = articleThumbnailMeta(article);
  const accent = safeHex(thumbnail.accent ?? article.thumbnail?.accent, Number(article.sentimentScore) >= 0 ? "#059669" : "#dc2626");
  const label = escapeSvg(thumbnail.label ?? article.thumbnail?.label ?? article.entityName ?? "Market");
  const theme = escapeSvg(String(thumbnail.theme ?? article.thumbnail?.theme ?? article.category ?? "Market").replaceAll("_", " "));
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">',
    '<defs>',
    '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">',
    `<stop offset="0" stop-color="${accent}" stop-opacity="0.92"/>`,
    '<stop offset="0.58" stop-color="#0f172a" stop-opacity="0.96"/>',
    '<stop offset="1" stop-color="#020617"/>',
    '</linearGradient>',
    '</defs>',
    '<rect width="640" height="360" fill="url(#g)"/>',
    '<circle cx="540" cy="78" r="118" fill="#ffffff" opacity="0.08"/>',
    '<path d="M40 286 C150 224 214 252 306 184 S470 94 600 132" fill="none" stroke="#f8fafc" stroke-width="18" stroke-linecap="round" opacity="0.24"/>',
    '<path d="M40 286 C150 224 214 252 306 184 S470 94 600 132" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.82"/>',
    `<text x="42" y="72" fill="#e5e7eb" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="3">${theme}</text>`,
    `<text x="42" y="156" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="54" font-weight="900">${label}</text>`,
    '</svg>'
  ].join("");
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function publicMarketSnapshotDto(snapshot) {
  return {
    symbol: snapshot.symbol,
    name: snapshot.name,
    closeValue: snapshot.closeValue,
    previousClose: snapshot.previousClose,
    changePercent: snapshot.changePercent,
    currency: snapshot.currency ?? null,
    marketRegion: snapshot.marketRegion,
    country: snapshot.country ?? null,
    session: snapshot.session,
    dataQuality: snapshot.dataQuality ?? "published",
    dataTimestamp: snapshot.dataTimestamp ?? null,
    yahooSymbol: snapshot.yahooSymbol ?? null,
    tradingViewSymbol: snapshot.tradingViewSymbol ?? null,
    chartPoints: Array.isArray(snapshot.chartPoints) && snapshot.chartPoints.length >= 2
      ? snapshot.chartPoints.map((p) => ({ time: p.time, close: p.close }))
      : synthesizePublicChartPoints(snapshot)
  };
}

function synthesizePublicChartPoints(snapshot) {
  const latest = Number(snapshot?.closeValue);
  if (!Number.isFinite(latest) || latest <= 0) return [];
  const changePercent = Number(snapshot?.changePercent || 0);
  const previous = Number(snapshot?.previousClose) || (latest / (1 + changePercent / 100));
  const symbol = String(snapshot?.symbol || "INDEX");
  const drift = latest - previous, seed = [...symbol].reduce((s, c) => s + c.charCodeAt(0), 0);
  const amp = Math.max(Math.abs(latest) * 0.0008, Math.abs(drift) * 0.35, 0.01);
  const end = snapshot?.dataTimestamp ? Date.parse(snapshot.dataTimestamp) : Date.now();
  return Array.from({ length: 24 }, (_, i) => {
    const p = i / 23, time = new Date(end - (23 - i) * 900000).toISOString();
    if (i === 0) return { time, close: Number(previous.toFixed(2)) };
    if (i === 23) return { time, close: Number(latest.toFixed(2)) };
    const wave = Math.sin((p * 2.4 + seed / 17) * Math.PI) * amp * (1 - p * 0.35);
    return { time, close: Number((previous + drift * p + wave).toFixed(2)) };
  });
}

function publicThemeDto(theme) {
  return { title: theme.title, tone: theme.tone, summary: theme.summary, affectedSymbols: theme.affectedSymbols ?? [], sourceCount: theme.sourceCount ?? 0 };
}

function publicTradeSetupDto(setup) {
  return {
    symbol: setup.symbol, direction: setup.direction, entry: setup.entry, stopLoss: setup.stopLoss, target: setup.target,
    riskReward: setup.riskReward, confidenceReason: setup.confidenceReason, invalidationReason: setup.invalidationReason, outcome: setup.outcome ?? null
  };
}

function publicSetupAuditDto(item) {
  return {
    symbol: item.symbol, direction: item.direction, status: item.status, reason: item.reason, currentPrice: item.currentPrice ?? null,
    entry: item.entry, stopLoss: item.stopLoss, target: item.target, riskReward: item.riskReward, remainingRiskReward: item.remainingRiskReward ?? null
  };
}

function sourceStats(articles) {
  return { articleCount: articles.length, publisherCount: new Set(articles.map((a) => a.sourceName).filter(Boolean)).size };
}

function sentimentLabel(score) {
  if (Number(score) <= -0.2) return "negative";
  if (Number(score) >= 0.2) return "positive";
  return "neutral";
}

function round(value, places) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(places)) : 0;
}

function safeHex(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value ?? "")) ? value : fallback;
}

function escapeSvg(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
