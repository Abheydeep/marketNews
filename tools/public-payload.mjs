export function publicDigestPayload(digest) {
  const {
    teleprompterScript,
    reelScript,
    asset,
    marketSnapshots,
    news,
    themes,
    tradeSetups,
    ...publicFields
  } = digest;

  const newsCards = (news ?? []).map(publicNewsCardDto);

  return {
    ...publicFields,
    marketSnapshots: (marketSnapshots ?? []).map(publicMarketSnapshotDto),
    news: newsCards,
    newsCards,
    themes: (themes ?? []).map(publicThemeDto),
    tradeSetups: (tradeSetups ?? []).map(publicTradeSetupDto),
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
    ...publicFields
  } = digest;

  return {
    ...publicFields,
    asset: asset
      ? {
        sentimentLabel: asset.sentimentLabel,
        assetUrl: asset.assetUrl
      }
      : null
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
    sentimentScore: round(article.sentimentScore, 3),
    category: article.category ?? "market"
  };
}

function thumbnailDataUrl(article) {
  const accent = safeHex(article.thumbnail?.accent, Number(article.sentimentScore) >= 0 ? "#059669" : "#dc2626");
  const label = escapeSvg(article.thumbnail?.label ?? article.entityName ?? "Market");
  const theme = escapeSvg(String(article.thumbnail?.theme ?? article.category ?? "Market").replaceAll("_", " "));
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
    chartPoints: Array.isArray(snapshot.chartPoints)
      ? snapshot.chartPoints.map((point) => ({
        time: point.time,
        close: point.close
      }))
      : undefined
  };
}

function publicThemeDto(theme) {
  return {
    title: theme.title,
    tone: theme.tone,
    summary: theme.summary,
    affectedSymbols: theme.affectedSymbols ?? [],
    sourceCount: theme.sourceCount ?? 0
  };
}

function publicTradeSetupDto(setup) {
  return {
    symbol: setup.symbol,
    direction: setup.direction,
    entry: setup.entry,
    stopLoss: setup.stopLoss,
    target: setup.target,
    riskReward: setup.riskReward,
    confidenceReason: setup.confidenceReason,
    invalidationReason: setup.invalidationReason,
    outcome: setup.outcome ?? null
  };
}

function sourceStats(articles) {
  return {
    articleCount: articles.length,
    publisherCount: new Set(articles.map((article) => article.sourceName).filter(Boolean)).size
  };
}

function sentimentLabel(score) {
  if (Number(score) <= -0.2) {
    return "negative";
  }
  if (Number(score) >= 0.2) {
    return "positive";
  }
  return "neutral";
}

function round(value, places) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Number(number.toFixed(places));
}

function safeHex(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value ?? "")) ? value : fallback;
}

function escapeSvg(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
