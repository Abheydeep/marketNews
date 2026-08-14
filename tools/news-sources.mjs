import { ARTICLE_ENRICHMENT_PROMPT } from "./editorial-guardrails.mjs";
import { log } from "./logger.mjs";
import { articleThumbnailMeta } from "./source-thumbnails.mjs";
import { isLivePriceTracker, triageArticlesWithLLM } from "./article-triage.mjs";
import { isPulseMarketCandidate } from "./pulse-candidate-filter.mjs";
import { mapWithConcurrency } from "./limited-concurrency.mjs";

export const NEWS_DATA_MODES = new Set(["live", "fixture"]);

const MIN_VERIFIED_ARTICLES = 3;
const MIN_SOURCE_CATEGORY_BUCKETS = 2;
const MAX_DUPLICATE_WITH_PREVIOUS_PERCENT = 55;
const MARKET_RELEVANCE_PATTERN = /\b(market|markets|stock|stocks|share|shares|equity|equities|nifty|sensex|bank|banks|banking|yield|yields|bond|bonds|rate|rates|fed|rbi|mpc|inflation|deficit|rupee|dollar|currency|forex|oil|crude|brent|gold|commodity|commodities|futures|nasdaq|dow|s&p|wall street|asia|china|japan|korea|taiwan|hk|hong kong|berkshire|buffett|earnings|revenue|profit|margin|guidance|tariff|trade|export|import|gdp|economy|economic|liquidity|fund|funds|mutual|sip|fii|dii|capex|manufacturing|gst|sebi|pli|budget|finance ministry|war|military|missile|strike|airstrike|conflict|geopolit|iran|israel|russia|ukraine|taiwan strait|south china sea|nato|sanctions|ceasefire|border tension|red sea|hormuz|semiconductor|ai|tech|it|software|airline|airlines|energy|power|auto|autos|realty|metal|metals|pharma|fmcg|consumer)\b/i;
const STRICT_MARKET_RELEVANCE_PATTERN = /\b(markets?|stocks?|shares?|equities|indices|nifty|sensex|bank\s+nifty|yields?|bonds?|rates?|fed|rbi|mpc|inflation|rupee|dollar|currency|forex|oil|crude|brent|gold|commodit(?:y|ies)|futures|nasdaq|dow|s&p|wall street|earnings|revenue|profit|margin|guidance|tariff|trade|exports?|imports?|gdp|econom(?:y|ic)|liquidity|mutual|sip|fii|dii|capex|manufacturing|gst|sebi|pli|budget|war|military|missile|strike|airstrike|conflict|geopolit|iran|israel|russia|ukraine|taiwan strait|south china sea|nato|sanctions|ceasefire|border tension|red sea|hormuz|semiconductor|software|airlines?|energy|power|autos?|realty|metals?|pharma|fmcg|valuation|volatility|options?)\b/i;
const DIRECT_MARKET_MOVING_PATTERN = /\b(stocks?|shares?|listed|publicly traded|market cap|earnings|revenue|profit|guidance|ipo|bonds?|yields?|rates?|tariff|oil|crude|brent|inflation|fed|rbi|mpc|gst|sebi|pli|budget|war|military|missile|strike|airstrike|conflict|geopolit|iran|israel|russia|ukraine|taiwan strait|south china sea|nato|sanctions|ceasefire|border tension|red sea|hormuz|rupee|dollar|futures|wall street|nasdaq|s&p|dow)\b/i;
const OFF_TOPIC_WITHOUT_MARKET_PATTERN = /\b(assassination|murder|suicide|crime|celebrity|movie|sports|football|baseball|recipe|travel|museum|gallery|exhibition|polls?|election|campaign|senate|house of representatives)\b/i;
const OFF_TOPIC_ALWAYS_PATTERN = /\b(kentucky derby|pickleball|nfl|nba|mlb|yankees|mariano rivera|salary cap|sports capital|prediction market platforms?|netflix|hair loss|weight loss)\b/i;
const LEGAL_POLITICAL_WITHOUT_POLICY_PATTERN = /\b(attorney|lawsuit|legal strateg(?:y|ies)|probe|investigation|deadline|subpoena|court|criminal|civil case)\b/i;
const MARKET_POLICY_PATTERN = /\b(rate|rates|yield|yields|bond|bonds|inflation|policy|fomc|cut|hike|guidance|liquidity|market|markets|stocks?|futures)\b/i;
const LOW_SIGNAL_MARKET_CONTENT_PATTERN = /\b(good stock to buy now|stock pick with huge upside|billionaire .* stock pick|best artificial intelligence .*growth stocks|ai growth stocks|social security|honey pot|numbers don['’]t lie|scotch whisky|king charles|spirit airlines|lawyers? to the wealthy|lazy millionaire|retirement|top wall street analysts|long-term prospects|how to invest|is this a good time to invest|good time to invest|best etf|dividend stock|passive income|bitcoin|crypto|nft|defi|web3|blockchain wallet|us housing|home prices|mortgage rates|real estate agent|homebuilders staying asset-light|millrose|clean harbors|pfas momentum|debt ceiling|government shutdown|us budget|senate vote|warren buffett quotes?|charlie munger|munger|greg abel|berkshire|chipotle|paypal|venmo|dunkin|inspire brands|arby's|buffalo wild wings|baskin robbins|sonic drive-in|restaurant company owns|plane tickets?|air travelers?|credit score|medical appointments?|patients who died|prior authorization|doctors say|us health provider|world['’]s oldest doctor|long, happy life|happy life|longevity|wellness|all my patients|youtube whisperers?|mrbeast|million-dollar channels?|creator economy|content creators?|jim cramer|investing club subscribers|start buying .*winners|red-hot ai stocks|claude has feelings|claude to be conscious|large language model .*conscious|mythos|cybersecurity hysteria|fitness wearable|whoop|on-demand clinician|sell in may|flip a coin|paramount|hollywood|films annually|anthropic is still blacklisted|weight loss|weight-loss|obesity assets?|glp-?1|wegovy|bank freeze your account|freeze your bank account|don['’]t update kyc|without (?:updating )?kyc|bank account frozen)\b/i;
const LOW_SIGNAL_LIVE_HEADLINE_PATTERN = /\b(too late to buy|should you buy|post-earnings dip|12-month gain|trump[‘’]s? .*gold card|gold card.*wealthy|world[‘’]s wealthy|wealthy investors|qualified small business stock|qsbs|tax break for wealthy|trump accounts?|buy a dell|fanduel|sports betting|data center outage hits trading|coinbase|maintains buy rating|upgrades .* stock|downgrades .* stock|raises pt|lowers pt|initiates coverage|price target|analyst rating|stocks? to buy|unstoppable stocks? to buy|top .*stock pick|cathie wood|most undervalued .*stock|high quality stock|wall street bullish on|legendary investor|negative 10-year returns|family office deal-making|best cd rates|cd rates today|apy|high-yield savings|savings interest rates|mortgage and refinance|refinance interest rates|heloc|home equity loan|home equity rates|gold and silver prices today(?! (?:rise|fall|surge|slump|jump|drop|tariff|duty|import|tax|policy|ban|levy))|wearable patches?|supplement industry|lactose intolerance patch|barri[eè]re|restaurant brands international|burger king|qsr q[1-4]|apollo ceo|rival insurers|stock lagging the s&p|real estate fund made .* bet|inventrust|(?:tv|advertising|media|ad)\s+upfronts?|upfront\s+(?:advertising|season|week|showcase|presentations?)|corporate shuffles? (?:reshaping|are reshaping)|awards? (?:season|show|ceremony)|grammy|emmy|oscar|golden globe|cannes film|sundance|box office|theatrical release)\b/i;

const LIVE_FEEDS = [
  {
    sourceName: "Moneycontrol Markets",
    sourceId: "moneycontrol-markets",
    type: "rss",
    categoryHint: "sector_positive",
    url: "https://www.moneycontrol.com/rss/marketreports.xml"
  },
  {
    sourceName: "Moneycontrol Business",
    sourceId: "moneycontrol-business",
    type: "rss",
    categoryHint: "macro_positive",
    url: "https://www.moneycontrol.com/rss/business.xml"
  },
  {
    sourceName: "Moneycontrol Economy",
    sourceId: "moneycontrol-economy",
    type: "rss",
    categoryHint: "macro_negative",
    url: "https://www.moneycontrol.com/rss/economy.xml"
  },
  {
    sourceName: "Moneycontrol Buzzing Stocks",
    sourceId: "moneycontrol-buzzing-stocks",
    type: "rss",
    categoryHint: "sector_positive",
    url: "https://www.moneycontrol.com/rss/buzzingstocks.xml"
  },
  {
    sourceName: "Economic Times Markets",
    sourceId: "economic-times-markets",
    type: "rss",
    categoryHint: "macro_positive",
    url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms"
  },
  {
    sourceName: "Economic Times Stocks",
    sourceId: "economic-times-stocks",
    type: "rss",
    categoryHint: "sector_positive",
    url: "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms"
  },
  {
    sourceName: "Mint Markets",
    sourceId: "mint-markets",
    type: "rss",
    categoryHint: "macro_positive",
    url: "https://www.livemint.com/rss/markets"
  },
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
    sourceName: "The Week Business",
    sourceId: "the-week-business",
    type: "html-index",
    categoryHint: "macro_negative",
    url: "https://www.theweek.in/wire-updates/business.html"
  },
  {
    sourceName: "Moneycontrol Source Page",
    sourceId: "moneycontrol-source-page",
    type: "moneycontrol-source-page",
    categoryHint: "sector_positive",
    url: "https://www.moneycontrol.com/features/rss/"
  },
  {
    sourceName: "Business Standard Markets",
    sourceId: "business-standard-markets",
    type: "rss",
    categoryHint: "macro_negative",
    url: "https://www.business-standard.com/rss/markets-106.rss"
  },
  {
    sourceName: "Business Standard Economy",
    sourceId: "business-standard-economy",
    type: "rss",
    categoryHint: "macro_negative",
    url: "https://www.business-standard.com/rss/economy-policy-102.rss"
  },
  {
    sourceName: "NDTV Profit Markets",
    sourceId: "ndtv-profit-markets",
    type: "rss",
    categoryHint: "macro_positive",
    url: "https://feeds.feedburner.com/ndtvprofit-latest"
  },
  {
    sourceName: "Financial Express Markets",
    sourceId: "financial-express-markets",
    type: "rss",
    categoryHint: "macro_negative",
    url: "https://www.financialexpress.com/market/feed/"
  },
  {
    sourceName: "Bloomberg Markets",
    sourceId: "bloomberg-markets",
    type: "rss",
    categoryHint: "global_risk",
    url: "https://feeds.bloomberg.com/markets/news.rss"
  },
  {
    sourceName: "PIB Finance Ministry",
    sourceId: "pib-finance",
    type: "rss",
    categoryHint: "macro_negative",
    url: "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3"
  },
  {
    sourceName: "Zerodha Pulse",
    sourceId: "zerodha-pulse",
    type: "html-index",
    categoryHint: "neutral_volatile",
    url: "https://pulse.zerodha.com/"
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
  macro_positive: { label: "Earnings", theme: "Global Earnings", accent: "#059669" },
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
    previousDigest: options.previousDigest,
    isPulseMode: process.env.PULSE_MODE === "true" || options.pulseMode === true
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
  const isPulseMode = process.env.PULSE_MODE === "true" || options.pulseMode === true;
  const activeFeeds = isPulseMode ? LIVE_FEEDS.filter(f => f.sourceId === "zerodha-pulse") : LIVE_FEEDS;
  const fetchConcurrency = Math.max(1, Math.min(12, Number(options.newsFetchConcurrency ?? process.env.NEWS_FETCH_CONCURRENCY ?? 6) || 6));
  const fetchStarted = Date.now();
  log.info("news source fetch start", { feeds: activeFeeds.length, concurrency: fetchConcurrency });
  const feedGroups = await mapWithConcurrency(activeFeeds, fetchConcurrency, async (feed) => {
    const rows = [];
    try {
      if (feed.type === "rss") {
        const xml = await fetchText(feed.url, fetcher);
        rows.push(...parseRssItems(xml).map((item) => normalizeLiveArticle(date, feed, item)));
      } else if (feed.sourceId === "zerodha-pulse" && feed.type === "html-index") {
        const html = await fetchText(feed.url, fetcher);
        rows.push(...parsePulseHtmlItems(html, feed.url).map((item) => normalizeLiveArticle(date, feed, item)));
      } else if (feed.type === "html-index") {
        const html = await fetchText(feed.url, fetcher);
        rows.push(...parseHtmlIndexItems(html, feed.url).map((item) => normalizeLiveArticle(date, feed, item)));
      } else if (feed.type === "moneycontrol-source-page") {
        const html = await fetchText(feed.url, fetcher);
        const moneycontrolFeeds = moneycontrolFeedUrls(html).slice(0, 6);
        for (const rssUrl of moneycontrolFeeds) {
          const xml = await fetchText(rssUrl, fetcher);
          rows.push(...parseRssItems(xml).map((item) => normalizeLiveArticle(date, {
            ...feed,
            sourceName: moneycontrolSourceName(rssUrl),
            sourceId: `moneycontrol-${slugify(moneycontrolSourceName(rssUrl))}`,
            url: rssUrl
          }, item)));
        }
      }
      return rows;
    } catch (error) {
      if (options.strictFetch) throw error;
      log.warn("news source skipped", { sourceName: feed.sourceName, error: error.message });
      return [];
    }
  });
  const feedResults = feedGroups.flat();
  log.info("news source fetch complete", { feeds: activeFeeds.length, articles: feedResults.length, durationMs: Date.now() - fetchStarted });
  let verifiedArticles = dedupeArticles(feedResults)
    .filter((article) => sourceUrlLooksArticleLevel(article.sourceUrl));
  verifiedArticles = verifiedArticles.filter((article) => articleIsFreshForDigest(article, date, isPulseMode));
  if (!isPulseMode) {
    const preTriage = selectDiverseArticles(prioritizeDigestWindowArticles(verifiedArticles, date), 100);
    verifiedArticles = await triageArticlesWithLLM(preTriage, options);
  }
  let selectedArticles;
  if (isPulseMode) {
    const pulseCandidates = selectDiverseArticles(
      prioritizeDigestWindowArticles(verifiedArticles.filter(articleLooksMarketRelevant).filter(isPulseMarketCandidate).filter((article) => !isLivePriceTracker(article)), date),
      80
    );
    selectedArticles = await agentSelectPulseArticles(pulseCandidates, options);
    const top3 = selectedArticles.slice(0, 3);
    await Promise.all(top3.map(a => enrichPulseArticleWithContent(a, fetcher)));
  } else {
    selectedArticles = selectDiverseArticles(prioritizeDigestWindowArticles(verifiedArticles, date), 60);
  }
  return enrichArticlesWithEditorialLLM(selectedArticles, options);
}

async function enrichPulseArticleWithContent(article, fetcher) {
  if (!article.sourceUrl || !article.sourceUrl.startsWith('http')) return article;
  
  try {
    const html = await fetchText(article.sourceUrl, fetcher);
    const paragraphs = [];
    const pRegex = /<p[^>]*>(.*?)<\/p>/gi;
    let match;
    while ((match = pRegex.exec(html)) !== null) {
      const text = match[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
      if (text.length > 50) paragraphs.push(text);
      if (paragraphs.length >= 3) break;
    }
    
    if (paragraphs.length > 0) {
       article.summary = paragraphs.join('\n\n'); 
    }
  } catch (e) {
      log.warn("pulse article body scrape failed", { sourceUrl: article.sourceUrl, error: e.message });
  }
  return article;
}

const ENRICH_CONCURRENCY = 16;

async function enrichArticlesWithEditorialLLM(articles, options = {}) {
  const enricher = options.articleEditorialEnricher ?? configuredArticleEditorialEnricher(options);
  if (typeof enricher !== "function") {
    return articles;
  }
  const usedEditorialAngles = [];
  const enriched = new Array(articles.length);
  let enrichedCount = 0;
  let fallbackCount = 0;

  log.info("enrich start", { total: articles.length, concurrency: ENRICH_CONCURRENCY });

  for (let i = 0; i < articles.length; i += ENRICH_CONCURRENCY) {
    const batch = articles.slice(i, i + ENRICH_CONCURRENCY);
    const batchNum = Math.floor(i / ENRICH_CONCURRENCY) + 1;
    const totalBatches = Math.ceil(articles.length / ENRICH_CONCURRENCY);
    log.info("enrich batch start", { batch: batchNum, of: totalBatches, headlines: batch.map((a) => String(a.headline ?? "").slice(0, 50)) });
    const batchStart = Date.now();

    const settled = await Promise.allSettled(batch.map(async (article, batchIndex) => {
      // Stagger requests within each batch by 50ms to avoid thundering-herd 429s
      await new Promise((resolve) => setTimeout(resolve, batchIndex * 50));
      const articleStart = Date.now();
      const patch = await enricher({
        article: articleForEditorialEnrichment(article),
        prompt: ARTICLE_ENRICHMENT_PROMPT,
        usedAngles: usedEditorialAngles.slice(-8),
        schema: {
          takeaway: "max 30 words, do not restate the headline",
          indiaImpact: "max 35 words, specific India sector/index/instrument or global-only context",
          watchFor: "max 20 words, one tradable confirmation input"
        }
      });
      log.info("enrich article ok", { headline: String(article.headline ?? "").slice(0, 60), durationMs: Date.now() - articleStart });
      return sanitizeArticleEditorialPatch(article, patch);
    }));

    for (let j = 0; j < batch.length; j++) {
      const result = settled[j];
      if (result.status === "fulfilled") {
        enriched[i + j] = result.value;
        rememberArticleEditorialAngles(result.value, usedEditorialAngles);
        enrichedCount++;
      } else {
        if (options.strictEditorialEnrichment) throw result.reason;
        log.warn("enrich article failed", { headline: String(batch[j].headline ?? "").slice(0, 60), error: result.reason?.message });
        enriched[i + j] = batch[j];
        rememberArticleEditorialAngles(batch[j], usedEditorialAngles);
        fallbackCount++;
      }
    }
    log.info("enrich batch complete", { batch: batchNum, of: totalBatches, durationMs: Date.now() - batchStart });
  }

  log.info("enrich complete", { total: articles.length, enriched: enrichedCount, fallback: fallbackCount });
  return enriched;
}

function shouldUseAgentArticleEnrichment(options = {}) {
  if (options.agentArticleEnrichment === true || process.env.PUBLIC_BRIEFING_AGENT_MODE === "true") {
    return true;
  }
  if (options.agentArticleEnrichment === false || process.env.PUBLIC_BRIEFING_AGENT_MODE === "false") {
    return false;
  }
  return Boolean(options.nvidiaApiKey ?? process.env.NVIDIA_API_KEY);
}

function rememberArticleEditorialAngles(article, usedEditorialAngles) {
  const angle = cleanText([
    article?.entityName,
    article?.takeaway,
    article?.indiaImpact,
    article?.watchFor
  ].filter(Boolean).join(" | "));
  if (angle && angle.length >= 20) {
    usedEditorialAngles.push(angle.slice(0, 360));
  }
}

function configuredArticleEditorialEnricher(options = {}) {
  const enabled = options.llmArticleEnrichment !== false &&
    process.env.PUBLIC_BRIEFING_LLM_ENRICH !== "false";
  if (!enabled) {
    return null;
  }
  const fetcher = options.llmFetcher ?? fetch;
  const nvidiaApiKey = options.nvidiaApiKey ?? (options.llmFetcher ? "test-nvidia-key" : process.env.NVIDIA_API_KEY);
  if (nvidiaApiKey) {
    return configuredNvidiaArticleEditorialEnricher({ ...options, apiKey: nvidiaApiKey, fetcher });
  }
  return null;
}

function configuredNvidiaArticleEditorialEnricher(options = {}) {
  const { apiKey, fetcher } = options;
  const model = options.nvidiaArticleModel ?? process.env.NVIDIA_ARTICLE_MODEL ?? options.nvidiaModel ?? process.env.NVIDIA_MODEL ?? "meta/llama-3.3-70b-instruct";
  const baseUrl = String(options.nvidiaBaseUrl ?? process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");
  const enableThinking = options.nvidiaArticleThinking ?? process.env.NVIDIA_ARTICLE_THINKING !== "false";
  const isPulseModel = model.includes("deepseek");
  const finalApiKey = isPulseModel ? (process.env.PULSE_API_KEY ?? apiKey) : apiKey;
  
  return async ({ article, prompt, schema, usedAngles = [] }) => {
    const startedAt = Date.now();
    const response = await nvidiaFetchWithRetry({
      fetcher,
      url: `${baseUrl}/chat/completions`,
      provider: "nvidia_article_editorial",
      model,
      timeoutMs: Number(options.nvidiaArticleTimeoutMs ?? process.env.NVIDIA_ARTICLE_TIMEOUT_MS ?? process.env.NVIDIA_TIMEOUT_MS ?? 180000),
      body: {
        model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: articleEditorialUserPrompt(article, schema, usedAngles) }
        ],
        response_format: { type: "json_object" },
        max_tokens: Number(options.nvidiaArticleMaxTokens ?? process.env.NVIDIA_ARTICLE_MAX_TOKENS ?? 900),
        temperature: Number(options.nvidiaArticleTemperature ?? process.env.NVIDIA_ARTICLE_TEMPERATURE ?? 0.2),
        top_p: Number(options.nvidiaArticleTopP ?? process.env.NVIDIA_ARTICLE_TOP_P ?? 0.9),
        ...(enableThinking && /nemotron|deepseek/i.test(model) ? { chat_template_kwargs: { enable_thinking: true } } : {}),
        stream: false
      },
      apiKey: finalApiKey
    });
    log.info("article editorial enrichment completed", { provider: "nvidia", model, status: response.status, durationMs: Date.now() - startedAt });
    const data = await response.json();
    return parseArticleEditorialResponse(nvidiaResponseText(data));
  };
}

function nvidiaResponseText(data) {
  return (data?.choices ?? [])
    .map((choice) => choice?.message?.content ?? "")
    .filter(Boolean)
    .join("\n");
}

async function nvidiaFetchWithRetry({ fetcher, url, provider, model, body, apiKey, timeoutMs, retries = 2 }) {
  // Use streaming when model likely needs long think time (Nemotron) to prevent Cloudflare 120s idle timeout.
  const useStream = body.stream !== false && /nemotron/i.test(model);
  const requestBody = useStream ? { ...body, stream: true } : { ...body, stream: false };
  let lastError;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    const startedAt = Date.now();
    try {
      log.info("llm request started", { provider, model, attempt, stream: useStream });
      const response = await fetcher(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: useStream ? "text/event-stream" : "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeoutMs)
      });
      log.info("llm request completed", { provider, model, attempt, status: response.status, durationMs: Date.now() - startedAt });
      if (response.ok) {
        if (!useStream) return response;
        const assembled = await assembleStream(response);
        return { ok: true, status: 200, json: () => Promise.resolve(assembled) };
      }
      const retryable = response.status === 429 || response.status >= 500;
      lastError = new Error(`NVIDIA ${provider} failed with status ${response.status}`);
      if (!retryable || attempt > retries) throw lastError;
    } catch (error) {
      lastError = error;
      const timedOut = error?.name === "AbortError" || error?.name === "TimeoutError";
      log.warn("llm request failed", { provider, model, attempt, timedOut, error: error.message });
      if (attempt > retries) throw error;
    }
    await sleep(Number(process.env.NVIDIA_RETRY_DELAY_MS ?? 900) * attempt);
  }
  throw lastError;
}

async function assembleStream(response) {
  const decoder = new TextDecoder();
  let content = "";
  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value, { stream: true }).split("\n")) {
        if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
        try {
          const delta = JSON.parse(line.slice(6))?.choices?.[0]?.delta?.content;
          if (delta) content += delta;
        } catch { /* skip malformed chunk */ }
      }
    }
  } finally { reader.releaseLock(); }
  return { choices: [{ message: { content } }] };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function articleShouldUseEditorialEnrichment(article, seenTemplateSignatures) {
  const signature = articleReadthroughTemplateSignature(article);
  if (signature) {
    const seenCount = seenTemplateSignatures.get(signature) || 0;
    seenTemplateSignatures.set(signature, seenCount + 1);
    if (seenCount > 0) {
      return true;
    }
  }
  return articleNeedsEditorialEnrichment(article);
}

function articleNeedsEditorialEnrichment(article) {
  const text = [
    article?.takeaway,
    article?.indiaImpact,
    article?.watchFor,
    article?.whyItMatters
  ].join(" ");
  return /\b(conditional India input|watch input only|watch input, not a trade bias|require first-range breadth|global-only context|No direct India read-through|Watch .* during the first-hour range|macro checklist|sector-leadership check|watchlist cue|no index bias unless|risk appetite is supportive only if Indian breadth confirms|mixed global cues keep the India open in confirmation mode)\b/i.test(text);
}

function articleReadthroughTemplateSignature(article) {
  const lower = `${article?.headline || ""} ${article?.summary || ""}`.toLowerCase();
  if (isOilStory(lower)) {
    if (/\b(opec|opec\+|output|production|barrels?|supply deal|saudi|russia)\b/.test(lower)) return "oil:supply";
    if (/\b(pipeline|keystone|refinery|export terminal|shipment|cargo|gulf coast)\b/.test(lower)) return "oil:flow";
    if (/\b(falls?|drops?|slides?|slips?|softens?|eases?|lower|down|retreats?)\b/.test(lower)) return "oil:lower";
    if (/\b(rises?|gains?|jumps?|surges?|spikes?|soars?|higher|up)\b/.test(lower)) return "oil:higher";
    return "oil:general";
  }
  if (isIndiaPreciousMetalsPolicyStory(lower)) {
    return "india:precious-metals-policy";
  }
  if (/\b(fed|yields?|bonds?|rates?|inflation|powell|boe|bank of england|central bank|governor bailey)\b/.test(lower) && !isIndiaPolicyStory(lower)) {
    if (/\b(boe|bank of england|uk rate|sterling)\b/.test(lower)) return "rates:boe";
    if (/\b(fed|powell|fomc)\b/.test(lower)) return "rates:fed";
    return "rates:general";
  }
  if (/\b(earnings|revenue|profit|profits|guidance|results?|outlook|margin|margins)\b/.test(lower)) {
    if (/\b(apple|amazon|meta|alphabet|google|microsoft|nvidia|big tech|faang|mega-cap|mag.?7)\b/.test(lower)) return "earnings:megacap";
    if (/\b(infosys|tcs|wipro|hcltech|tech mahindra|reliance|hdfc bank|icici bank|axis bank|sbi|kotak|bajaj finance|maruti|tata motors|airtel|larsen|ltimindtree)\b/.test(lower)) return "earnings:india";
    if (/\b(bank|banks|banking|financial|financials|credit|deposit|loan|nbfc|jpmorgan|goldman|morgan stanley|citigroup|wells fargo)\b/.test(lower)) return "earnings:financial";
    return "earnings:general";
  }
  return "";
}

function articleForEditorialEnrichment(article) {
  const entityName = validatedArticleEntity(article);
  return entityName === article?.entityName ? article : { ...article, entityName };
}

function validatedArticleEntity(article) {
  const lower = `${article?.headline || ""} ${article?.summary || ""}`.toLowerCase();
  const recalculated = entityForHeadline(lower, article?.category || "neutral_volatile");
  const provided = cleanText(article?.entityName || "");
  if (!provided || provided === "Market") {
    return recalculated || "Market";
  }
  if (articleEntityMatchesText(provided, lower)) {
    return provided;
  }
  return recalculated && recalculated !== "Market" ? recalculated : "Market";
}

function articleEntityMatchesText(entityName, lower) {
  const entity = String(entityName || "").toLowerCase();
  const checks = [
    [/nifty open/, /\b(gift nifty|sgx nifty|nifty futures|index futures|futures premium|futures discount)\b/],
    [/options tape/, /\b(vix|volatility|options?|pcr|oi buildup|put writing|call resistance)\b/],
    [/mcx gold|jeweller/, /\b(gold|silver|bullion|mcx gold|mcx silver|sovereign gold bond|sgb|gold etf|jeweller(?:y|s)?|titan|kalyan|senco|tanishq)\b/],
    [/geopolitical risk/, /\b(war|military|missile|strike|airstrike|conflict|geopolit|iran|israel|russia|ukraine|taiwan strait|south china sea|nato|sanctions|red sea|hormuz)\b/],
    [/india policy/, /\b(gst|sebi|pli|production[-\s]?linked incentive|budget|finance ministry|mpc|monetary policy committee)\b/],
    [/market infrastructure/, /\b(mcx|multi commodity exchange|commodity exchange|exchange revenue|trading volume|clearing corporation)\b/],
    [/infrastructure/, /\b(arisinfra|infra solutions|construction materials|building materials|cement demand|roads?|highways?|infrastructure (?:orders?|capex|projects?|earnings|revenue))\b/],
    [/fuel inflation/, /\b(gas prices|fuel prices|petrol|diesel|gasoline)\b/],
    [/telecom/, /\b(vodafone idea|vodafone|bharti airtel|airtel|jio|telecom|telco|spectrum|average revenue per user|arpu)\b/],
    [/corporate actions/, /\b(corporate actions?|bonus issues?|stock splits?|split shares?|dividends?|ex-date|ex date|record date|buyback|rights issue)\b/],
    [/fii\/dii flow/, /\b(fii|dii|fpi|foreign institutional|domestic institutional|institutional flow|provisional flow)\b/],
    [/bank nifty/, /\b(bank|banks|banking|credit|deposit|loan|nbfc|financial|rbi|mpc|repo rate|liquidity)\b/],
    [/nifty 50/, /\b(nifty|sensex|indian equities|india stocks?)\b/],
    [/nifty it/, /\b(indian it|it services|nifty it|infosys|tcs|wipro|hcltech|tech mahindra)\b/],
    [/global tech/, /\b(ai|semiconductor|software|alphabet|google|nvidia|microsoft|oracle|meta|tech|apple|iphone|mac|big tech|faang)\b/],
    [/nifty metal/, /\b(metal|metals|steel|copper|aluminium|aluminum|iron ore|china demand)\b/],
    [/rates/, /\b(yields?|bonds?|rates?|fed|inflation|powell|boe|bank of england|central bank)\b/],
    [/brent crude/, /\b(oil|crude|brent|keystone|refinery|opec)\b/],
    [/usdinr/, /\b(rupee|dollar|currency|forex|yen|usd.?inr|dxy)\b/],
    [/rural demand/, /\b(monsoon|rainfall|agri|agriculture|rural|crop|fertili[sz]er)\b/],
    [/pharma/, /\b(pharma|health|lilly|drug|fda|healthcare)\b/],
    [/autos/, /\b(auto|vehicle|tariff|ev|tesla|ancillar(?:y|ies))\b/],
    [/exporters/, /\b(tariff|trade policy|trade war|exports?|imports?|export ban|import duty)\b/]
  ];
  return checks.some(([entityPattern, textPattern]) => entityPattern.test(entity) && textPattern.test(lower));
}

function sanitizeArticleEditorialPatch(article, patch) {
  if (!patch || typeof patch !== "object") {
    return article;
  }
  const next = { ...article };
  for (const key of ["takeaway", "indiaImpact", "watchFor"]) {
    const value = cleanText(patch[key]);
    if (value && value.length >= 12 && value.length <= 260) {
      next[key] = stripTerminal(value) + ".";
    }
  }
  return next;
}

function articleEditorialUserPrompt(article, schema, usedAngles = []) {
  const priorAngles = (usedAngles ?? []).length
    ? `\nPrior India angles from earlier cards, for repetition avoidance only. Do not classify the current article from these prior angles:\n${usedAngles.map((angle, index) => `${index + 1}. ${angle}`).join("\n")}\n`
    : "";
  return `Current article:
Article headline: ${article?.headline || ""}
Publisher: ${article?.sourceName || article?.publisher || ""}
Published: ${article?.publishedAt || ""}
Article summary: ${article?.summary || ""}
Category: ${article?.category || "market"}
Entity: ${article?.entityName || "Market"}
Existing takeaway: ${article?.takeaway || ""}
Existing India impact: ${article?.indiaImpact || ""}
Existing watch: ${article?.watchFor || ""}
${priorAngles}
Rank this article like an Indian pre-market desk editor. PM/RBI/SEBI/finance-ministry policy, Brent moves above 2%, GIFT Nifty, FII/DII flows, US-China trade, and geopolitical commodity shocks outrank single-stock liveblogs or analyst-target articles.
Use only the current article to decide the entity and India transmission line. Use prior angles only to avoid repeating wording.

Generate JSON only:
{
  "takeaway": "${schema.takeaway}",
  "indiaImpact": "${schema.indiaImpact}",
  "watchFor": "${schema.watchFor}"
}`;
}

function parseArticleEditorialResponse(text) {
  const cleaned = String(text || "").replace(/```(?:json)?|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw error;
  }
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
      thumbnail: normalizeThumbnail(articleThumbnailMeta({ headline, summary: fixtureSummary(headline, category), category, entityName })),
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
  const isPulseMode = options.isPulseMode === true;
  const verified = (articles ?? []).filter((article) =>
    sourceUrlLooksArticleLevel(article.sourceUrl) && (isPulseMode || articleLooksMarketRelevant(article))
  );
  const publisherCount = new Set(verified.map((article) => article.sourceName).filter(Boolean)).size;
  const categoryCount = new Set(verified.map((article) => article.category).filter(Boolean)).size;
  const sourceCategoryBucketCount = new Set(
    verified.map((article) => `${article.sourceName || "source"}::${article.category || "market"}`)
  ).size;
  const duplicateWithPreviousPercent = overlapWithPreviousPercent(verified, options.previousDigest);
  const duplicateWithinCurrentPercent = duplicateWithinCurrentPercentForArticles(verified);

  const blockedReason = firstBlockedReason({
    isPulseMode,
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
  if (LOW_SIGNAL_LIVE_HEADLINE_PATTERN.test(text)) {
    return false;
  }
  if (isLowRelevanceUsSingleStockStory(text)) {
    return false;
  }
  if (isIndiaStartupFundingStory(text)) {
    return false;
  }
  if (isSmeIpoStory(text)) {
    return false;
  }
  if (isGenericEarningsCallSummary(text) && !isImportantEarningsStory(text)) {
    return false;
  }
  if (isWeakNeutralVolatileArticle(article, text)) {
    return false;
  }
  if (MARKET_RELEVANCE_PATTERN.test(text)) {
    return true;
  }
  return !OFF_TOPIC_WITHOUT_MARKET_PATTERN.test(text) && /(business|economy|finance|company|corporate|investor|investment)/i.test(text);
}

function isWeakNeutralVolatileArticle(article, text) {
  const category = article?.category ?? categoryFromText(text);
  return category === "neutral_volatile" && !hasSpecificMarketDriverText(text);
}

function hasSpecificMarketDriverText(value) {
  const text = String(value || "").toLowerCase();
  if (isPrivateMarketStory(text) || isIndiaEnergyStory(text) || isOilStory(text) ||
      isGeopoliticalRiskStory(text) || isIndiaPreciousMetalsPolicyStory(text) ||
      isIndiaFuelForexPolicyStory(text) || isIndiaPolicyStory(text) || isMarketInfrastructureStory(text) ||
      isIndiaInfrastructureStory(text) || isFuelInflationStory(text) ||
      isIndiaTelecomStory(text) || isCorporateActionStory(text) ||
      isTradePolicyStory(text) || isIndexRebalancingStory(text) || isMonsoonStory(text)) {
    return true;
  }
  return /\b(gift nifty|sgx nifty|nifty futures|index futures|futures premium|futures discount|vix|volatility|options?|pcr|oi buildup|put writing|call resistance|fii|dii|fpi|foreign institutional|domestic institutional|institutional flow|provisional flow|rbi|repo rate|monetary policy|liquidity|g-sec|gsec|monsoon|rainfall|agri|agriculture|rural|crop|fertili[sz]er|ipo|listing|primary market|new issue|china|hong kong|shanghai|beijing|yuan|pboc|metal|metals|steel|copper|aluminium|aluminum|iron ore|consumer spending|retail sales|consumer confidence|personal consumption|pmi|manufacturing|factory orders|industrial production|capex|deficit|fiscal|treasury borrowing|sovereign debt|bond supply)\b/.test(text);
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

function firstBlockedReason({ isPulseMode, verifiedArticleCount, sourceCategoryBucketCount, duplicateWithPreviousPercent, duplicateWithinCurrentPercent }) {
  if (verifiedArticleCount < MIN_VERIFIED_ARTICLES) {
    return `only ${verifiedArticleCount} verified article links; need at least ${MIN_VERIFIED_ARTICLES}`;
  }
  if (!isPulseMode && sourceCategoryBucketCount < MIN_SOURCE_CATEGORY_BUCKETS) {
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
  if (category.includes("macro")) {
    return `${headline} changes the macro checklist; confirm with yields, rupee, Brent and index breadth before assigning direction.`;
  }
  if (category.includes("sector")) {
    return `${headline} belongs in the sector-leadership check; use it only if related Indian names participate after the open.`;
  }
  return `${headline} is a risk-appetite cue; Nifty and Bank Nifty still need first-range confirmation.`;
}

function fixtureWhyItMatters(headline, category) {
  if (category.includes("macro")) {
    return "Macro fixture stories are useful only when they change the opening checklist for rates, currency, crude, or breadth.";
  }
  if (category.includes("sector")) {
    return "Sector fixture stories matter when they can show up in Indian leadership, not as automatic broad-index calls.";
  }
  return "Fixture stories should keep the desk in confirmation mode until price, breadth, and Bank Nifty agree.";
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
    return "Watch bond yields, spot USD/INR, DXY, Brent, and opening breadth through 9:45-10:00 AM IST.";
  }
  if (category.includes("sector")) {
    return "Watch sector leadership and follow-through after the first range; skip the read if related Indian names do not participate.";
  }
  return "Watch whether Asia cues persist into the Indian first range and whether Bank Nifty confirms.";
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
    thumbnail: normalizeThumbnail(articleThumbnailMeta({ headline, summary, category, entityName })),
    sourceUrl: normalizeSourceUrl(url),
    sentimentScore,
    entityName,
    entityMatchScore: entityMatchScoreFromText(analysisText, entityName),
    category
  };
}

function categoryFromText(text, fallback) {
  const value = text.toLowerCase();
  if (/\b(gift nifty|sgx nifty|nifty futures|index futures|futures premium|futures discount|vix|volatility|options?|pcr|oi buildup|put writing|call resistance)\b/.test(value)) {
    return "neutral_volatile";
  }
  if (isIndiaPreciousMetalsPolicyStory(value)) {
    return "macro_negative";
  }
  if (isIndiaFuelForexPolicyStory(value)) {
    return "macro_negative";
  }
  if (isIndiaPolicyStory(value)) {
    return "macro_positive";
  }
  if (/\b(boe|bank of england|central bank|governor bailey)\b/.test(value)) {
    return "macro_negative";
  }
  if (isPrivateMarketStory(value)) {
    return "neutral_volatile";
  }
  if (isLowRelevanceUsSingleStockStory(value)) {
    return "neutral_volatile";
  }
  if (isOilStory(value)) {
    return "global_risk";
  }
  if (isGeopoliticalRiskStory(value)) {
    return "global_risk";
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
  if (/\b(yields?|bonds?|inflation|rates?|fed|rbi|deficit|rupee|powell)\b/.test(value)) {
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

function isPrivateMarketStory(value) {
  const text = String(value || "").toLowerCase();
  if (/\b(blue owl|spacex|private credit deal|private-market|private market)\b/.test(text)) return true;
  // Indian startup seed / angel / early-stage raises (≤2-digit crore = startup territory)
  // Guard: skip if it's a listed-company capital-market action (QIP, bond, rights issue, IPO)
  if (
    /\braises?\s+rs\.?\s*\d{1,2}\s+crore\b/.test(text) &&
    !/\b(ipo|qip|fpo|bond|ncd|debenture|rights\s+issue|public\s+issue|listed|sebi|stock\s+exchange)\b/.test(text)
  ) return true;
  // Explicit early-stage funding language regardless of amount
  if (/\b(seed\s+(?:round|funding)|angel\s+(?:round|funding|investment)|pre.?seed\s+(?:round|funding)|venture\s+(?:round|seed)|startup\s+(?:raises?|secures?|bags?|gets?\s+funding))\b/.test(text)) return true;
  return false;
}

function isLowRelevanceUsSingleStockStory(value) {
  return /\b(carvana|used car retailer|used cars?|chipotle|paypal|venmo|netflix|paramount|hollywood|streaming wars?|disney|peloton|mcdonald['’]?s?|grindr|grove collaborative|plane tickets?|air travelers?|medical appointments?|patients who died|obesity assets?|glp-?1|wegovy)\b/i.test(String(value || ""));
}

function isIndiaStartupFundingStory(value) {
  const text = String(value || "").toLowerCase();
  // Small crore raises (≤2 digits before "crore") = seed/angel territory, not listed-co actions
  const isSmallCroreRaise = /\braises?\s+rs\.?\s*\d{1,2}\s+crore\b/.test(text);
  // Explicit early-stage language regardless of amount
  const hasStartupFundingLanguage = /\b(seed\s+(?:round|funding)|angel\s+(?:round|funding|investment)|pre.?seed\s+(?:round|funding)?|startup\s+(?:raises?|secures?|bags?|gets?\s+funding)|early.stage\s+(?:funding|capital|investment))\b/.test(text);
  if (!isSmallCroreRaise && !hasStartupFundingLanguage) return false;
  // Allow through if it's a listed-company capital-market action
  return !/\b(ipo|qip|fpo|bond|ncd|debenture|rights\s+issue|public\s+issue|stock\s+exchange|nse|bse|sebi|listed)\b/.test(text);
}

function isSmeIpoStory(value) {
  const text = String(value || "").toLowerCase();
  // SME/small-cap IPO allotment, GMP, and subscription churn — irrelevant for Nifty traders
  if (/\bsme\s+ipo\b|\bbse\s+sme\b|\bnse\s+emerge\b/.test(text)) return true;
  if (/\bipo\s+allotment\b|\ballotment\s+status\b/.test(text)) return true;
  if (/\bgrey\s+market\s+premium\b|\bgmp\b.{0,40}\bipo\b|\bipo\b.{0,40}\bgmp\b/.test(text)) return true;
  if (/\bipo\s+subscription\s+status\b|\bday\s+[123]\s+subscription\b/.test(text)) return true;
  if (/\bipo\s+listing\s+(?:price\s+)?prediction\b|\blisting\s+gain\s+prediction\b/.test(text)) return true;
  return false;
}

function isGenericEarningsCallSummary(value) {
  return /\bq[1-4]\s+earnings call highlights\b/i.test(String(value || ""));
}

function isImportantEarningsStory(value) {
  return /\b(apple|amazon|meta|alphabet|google|microsoft|nvidia|big tech|faang|mega-cap|mag.?7|infosys|tcs|wipro|hcltech|tech mahindra|reliance|hdfc bank|icici bank|axis bank|sbi|kotak|bajaj finance|maruti|tata motors|airtel|larsen|ltimindtree|mcx|bank|banks|banking|financial|financials|credit|deposit|loan|nbfc)\b/i.test(String(value || ""));
}

function isTradePolicyStory(value) {
  const lower = String(value || "");
  if (/\bai trade\b/.test(lower)) {
    return false;
  }
  return /\b(tariff|trade policy|trade war|exports?|imports?)\b/.test(lower);
}

function isIndiaPolicyStory(value) {
  const lower = String(value || "");
  if (/\b(us budget|uk budget|federal budget|congressional budget)\b/.test(lower)) {
    return false;
  }
  if (isIndiaFuelForexPolicyStory(lower)) {
    return true;
  }
  return /\b(gst|goods and services tax|sebi|pli|production[-\s]?linked incentive|union budget|india budget|budget 2026|finance ministry|ministry of finance|mpc|monetary policy committee|rbi policy|securities transaction tax|stt|capital gains tax|tax rule|government capex|disinvestment|psu divestment|import duty|customs duty|basic customs duty|bcd|import tariff|import levy|import tax|export duty|anti-dumping|safeguard duty)\b/.test(lower);
}

function isIndiaPreciousMetalsPolicyStory(value) {
  const lower = String(value || "");
  return /\b(gold|silver|bullion|precious metal|sovereign gold bond|sgb|gold etf|mcx gold|mcx silver|jeweller(?:y|s)?)\b/.test(lower) &&
    /\b(tariff|import duty|customs duty|basic customs duty|bcd|import tax|import levy|import on gold|gold duty|silver duty|import on silver|tax on gold|tax on silver|export duty)\b/.test(lower);
}

function isIndiaFuelForexPolicyStory(value) {
  const lower = String(value || "");
  return /\b(modi|narendra modi|pm modi|prime minister modi|indian prime minister|pmo|petroleum minister|hardeep singh puri|ministry of petroleum|government of india|indian government|centre)\b/.test(lower) &&
    /\b(fuel|petrol|diesel|gasoline|gas|lpg|crude|oil|energy|foreign exchange|forex|current account|gold|silver|foreign travel|work[-\s]?from[-\s]?home|remote work|conserve|conservation|import bill|oil imports?)\b/.test(lower);
}

function isGeopoliticalRiskStory(value) {
  return /\b(war|military|missile|strike|airstrike|conflict|geopolit|iran|israel|russia|ukraine|taiwan strait|south china sea|nato|sanctions|ceasefire|border tension|red sea|hormuz)\b/.test(String(value || ""));
}

function isMarketInfrastructureStory(value) {
  return /\b(mcx|multi commodity exchange|commodity exchange|exchange revenue|trading volume|clearing corporation|depository|capital-market infrastructure|msci|msci rebalanc|msci index|msci inclusion|msci exclusion|msci weight|msci review|msci semi-annual|morgan stanley capital international|index rebalanc|index reshuffle|index reconstitut|passive fund|etf rebalanc|benchmark rebalanc|ftse rebalanc|nifty50 rebalanc|sensex rebalanc|index weight change|index reshuffle|block deal|bulk deal.*index|index.*bulk deal)\b/i.test(String(value || ""));
}

function isIndexRebalancingStory(value) {
  return /\b(msci|ftse|s&p.*index|nifty.*reshuffle|index.*inclusion|index.*exclusion|index.*weight|rebalanc|reconstitut|index review|passive.*outflow|passive.*inflow|etf.*flow)\b/i.test(String(value || ""));
}

function isMonsoonStory(value) {
  return /\b(monsoon|imd|india meteorological|rainfall|kharif|rabi|el ni[nñ]o|la ni[nñ]a|southwest monsoon|below.?normal|above.?normal|monsoon.*forecast|monsoon.*predict|monsoon.*deficit|monsoon.*progress|monsoon.*arrival|delayed monsoon|weak monsoon)\b/i.test(String(value || ""));
}

function isIndiaInfrastructureStory(value) {
  return /\b(arisinfra|infra solutions|construction materials|building materials|cement demand|roads?|highways?|infrastructure (?:orders?|capex|projects?|earnings|revenue))\b/i.test(String(value || ""));
}

function isFuelInflationStory(value) {
  return /\b(gas prices|fuel prices|petrol|diesel|gasoline)\b/i.test(String(value || ""));
}

function isIndiaTelecomStory(value) {
  return /\b(vodafone idea|vodafone|bharti airtel|airtel|jio|telecom|telco|spectrum|average revenue per user|arpu)\b/i.test(String(value || ""));
}

function isCorporateActionStory(value) {
  return /\b(corporate actions?|bonus issues?|stock splits?|split shares?|dividends?|ex-date|ex date|record date|turning ex-date|buyback|rights issue)\b/.test(String(value || ""));
}

function articleIsFreshForDigest(article, digestDate, isPulseMode = false) {
  const published = Date.parse(article.publishedAt);
  const digestTime = Date.parse(`${digestDate}T07:15:00+05:30`);
  if (!Number.isFinite(published) || !Number.isFinite(digestTime)) {
    return true;
  }
  const ageHours = (digestTime - published) / (60 * 60 * 1000);
  if (isPulseMode) {
    return ageHours <= 20 && ageHours >= -48;
  }
  return ageHours <= 120 && ageHours >= -48;
}

function prioritizeDigestWindowArticles(articles, digestDate) {
  const digestTime = Date.parse(`${digestDate}T07:15:00+05:30`);
  if (!Number.isFinite(digestTime)) {
    return articles;
  }
  return [...articles].sort((left, right) => {
    const leftScore = digestWindowScore(left, digestTime);
    const rightScore = digestWindowScore(right, digestTime);
    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }
    return Date.parse(right.publishedAt || "") - Date.parse(left.publishedAt || "");
  });
}

function digestWindowScore(article, digestTime) {
  const published = Date.parse(article.publishedAt || "");
  if (!Number.isFinite(published)) {
    return 0;
  }
  const ageHours = (digestTime - published) / (60 * 60 * 1000);
  if (ageHours >= -1 && ageHours <= 24) {
    return 3;
  }
  if (ageHours > 24 && ageHours <= 120) {
    return 1;
  }
  return 0;
}

function takeawayFromArticle(headline, summary, category, entityName) {
  const lower = `${headline} ${summary}`.toLowerCase();
  const fact = articleFactSentence(headline, summary);
  const thematic = thematicFallbackReadthrough(lower, category, entityName);
  if (isIndiaEnergyStory(lower)) {
    return compactWords(`${fact}; India power demand, coal use and fuel supply make energy breadth and inflation the local checks.`, 35);
  }
  if (isIndiaPreciousMetalsPolicyStory(lower) && thematic.takeaway) {
    return compactWords(`${fact}; ${thematic.takeaway}`, 35);
  }
  if (isIndiaPolicyStory(lower) && thematic.takeaway) {
    return compactWords(`${fact}; ${thematic.takeaway}`, 35);
  }
  if (isFuelInflationStory(lower) && thematic.takeaway) {
    return compactWords(`${fact}; ${thematic.takeaway}`, 35);
  }
  if (isIndiaInfrastructureStory(lower) && thematic.takeaway) {
    return compactWords(`${fact}; ${thematic.takeaway}`, 35);
  }
  if (isIndiaTelecomStory(lower) && thematic.takeaway) {
    return compactWords(`${fact}; ${thematic.takeaway}`, 35);
  }
  if (isMarketInfrastructureStory(lower) && thematic.takeaway) {
    return compactWords(`${fact}; ${thematic.takeaway}`, 35);
  }
  if (isOilStory(lower)) {
    return compactWords(`${fact}; ${oilReadthrough(lower).takeaway}`, 35);
  }
  if (/\b(fed|yields?|bonds?|rates?|inflation|powell|boe|bank of england|central bank|governor bailey)\b/.test(lower)) {
    return compactWords(`${fact}; ${ratesReadthrough(lower).takeaway}`, 35);
  }
  if (isTradePolicyStory(lower)) {
    return compactWords(`${fact}; ${tradeReadthrough(lower).takeaway}`, 35);
  }
  if (isLowRelevanceUsSingleStockStory(lower)) {
    return compactWords(`${fact}; keep it as a US single-stock cue, not an India opening signal.`, 35);
  }
  if (/\b(metal|metals|steel|copper|aluminium|aluminum|iron ore|china demand)\b/.test(lower) && thematic.takeaway) {
    return compactWords(`${fact}; ${thematic.takeaway}`, 35);
  }
  if (/\b(earnings|revenue|profit|guidance|results?)\b/.test(lower)) {
    return compactWords(`${fact}; ${earningsReadthrough(lower, entityName).takeaway}`, 35);
  }
  if (/\b(airline|airlines|spirit)\b/.test(lower)) {
    return compactWords(`${fact}; ${aviationReadthrough(lower).takeaway}`, 35);
  }
  if (isPrivateMarketStory(lower)) {
    return compactWords(`${fact}; keep it as private-market risk appetite, not an Indian financial-sector signal.`, 35);
  }
  if (/\b(ai|semiconductor|software|alphabet|nvidia|tech)\b/.test(lower)) {
    return compactWords(`${fact}; ${techReadthrough(lower, entityName).takeaway}`, 35);
  }
  if (thematic.takeaway) {
    return compactWords(`${fact}; ${thematic.takeaway}`, 35);
  }
  if (category === "macro_positive") {
    return compactWords(`${fact}; treat it as risk-appetite support only after Indian breadth confirms beyond the opening range.`, 35);
  }
  if (category === "sector_negative") {
    return compactWords(`${fact}; make it a sector warning only if related Indian names weaken and breadth confirms the pressure.`, 35);
  }
  return compactWords(`${fact}; treat ${entityName} as a watchlist cue only after related Indian sector breadth confirms.`, 35);
}

function whyItMattersFromArticle(headline, summary, category, entityName) {
  const lower = `${headline} ${summary}`.toLowerCase();
  const thematic = thematicFallbackReadthrough(lower, category, entityName);
  if (isIndiaEnergyStory(lower)) {
    return "This is directly India-linked: power demand, fuel mix and import costs can affect utilities, industrial margins, and inflation expectations.";
  }
  if (isIndiaPreciousMetalsPolicyStory(lower) && thematic.whyItMatters) {
    return thematic.whyItMatters;
  }
  if (isIndiaPolicyStory(lower) && thematic.whyItMatters) {
    return thematic.whyItMatters;
  }
  if (isFuelInflationStory(lower) && thematic.whyItMatters) {
    return thematic.whyItMatters;
  }
  if (isIndiaInfrastructureStory(lower) && thematic.whyItMatters) {
    return thematic.whyItMatters;
  }
  if (isIndiaTelecomStory(lower) && thematic.whyItMatters) {
    return thematic.whyItMatters;
  }
  if (isMarketInfrastructureStory(lower) && thematic.whyItMatters) {
    return thematic.whyItMatters;
  }
  if (isCorporateActionStory(lower) && thematic.whyItMatters) {
    return thematic.whyItMatters;
  }
  if (isOilStory(lower)) {
    return "India imports most of its crude, so the same story can pressure inflation expectations while helping upstream energy.";
  }
  if (/\b(fed|yields?|bonds?|rates?|inflation)\b/.test(lower)) {
    return "Rate-sensitive sectors need yield stability; without that, gap-up moves in high-duration names deserve skepticism.";
  }
  if (isPrivateMarketStory(lower)) {
    return "Private-market marks can show risk appetite, but they do not map cleanly to listed Indian lenders.";
  }
  if (/\b(bank|credit|loan|deposit|jpmorgan|private credit)\b/.test(lower)) {
    return "Financial cues matter because Bank Nifty often decides whether a Nifty move becomes a trend or just a gap reaction.";
  }
  if (/\b(earnings|guidance|revenue|profit)\b/.test(lower)) {
    return "Earnings stories are useful only when they reveal margin, demand, or guidance that can travel to Indian peers.";
  }
  if (isLowRelevanceUsSingleStockStory(lower)) {
    return "This is useful as broad US risk-appetite context, but it has no clean listed-India transmission line.";
  }
  if (isTradePolicyStory(lower)) {
    return "Trade headlines can split sectors; exporters, importers, and domestic cyclicals need separate confirmation.";
  }
  if (/\b(metal|metals|steel|copper|aluminium|aluminum|iron ore|china demand)\b/.test(lower) && thematic.whyItMatters) {
    return thematic.whyItMatters;
  }
  if (thematic.whyItMatters) {
    return thematic.whyItMatters;
  }
  if (category.includes("macro")) {
    return `${entityName} can change the macro checklist, but the India open still needs confirmation from breadth, currency, or rates.`;
  }
  if (category.includes("sector")) {
    return `${entityName} matters only if the related Indian sector joins the move after the first range.`;
  }
  return `${entityName} stays on the watchlist until Nifty breadth and Bank Nifty confirm.`;
}

function indiaImpactFromArticle(headline, summary, category, entityName) {
  const lower = `${headline} ${summary}`.toLowerCase();
  const thematic = thematicFallbackReadthrough(lower, category, entityName);
  if (hasNoDirectIndiaRead(lower, category)) {
    return globalOnlyIndiaContext();
  }
  if (isPrivateMarketStory(lower)) {
    return globalOnlyIndiaContext();
  }
  if (isLowRelevanceUsSingleStockStory(lower)) {
    return globalOnlyIndiaContext();
  }
  if (isIndiaEnergyStory(lower)) {
    return "Direct India read-through: power, utilities, cement/metals costs and inflation expectations are the checks; confirm with energy and industrial breadth.";
  }
  if (isIndiaPreciousMetalsPolicyStory(lower) && thematic.indiaImpact) {
    return thematic.indiaImpact;
  }
  if (isIndiaPolicyStory(lower) && thematic.indiaImpact) {
    return thematic.indiaImpact;
  }
  if (isFuelInflationStory(lower) && thematic.indiaImpact) {
    return thematic.indiaImpact;
  }
  if (isIndiaInfrastructureStory(lower) && thematic.indiaImpact) {
    return thematic.indiaImpact;
  }
  if (isIndiaTelecomStory(lower) && thematic.indiaImpact) {
    return thematic.indiaImpact;
  }
  if (isMarketInfrastructureStory(lower) && thematic.indiaImpact) {
    return thematic.indiaImpact;
  }
  if (isCorporateActionStory(lower) && thematic.indiaImpact) {
    return thematic.indiaImpact;
  }
  if (isOilStory(lower)) {
    return oilReadthrough(lower).indiaImpact;
  }
  if (/\b(fed|yields?|bonds?|rates?|inflation|powell|boe|bank of england|central bank|governor bailey)\b/.test(lower)) {
    return ratesReadthrough(lower).indiaImpact;
  }
  if (/\b(rupee|dollar|currency|yen|forex)\b/.test(lower)) {
    return "Bullish for IT exporters if rupee weakness is orderly, bearish for imported-cost sectors. Confirm with USD/INR and Nifty IT breadth.";
  }
  if (/\b(bank|credit|loan|deposit|jpmorgan|private credit)\b/.test(lower)) {
    if (isPrivateMarketStory(lower)) {
      return globalOnlyIndiaContext();
    }
    return "Bank Nifty, private banks and NBFCs are the direct check; weak financial breadth can cap Nifty even if global cues are firm.";
  }
  if (/\b(metal|metals|steel|copper|aluminium|aluminum|iron ore|china demand)\b/.test(lower) && thematic.indiaImpact) {
    return thematic.indiaImpact;
  }
  if (/\b(ai|semiconductor|software|alphabet|nvidia|tech)\b/.test(lower)) {
    return techReadthrough(lower, entityName).indiaImpact;
  }
  if (/\b(apple|iphone|mac|big tech|faang)\b/.test(lower)) {
    return "Nifty IT gets a conditional read-through only if Nasdaq futures, USD/INR and exporter breadth support the open.";
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
  if (isTradePolicyStory(lower)) {
    return tradeReadthrough(lower).indiaImpact;
  }
  if (thematic.indiaImpact) {
    return thematic.indiaImpact;
  }
  if (category === "macro_positive") {
    return "Global earnings support risk appetite only if Indian breadth confirms after the first range.";
  }
  if (category === "sector_negative") {
    return "Treat this as a sector caution flag; index action needs confirmation from banks and breadth.";
  }
  return entityName === "Market"
    ? globalOnlyIndiaContext()
    : `${entityName} needs related Indian peer breadth before it becomes more than a watchlist cue.`;
}

function globalOnlyIndiaContext() {
  return "Global-only context: no direct India trade read; use it only if index futures, sector breadth, currency, or rates confirm after the open.";
}

function watchForFromArticle(headline, summary, category, entityName) {
  const lower = `${headline} ${summary}`.toLowerCase();
  const thematic = thematicFallbackReadthrough(lower, category, entityName);
  if (hasNoDirectIndiaRead(lower, category)) {
    return "No specific watch for this article.";
  }
  if (isPrivateMarketStory(lower)) {
    return "No specific watch for this article.";
  }
  if (isLowRelevanceUsSingleStockStory(lower)) {
    return "No specific watch for this article.";
  }
  if (isIndiaEnergyStory(lower)) {
    return "Watch power, energy and industrial breadth after the open; broad-index bias needs confirmation outside the headline.";
  }
  if (isIndiaPreciousMetalsPolicyStory(lower) && thematic.watchFor) {
    return thematic.watchFor;
  }
  if (isIndiaPolicyStory(lower) && thematic.watchFor) {
    return thematic.watchFor;
  }
  if (isFuelInflationStory(lower) && thematic.watchFor) {
    return thematic.watchFor;
  }
  if (isIndiaInfrastructureStory(lower) && thematic.watchFor) {
    return thematic.watchFor;
  }
  if (isIndiaTelecomStory(lower) && thematic.watchFor) {
    return thematic.watchFor;
  }
  if (isMarketInfrastructureStory(lower) && thematic.watchFor) {
    return thematic.watchFor;
  }
  if (isCorporateActionStory(lower) && thematic.watchFor) {
    return thematic.watchFor;
  }
  if (isOilStory(lower)) {
    return oilReadthrough(lower).watchFor;
  }
  if (/\b(fed|yields?|bonds?|rates?|inflation|boe|bank of england|central bank|governor bailey)\b/.test(lower)) {
    return ratesReadthrough(lower).watchFor;
  }
  if (/\b(rupee|dollar|currency|yen|forex)\b/.test(lower)) {
    return "Watch spot USD/INR against its morning range and DXY in the first hour; pressure splits exporters from importers.";
  }
  if (/\b(bank|credit|loan|deposit|jpmorgan|private credit)\b/.test(lower)) {
    if (isPrivateMarketStory(lower)) {
      return "No specific watch for this article.";
    }
    return "Watch private-bank breadth through 9:45-10:00 AM IST; no long bias if financials lag Nifty.";
  }
  if (/\b(metal|metals|steel|copper|aluminium|aluminum|iron ore|china demand)\b/.test(lower) && thematic.watchFor) {
    return thematic.watchFor;
  }
  if (/\b(ai|semiconductor|software|alphabet|nvidia|tech)\b/.test(lower)) {
    return techReadthrough(lower, entityName).watchFor;
  }
  if (/\b(apple|iphone|mac|big tech|faang)\b/.test(lower)) {
    return "Watch Nasdaq futures, USD/INR and Nifty IT participation together; Apple alone is not a local trade trigger.";
  }
  if (/\b(airline|airlines|spirit|travel|jet fuel)\b/.test(lower)) {
    return aviationReadthrough(lower).watchFor;
  }
  if (isTradePolicyStory(lower)) {
    return "Watch exporter and auto-ancillary participation after the first range; avoid trading the tariff headline alone.";
  }
  if (thematic.watchFor) {
    return thematic.watchFor;
  }
  return `Watch ${entityName} peer participation after 9:45 AM; no index bias unless banks and Nifty hold morning averages.`;
}

function thematicFallbackReadthrough(lower, category, entityName) {
  const text = String(lower || "");
  if (isIndiaPreciousMetalsPolicyStory(text)) {
    return {
      takeaway: "India import duty change on gold or silver directly shifts domestic landed cost and MCX price discovery; the jewellery sector reprices immediately.",
      whyItMatters: "A tariff on gold or silver imports changes MCX spot vs. international gold spread, landed cost for jewellers, and sovereign gold bond premiums — all before the equity open.",
      indiaImpact: "MCX Gold, MCX Silver, listed jewellers (Titan, Kalyan, Senco), SGBs and gold ETFs need re-pricing; import cost change is immediate and measurable.",
      watchFor: "Watch MCX Gold open vs. international spot gap, USD/INR for transmission magnitude, and jeweller breadth (Titan, Kalyan, Senco) by 9:45 AM IST."
    };
  }
  if (isIndiaFuelForexPolicyStory(text)) {
    return {
      takeaway: "India's fuel and forex conservation appeal is a domestic risk signal tied to crude, current account pressure and consumption.",
      whyItMatters: "When policy messaging asks households and businesses to save fuel, gold and foreign exchange, traders should read it as macro stress, not routine politics.",
      indiaImpact: "OMCs, aviation, tyres, paints, jewellery, autos, USD/INR and Bank Nifty are the first India checks; broad Nifty needs breadth confirmation.",
      watchFor: "Watch Brent, USD/INR, OMCs, aviation, jewellery and Bank Nifty breadth through the first range."
    };
  }
  if (isGeopoliticalRiskStory(text)) {
    return {
      takeaway: "geopolitical escalation is a defensive signal that travels through crude, gold, currencies and FII flows before equities.",
      whyItMatters: "Military and conflict headlines move India through Brent crude, safe-haven dollar demand and FII risk appetite, not directly.",
      indiaImpact: "Brent crude, USD/INR, gold and FII provisional flow data are the direct India checks; broad index bias needs breadth.",
      watchFor: "Watch Brent at the Asia open, USD/INR and gold before assigning defensive weight to the India open."
    };
  }
  if (isIndiaPolicyStory(text)) {
    return {
      takeaway: "India policy is a direct domestic catalyst; map the rule change to banks, consumption, exporters or listed sectors before trading it.",
      whyItMatters: "GST, SEBI, PLI, Budget and MPC signals can change sector earnings, liquidity or positioning before global cues matter.",
      indiaImpact: "Direct India read-through: Bank Nifty, affected sectors and listed beneficiaries need breadth confirmation after the first range.",
      watchFor: "Watch affected-sector breadth, Bank Nifty VWAP and official follow-up circulars through the first range."
    };
  }
  if (isFuelInflationStory(text)) {
    return {
      takeaway: "fuel inflation is a margin and consumption pressure cue, not a standalone index signal.",
      whyItMatters: "Higher petrol, diesel or gasoline pressure travels to India through inflation expectations, OMCs, aviation, tyres and consumer demand.",
      indiaImpact: "Watch OMCs, aviation, tyres, paints and consumer breadth; broad Nifty pressure needs USD/INR and Bank Nifty confirmation.",
      watchFor: "Watch Brent, USD/INR and fuel-sensitive sector breadth after the open."
    };
  }
  if (isIndiaInfrastructureStory(text)) {
    return {
      takeaway: "infrastructure earnings are stock-specific domestic demand evidence before they become an index cue.",
      whyItMatters: "Infrastructure and building-material names can show capex demand, but the read-through needs peer breadth and order-book confirmation.",
      indiaImpact: "Watch infrastructure, cement, capital-goods and construction-material peers; broad Nifty needs Bank Nifty and breadth confirmation.",
      watchFor: "Watch infra peer breadth, cement/capital-goods participation and Bank Nifty VWAP after the open."
    };
  }
  if (/\b(fii|dii|fpi|foreign institutional|domestic institutional|institutional flow|provisional flow|cash market flow)\b/.test(text)) {
    return {
      takeaway: "institutional flow is the domestic risk check; price still has to confirm it after the opening range.",
      whyItMatters: "FII/DII direction can explain whether global cues are being absorbed or rejected by local cash-market demand.",
      indiaImpact: "Nifty and Bank Nifty need breadth aligned with FII/DII flow before the morning bias deserves follow-through weight.",
      watchFor: "Watch FII/DII provisional flow, Nifty VWAP and Bank Nifty breadth through 9:45 AM."
    };
  }
  if (/\b(rbi|repo rate|monetary policy|liquidity|crr|slr|g-sec|gsec|government bond|india bond yield)\b/.test(text)) {
    return {
      takeaway: "RBI and liquidity cues travel first through banks, rates and rate-sensitive sectors.",
      whyItMatters: "Policy liquidity can support or cap risk appetite, but the market needs Bank Nifty and local yields to confirm it.",
      indiaImpact: "Bank Nifty, realty, autos and NBFCs are the direct checks; broad Nifty weight needs domestic breadth.",
      watchFor: "Watch G-sec yields, Bank Nifty VWAP and rate-sensitive breadth after the open."
    };
  }
  if (/\b(monsoon|rainfall|rain|kharif|rabi|agri|agriculture|rural|crop|fertili[sz]er)\b/.test(text)) {
    return {
      takeaway: "monsoon and rural cues matter through consumption, agri inputs and inflation expectations.",
      whyItMatters: "Weather-linked demand can support FMCG, tractors, fertilisers and rural lenders, but it needs domestic sector breadth.",
      indiaImpact: "FMCG, autos, fertilisers and rural-finance names are the India checks; Nifty bias still needs banks to confirm.",
      watchFor: "Watch FMCG, tractor, fertiliser and rural-lender breadth; broad bias needs Bank Nifty support."
    };
  }
  if (/\b(ipo|listing|primary market|new issue|qib|anchor investor|grey market|gmp)\b/.test(text)) {
    return {
      takeaway: "primary-market demand is a risk-appetite read, not an automatic index signal.",
      whyItMatters: "Strong listings can support sentiment, but they need cash-market breadth before changing the morning Nifty map.",
      indiaImpact: "Use IPO demand as a liquidity and midcap sentiment check; Nifty direction still needs Bank Nifty confirmation.",
      watchFor: "Watch listing-day breadth, midcap participation and Bank Nifty VWAP before treating IPO demand as broadly constructive."
    };
  }
  if (isIndiaTelecomStory(text)) {
    return {
      takeaway: "telecom capital and stake stories are sector-specific India catalysts, not broad-index signals by themselves.",
      whyItMatters: "Telecom funding, ARPU and balance-sheet changes can move Vodafone Idea, Bharti Airtel and related lenders without deciding Nifty direction.",
      indiaImpact: "Watch Vodafone Idea, Bharti Airtel, telecom peers and lender exposure; broad Nifty bias still needs Bank Nifty and breadth confirmation.",
      watchFor: "Watch telecom peer breadth, Vodafone Idea volume and Bank Nifty VWAP after the open."
    };
  }
  if (isMarketInfrastructureStory(text)) {
    return {
      takeaway: "market-infrastructure results are a stock-specific capital-market activity cue, not a broad index signal by themselves.",
      whyItMatters: "Exchange and clearing businesses respond to trading volume, product mix and volatility; the read-through is financial-market infrastructure first.",
      indiaImpact: "Watch MCX, exchanges, brokers and capital-market infrastructure peers; broad Nifty bias still needs Bank Nifty and breadth confirmation.",
      watchFor: "Watch MCX volume reaction, broker/exchange peer breadth and Bank Nifty VWAP after the open."
    };
  }
  if (isIndexRebalancingStory(text)) {
    return {
      takeaway: "index rebalancing is a pre-scheduled, mechanical event — passive funds must buy or sell on a fixed date regardless of market conditions. The selling pressure is temporary and ends once the rebalancing date passes.",
      whyItMatters: "MSCI conducts 4 reviews a year — 2 quarterly (February, August) and 2 major semi-annual (May, November). The May and November reviews are the large ones where index weights change significantly. Global ETFs tracking MSCI must execute trades by the close on the effective date, regardless of fundamentals. This can move Nifty 1–2% in the final 30–60 minutes. Once the date passes, the mechanical selling stops and markets typically stabilize or recover.",
      indiaImpact: "An MSCI-driven drop is NOT a signal of deteriorating fundamentals — it is a flow event with a known end date. Once the rebalancing is complete, the artificial selling pressure disappears. Stocks added to the index often recover quickly as the same passive funds that sold other names must now hold the new additions.",
      watchFor: "The trading day after the effective rebalancing date is often calmer or even a relief bounce. Watch for block deals and late-session divergence between futures and cash as the live tell that rebalancing flows are active."
    };
  }
  if (isMonsoonStory(text)) {
    return {
      takeaway: "monsoon forecast and progress are India's single biggest domestic macro variable — a below-normal monsoon raises food inflation, hits rural demand and pressures RBI on rate cuts.",
      whyItMatters: "India's agriculture depends on the southwest monsoon (June–September). A weak or delayed monsoon lifts vegetable and food prices, reduces kharif crop output, squeezes rural wages and delays consumption recovery in FMCG and rural-focused sectors.",
      indiaImpact: "FMCG, agri-input companies, rural NBFCs and two-wheeler companies are most exposed to monsoon risk. A below-normal forecast typically causes Nifty FMCG and auto to underperform and reduces the probability of an RBI rate cut.",
      watchFor: "Track IMD's weekly monsoon progress reports and the June 1 onset date. A 10%+ rainfall deficit by July is the threshold where market pricing starts to shift materially."
    };
  }
  if (isCorporateActionStory(text)) {
    return {
      takeaway: "corporate actions are stock-specific flow triggers; they do not become an index signal without sector breadth.",
      whyItMatters: "Bonus issues, splits, dividends and ex-dates can move individual counters, but the morning index read still needs breadth.",
      indiaImpact: "Track the named stocks, sector peers and cash-market volume; broad Nifty or Bank Nifty bias needs separate confirmation.",
      watchFor: "Watch ex-date names, delivery volume and sector peer breadth after the open; avoid turning one corporate action into an index trade."
    };
  }
  if (/\b(china|hong kong|shanghai|beijing|yuan|pboc|property stimulus)\b/.test(text)) {
    return {
      takeaway: "China cues matter for India through metals, chemicals, commodities and regional risk appetite.",
      whyItMatters: "China strength can lift cyclicals, but India needs Nifty Metal and domestic breadth before it becomes a broad cue.",
      indiaImpact: "Nifty Metal, chemicals and capital-goods suppliers are the direct checks; broad conviction needs banks to join.",
      watchFor: "Watch Nifty Metal breadth, China futures and Bank Nifty VWAP through the first range."
    };
  }
  if (/\b(gift nifty|sgx nifty|nifty futures|index futures|futures premium|futures discount)\b/.test(text)) {
    return {
      takeaway: "treat futures premium or discount as the opening-gap input, not a finished trade view.",
      whyItMatters: "Gift Nifty is the cleanest pre-9:15 cue, but cash-market breadth and Bank Nifty decide whether the gap holds.",
      indiaImpact: "Direct index read-through: Nifty gap direction matters first; Bank Nifty confirmation decides whether it becomes a trend.",
      watchFor: "Watch Gift Nifty premium/discount into 9:15 AM, then Nifty VWAP and Bank Nifty breadth."
    };
  }
  if (isTradePolicyStory(text)) {
    return {
      takeaway: tradeReadthrough(text).takeaway,
      whyItMatters: "Trade-policy stories split sectors instead of moving India as one block.",
      indiaImpact: tradeReadthrough(text).indiaImpact,
      watchFor: tradeReadthrough(text).watchFor
    };
  }
  if (/\b(metal|metals|steel|copper|aluminium|aluminum|china demand|iron ore)\b/.test(text)) {
    return {
      takeaway: "metals news is a China-demand and commodity-margin cue, not a full-index signal by itself.",
      whyItMatters: "Metal stocks can lead or lag independently; traders need China, commodity prices and domestic sector breadth aligned.",
      indiaImpact: "Nifty Metal and capital-goods suppliers are the direct checks; broad Nifty conviction needs banks to confirm.",
      watchFor: "Watch Nifty Metal breadth, China futures and Bank Nifty VWAP together after the first range."
    };
  }
  if (/\b(us|u\.s\.|america|american)\b.*\b(consumer spending|retail sales|consumer confidence|personal consumption|discretionary demand)\b|\b(consumer spending|retail sales|consumer confidence|personal consumption)\b.*\b(us|u\.s\.|america|american)\b/.test(text)) {
    return {
      takeaway: "US consumer demand is a global risk cue; India needs local consumption and lender breadth before it becomes domestic evidence.",
      whyItMatters: "Retail spending can support global cyclicals, but Indian traders should separate exporter sentiment from FMCG, autos and retail lenders.",
      indiaImpact: "FMCG, autos, discretionary names and retail lenders are the India checks; broad Nifty conviction still needs Bank Nifty.",
      watchFor: "Watch FMCG, auto and retail-lender breadth with Bank Nifty VWAP after the first range."
    };
  }
  if (/\b(uk|britain|eurozone|europe|germany|france)\b.*\b(gdp|growth|pmi|services|manufacturing|industrial production)\b|\b(gdp|pmi|services|manufacturing|industrial production)\b.*\b(uk|britain|eurozone|europe|germany|france)\b/.test(text)) {
    return {
      takeaway: "European growth data is export-demand context, not a standalone India index signal.",
      whyItMatters: "A stronger Europe can support risk appetite and exporters, but India still needs currency, IT and sector breadth to confirm.",
      indiaImpact: "IT exporters, autos, pharma exporters and USD/INR are the India checks; Bank Nifty decides index follow-through.",
      watchFor: "Watch Nifty IT, pharma exporters, USD/INR and Bank Nifty VWAP after the open."
    };
  }
  if (/\b(global|us|u\.s\.|china|asia)\b.*\b(pmi|manufacturing|factory orders|industrial production|capex)\b|\b(pmi|manufacturing|factory orders|industrial production|capex)\b.*\b(global|us|u\.s\.|china|asia)\b/.test(text)) {
    return {
      takeaway: "manufacturing data is a cyclicals check; India needs sector breadth before the macro print has trading weight.",
      whyItMatters: "Factory and capex data can move metals, capital goods and exporters differently, so the index read needs sector confirmation.",
      indiaImpact: "Nifty Metal, capital goods, autos and exporters are the checks; broad Nifty needs banks to join.",
      watchFor: "Watch metals, capital goods, exporters and Bank Nifty VWAP through 9:45 AM."
    };
  }
  if (/\b(deficit|fiscal|treasury borrowing|debt ceiling|sovereign debt|bond supply)\b/.test(text)) {
    return {
      takeaway: "fiscal stress is a yield and currency risk cue before it is an equity signal.",
      whyItMatters: "Debt and deficit stories matter for India only if yields, DXY or USD/INR tighten financial conditions.",
      indiaImpact: "Bank Nifty, rate-sensitive sectors and USD/INR are the direct checks; avoid broad bias if yields stay calm.",
      watchFor: "Watch US yields, DXY, USD/INR and Bank Nifty VWAP before assigning defensive weight."
    };
  }
  if (/\b(consumer|retail sales?|spending|sentiment|discretionary|fmcg|rural demand)\b/.test(text)) {
    return {
      takeaway: "consumer demand is a selective risk cue; India needs FMCG, auto and retail breadth before it matters.",
      whyItMatters: "Consumption stories can support defensives or autos, but they do not become broad-index evidence without domestic participation.",
      indiaImpact: "FMCG, autos, retail lenders and discretionary names are the India checks; Nifty bias needs breadth outside defensives.",
      watchFor: "Watch FMCG, auto and retail-lender breadth after the first range; avoid a broad Nifty read if banks lag."
    };
  }
  if (/\b(vix|volatility|options?|hedg(?:e|ing)|put writing|call resistance|pcr|oi buildup)\b/.test(text)) {
    return {
      takeaway: "options and volatility cues define sizing discipline; direction still needs cash breadth confirmation.",
      whyItMatters: "High volatility changes risk management first: option writers need evidence before the market deserves directional size.",
      indiaImpact: "Nifty and Bank Nifty option positioning matter through India VIX, PCR, put writing and call resistance after the open.",
      watchFor: "Watch India VIX, PCR, put writing and call resistance through 9:45 AM before sizing direction."
    };
  }
  if (/\b(pharma|drug|fda|healthcare|hospital|diagnostic)\b/.test(text)) {
    return {
      takeaway: "healthcare news belongs in defensives and stock-specific read-through before it becomes an index input.",
      whyItMatters: "Pharma can cushion weak markets, but a defensive bid is different from broad risk appetite.",
      indiaImpact: "Nifty Pharma and healthcare are the direct checks; use them as defensive leadership unless banks and breadth join.",
      watchFor: "Watch Nifty Pharma breadth and defensive rotation; broad index bias still needs Bank Nifty confirmation."
    };
  }
  if (/\b(auto|vehicle|ev|two-wheeler|passenger vehicle|ancillar(?:y|ies)|battery)\b/.test(text)) {
    return {
      takeaway: "auto news separates domestic demand from export and input-cost exposure.",
      whyItMatters: "Autos can react to volumes, rates, fuel, tariffs or currency; the transmission channel decides the trade.",
      indiaImpact: "Nifty Auto, ancillaries and auto-finance lenders are the checks; imported-cost pressure can split winners from laggards.",
      watchFor: "Watch Nifty Auto breadth, auto-finance names and USD/INR; avoid treating one global EV story as an index cue."
    };
  }
  if (category === "macro_positive") {
    return {
      takeaway: "risk appetite is supportive only if Indian breadth confirms beyond the first range.",
      whyItMatters: "Macro-positive headlines can lift the open, but they need currency, Bank Nifty and breadth to turn into trend evidence.",
      indiaImpact: "Nifty can open firmer, but Bank Nifty, USD/INR and advance-decline must confirm before the read gets trading weight.",
      watchFor: "Watch Nifty VWAP, Bank Nifty breadth and USD/INR through 9:45 AM before trusting the constructive read."
    };
  }
  if (category === "macro_negative") {
    return {
      takeaway: "macro pressure needs confirmation from yields, currency and Indian breadth before it becomes a tradeable defensive cue.",
      whyItMatters: "Negative macro headlines can fade quickly unless USD/INR, Bank Nifty and advance-decline confirm stress after the open.",
      indiaImpact: "Nifty bias stays defensive only if Bank Nifty weakens, USD/INR pressures importers and breadth fails to recover.",
      watchFor: "Watch Bank Nifty VWAP, USD/INR and advance-decline through 9:45 AM before pressing a defensive view."
    };
  }
  if (category === "sector_positive") {
    return {
      takeaway: "sector support needs Indian peer participation before it earns index weight.",
      whyItMatters: "Positive sector headlines can help watchlists, but the index read needs domestic participation and Bank Nifty confirmation.",
      indiaImpact: `${entityName} needs related Indian peer participation and Nifty morning average acceptance before it becomes broad support.`,
      watchFor: `Watch ${entityName} peer participation and Bank Nifty morning average through the first range.`
    };
  }
  if (category === "sector_negative") {
    return {
      takeaway: "sector pressure matters only if Indian peers and participation validate it after the open.",
      whyItMatters: "Negative sector stories are useful as watchlist filters, not automatic index direction.",
      indiaImpact: `${entityName} needs related Indian peers to weaken before it becomes more than a caution flag.`,
      watchFor: `Watch ${entityName} peer participation after 9:45 AM; no index bias if banks and Nifty hold morning averages.`
    };
  }
  if (category === "neutral_volatile") {
    return {
      takeaway: "mixed global cues keep the India open in confirmation mode.",
      whyItMatters: "Neutral stories matter through the first range: price acceptance, participation and Bank Nifty decide whether noise becomes signal.",
      indiaImpact: "Keep Nifty and Bank Nifty in range-first mode until participation and morning averages agree.",
      watchFor: "Watch first-range high/low, morning averages and Bank Nifty participation through 9:45-10:00 AM IST."
    };
  }
  return {};
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
      indiaImpact: "Pipeline flow news matters through Brent; use prices to decide whether OMCs, aviation and paints face import-cost pressure.",
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
      indiaImpact: "Bank Nifty and rate-sensitive sectors care only if global yields follow through and local participation weakens.",
      watchFor: `Watch ${level} and Indian bank participation; no rate trade if yields fade.`
    };
  }
  if (/\b(fed|powell|fomc)\b/.test(lower)) {
    return {
      takeaway: "Fed policy uncertainty shifts the hurdle rate, so India needs cleaner bank and growth-stock confirmation.",
      indiaImpact: "Bearish for Bank Nifty, realty, autos and high-PE growth if yields rise; neutral if participation absorbs it.",
      watchFor: `Watch ${level}; rising yields require Bank Nifty to hold morning averages.`
    };
  }
  return {
    takeaway: "A higher-yield tape raises the discount-rate check for banks and high-multiple growth.",
    indiaImpact: "Rate-sensitive Indian sectors need yield stability; otherwise treat gap-ups in banks, realty and growth as fragile.",
    watchFor: `Watch ${level}; pair it with Bank Nifty's morning average before assigning direction.`
  };
}

function tradeReadthrough(lower) {
  if (/\b(tariff|tariffs)\b/.test(lower)) {
    return {
      takeaway: "tariff risk can split exporters, autos and metals instead of moving the whole index together.",
      indiaImpact: "Exporters, metals, autos and pharma need separate breadth checks; Bank Nifty decides whether the index absorbs the policy shock.",
      watchFor: "Watch metals, autos, pharma and IT breadth separately; tariff headlines are sector splitters, not automatic Nifty signals."
    };
  }
  return {
    takeaway: "trade-flow news separates exporters from import-cost sectors, so the index read needs sector confirmation.",
    indiaImpact: "IT, pharma, metals, autos and import-cost sectors can diverge; use breadth by sector before assigning index direction.",
    watchFor: "Watch exporter breadth against import-cost sectors after the first range; avoid one-shot index conclusions."
  };
}

function earningsReadthrough(lower, entityName) {
  const subject = specificCompanyOrTheme(lower, entityName);
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
  if (/\bjobs day\b|\bsemiconductor earnings\b/.test(lower)) {
    return {
      takeaway: "US jobs data and chip earnings set Nasdaq risk appetite; Nifty IT only inherits it if exporters participate."
    };
  }
  if (/\bpalantir\b/.test(lower)) {
    return {
      takeaway: "Palantir's software rebound is a Nifty IT sentiment cue only if Indian exporters participate."
    };
  }
  if (/\bs&p 500 profits?\b|\bs&p 500 earnings\b|\bprofits haven\b/.test(lower)) {
    return {
      takeaway: "Rich S&P 500 profits support global risk appetite, but India needs breadth beyond a few US mega-cap winners."
    };
  }
  if (/\bai trade\b|\bit'?s a boom\b|\bstrong earnings\b.*\bmarket gains\b/.test(lower)) {
    return {
      takeaway: "AI-led earnings momentum supports risk appetite; the India read is Nifty IT breadth, not a broad-index signal."
    };
  }
  if (/\bbig tech\b/.test(lower)) {
    return {
      takeaway: "Big Tech capex discipline supports Nasdaq tone; Nifty IT still needs exporter breadth and USD/INR confirmation."
    };
  }
  return {
    takeaway: `${subject} matters for India only if margins, guidance, or demand can travel to listed peers.`
  };
}

function aviationReadthrough(lower) {
  if (/\b(spirit airlines|shutdown|bankrupt|bankruptcy)\b/.test(lower)) {
    return {
      takeaway: "keep it as US aviation stress unless fuel, demand or aircraft-supply data moves Indian aviation names.",
      indiaImpact: globalOnlyIndiaContext(),
      watchFor: "No specific watch for this article."
    };
  }
  return {
    takeaway: "aviation demand or fuel pressure matters for IndiGo and SpiceJet before it matters for the broad index.",
    indiaImpact: "Aviation is the direct read-through through IndiGo, SpiceJet and fuel-cost sensitivity; do not convert it into Nifty IT or broad-index conviction.",
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
      takeaway: `${subject} supports the AI-spending narrative; India still needs IT services breadth before it becomes a trade.`,
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
    [/\bs&p 500 earnings\b|\bearnings madness\b/, "S&P 500 earnings season"],
    [/\bwall street\b.*\bai trade\b|\bstrong earnings\b.*\bai trade\b/, "AI-led earnings"],
    [/\bjobs day\b|\bsemiconductor earnings\b/, "semiconductor earnings"],
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
  return fallback && fallback !== "Market" ? fallback : "global cue";
}

function extractMarketLevel(lower, unit) {
  const escapedUnit = unit === "$" ? "\\$" : unit;
  const pattern = unit === "$"
    ? new RegExp(`${escapedUnit}\\s?(\\d+(?:\\.\\d+)?)`, "i")
    : new RegExp(`(\\d+(?:\\.\\d+)?)\\s?${escapedUnit}`, "i");
  const match = String(lower || "").match(pattern);
  if (match) {
    if (unit === "$") {
       const val = Number(match[1]);
       // Crude trades $40-150. Above $200 is definitely an error
       if (val > 200 || val < 40) return ""; 
    }
    return match[0].replace(/\s+/g, "");
  }
  return "";
}

function articleFactSentence(headline, summary) {
  const summarySentence = firstUsefulSentence(summary);
  if (summarySentence &&
      normalizeForComparison(summarySentence) !== normalizeForComparison(headline) &&
      !startsWithHeadline(summarySentence, headline)) {
    return compactWordsPlain(summarySentence, 18);
  }
  return fallbackFactFromHeadline(headline);
}

function startsWithHeadline(sentence, headline) {
  const sentenceLead = normalizeForComparison(String(sentence || "").split(/[;:.!?]/)[0] || sentence);
  const headlineLead = normalizeForComparison(String(headline || "").split(/[;:.!?]/)[0] || headline);
  return Boolean(headlineLead && sentenceLead.startsWith(headlineLead.slice(0, 42)));
}

function fallbackFactFromHeadline(headline) {
  const lower = String(headline || "").toLowerCase();
  if (/\bjobs day\b|\bwhat to watch this week\b/.test(lower)) {
    return "US jobs data and semiconductor earnings are the week's main risk-appetite tests";
  }
  if (/\bkeystone\b|\bpipeline\b/.test(lower)) {
    return "Keystone Light approval keeps North American crude-flow infrastructure in focus";
  }
  if (/\bs&p 500 earnings\b|\bearnings madness\b/.test(lower)) {
    return "S&P 500 earnings season is shaping the US risk-appetite read";
  }
  if (/\bit'?s a boom\b|\bwall street\b.*\bmarket gains\b|\bai trade\b/.test(lower)) {
    return "Strong earnings are keeping the AI-led Wall Street risk appetite alive";
  }
  if (/\bapple\b/.test(lower)) {
    return "Apple guided current-quarter revenue growth above estimates";
  }
  if (/\bcarvana\b/.test(lower)) {
    return "Carvana reported record first-quarter results";
  }
  const subClause = stripTerminal(String(headline || "")
    .replace(/^[^:;–—]+[:;–—]\s*/, "")
    .replace(/^.*?\b(as|after|amid|on|with|while)\b\s+/i, "")
    .replace(/\s*-\s*[^-]+$/i, "")
    .replace(/\s+/g, " ")
    .trim());
  if (subClause &&
      subClause.length >= 24 &&
      subClause.length < String(headline || "").trim().length &&
      normalizeForComparison(subClause) !== normalizeForComparison(headline)) {
    return compactWordsPlain(subClause, 16);
  }
  const cleaned = compactWordsPlain(stripTerminal(headline)
    .replace(/^why\s+/i, "")
    .replace(/^\d+\s+things?\s+(we\s+)?learned\s+(during|from)\s+/i, "")
    .replace(/\s*-\s*[^-]+$/i, "")
    .replace(/\s+/g, " ")
    .trim(), 14);
  
  if (!cleaned) return "Global cues dominate the pre-market setup";

  const parts = cleaned.split(/[:;.,-]/).map(p => p.trim()).filter(p => p.length > 10);
  const bestPart = parts.length > 0 
      ? parts.sort((a, b) => b.length - a.length)[0] 
      : cleaned;

  return bestPart.charAt(0).toUpperCase() + bestPart.slice(1);
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
  if (isIndiaEnergyStory(lower)) {
    return false;
  }
  if (isLowRelevanceUsSingleStockStory(lower)) {
    return true;
  }
  if (/\b(spirit airlines|domestic us|air travelers?|ticket prices?|shutdown|shut down)\b/.test(lower) &&
      !/\b(oil|crude|brent|fuel|jet fuel|boeing|airbus|supply chain|dollar|rate|yield)\b/.test(lower)) {
    return true;
  }
  if (/\b(attorney|lawsuit|legal strategy|court|subpoena|criminal case|civil case)\b/.test(lower) &&
      !/\b(rate|yield|bond|inflation|policy|market|stock|futures)\b/.test(lower)) {
    return true;
  }
  if (/\b(bitcoin|crypto|nft|defi|web3|blockchain wallet|meme coin|token)\b/.test(lower) &&
      !/\b(risk appetite|liquidity|market|markets|nasdaq|dollar|yield|india|rupee)\b/.test(lower)) {
    return true;
  }
  if (/\b(museum|gallery|exhibition|film|movie|streaming|celebrity|sports|football|baseball|recipe)\b/.test(lower)) {
    return true;
  }
  return category === "neutral_volatile" &&
    /\b(lifestyle|travel tips|retirement|consumer advice|credit score|passive income|best etf|dividend stock)\b/.test(lower);
}

function isOilStory(lower) {
  const text = String(lower || "");
  return /\b(oil|crude|brent|keystone|refinery|export terminal|gulf coast|opec)\b/.test(text) ||
    (/\bpipeline\b/.test(text) && /\b(oil|crude|brent|keystone|refinery|barrels?|shipments?|gulf coast)\b/.test(text));
}

function isIndiaEnergyStory(lower) {
  const text = String(lower || "");
  return /\bindia\b/.test(text) && /\b(coal|lng|power demand|power generation|heatwave|energy supplies?|electricity demand)\b/.test(text);
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
  if (/\b(gift nifty|sgx nifty|nifty futures|index futures|futures premium|futures discount)\b/.test(lower)) {
    return "Nifty Open";
  }
  if (isMarketInfrastructureStory(lower)) {
    return "Market infrastructure";
  }
  if (isIndiaInfrastructureStory(lower)) {
    return "Infrastructure";
  }
  if (isIndiaPreciousMetalsPolicyStory(lower)) {
    return "MCX Gold / Jewellery";
  }
  if (isIndiaFuelForexPolicyStory(lower)) {
    return "India fuel / forex";
  }
  if (isFuelInflationStory(lower)) {
    return "Fuel inflation";
  }
  if (/\b(vix|volatility|options?|pcr|oi buildup|put writing|call resistance)\b/.test(lower)) {
    return "Options tape";
  }
  if (isIndiaEnergyStory(lower)) {
    return "India Energy";
  }
  if (isGeopoliticalRiskStory(lower)) {
    return "Geopolitical risk";
  }
  if (isIndiaPolicyStory(lower)) {
    return "India policy";
  }
  if (isIndiaTelecomStory(lower)) {
    return "Telecom";
  }
  if (isCorporateActionStory(lower)) {
    return "Corporate actions";
  }
  if (/\b(fii|dii|fpi|foreign institutional|domestic institutional|institutional flow|provisional flow)\b/.test(lower)) {
    return "FII/DII flow";
  }
  if (/\b(boe|bank of england|central bank|governor bailey)\b/.test(lower)) {
    return "Rates";
  }
  if (isPrivateMarketStory(lower)) {
    return "Private markets";
  }
  if (isLowRelevanceUsSingleStockStory(lower)) {
    return "US single-stock";
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
  if (/\b(metal|metals|steel|copper|aluminium|aluminum|iron ore|china demand)\b/.test(lower)) {
    return "Nifty Metal";
  }
  if (/\b(ai|semiconductor|software|alphabet|google|nvidia|microsoft|oracle|meta|tech|apple|iphone|mac|big tech|faang)\b/.test(lower)) {
    return "Global Tech";
  }
  if (/\b(yields?|bonds?|rates?|fed|inflation|powell)\b/.test(lower)) {
    return "Rates";
  }
  if (isOilStory(lower)) {
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
  if (/\b(monsoon|rainfall|agri|agriculture|rural|crop|fertili[sz]er)\b/.test(lower)) {
    return "Rural demand";
  }
  if (/\b(auto|vehicle|tariff|ev|tesla)\b/.test(lower)) {
    return "Autos";
  }
  if (isTradePolicyStory(lower)) {
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
        // Browser-like UA required — Moneycontrol, PIB and others actively block bot/custom UA strings
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
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

function parseHtmlIndexItems(html, baseUrl) {
  const seen = new Set();
  const items = [];
  for (const match of String(html).matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const title = cleanText(match[2]);
    if (!title || title.length < 18 || title.length > 180) {
      continue;
    }
    const link = absoluteUrl(match[1], baseUrl);
    if (!link || seen.has(link) || !sourceUrlLooksArticleLevel(link)) {
      continue;
    }
    seen.add(link);
    items.push({ title, link, publishedAt: "", summary: title });
    if (items.length >= 24) {
      break;
    }
  }
  return items;
}

function absoluteUrl(value, baseUrl) {
  try {
    return new URL(decodeHtml(String(value || "")), baseUrl).toString();
  } catch {
    return "";
  }
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
    macro_positive: "Global earnings and risk appetite",
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


function parsePulseHtmlItems(html, baseUrl) {
  const seen = new Set();
  const items = [];
  const listItems = [...String(html).matchAll(/<li\b[^>]*class=["'][^"']*box item[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi)];
  
  for (const liMatch of listItems) {
    const liHtml = liMatch[1];
    const linkMatch = liHtml.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    const dateMatch = liHtml.match(/<span\b[^>]*class=["'][^"']*date[^"']*["'][^>]*title=["']([^"']+)["'][^>]*>/i);
    const descMatch = liHtml.match(/<div\b[^>]*class=["'][^"']*desc[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    
    if (!linkMatch) continue;
    
    const title = cleanText(linkMatch[2]);
    if (!title || title.length < 18 || title.length > 180) continue;
    
    const link = absoluteUrl(linkMatch[1], baseUrl);
    if (!link || seen.has(link) || !sourceUrlLooksArticleLevel(link)) continue;
    
    seen.add(link);
    
    let publishedAt = "";
    if (dateMatch) {
      const rawDate = cleanText(dateMatch[1]);
      const parts = rawDate.split(", ");
      if (parts.length === 2) {
        const [time, dateStr] = parts;
        const parsed = new Date(`${dateStr} ${time} UTC+05:30`);
        if (!isNaN(parsed.getTime())) {
          publishedAt = parsed.toISOString();
        }
      }
    }
    
    const summary = descMatch ? cleanText(descMatch[1]) : title;
    items.push({ title, link, publishedAt, summary });
  }
  return items;
}

export async function agentSelectPulseArticles(articles, options = {}) {
  const candidates = selectDiverseArticles(articles, 80);
  const agentMode = shouldUseAgentArticleEnrichment(options);
  if (!agentMode || candidates.length === 0) {
    return selectDiverseArticles(candidates, 12);
  }
  
  const fetcher = options.llmFetcher ?? fetch;
  const strictAgentSelection = options.strictAgentSelection ?? process.env.PUBLIC_BRIEFING_AGENT_STRICT === "true";
  const nvidiaApiKey = options.nvidiaPulseApiKey ?? process.env.NVIDIA_PULSE_API_KEY ?? options.nvidiaApiKey ?? process.env.NVIDIA_API_KEY;
  
  if (!nvidiaApiKey) {
     if (strictAgentSelection) {
       throw new Error("Pulse agent selection requires NVIDIA_PULSE_API_KEY or NVIDIA_API_KEY");
     }
     return selectDiverseArticles(candidates, 12);
  }

  const inputList = candidates.map((a, i) => `[${i}] ${a.headline} - ${a.sourceName}\nSummary: ${a.summary}`).join("\n\n");
  let indices = [];

  try {
    if (nvidiaApiKey) {
      const model = options.nvidiaPulseModel ?? process.env.NVIDIA_PULSE_MODEL ?? options.nvidiaModel ?? process.env.NVIDIA_MODEL ?? "deepseek-ai/deepseek-v4-pro";
      const baseUrl = String(options.nvidiaBaseUrl ?? process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");
      const prompt = `You are the pre-market desk editor at Market Narrative. Your briefing reaches Indian 
retail and semi-professional traders before NSE opens at 9:15 AM IST. You are reading 
Zerodha Pulse — already a curated Indian market feed — and selecting the 8 to 12 
stories that give a trader the clearest picture of what will drive Nifty 50 and 
Bank Nifty in today's session.

SELECTION MINDSET
Ask one question per article: "Does knowing this change what a trader should do in 
the first 30 minutes?" If yes, include it. If it merely confirms something already 
obvious or adds colour without changing action, leave it out.

TIER 1 — Always include if present (index-moving, non-negotiable)
- Gift Nifty premium or discount versus last close
- Brent crude direction, especially if move is above 1.5% or linked to Iran/Hormuz/OPEC
- FII or DII provisional net flow data
- USD/INR morning range or a sharp rupee move
- RBI, SEBI, Finance Ministry or PM statement with a direct market consequence
- US Fed or Treasury yield move that crosses a level (e.g. 10Y above 4.5%)
- A geopolitical event with a clear commodity or currency transmission line to India

TIER 2 — Include when they add a sector or breadth signal not covered by Tier 1
- Asia open direction: KOSPI, Hang Seng, Nikkei, SGX — only if the move is above 0.8%
- Major US earnings result (Apple, Nvidia, Microsoft, Meta, Alphabet) and Nifty IT read
- India-specific corporate result or guidance that is large enough to move a sector index
- Monsoon, crop or agri data with an FMCG or rural-lender read
- India policy: GST, PLI scheme, tariff, capital gains, STT with a named sector impact
- China PMI or credit data with a Nifty Metal or FII flow read
- Nifty 50 or Bank Nifty technical level article from a credible source if it names 
  the level and the consequence (e.g. "Bank Nifty below 54,200 opens 53,800")

TIER 3 — Exclude even if the headline looks interesting
- Any article whose only India read is "markets may be volatile" or "watch for cues"
- Single-stock analyst calls, price targets, upgrades or downgrades for one company
- "Top stocks to buy today" or any list-format stock-pick article
- US consumer, housing, healthcare, or lifestyle stories with no commodity or FII link
- Crypto, NFT, web3 with no RBI or SEBI regulatory angle
- Political news — India or global — with no named market consequence
- Any story that duplicates a Tier 1 story already selected (keep the more specific one)

EDGE CASES
- If two articles cover the same driver (e.g. two crude oil pieces), include only the 
  one with the more specific India angle or the fresher timestamp.
- A "markets live" or "open bell" article that contains Gift Nifty data counts as Tier 1.
- If the article count in Tier 1 alone reaches 8, do not add Tier 2 stories.

OUTPUT
Return a JSON array of the integer indices of selected articles, ordered from most 
important to least important. The first index in your array becomes the lead story.
Return nothing else — no explanation, no markdown, no preamble.
Example: [4, 0, 11, 7, 2, 15, 9, 6]`;

      const response = await nvidiaFetchWithRetry({
        fetcher,
        url: `${baseUrl}/chat/completions`,
        provider: "nvidia_pulse_selection",
        model,
        apiKey: nvidiaApiKey,
        timeoutMs: Number(options.nvidiaPulseTimeoutMs ?? process.env.NVIDIA_PULSE_TIMEOUT_MS ?? 20000),
        retries: Number(options.nvidiaPulseRetries ?? process.env.NVIDIA_PULSE_RETRIES ?? 0),
        body: {
          model,
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: inputList }
          ],
          temperature: Number(options.nvidiaPulseTemperature ?? process.env.NVIDIA_PULSE_TEMPERATURE ?? 0.2),
          top_p: Number(options.nvidiaPulseTopP ?? process.env.NVIDIA_PULSE_TOP_P ?? 0.9),
          max_tokens: Number(options.nvidiaPulseMaxTokens ?? process.env.NVIDIA_PULSE_MAX_TOKENS ?? 128),
          chat_template_kwargs: { thinking: true },
          stream: false
        }
      });
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content?.trim() ?? "[]";
      // Ensure we extract the array even if there is markdown or conversational preamble
      const match = text.match(/\[[\d,\s]*\]/);
      if (match) {
        indices = JSON.parse(match[0]);
      } else {
        indices = [];
      }
    }

    if (Array.isArray(indices) && indices.length > 0) {
      return indices.slice(0, 12).map(i => candidates[i]).filter(Boolean);
    }
    if (strictAgentSelection) {
      throw new Error("Pulse agent selection returned no valid article indices");
    }
  } catch (e) {
    if (strictAgentSelection) {
      throw e;
    }
    log.warn("pulse agent selection fell back", { error: e.message });
  }
  return selectDiverseArticles(candidates, 12);
}
