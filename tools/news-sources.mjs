export const NEWS_DATA_MODES = new Set(["live", "fixture"]);

const MIN_VERIFIED_ARTICLES = 8;
const MIN_SOURCE_CATEGORY_BUCKETS = 4;
const MAX_DUPLICATE_WITH_PREVIOUS_PERCENT = 55;
const MARKET_RELEVANCE_PATTERN = /\b(market|markets|stock|stocks|share|shares|equity|equities|nifty|sensex|bank|banks|banking|yield|yields|bond|bonds|rate|rates|fed|rbi|inflation|deficit|rupee|dollar|currency|forex|oil|crude|brent|gold|commodity|commodities|futures|nasdaq|dow|s&p|wall street|asia|china|japan|korea|taiwan|hk|hong kong|berkshire|buffett|earnings|revenue|profit|margin|guidance|tariff|trade|export|import|gdp|economy|economic|liquidity|fund|funds|mutual|sip|fii|dii|capex|manufacturing|semiconductor|ai|tech|it|software|airline|airlines|energy|power|auto|autos|realty|metal|metals|pharma|fmcg|consumer)\b/i;
const STRICT_MARKET_RELEVANCE_PATTERN = /\b(markets?|stocks?|shares?|equities|indices|nifty|sensex|bank\s+nifty|yields?|bonds?|rates?|fed|rbi|inflation|rupee|dollar|currency|forex|oil|crude|brent|gold|commodit(?:y|ies)|futures|nasdaq|dow|s&p|wall street|earnings|revenue|profit|margin|guidance|tariff|trade|exports?|imports?|gdp|econom(?:y|ic)|liquidity|mutual|sip|fii|dii|capex|manufacturing|semiconductor|software|airlines?|energy|power|autos?|realty|metals?|pharma|fmcg|valuation|volatility|options?)\b/i;
const DIRECT_MARKET_MOVING_PATTERN = /\b(stocks?|shares?|listed|publicly traded|market cap|earnings|revenue|profit|guidance|ipo|bonds?|yields?|rates?|tariff|oil|crude|brent|inflation|fed|rbi|rupee|dollar|futures|wall street|nasdaq|s&p|dow)\b/i;
const OFF_TOPIC_WITHOUT_MARKET_PATTERN = /\b(assassination|murder|suicide|crime|celebrity|movie|sports|football|baseball|recipe|travel|museum|gallery|exhibition|polls?|election|campaign|senate|house of representatives)\b/i;
const OFF_TOPIC_ALWAYS_PATTERN = /\b(kentucky derby|pickleball|nfl|nba|sports capital|prediction market platforms?|netflix|hair loss|weight loss)\b/i;
const LEGAL_POLITICAL_WITHOUT_POLICY_PATTERN = /\b(attorney|lawsuit|legal strateg(?:y|ies)|probe|investigation|deadline|subpoena|court|criminal|civil case)\b/i;
const MARKET_POLICY_PATTERN = /\b(rate|rates|yield|yields|bond|bonds|inflation|policy|fomc|cut|hike|guidance|liquidity|market|markets|stocks?|futures)\b/i;
const LOW_SIGNAL_MARKET_CONTENT_PATTERN = /\b(good stock to buy now|stock pick with huge upside|billionaire .* stock pick|social security|honey pot|numbers don['’]t lie|scotch whisky|king charles|spirit airlines|lawyers? to the wealthy|lazy millionaire|retirement|top wall street analysts|long-term prospects|greg abel|berkshire|chipotle|paypal|venmo|plane tickets?|air travelers?|credit score|medical appointments?|patients who died|sell in may|flip a coin|paramount|hollywood|films annually|anthropic is still blacklisted)\b/i;

const LIVE_FEEDS = [
  {
    sourceName: "CNBC Markets",
    sourceId: "cnbc-markets",
    type: "rss",
    categoryHint: "global_risk",
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html"
  },
  {
    sourceName: "CNBC Business",
    sourceId: "cnbc-business",
    type: "rss",
    categoryHint: "macro_positive",
    url: "https://www.cnbc.com/id/10001147/device/rss/rss.html"
  },
  {
    sourceName: "CNBC World",
    sourceId: "cnbc-world",
    type: "rss",
    categoryHint: "global_risk",
    url: "https://www.cnbc.com/id/100727362/device/rss/rss.html"
  },
  {
    sourceName: "CNBC Economy",
    sourceId: "cnbc-economy",
    type: "rss",
    categoryHint: "macro_negative",
    url: "https://www.cnbc.com/id/20910258/device/rss/rss.html"
  },
  {
    sourceName: "Yahoo Finance",
    sourceId: "yahoo-finance",
    type: "rss",
    categoryHint: "macro_positive",
    url: "https://finance.yahoo.com/news/rssindex"
  },
  {
    sourceName: "MarketWatch",
    sourceId: "marketwatch",
    type: "rss",
    categoryHint: "global_risk",
    url: "https://feeds.content.dowjones.io/public/rss/mw_topstories"
  },
  {
    sourceName: "Moneycontrol Source Page",
    sourceId: "moneycontrol-source-page",
    type: "moneycontrol-source-page",
    categoryHint: "sector_positive",
    url: "https://www.moneycontrol.com/features/rss/"
  }
];

const FIXTURE_TOPICS = [
  {
    date: "2026-04-29",
    topics: [
      ["Treasury yields firm before Asia open", "cnbc-markets", "CNBC Markets", "macro_negative"],
      ["Crude steadies as energy risk stays live", "moneycontrol-markets", "Moneycontrol Markets", "global_risk"],
      ["Gift Nifty points to a cautious start", "cnbc-business", "CNBC Business", "neutral_volatile"],
      ["Banks watch funding-cost commentary", "moneycontrol-banks", "Moneycontrol Banking", "sector_positive"],
      ["IT services brace for AI-led spending split", "cnbc-tech", "CNBC Technology", "sector_positive"],
      ["Rupee traders track dollar resilience", "moneycontrol-currency", "Moneycontrol Currency", "macro_negative"],
      ["Asia breadth weakens into the open", "cnbc-world", "CNBC World", "neutral_volatile"],
      ["Defensive sectors hold early leadership", "moneycontrol-sectors", "Moneycontrol Sectors", "macro_positive"],
      ["Bond desks watch RBI liquidity language", "cnbc-economy", "CNBC Economy", "macro_negative"],
      ["Metals react to China demand signals", "moneycontrol-commodities", "Moneycontrol Commodities", "global_risk"],
      ["FII flow data keeps index traders selective", "cnbc-markets", "CNBC Markets", "neutral_volatile"],
      ["Capex names stay in focus after order wins", "moneycontrol-markets", "Moneycontrol Markets", "sector_positive"],
      ["Global banks reprice rate-cut hopes", "cnbc-economy", "CNBC Economy", "macro_negative"],
      ["Domestic liquidity cushions index breadth", "moneycontrol-markets", "Moneycontrol Markets", "macro_positive"]
    ]
  },
  {
    date: "2026-04-30",
    topics: [
      ["Wall Street rotation lifts industrial cues", "cnbc-markets", "CNBC Markets", "macro_positive"],
      ["Oil premium eases but import risk remains", "moneycontrol-commodities", "Moneycontrol Commodities", "global_risk"],
      ["Gift Nifty signals a range-bound open", "cnbc-business", "CNBC Business", "neutral_volatile"],
      ["Private banks watch deposit growth trends", "moneycontrol-banks", "Moneycontrol Banking", "sector_positive"],
      ["Midcap IT sees selective bargain hunting", "cnbc-tech", "CNBC Technology", "sector_positive"],
      ["Dollar pullback helps emerging-market FX", "moneycontrol-currency", "Moneycontrol Currency", "macro_positive"],
      ["Asian futures split ahead of India open", "cnbc-world", "CNBC World", "neutral_volatile"],
      ["Consumption names wait for volume proof", "moneycontrol-sectors", "Moneycontrol Sectors", "macro_negative"],
      ["Bond yields cool after auction demand", "cnbc-economy", "CNBC Economy", "macro_positive"],
      ["Power equipment names track order pipeline", "moneycontrol-markets", "Moneycontrol Markets", "sector_positive"],
      ["FII selling narrows as domestic flows persist", "cnbc-markets", "CNBC Markets", "neutral_volatile"],
      ["Autos watch margin commentary after results", "moneycontrol-sectors", "Moneycontrol Sectors", "sector_positive"],
      ["US rate expectations steady before payrolls", "cnbc-economy", "CNBC Economy", "macro_negative"],
      ["Realty names wait for yield stability", "moneycontrol-sectors", "Moneycontrol Sectors", "macro_negative"]
    ]
  },
  {
    date: "2026-05-01",
    topics: [
      ["US futures pause after tech-led volatility", "cnbc-markets", "CNBC Markets", "neutral_volatile"],
      ["Crude spike keeps inflation hedge bid alive", "moneycontrol-commodities", "Moneycontrol Commodities", "global_risk"],
      ["Gift Nifty opens with a shallow discount", "cnbc-business", "CNBC Business", "neutral_volatile"],
      ["Bank Nifty watches credit-cost commentary", "moneycontrol-banks", "Moneycontrol Banking", "sector_positive"],
      ["IT reset remains a valuation watchlist", "cnbc-tech", "CNBC Technology", "sector_positive"],
      ["Rupee softness raises imported-inflation risk", "moneycontrol-currency", "Moneycontrol Currency", "macro_negative"],
      ["Asia cues stay mixed before domestic open", "cnbc-world", "CNBC World", "neutral_volatile"],
      ["Renewables and capital goods keep order focus", "moneycontrol-markets", "Moneycontrol Markets", "sector_positive"],
      ["G-sec yield near seven percent resets hurdle rates", "cnbc-economy", "CNBC Economy", "macro_negative"],
      ["Defence suppliers track execution discipline", "moneycontrol-sectors", "Moneycontrol Sectors", "sector_positive"],
      ["Global risk appetite waits for Fed language", "cnbc-markets", "CNBC Markets", "global_risk"],
      ["Domestic SIP flows keep breadth resilient", "moneycontrol-markets", "Moneycontrol Markets", "macro_positive"],
      ["Treasury volatility keeps duration risk elevated", "cnbc-economy", "CNBC Economy", "macro_negative"],
      ["FMCG awaits rural-demand confirmation", "moneycontrol-sectors", "Moneycontrol Sectors", "neutral_volatile"]
    ]
  }
];

const THUMBNAIL_BY_CATEGORY = {
  macro_negative: { label: "Macro", theme: "Macro Pressure", accent: "#dc2626" },
  macro_positive: { label: "India", theme: "Domestic Support", accent: "#059669" },
  sector_positive: { label: "Sector", theme: "Sector Rotation", accent: "#2563eb" },
  sector_negative: { label: "Sector", theme: "Sector Pressure", accent: "#b45309" },
  global_risk: { label: "Risk", theme: "Global Risk", accent: "#7c3aed" },
  neutral_volatile: { label: "Range", theme: "Asia Volatility", accent: "#0891b2" }
};

export async function resolveNewsArticles(date, options = {}) {
  const mode = normalizeNewsMode(options.mode ?? process.env.NEWS_DATA_MODE ?? "fixture");
  const articles = mode === "live"
    ? await fetchLiveNewsArticles(date, options)
    : fixtureNewsArticles(date, options.seedNews ?? []);
  const verification = verifySourceArticles(articles, {
    mode,
    previousDigest: options.previousDigest
  });
  assertSourceVerification(verification);
  return { articles, sourceVerification: publicSourceVerification(verification) };
}

export function normalizeNewsMode(value) {
  const mode = String(value ?? "fixture").toLowerCase();
  if (!NEWS_DATA_MODES.has(mode)) {
    throw new Error(`Unsupported NEWS_DATA_MODE "${value}". Use live or fixture.`);
  }
  return mode;
}

export async function fetchLiveNewsArticles(date, options = {}) {
  const fetcher = options.fetcher ?? fetch;
  const feedResults = [];
  for (const feed of LIVE_FEEDS) {
    try {
      if (feed.type === "rss") {
        const xml = await fetchText(feed.url, fetcher);
        feedResults.push(...parseRssItems(xml).map((item) => normalizeLiveArticle(date, feed, item)));
      } else if (feed.type === "moneycontrol-source-page") {
        const html = await fetchText(feed.url, fetcher);
        const moneycontrolFeeds = moneycontrolFeedUrls(html).slice(0, 6);
        for (const rssUrl of moneycontrolFeeds) {
          const xml = await fetchText(rssUrl, fetcher);
          feedResults.push(...parseRssItems(xml).map((item) => normalizeLiveArticle(date, {
            ...feed,
            sourceName: moneycontrolSourceName(rssUrl),
            sourceId: `moneycontrol-${slugify(moneycontrolSourceName(rssUrl))}`,
            url: rssUrl
          }, item)));
        }
      }
    } catch (error) {
      if (options.strictFetch) {
        throw error;
      }
    }
  }
  const verifiedArticles = dedupeArticles(feedResults)
    .filter((article) => sourceUrlLooksArticleLevel(article.sourceUrl))
    .filter(articleLooksMarketRelevant)
    .filter((article) => articleIsFreshForDigest(article, date));
  return selectDiverseArticles(verifiedArticles, 24);
}

export function fixtureNewsArticles(date, seedNews = []) {
  const template = fixtureTemplateForDate(date);
  return template.map(([headline, sourceId, sourceName, category], index) => {
    const seed = seedNews[index % Math.max(seedNews.length, 1)] ?? {};
    const sentimentScore = Number.isFinite(Number(seed.sentimentScore))
      ? adjustedSentiment(Number(seed.sentimentScore), category)
      : categorySentiment(category);
    const entityName = entityForHeadline(headline, category);
    return {
      publishedAt: `${date}T${fixtureTime(index)}+05:30`,
      sourceId,
      sourceName,
      headline,
      summary: fixtureSummary(headline, category),
      takeaway: fixtureTakeaway(headline, category),
      whyItMatters: fixtureWhyItMatters(headline, category),
      indiaImpact: fixtureIndiaImpact(headline, category),
      watchFor: fixtureWatchFor(headline, category),
      thumbnail: normalizeThumbnail({ ...THUMBNAIL_BY_CATEGORY[category], alt: `${headline} source thumbnail` }),
      sourceUrl: fixtureArticleUrl(date, sourceName, headline, index),
      sentimentScore,
      entityName,
      entityMatchScore: Number(seed.entityMatchScore ?? 0.78),
      category
    };
  });
}

export function verifySourceArticles(articles, options = {}) {
  const mode = normalizeNewsMode(options.mode ?? "fixture");
  const verified = (articles ?? []).filter((article) =>
    sourceUrlLooksArticleLevel(article.sourceUrl) && articleLooksMarketRelevant(article)
  );
  const publisherCount = new Set(verified.map((article) => article.sourceName).filter(Boolean)).size;
  const categoryCount = new Set(verified.map((article) => article.category).filter(Boolean)).size;
  const sourceCategoryBucketCount = new Set(
    verified.map((article) => `${article.sourceName || "source"}::${article.category || "market"}`)
  ).size;
  const duplicateWithPreviousPercent = overlapWithPreviousPercent(verified, options.previousDigest);
  const duplicateWithinCurrentPercent = duplicateWithinCurrentPercentForArticles(verified);

  const blockedReason = firstBlockedReason({
    verifiedArticleCount: verified.length,
    sourceCategoryBucketCount,
    duplicateWithPreviousPercent,
    duplicateWithinCurrentPercent
  });

  return {
    mode,
    verifiedArticleCount: verified.length,
    publisherCount,
    categoryCount,
    duplicateWithPreviousPercent,
    blockedReason,
    isVerifiedForPublicArchive: !blockedReason
  };
}

export function assertSourceVerification(verification) {
  if (verification.blockedReason) {
    throw new Error(`Source verification failed: ${verification.blockedReason}`);
  }
}

export function publicSourceVerification(verification) {
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

export function articleLooksMarketRelevant(article) {
  const titleText = [article?.headline, article?.title].filter(Boolean).join(" ");
  const text = [
    article?.headline,
    article?.title,
    article?.summary
  ].filter(Boolean).join(" ");
  if (!text.trim()) {
    return false;
  }
  if (OFF_TOPIC_ALWAYS_PATTERN.test(text) && !DIRECT_MARKET_MOVING_PATTERN.test(text)) {
    return false;
  }
  if (OFF_TOPIC_WITHOUT_MARKET_PATTERN.test(titleText) && !STRICT_MARKET_RELEVANCE_PATTERN.test(text)) {
    return false;
  }
  if (LEGAL_POLITICAL_WITHOUT_POLICY_PATTERN.test(text) && !MARKET_POLICY_PATTERN.test(text)) {
    return false;
  }
  if (LOW_SIGNAL_MARKET_CONTENT_PATTERN.test(text)) {
    return false;
  }
  if (MARKET_RELEVANCE_PATTERN.test(text)) {
    return true;
  }
  return !OFF_TOPIC_WITHOUT_MARKET_PATTERN.test(text) && /(business|economy|finance|company|corporate|investor|investment)/i.test(text);
}

export function sourceUrlLooksArticleLevel(value) {
  let url;
  try {
    url = new URL(String(value ?? ""));
  } catch {
    return false;
  }
  if (!/^https?:$/.test(url.protocol)) {
    return false;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = url.pathname.replace(/\/+$/, "").toLowerCase();
  if (!path || path === "/") {
    return false;
  }
  if (host.includes("rsscatalog.com")) {
    return false;
  }
  if (path.includes("rss.cms") || path.includes("/rss/") || path.endsWith("/rss")) {
    return false;
  }
  const sectionPatterns = [
    /^\/markets?$/,
    /^\/markets?\/(rates-bonds|commodities|stocks|indices)?$/,
    /^\/business$/,
    /^\/finance$/,
    /^\/economy$/,
    /^\/news$/,
    /^\/world-top-news$/,
    /^\/asia$/,
    /^\/features\/rss$/,
    /^\/id\/\d+\/device\/rss\/rss\.html$/
  ];
  if (sectionPatterns.some((pattern) => pattern.test(path))) {
    return false;
  }
  const segments = path.split("/").filter(Boolean);
  if (segments.length < 2) {
    return false;
  }
  if (host.includes("marketwatch.com") && /^\/story\//.test(path)) {
    return true;
  }
  if (host.includes("finance.yahoo.com") && /^\/news\//.test(path)) {
    return true;
  }
  return (
    /\.html?$/.test(path) ||
    /\/\d{4}\/\d{2}\/\d{2}\//.test(path) ||
    /[_-]\d{5,}(?:\.|$)/.test(path) ||
    segments.length >= 4
  );
}

export function normalizedSourceFingerprint(article) {
  const title = normalizeTitle(article?.headline ?? article?.title ?? "");
  const urlKey = normalizeSourceUrl(article?.sourceUrl ?? "");
  return `${title}::${urlKey}`;
}

function firstBlockedReason({ verifiedArticleCount, sourceCategoryBucketCount, duplicateWithPreviousPercent, duplicateWithinCurrentPercent }) {
  if (verifiedArticleCount < MIN_VERIFIED_ARTICLES) {
    return `only ${verifiedArticleCount} verified article links; need at least ${MIN_VERIFIED_ARTICLES}`;
  }
  if (sourceCategoryBucketCount < MIN_SOURCE_CATEGORY_BUCKETS) {
    return `only ${sourceCategoryBucketCount} source/category buckets; need at least ${MIN_SOURCE_CATEGORY_BUCKETS}`;
  }
  if (duplicateWithPreviousPercent > MAX_DUPLICATE_WITH_PREVIOUS_PERCENT) {
    return `${duplicateWithPreviousPercent}% headline/source overlap with the previous digest`;
  }
  if (duplicateWithinCurrentPercent > 25) {
    return `${duplicateWithinCurrentPercent}% duplicate headline/source overlap inside the current source stack`;
  }
  return null;
}

function fixtureTemplateForDate(date) {
  const exact = FIXTURE_TOPICS.find((item) => item.date === date);
  if (exact) {
    return exact.topics;
  }
  const index = Math.abs(hashString(date)) % FIXTURE_TOPICS.length;
  return FIXTURE_TOPICS[index].topics.map(([headline, ...rest]) => [
    `${headline} for ${readableDate(date)}`,
    ...rest
  ]);
}

function fixtureArticleUrl(date, sourceName, headline, index) {
  const slug = slugify(headline);
  const [year, month, day] = date.split("-");
  if (sourceName.toLowerCase().includes("moneycontrol")) {
    return `https://www.moneycontrol.com/news/business/markets/${slug}_${year}${month}${day}${String(index + 1).padStart(2, "0")}.html`;
  }
  return `https://www.cnbc.com/${year}/${month}/${day}/${slug}.html`;
}

function fixtureTime(index) {
  const hour = 5 + Math.floor(index / 4);
  const minute = (index * 7) % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

function fixtureSummary(headline, category) {
  return `${headline}. The item is tracked as ${categoryLabel(category)} evidence for the India pre-market read.`;
}

function fixtureTakeaway(headline, category) {
  return `${headline} shapes the opening bias through ${categoryLabel(category).toLowerCase()} conditions.`;
}

function fixtureWhyItMatters(headline, category) {
  return `${headline} matters because it changes the weight given to ${categoryLabel(category).toLowerCase()} before the cash open.`;
}

function fixtureIndiaImpact(headline, category) {
  if (category === "global_risk" || category === "macro_negative") {
    return `${headline} can pressure rate-sensitive and import-linked pockets unless domestic breadth absorbs the shock.`;
  }
  if (category === "sector_positive" || category === "macro_positive") {
    return `${headline} can support selective Indian sectors if opening breadth confirms the read.`;
  }
  return `${headline} keeps Nifty and Bank Nifty in a confirmation-first opening range.`;
}

function fixtureWatchFor(headline, category) {
  if (category.includes("macro")) {
    return "Watch bond yields, rupee movement, and opening breadth.";
  }
  if (category.includes("sector")) {
    return "Watch sector leadership and follow-through after the first 30 minutes.";
  }
  return "Watch whether Asia cues persist into the Indian cash open.";
}

function adjustedSentiment(seedScore, category) {
  const categoryScore = categorySentiment(category);
  return round((seedScore * 0.45) + (categoryScore * 0.55), 3);
}

function categorySentiment(category) {
  return {
    macro_negative: -0.55,
    global_risk: -0.42,
    neutral_volatile: -0.08,
    sector_positive: 0.35,
    macro_positive: 0.4,
    sector_negative: -0.35
  }[category] ?? 0;
}

export function normalizeLiveArticle(date, feed, item) {
  const headline = cleanText(item.title);
  const summary = cleanText(item.summary);
  const analysisText = `${headline} ${summary}`;
  const category = categoryFromText(analysisText, feed.categoryHint);
  const sourceName = feed.sourceName;
  const url = item.link || item.guid || feed.url;
  const publishedAt = isoTimestampForArticle(date, item.publishedAt);
  const entityName = entityForHeadline(analysisText, category);
  const sentimentScore = sentimentFromText(analysisText, category);
  return {
    publishedAt,
    sourceId: feed.sourceId,
    sourceName,
    headline,
    summary: summary || `${headline}.`,
    takeaway: takeawayFromArticle(headline, summary, category, entityName),
    whyItMatters: whyItMattersFromArticle(headline, summary, category, entityName),
    indiaImpact: indiaImpactFromArticle(headline, summary, category, entityName),
    watchFor: watchForFromArticle(headline, summary, category, entityName),
    thumbnail: normalizeThumbnail({ ...THUMBNAIL_BY_CATEGORY[category], alt: `${headline} source thumbnail` }),
    sourceUrl: normalizeSourceUrl(url),
    sentimentScore,
    entityName,
    entityMatchScore: entityMatchScoreFromText(analysisText, entityName),
    category
  };
}

function categoryFromText(text, fallback) {
  const value = text.toLowerCase();
  if (/\b(boe|bank of england|central bank|governor bailey)\b/.test(value)) {
    return "macro_negative";
  }
  if (/(oil|crude|war|geopolitical|tariff|yen|dollar|currency|risk|volatility)/.test(value)) {
    return "global_risk";
  }
  if (/\b(airline|airlines|spirit|travel|shutdown|shut down|bankrupt|bailout|cuts|cost surge|failing|deductible|pressure|losses)\b/.test(value)) {
    return "sector_negative";
  }
  if (/\b(s&p|nasdaq|dow|rallies|rally|wall street|analyst|berkshire|buffett|stocks?|record high|long-term prospects)\b/.test(value)) {
    return "macro_positive";
  }
  if (/\b(yield|yields|bond|bonds|inflation|rate|rates|fed|rbi|deficit|rupee|powell)\b/.test(value)) {
    return "macro_negative";
  }
  if (/\b(bank|banks|banking|financial|financials|credit|deposit|loan|nbfc)\b/.test(value)) {
    return "sector_positive";
  }
  if (/\b(indian it|it services|nifty it|infosys|tcs|wipro|hcltech|tech mahindra|tech|ai|software|semiconductor|digital)\b/.test(value)) {
    return "sector_positive";
  }
  if (/\b(growth|domestic|demand|sip|mutual fund|capex|manufacturing)\b/.test(value)) {
    return "macro_positive";
  }
  return fallback ?? "neutral_volatile";
}

function articleIsFreshForDigest(article, digestDate) {
  const published = Date.parse(article.publishedAt);
  const digestTime = Date.parse(`${digestDate}T07:15:00+05:30`);
  if (!Number.isFinite(published) || !Number.isFinite(digestTime)) {
    return true;
  }
  const ageHours = (digestTime - published) / (60 * 60 * 1000);
  return ageHours <= 120 && ageHours >= -48;
}

function takeawayFromArticle(headline, summary, category, entityName) {
  const lower = `${headline} ${summary}`.toLowerCase();
  const fact = articleFactSentence(headline, summary);
  if (/\b(oil|crude|brent|energy supply)\b/.test(lower)) {
    return compactWords(`${fact}; ${oilReadthrough(lower).takeaway}`, 35);
  }
  if (/\b(fed|yield|bond|rate|inflation|powell|boe|bank of england|central bank|governor bailey)\b/.test(lower)) {
    return compactWords(`${fact}; ${ratesReadthrough(lower).takeaway}`, 35);
  }
  if (/\b(tariff|trade|exports?|imports?)\b/.test(lower)) {
    return compactWords(`${fact}; ${tradeReadthrough(lower).takeaway}`, 35);
  }
  if (/\b(earnings|revenue|profit|guidance|results?)\b/.test(lower)) {
    return compactWords(`${fact}; ${earningsReadthrough(lower, entityName).takeaway}`, 35);
  }
  if (/\b(airline|airlines|spirit)\b/.test(lower)) {
    return compactWords(`${fact}; ${aviationReadthrough(lower).takeaway}`, 35);
  }
  if (/\b(ai|semiconductor|software|alphabet|nvidia|tech)\b/.test(lower)) {
    return compactWords(`${fact}; ${techReadthrough(lower, entityName).takeaway}`, 35);
  }
  if (category === "macro_positive") {
    return compactWords(`${fact}; keep the read-through to risk appetite until Indian breadth confirms after the opening range.`, 35);
  }
  if (category === "sector_negative") {
    return compactWords(`${fact}; keep it as a sector warning unless related Indian names weaken and breadth confirms the same pressure.`, 35);
  }
  return compactWords(`${fact}; keep it as ${entityName} context unless a related Indian sector confirms the move.`, 35);
}

function whyItMattersFromArticle(headline, summary, category, entityName) {
  const lower = `${headline} ${summary}`.toLowerCase();
  if (/\b(oil|crude|brent)\b/.test(lower)) {
    return "India imports most of its crude, so the same story can pressure inflation expectations while helping upstream energy.";
  }
  if (/\b(fed|yield|bond|rate|inflation)\b/.test(lower)) {
    return "Rate-sensitive sectors need yield stability; without that, gap-up moves in high-duration names deserve skepticism.";
  }
  if (/\b(bank|credit|loan|deposit|jpmorgan|private credit)\b/.test(lower)) {
    return "Financial cues matter because Bank Nifty often decides whether a Nifty move becomes a trend or just a gap reaction.";
  }
  if (/\b(earnings|guidance|revenue|profit)\b/.test(lower)) {
    return "Earnings stories are useful only when they reveal margin, demand, or guidance that can travel to Indian peers.";
  }
  if (/\b(tariff|trade)\b/.test(lower)) {
    return "Trade headlines can split sectors; exporters, importers, and domestic cyclicals need separate confirmation.";
  }
  return `${entityName} matters because it can shift the first-hour balance between macro pressure and domestic breadth.`;
}

function indiaImpactFromArticle(headline, summary, category, entityName) {
  const lower = `${headline} ${summary}`.toLowerCase();
  if (hasNoDirectIndiaRead(lower, category)) {
    return "No direct India read-through for this story.";
  }
  if (/\b(oil|crude|brent)\b/.test(lower)) {
    return oilReadthrough(lower).indiaImpact;
  }
  if (/\b(fed|yield|bond|rate|inflation|powell|boe|bank of england|central bank|governor bailey)\b/.test(lower)) {
    return ratesReadthrough(lower).indiaImpact;
  }
  if (/\b(rupee|dollar|currency|yen|forex)\b/.test(lower)) {
    return "Bullish for IT exporters if rupee weakness is orderly, bearish for imported-cost sectors. Confirm with USD/INR and Nifty IT breadth.";
  }
  if (/\b(bank|credit|loan|deposit|jpmorgan|private credit)\b/.test(lower)) {
    return "Bank Nifty, private banks and NBFCs are the direct check; weak financial breadth can cap Nifty even if global cues are firm.";
  }
  if (/\b(ai|semiconductor|software|alphabet|nvidia|tech)\b/.test(lower)) {
    return techReadthrough(lower, entityName).indiaImpact;
  }
  if (/\b(pharma|health|lilly|drug|fda)\b/.test(lower)) {
    return "Nifty Pharma and healthcare can move independently of Nifty; bullish only if defensives lead beyond one stock.";
  }
  if (/\b(auto|vehicle|tariff|ev|tesla)\b/.test(lower)) {
    return "Nifty Auto and ancillaries need a separate read; tariff or demand news can hit exporters differently from domestic OEMs.";
  }
  if (/\b(airline|airlines|spirit|travel)\b/.test(lower)) {
    return aviationReadthrough(lower).indiaImpact;
  }
  if (category === "macro_positive") {
    return "Supportive for risk appetite only if Indian breadth confirms after the first 30 minutes.";
  }
  if (category === "sector_negative") {
    return "Treat this as a sector caution flag; index action needs confirmation from banks and breadth.";
  }
  return entityName === "Market"
    ? "No direct India read-through for this story."
    : `${entityName} is only a conditional India input; require first-range breadth before using it for trade bias.`;
}

function watchForFromArticle(headline, summary, category, entityName) {
  const lower = `${headline} ${summary}`.toLowerCase();
  if (hasNoDirectIndiaRead(lower, category)) {
    return "No specific watch for this article.";
  }
  if (/\b(oil|crude|brent)\b/.test(lower)) {
    return oilReadthrough(lower).watchFor;
  }
  if (/\b(fed|yield|bond|rate|inflation|boe|bank of england|central bank|governor bailey)\b/.test(lower)) {
    return ratesReadthrough(lower).watchFor;
  }
  if (/\b(rupee|dollar|currency|yen|forex)\b/.test(lower)) {
    return "Watch USD/INR near 84.20 and DXY in the first hour; pressure splits exporters from importers.";
  }
  if (/\b(bank|credit|loan|deposit|jpmorgan|private credit)\b/.test(lower)) {
    return "Watch private-bank breadth after 10:15 AM IST; no long bias if financials lag Nifty.";
  }
  if (/\b(ai|semiconductor|software|alphabet|nvidia|tech)\b/.test(lower)) {
    return techReadthrough(lower, entityName).watchFor;
  }
  if (/\b(tariff|trade|exports?|imports?)\b/.test(lower)) {
    return "Watch exporter and auto-ancillary breadth after the first range; avoid trading the tariff headline alone.";
  }
  return `Watch ${entityName} during the first-hour range; trade it only if it broadens into sector leadership.`;
}

function oilReadthrough(lower) {
  const level = extractMarketLevel(lower, "$") || "the Asia handoff";
  if (/\b(opec|opec\+|output|production|barrels?|supply deal|saudi|russia)\b/.test(lower)) {
    return {
      takeaway: "treat it as supply-discipline evidence; India impact travels through sustained Brent direction, not the meeting headline alone.",
      indiaImpact: "OMCs, aviation and tyres stay under pressure only if the OPEC+ signal keeps Brent bid; upstream energy is the offset.",
      watchFor: `Watch Brent around ${level}; OMC risk stays live only if supply headlines keep prices firm.`
    };
  }
  if (/\b(pipeline|keystone|refinery|export terminal|shipment|cargo|gulf coast)\b/.test(lower)) {
    return {
      takeaway: "treat it as crude-flow infrastructure evidence; India needs a Brent reaction before it becomes an opening trade input.",
      indiaImpact: "No direct Indian pipeline read-through; use Brent to decide whether OMCs, aviation and paints face import-cost pressure.",
      watchFor: `Watch whether Brent reacts to the flow story near ${level}; no India trade if prices ignore it.`
    };
  }
  if (/\b(falls?|drops?|slides?|slips?|softens?|eases?|lower|down|retreats?)\b/.test(lower)) {
    return {
      takeaway: "lower crude eases India import-cost pressure if the move survives the morning handoff.",
      indiaImpact: "Bullish for OMCs, aviation, paints and tyres if Brent stays soft; upstream energy may lag.",
      watchFor: `Watch Brent holding below ${level}; sustained softness removes part of the OMC and aviation overhang.`
    };
  }
  if (/\b(rises?|gains?|jumps?|surges?|spikes?|soars?|higher|up)\b/.test(lower)) {
    return {
      takeaway: "higher crude raises the import-cost check for India and can split upstream energy from OMCs.",
      indiaImpact: "Bearish for OMCs, aviation, paints and tyres if Brent stays bid; upstream energy can be the relative winner.",
      watchFor: `Watch Brent acceptance above ${level}; a firm tape keeps import-cost sectors on the defensive.`
    };
  }
  return {
    takeaway: "keep the oil story tied to Brent direction before turning it into an India equity signal.",
    indiaImpact: "India read-through is conditional on Brent: firm prices pressure OMCs and aviation, softer prices support margin relief.",
    watchFor: `Watch Brent at ${level}; direction after Asia opens decides whether the story matters for OMCs.`
  };
}

function ratesReadthrough(lower) {
  const level = extractMarketLevel(lower, "%") || "the US 10Y trend";
  if (/\b(boe|bank of england|uk rate|sterling)\b/.test(lower)) {
    return {
      takeaway: "use it as global rate-sensitivity evidence; India needs bond-market confirmation before banks inherit the signal.",
      indiaImpact: "Bank Nifty and rate-sensitive sectors care only if global yields follow through and local breadth weakens.",
      watchFor: `Watch ${level} and Indian bank breadth; no rate trade if yields fade.`
    };
  }
  if (/\b(fed|powell|fomc)\b/.test(lower)) {
    return {
      takeaway: "Fed policy uncertainty shifts the hurdle rate, so India needs cleaner bank and growth-stock confirmation.",
      indiaImpact: "Bearish for Bank Nifty, realty, autos and high-PE growth if yields rise; neutral if breadth absorbs it.",
      watchFor: `Watch ${level}; rising yields require Bank Nifty to hold VWAP.`
    };
  }
  return {
    takeaway: "the yield move changes the discount-rate check for banks and high-multiple growth.",
    indiaImpact: "Rate-sensitive Indian sectors need yield stability; otherwise treat gap-ups in banks, realty and growth as fragile.",
    watchFor: `Watch ${level}; pair it with Bank Nifty VWAP before assigning direction.`
  };
}

function tradeReadthrough(lower) {
  if (/\b(tariff|tariffs)\b/.test(lower)) {
    return {
      takeaway: "tariff risk can split exporters, autos and metals instead of moving the whole index together."
    };
  }
  return {
    takeaway: "trade-flow news separates exporters from import-cost sectors, so the index read needs sector confirmation."
  };
}

function earningsReadthrough(lower, entityName) {
  const subject = specificCompanyOrTheme(lower, entityName);
  const evidenceLabel = /\bearnings\b/i.test(subject) ? subject : `${subject} earnings`;
  if (/\b(space|spacex|satellite|rocket)\b/.test(lower)) {
    return {
      takeaway: `${subject} financing is a private-market risk cue, not a direct Nifty setup without listed peer breadth.`
    };
  }
  if (/\b(supercar|engine|luxury auto|ferrari|lamborghini)\b/.test(lower)) {
    return {
      takeaway: `${subject} margin evidence belongs in auto-ancillary context, not broad Nifty conviction.`
    };
  }
  return {
    takeaway: `${evidenceLabel} evidence matters only if margins, guidance or demand can travel to listed Indian peers.`
  };
}

function aviationReadthrough(lower) {
  if (/\b(spirit airlines|shutdown|bankrupt|bankruptcy)\b/.test(lower)) {
    return {
      takeaway: "keep it as US aviation stress unless fuel, demand or aircraft-supply data moves Indian aviation names.",
      indiaImpact: "No direct India read-through for this story.",
      watchFor: "No specific watch for this article."
    };
  }
  return {
    takeaway: "aviation demand or fuel pressure matters for airlines before it matters for the broad index.",
    indiaImpact: "Aviation is the direct read-through; do not convert it into Nifty IT or broad-index conviction.",
    watchFor: "Watch aviation and fuel-cost names separately; avoid using the headline as a Nifty setup."
  };
}

function techReadthrough(lower, entityName) {
  const subject = specificCompanyOrTheme(lower, entityName);
  if (/\b(chip|chips|semiconductor|nvidia)\b/.test(lower)) {
    return {
      takeaway: `${subject} is semiconductor-cycle evidence; Indian IT needs Nasdaq breadth and USD/INR support to inherit it.`,
      indiaImpact: "Nifty IT gets a read-through only if Nasdaq futures, chip breadth and USD/INR support exporters together.",
      watchFor: "Watch Nasdaq futures plus Nifty IT advance-decline; chip strength alone is not enough."
    };
  }
  if (/\b(ai|software|cloud|alphabet|google|microsoft|oracle|meta)\b/.test(lower)) {
    return {
      takeaway: `${subject} is AI-spending evidence; treat the India read as conditional on IT services breadth.`,
      indiaImpact: "Potentially bullish for Nifty IT only if exporters lead after the open; otherwise keep it as global tech context.",
      watchFor: `Watch Nifty IT breadth against Nasdaq futures; ${subject} must translate into exporter participation.`
    };
  }
  return {
    takeaway: `${subject} is global technology context; Indian exporters need local breadth before it matters.`,
    indiaImpact: "Nifty IT needs local breadth and USD/INR support before global tech news becomes an India trade input.",
    watchFor: "Watch Nifty IT breadth after the first range; avoid trading isolated global tech headlines."
  };
}

function specificCompanyOrTheme(lower, fallback) {
  const patterns = [
    [/\bblue owl\b/, "Blue Owl"],
    [/\bspacex\b/, "SpaceX"],
    [/\balphabet\b|\bgoogle\b/, "Alphabet"],
    [/\bpalantir\b/, "Palantir"],
    [/\bnvidia\b/, "Nvidia"],
    [/\bmicrosoft\b/, "Microsoft"],
    [/\boracle\b/, "Oracle"],
    [/\bmeta\b/, "Meta"],
    [/\bapple\b/, "Apple"],
    [/\btesla\b/, "Tesla"],
    [/\bbig tech\b/, "Big Tech"],
    [/\bsemiconductor earnings\b/, "semiconductor earnings"],
    [/\bsupercar\b/, "supercar supply chain"],
    [/\bopec\+?\b/, "OPEC+"]
  ];
  for (const [pattern, label] of patterns) {
    if (pattern.test(lower)) {
      return label;
    }
  }
  return fallback && fallback !== "Market" ? fallback : "the article";
}

function extractMarketLevel(lower, unit) {
  const escapedUnit = unit === "$" ? "\\$" : unit;
  const pattern = unit === "$"
    ? new RegExp(`${escapedUnit}\\s?\\d+(?:\\.\\d+)?`, "i")
    : new RegExp(`\\d+(?:\\.\\d+)?\\s?${escapedUnit}`, "i");
  const match = String(lower || "").match(pattern);
  return match?.[0]?.replace(/\s+/g, "") || "";
}

function articleFactSentence(headline, summary) {
  const summarySentence = firstUsefulSentence(summary);
  if (summarySentence && normalizeForComparison(summarySentence) !== normalizeForComparison(headline)) {
    return compactWordsPlain(summarySentence, 18);
  }
  return compactWordsPlain(stripTerminal(headline)
    .replace(/^why\s+/i, "")
    .replace(/\s*-\s*[^-]+$/i, "")
    .replace(/\s+/g, " ")
    .trim(), 18);
}

function firstUsefulSentence(value) {
  return protectAbbreviations(value)
    .split(/(?<=[.!?])\s+/)
    .map((item) => stripTerminal(item).trim())
    .find((item) =>
      item.length >= 24 &&
      !/verified source stack|tracked as|pre-market read|click here|read more/i.test(item)
    ) || "";
}

function hasNoDirectIndiaRead(text, category) {
  const lower = String(text || "").toLowerCase();
  if (/\b(spirit airlines|domestic us|u\.s\. consumer|us consumer|air travelers?|ticket prices?|shutdown|shut down)\b/.test(lower) &&
      !/\b(oil|crude|brent|fuel|jet fuel|boeing|airbus|supply chain|dollar|rate|yield)\b/.test(lower)) {
    return true;
  }
  if (/\b(attorney|lawsuit|legal strategy|court|subpoena|criminal case|civil case)\b/.test(lower) &&
      !/\b(rate|yield|bond|inflation|policy|market|stock|futures)\b/.test(lower)) {
    return true;
  }
  return category === "neutral_volatile" && /\b(lifestyle|travel tips|retirement|consumer advice)\b/.test(lower);
}

function compactWords(value, maxWords) {
  const words = compactWordsPlain(value, maxWords).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return stripTerminal(words.join(" ")) + ".";
  }
  return stripTerminal(words.slice(0, maxWords).join(" ")) + ".";
}

function compactWordsPlain(value, maxWords) {
  const words = cleanText(protectAbbreviations(value)).split(/\s+/).filter(Boolean);
  const selected = words.length <= maxWords ? words : words.slice(0, maxWords);
  while (selected.length > 4 && /^(a|an|the|and|or|but|by|with|as|to|from|for|of|in|on|at|amid|because|caused|said)$/i.test(selected[selected.length - 1])) {
    selected.pop();
  }
  return stripTerminal(selected.join(" "));
}

function protectAbbreviations(value) {
  return String(value || "")
    .replace(/\bU\.S\./g, "US")
    .replace(/\bU\.K\./g, "UK")
    .replace(/\bE\.U\./g, "EU");
}

function stripTerminal(value) {
  return String(value || "").replace(/[.!?,;:]+$/g, "").trim();
}

function normalizeForComparison(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sentimentFromText(text, category) {
  const lower = String(text || "").toLowerCase();
  let score = categorySentiment(category);
  const adjustments = [
    [/\b(record|surge|jumps?|rall(?:y|ies)|gains?|beats?|tops?|booming|upgrades?|raises?|strong|optimis(?:m|tic)|resilient)\b/g, 0.12],
    [/\b(eases?|cools?|softens?|relief|stabiliz(?:e|es|ing))\b/g, 0.07],
    [/\b(warns?|risk|risks|pressure|probe|investigation|tariff|war|disruption|shutdown|failed|bankrupt|losses?|cuts?|slumps?|falls?|drops?|slides?|plunges?|weak|underpricing)\b/g, -0.13],
    [/\b(inflation|yield|yields|rates?|deficit|volatility)\b/g, -0.05],
    [/\b(earnings|guidance|margin|profit|revenue)\b/g, 0.03]
  ];
  for (const [pattern, weight] of adjustments) {
    const matches = lower.match(pattern);
    if (matches?.length) {
      score += Math.min(3, matches.length) * weight;
    }
  }
  return round(Math.max(-0.9, Math.min(0.9, score)), 3);
}

function entityMatchScoreFromText(text, entityName) {
  const lower = String(text || "").toLowerCase();
  let score = 0.66;
  if (entityName && entityName !== "Market") score += 0.08;
  if (/\b(nifty|sensex|bank nifty|brent|crude|rupee|dollar|yield|bond|fed|rbi)\b/.test(lower)) score += 0.1;
  if (/\b(earnings|guidance|revenue|profit|tariff|trade|ai|semiconductor|bank|credit)\b/.test(lower)) score += 0.06;
  return round(Math.min(0.94, score), 2);
}

function entityForHeadline(headline, category) {
  const lower = headline.toLowerCase();
  if (/\b(boe|bank of england|central bank|governor bailey)\b/.test(lower)) {
    return "Rates";
  }
  if (/\b(bank|banks|banking|credit|deposit|loan|jpmorgan|private credit|financials?)\b/.test(lower)) {
    return "Bank Nifty";
  }
  if (/\b(nifty|sensex|indian equities|india stocks?)\b/.test(lower)) {
    return "Nifty 50";
  }
  if (/\b(indian it|it services|nifty it|infosys|tcs|wipro|hcltech|tech mahindra)\b/.test(lower)) {
    return "Nifty IT";
  }
  if (/\b(ai|semiconductor|software|alphabet|google|nvidia|microsoft|oracle|meta|tech)\b/.test(lower)) {
    return "Global Tech";
  }
  if (/\b(yield|bond|rate|fed|inflation|powell)\b/.test(lower)) {
    return "Rates";
  }
  if (/\b(oil|crude|brent|energy supply)\b/.test(lower)) {
    return "Brent Crude";
  }
  if (/\b(rupee|dollar|currency|forex|yen)\b/.test(lower)) {
    return "USDINR";
  }
  if (/\b(airline|airlines|spirit|travel)\b/.test(lower)) {
    return "Aviation";
  }
  if (/\b(pharma|health|lilly|drug|fda)\b/.test(lower)) {
    return "Pharma";
  }
  if (/\b(auto|vehicle|tariff|ev|tesla)\b/.test(lower)) {
    return "Autos";
  }
  if (/\b(tariff|trade|exports?|imports?)\b/.test(lower)) {
    return "Exporters";
  }
  if (category === "sector_positive") {
    return "Sector Breadth";
  }
  return "Market";
}

async function fetchText(url, fetcher) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetcher(url, {
      headers: {
        "User-Agent": "MarketNarrativeSourceVerifier/1.0 (+https://marketnarrative.in)",
        Accept: "application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8"
      },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Source fetch failed ${response.status} for ${url}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseRssItems(xml) {
  const itemMatches = [...String(xml).matchAll(/<item\b[\s\S]*?<\/item>/gi)];
  return itemMatches.map((match) => parseRssItem(match[0])).filter((item) => item.title && (item.link || item.guid));
}

function parseRssItem(itemXml) {
  return {
    title: readXmlTag(itemXml, "title"),
    link: readXmlTag(itemXml, "link"),
    guid: readXmlTag(itemXml, "guid"),
    publishedAt: readXmlTag(itemXml, "pubDate") || readXmlTag(itemXml, "dc:date"),
    summary: readXmlTag(itemXml, "description")
  };
}

function readXmlTag(xml, tagName) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(xml).match(new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? cleanText(match[1]) : "";
}

function moneycontrolFeedUrls(html) {
  const urls = [...String(html).matchAll(/href=["']([^"']+)["']/gi)]
    .map((match) => decodeHtml(match[1]))
    .filter((url) => /^https:\/\/www\.moneycontrol\.com\/rss\//i.test(url))
    .filter((url) => !/stocksmarket|personalfinance/i.test(url));
  return [...new Set(urls)];
}

function moneycontrolSourceName(url) {
  const lower = url.toLowerCase();
  if (lower.includes("market")) {
    return "Moneycontrol Markets";
  }
  if (lower.includes("business")) {
    return "Moneycontrol Business";
  }
  if (lower.includes("economy")) {
    return "Moneycontrol Economy";
  }
  if (lower.includes("brokerage")) {
    return "Moneycontrol Brokerage";
  }
  return "Moneycontrol";
}

function dedupeArticles(articles) {
  const seen = new Set();
  const result = [];
  for (const article of articles) {
    const key = normalizedSourceFingerprint(article);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(article);
  }
  return result;
}

function selectDiverseArticles(articles, limit) {
  const bySource = new Map();
  for (const article of articles) {
    const key = article.sourceName || article.sourceId || "source";
    if (!bySource.has(key)) {
      bySource.set(key, []);
    }
    bySource.get(key).push(article);
  }

  const sourceKeys = [...bySource.keys()];
  const selected = [];
  while (selected.length < limit) {
    let progressed = false;
    for (const key of sourceKeys) {
      const next = bySource.get(key)?.shift();
      if (!next) {
        continue;
      }
      selected.push(next);
      progressed = true;
      if (selected.length >= limit) {
        break;
      }
    }
    if (!progressed) {
      break;
    }
  }
  return selected;
}

function overlapWithPreviousPercent(articles, previousDigest) {
  const previous = previousDigest?.news ?? previousDigest?.newsCards ?? [];
  if (!previous.length || !articles.length) {
    return 0;
  }
  const previousTitles = new Set(previous.map((article) => normalizeTitle(article.headline ?? article.title)).filter(Boolean));
  const previousUrls = new Set(previous.map((article) => normalizeSourceUrl(article.sourceUrl)).filter(Boolean));
  const overlaps = articles.filter((article) =>
    previousTitles.has(normalizeTitle(article.headline ?? article.title)) ||
    previousUrls.has(normalizeSourceUrl(article.sourceUrl))
  ).length;
  return round((overlaps / articles.length) * 100, 1);
}

function duplicateWithinCurrentPercentForArticles(articles) {
  if (!articles.length) {
    return 0;
  }
  const seen = new Set();
  let duplicates = 0;
  for (const article of articles) {
    const key = normalizedSourceFingerprint(article);
    if (seen.has(key)) {
      duplicates += 1;
    }
    seen.add(key);
  }
  return round((duplicates / articles.length) * 100, 1);
}

function normalizeTitle(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an|to|of|and|for|in|on|as|with|after|before)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSourceUrl(value) {
  try {
    const url = new URL(String(value ?? ""));
    url.hash = "";
    const removable = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "from", "fbclid", "gclid"];
    for (const key of removable) {
      url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return "";
  }
}

function isoTimestampForArticle(date, publishedAt) {
  const parsed = Date.parse(publishedAt);
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString();
  }
  return `${date}T06:30:00+05:30`;
}

function normalizeThumbnail(thumbnail) {
  return {
    label: thumbnail.label ?? "Market",
    theme: thumbnail.theme ?? "Verified Source",
    accent: thumbnail.accent ?? "#2563eb",
    alt: thumbnail.alt ?? `${thumbnail.label ?? "Market"} source thumbnail`
  };
}

function cleanText(value) {
  return decodeHtml(String(value ?? ""))
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function categoryLabel(category) {
  return {
    macro_negative: "Macro pressure",
    macro_positive: "Domestic macro support",
    sector_positive: "Sector support",
    sector_negative: "Sector pressure",
    global_risk: "Global risk",
    neutral_volatile: "Asia and volatility"
  }[category] ?? "Market";
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "source";
}

function hashString(value) {
  let hash = 0;
  for (const char of String(value)) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return hash;
}

function readableDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00+05:30`));
}

function round(value, places = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Number(number.toFixed(places));
}
