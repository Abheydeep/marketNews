const MODEL_CAPITAL_INR = 500_000;
const MODEL_ENTRY_DATE = "2026-04-27";
const MODEL_BASELINE_ENTRY_AT = "2026-05-04T14:12:00+05:30";
const STATIC_PRICE_REFRESH_AT = "2026-05-01T15:30:00+05:30";
const QUOTE_FRESHNESS_HOURS = 120;
const FILLS_PUBLISHED = true;

const trackingBasis = {
  researchModelStartedOn: MODEL_ENTRY_DATE,
  publicFillBaselineAt: MODEL_BASELINE_ENTRY_AT,
  returnsCalculatedFrom: "publicFillBaselineAt"
};

const priceSnapshots = {
  KPEL: {
    entryPrice: 369.85,
    lastPrice: null,
    previousClose: null,
    lastPriceAt: STATIC_PRICE_REFRESH_AT,
    priceSource: "Awaiting verified live quote",
    isStale: true
  },
  DHABRIYA: {
    entryPrice: 379.55,
    lastPrice: null,
    previousClose: null,
    lastPriceAt: STATIC_PRICE_REFRESH_AT,
    priceSource: "Awaiting verified live quote",
    isStale: true
  },
  DYCL: {
    entryPrice: 392.0,
    lastPrice: null,
    previousClose: null,
    lastPriceAt: STATIC_PRICE_REFRESH_AT,
    priceSource: "Awaiting verified live quote",
    isStale: true
  },
  SHARDAMOTR: {
    entryPrice: 882.03,
    lastPrice: null,
    previousClose: null,
    lastPriceAt: STATIC_PRICE_REFRESH_AT,
    priceSource: "Awaiting verified live quote",
    isStale: true
  },
  JNKINDIA: {
    entryPrice: 378.0,
    lastPrice: null,
    previousClose: null,
    lastPriceAt: STATIC_PRICE_REFRESH_AT,
    priceSource: "Awaiting verified live quote",
    isStale: true
  }
};

const benchmarkSnapshot = {
  symbol: "NIFTY 50",
  entryPrice: 24_203.35,
  lastPrice: null,
  previousClose: null,
  lastPriceAt: STATIC_PRICE_REFRESH_AT,
  source: "Awaiting verified live quote",
  isStale: true
};

const yahooSymbols = {
  KPEL: "KPEL.BO",
  DHABRIYA: "DHABRIYA.BO",
  DYCL: "DYCL.NS",
  SHARDAMOTR: "SHARDAMOTR.NS",
  JNKINDIA: "JNKINDIA.NS"
};

const bseSymbols = {
  KPEL: "539686"
};

const BSE_QUOTE_URL = "https://api.bseindia.com/BseIndiaAPI/api/StockReachGraph/w";

const screenerUrls = {
  KPEL: "https://www.screener.in/company/KPEL/",
  DHABRIYA: "https://www.screener.in/company/DHABRIYA/",
  DYCL: "https://www.screener.in/company/DYCL/",
  SHARDAMOTR: "https://www.screener.in/company/SHARDAMOTR/",
  JNKINDIA: "https://www.screener.in/company/JNKINDIA/"
};

const methodology = {
  definition: "A multibagger candidate is a business that can compound the original model capital several times over a full cycle, not merely a stock with a short-term price spike.",
  targetOutcome: "The public model is built to test a concentrated 5x-style research thesis through sizing discipline, monthly evidence review, and replacement logic.",
  evaluationCategories: [
    "Profitability: ROE, ROCE, margin durability, and free-cash-flow conversion.",
    "Valuation: current multiple versus growth, balance-sheet quality, and rerating room.",
    "Growth catalysts: order-book conversion, capacity addition, sector tailwind, or operating leverage.",
    "Cash conversion: receivables, inventory, debtor days, and whether earnings turn into cash.",
    "Capital structure: debt, guarantees, dilution risk, and interest coverage.",
    "Replacement discipline: every holding must keep earning its slot against the challenger list."
  ],
  replacementLogic: "A holding is replaced when the thesis weakens, valuation absorbs the upside, cash conversion breaks, or a challenger offers cleaner upside with lower evidence risk.",
  disclaimer: "Educational research tracker only. It is not stock advice, not a promise of returns, and not a demat statement mirror."
};

const researchEvidence = {
  asOf: "2026-05-02",
  marketRegime: [
    {
      label: "10Y G-sec hurdle",
      summary: "Economic Times reported India's 10-year benchmark government bond yield closed at 7.01% on Apr 30, 2026, after touching 7.06%. The model treats that as a higher hurdle rate for equity rerating.",
      sourceLabel: "Economic Times",
      sourceUrl: "https://economictimes.indiatimes.com/markets/bonds/g-sec-10-year-yield-tops-7-as-oil-soars/articleshow/130661336.cms?from=mdr"
    },
    {
      label: "IT valuation reset",
      summary: "Economic Times listed Nifty IT at 29,353.90 on Apr 30, 2026 with a 19.36 P/E, 6.13 P/B, and negative 1Y return. This is watchlist context, not a published IT-sector allocation call.",
      sourceLabel: "Economic Times",
      sourceUrl: "https://economictimes.indiatimes.com/markets/indices/nifty-it"
    },
    {
      label: "Domestic savings base",
      summary: "AMFI reported Indian mutual fund AUM of Rs 73.73 lakh crore as on Mar 31, 2026 and 20.83 crore retail-heavy equity, hybrid and solution-oriented folios.",
      sourceLabel: "AMFI",
      sourceUrl: "https://www.amfiindia.com/articles/indian-mutual"
    },
    {
      label: "Bond access benchmark",
      summary: "RBI Retail Direct widened direct access to government securities for individual investors, so the equity model is judged against a visible fixed-income alternative.",
      sourceLabel: "Reserve Bank of India",
      sourceUrl: "https://www.rbi.org.in/scripts/FS_PressRelease.aspx?prid=52548"
    }
  ],
  holdingEvidence: [
    {
      ticker: "KPEL",
      evidence: [
        "K.P. Energy's Q3 FY26 total revenue was Rs 347.55 crore, up about 63% YoY, with PAT of Rs 41.35 crore, up 58% YoY.",
        "The company investor-presentation hub lists Q3 FY26 material for primary cross-check.",
        "The public thesis is execution-led renewable growth, now tracked from the normalized Rs 5 lakh baseline entry."
      ],
      needsProof: "Operating cash flow, debtor days and project collections must confirm that revenue growth is converting into cash.",
      sourceLabel: "KP Energy investor presentations",
      sourceUrl: "https://kpenergy.in/Investor-Presentation"
    },
    {
      ticker: "DHABRIYA",
      evidence: [
        "Dhabriya reported Q3 FY26 revenue of Rs 65.66 crore, up 19.6% YoY.",
        "Q3 FY26 EBITDA rose 56.5% YoY and PAT rose 100.5% YoY, showing margin-led operating leverage.",
        "9M FY26 PAT was up 72.4% YoY in the company release."
      ],
      needsProof: "The next two quarters need to show that the margin band survives without inventory, debt or receivable stress.",
      sourceLabel: "Dhabriya Q3/9M FY26 release",
      sourceUrl: "https://www.polywood.org/wp-content/uploads/2020/12/Press-Release-Q3-9M-FY26.pdf"
    },
    {
      ticker: "DYCL",
      evidence: [
        "Dynamic Cables reported Q3 FY26 revenue of Rs 29,876.77 lakh, up 19% YoY.",
        "Q3 FY26 PAT was Rs 2,242.27 lakh, up 42% YoY.",
        "The evidence fits a cleaner cable-cycle quality slot rather than a pure story stock."
      ],
      needsProof: "Margins need to hold through commodity swings, receivable quality and capacity ramp-up.",
      sourceLabel: "Dynamic Cables Q3 FY26 summary",
      sourceUrl: "https://www.icicidirect.com/research/equity/rapid-results/dynamic-cables-ltd"
    },
    {
      ticker: "SHARDAMOTR",
      evidence: [
        "Sharda Motor is tracked as the quality ballast slot in the normalized public baseline.",
        "The public thesis is lower-torque than the order-book names, but it adds operating quality and valuation balance.",
        "Screener's company page and public filings remain the source hub for quarterly checks and announcements."
      ],
      needsProof: "The slot must prove that earnings quality and valuation support can offset its lower 5x torque.",
      sourceLabel: "Sharda Motor public filings/announcements",
      sourceUrl: "https://www.screener.in/company/SHARDAMOTR/"
    },
    {
      ticker: "JNKINDIA",
      evidence: [
        "JNK India reported Q3 FY26 revenue of Rs 2,062.3 million, up 113% YoY.",
        "Q3 FY26 PAT was Rs 180.2 million, up 535% YoY, from a depressed prior-year base.",
        "The company cited a total order book of Rs 17,611 million at the 9M FY26 mark."
      ],
      needsProof: "Receivables and execution pace must stay controlled as order-book conversion enters reported earnings.",
      sourceLabel: "JNK India Q3 FY26 summary",
      sourceUrl: "https://www.icicidirect.com/research/equity/rapid-results/jnk-india-ltd"
    }
  ],
  researchBoundaries: [
    "This evidence layer is dated context, not a trading signal or return promise.",
    "The model avoids unverified percentile claims, unsourced ROE figures and short-term return claims.",
    "Public data excludes demat-level positions, personal portfolio totals and unpublished operator notes."
  ]
};

const baseHoldings = [
  {
    ticker: "KPEL",
    yahooSymbol: "KPEL.BO",
    name: "KP Energy",
    targetWeight: 25.6079,
    modelAmountInr: 128_039,
    role: "Anchor renewable alpha",
    displayLabel: "Renewable execution",
    rolePlain: "Largest slot: renewable execution needs to keep converting into cash.",
    thesis: "Low-PE renewable execution with strong revenue growth and a valuation that still leaves room for rerating.",
    buyRule: "Build first while valuation remains a small-cap growth bargain and receivables stay controlled.",
    breakRule: "Trim if project execution slips, receivables stretch, or group complexity starts driving the story.",
    profitabilityLens: "Revenue growth and execution momentum must keep translating into reported profit and operating cash flow.",
    valuationLens: "Still treated as the valuation-growth anchor; rerating room matters more than headline theme popularity.",
    growthCatalyst: "Renewable project execution, order conversion, and sector capex visibility.",
    conversionRisk: "Receivables or delayed project cash collection would weaken the anchor role.",
    capitalStructureRisk: "Group complexity, debt-funded expansion, or guarantees must stay contained.",
    status: "Core hold / buy staged"
  },
  {
    ticker: "DHABRIYA",
    yahooSymbol: "DHABRIYA.BO",
    name: "Dhabriya Polywood",
    targetWeight: 21.4561,
    modelAmountInr: 107_280,
    role: "Hidden-quality margin inflection",
    displayLabel: "Margin recovery",
    rolePlain: "Core slot: margin recovery must prove it is durable, not one good quarter.",
    thesis: "Microcap quality candidate with PAT doubling, expanded EBITDA margin and a still-sane valuation base.",
    buyRule: "Build after confirming liquidity; add only if FY26 keeps the new margin band intact.",
    breakRule: "Reduce if inventory, debt or receivables absorb the reported earnings growth.",
    profitabilityLens: "The key proof is whether the improved margin band survives beyond one strong result.",
    valuationLens: "Microcap valuation is acceptable only while earnings quality and liquidity improve together.",
    growthCatalyst: "Operating leverage from scale, product mix, and margin recovery.",
    conversionRisk: "Inventory build-up or debtor stretch would turn reported PAT into lower-quality growth.",
    capitalStructureRisk: "Debt and working-capital funding must not rise faster than earnings.",
    status: "Core hold / buy staged"
  },
  {
    ticker: "DYCL",
    yahooSymbol: "DYCL.NS",
    name: "Dynamic Cables",
    targetWeight: 21.1864,
    modelAmountInr: 105_932,
    role: "Cleaner cable-cycle quality alpha",
    displayLabel: "Cable cycle quality",
    rolePlain: "Quality slot: cable-cycle demand with capacity optionality and working-capital checks.",
    thesis: "Mid-teens valuation, PAT growth, order visibility and solar DC/e-beam capacity provide a second trigger.",
    buyRule: "Build measured exposure; add if order inflow, spreads and capacity ramp remain disciplined.",
    breakRule: "Trim if cable spreads turn, receivables worsen, or capacity ramp disappoints.",
    profitabilityLens: "PAT growth should remain visible without relying on a one-off commodity spread tailwind.",
    valuationLens: "Mid-teens style valuation keeps it in the model while capacity optionality is still underpriced.",
    growthCatalyst: "Cable-cycle demand, solar DC products, e-beam capacity, and order inflow.",
    conversionRisk: "Receivable quality and commodity-linked margin swings are the main conversion checks.",
    capitalStructureRisk: "Capacity ramp must avoid excessive leverage or weak interest coverage.",
    status: "Quality alpha"
  },
  {
    ticker: "SHARDAMOTR",
    yahooSymbol: "SHARDAMOTR.NS",
    name: "Sharda Motor",
    targetWeight: 19.3262,
    modelAmountInr: 96_631,
    role: "Quality ballast",
    displayLabel: "Quality ballast",
    rolePlain: "Quality slot: steadier operating quality balances the higher-torque smallcap names.",
    thesis: "A lower-PE quality name that gives the basket valuation ballast while the order-book names prove cash conversion.",
    buyRule: "Hold while valuation support, earnings quality and balance-sheet discipline stay intact.",
    breakRule: "Reduce if growth stalls, margins compress without recovery, or valuation support disappears.",
    profitabilityLens: "The slot needs steady profitability rather than one-off cyclical expansion.",
    valuationLens: "Valuation support is the reason it earns a model slot despite lower 5x torque.",
    growthCatalyst: "Auto component operating leverage, export optionality and disciplined capital allocation.",
    conversionRisk: "Margin compression or weak cash conversion would lower the ballast value.",
    capitalStructureRisk: "The quality role depends on avoiding aggressive leverage or unfriendly capital allocation.",
    status: "Quality ballast"
  },
  {
    ticker: "JNKINDIA",
    yahooSymbol: "JNKINDIA.NS",
    name: "JNK India",
    targetWeight: 12.4234,
    modelAmountInr: 62_118,
    role: "Order book entering P&L",
    displayLabel: "Order conversion",
    rolePlain: "Capped slot: visible orders are starting to show up in reported earnings.",
    thesis: "Q3 revenue and PAT acceleration show that order visibility is already touching reported earnings.",
    buyRule: "Scale only after the next result confirms conversion without debtor blowout.",
    breakRule: "Reduce if receivables expand faster than sales or order conversion stalls.",
    profitabilityLens: "Reported PAT acceleration must be supported by execution quality and margin stability.",
    valuationLens: "The stock earns a slot only while the market still underprices order conversion.",
    growthCatalyst: "Order book entering P&L through process-heating and industrial capex execution.",
    conversionRisk: "Receivables expanding faster than sales would be the main evidence break.",
    capitalStructureRisk: "Balance-sheet strain from execution scale-up should stay modest.",
    status: "Capped alpha"
  }
];

const transactions = [];

const monthlyReviews = [
  {
    month: "2026-05",
    publishedDate: "2026-05-01",
    headline: "Model launched after the deep-dive portfolio reset",
    decisions: [
      {
        ticker: "KPEL",
        decision: "KEEP",
        publicRationale: "Best valuation-growth anchor from the research set."
      },
      {
        ticker: "DHABRIYA",
        decision: "KEEP",
        publicRationale: "Margin-led earnings acceleration earns core alpha weight."
      },
      {
        ticker: "DYCL",
        decision: "KEEP",
        publicRationale: "Cleaner cable-cycle exposure with capacity optionality and sane valuation."
      },
      {
        ticker: "SHARDAMOTR",
        decision: "ADD",
        publicRationale: "Quality ballast added to normalize the public model against the deployed-capital baseline."
      },
      {
        ticker: "JNKINDIA",
        decision: "KEEP",
        publicRationale: "Order conversion has started, while working capital remains the review point."
      }
    ],
    changesMade: [
      "Normalized the public model to Rs 5 lakh instead of mirroring the larger deployed rupee total.",
      "Moved from a broad basket to a concentrated 5-stock public baseline.",
      "Kept CPCL outside the model as a tactical refinery trade.",
      "Moved PIGL and TEMBO back to the watchlist until margin, cash-flow and governance proof improves."
    ]
  }
];

const watchlist = [
  {
    ticker: "PIGL",
    name: "Power & Instrumentation Gujarat",
    status: "Watch / capped challenger",
    replacementPressure: "High",
    reason: "Order-book asymmetry remains interesting, but margin and working-capital proof need to improve before it displaces the baseline names.",
    evaluationFlags: [
      { label: "Orders", tone: "green" },
      { label: "Margins", tone: "yellow" },
      { label: "Cash", tone: "yellow" }
    ]
  },
  {
    ticker: "TEMBO",
    name: "Tembo Global",
    status: "Watch / optionality",
    replacementPressure: "Medium",
    reason: "Large-order optionality remains high, but governance, financing and cash-flow proof keep it outside the normalized core model.",
    evaluationFlags: [
      { label: "Optionality", tone: "green" },
      { label: "Governance", tone: "yellow" },
      { label: "Cash flow", tone: "yellow" }
    ]
  },
  {
    ticker: "DELTNCBL",
    name: "Delton Cables",
    status: "Watch / capped challenger",
    replacementPressure: "Medium",
    reason: "Order-book-to-market-cap math is attractive, but leverage and copper/input-cost risk need proof.",
    evaluationFlags: [
      { label: "Orders", tone: "green" },
      { label: "Leverage", tone: "yellow" },
      { label: "Input cost", tone: "yellow" }
    ]
  },
  {
    ticker: "GALAPREC",
    name: "Gala Precision",
    status: "Watch / quality challenger",
    replacementPressure: "Low",
    reason: "Precision industrial growth is good, but near-30x PE and margin compression keep it outside the normalized baseline.",
    evaluationFlags: [
      { label: "Quality", tone: "green" },
      { label: "Valuation", tone: "yellow" },
      { label: "Margins", tone: "yellow" }
    ]
  },
  {
    ticker: "MARKOLINES",
    name: "Markolines",
    status: "Tiny optionality",
    replacementPressure: "Low",
    reason: "Interesting order-book asymmetry, but liquidity and debtor risk make it too small for the primary model.",
    evaluationFlags: [
      { label: "Asymmetry", tone: "green" },
      { label: "Liquidity", tone: "red" },
      { label: "Debtors", tone: "yellow" }
    ]
  },
  {
    ticker: "CPCL",
    name: "Chennai Petroleum",
    status: "Tactical side trade",
    replacementPressure: "Low",
    reason: "Refinery-cycle value is real, but it is not treated as a permanent multibagger compounder.",
    evaluationFlags: [
      { label: "Value", tone: "green" },
      { label: "Cycle", tone: "yellow" },
      { label: "Compounder", tone: "red" }
    ]
  }
];

const sources = [
  {
    label: "KP Energy Q3 FY26 investor presentation",
    url: "https://kpenergy.in/Investor-Presentation"
  },
  {
    label: "Dhabriya Polywood Q3/9M FY26 release",
    url: "https://www.polywood.org/wp-content/uploads/2020/12/Press-Release-Q3-9M-FY26.pdf"
  },
  {
    label: "JNK India Q3 FY26 result summary",
    url: "https://www.icicidirect.com/research/equity/rapid-results/jnk-india-ltd"
  },
  {
    label: "Dynamic Cables Q3 FY26 result summary",
    url: "https://www.icicidirect.com/research/equity/rapid-results/dynamic-cables-ltd"
  },
  {
    label: "Sharda Motor public filings and result material",
    url: "https://www.screener.in/company/SHARDAMOTR/"
  },
  {
    label: "Economic Times 10Y G-sec yield note",
    url: "https://economictimes.indiatimes.com/markets/bonds/g-sec-10-year-yield-tops-7-as-oil-soars/articleshow/130661336.cms?from=mdr"
  },
  {
    label: "Economic Times Nifty IT metrics",
    url: "https://economictimes.indiatimes.com/markets/indices/nifty-it"
  },
  {
    label: "AMFI mutual fund industry data",
    url: "https://www.amfiindia.com/articles/indian-mutual"
  },
  {
    label: "RBI Retail Direct release",
    url: "https://www.rbi.org.in/scripts/FS_PressRelease.aspx?prid=52548"
  }
];

export function multibaggerState(options = {}) {
  const activeSnapshots = options.priceSnapshots ?? priceSnapshots;
  const activeBenchmark = options.benchmarkSnapshot ?? benchmarkSnapshot;
  const refreshedAt = options.updatedAt ?? latestStateTimestamp(activeSnapshots, activeBenchmark);
  const holdings = holdingsWithPerformance(activeSnapshots);
  const hasMarketQuotes = holdings.some((holding) => !holding.isStale && Number.isFinite(Number(holding.lastPrice)));
  const hasVerifiedPrices = FILLS_PUBLISHED && holdings.every((holding) => !holding.isStale && Number.isFinite(Number(holding.currentModelValueInr)));
  const currentModelValueInr = hasVerifiedPrices
    ? round(holdings.reduce((sum, holding) => sum + holding.currentModelValueInr, 0), 2)
    : null;
  const totalPnlInr = hasVerifiedPrices ? round(currentModelValueInr - MODEL_CAPITAL_INR, 2) : null;
  const sinceLaunchPercent = hasVerifiedPrices ? round((totalPnlInr / MODEL_CAPITAL_INR) * 100, 2) : null;
  const benchmarkSinceLaunchPercent = activeBenchmark.isStale ? null : returnPercent(activeBenchmark.entryPrice, activeBenchmark.lastPrice);
  const quoteMode = hasMarketQuotes ? (options.mode ?? "public-market-snapshot") : "awaiting-verified-quotes";
  const quoteNote = hasMarketQuotes
    ? "Latest Yahoo/BSE public quotes are shown with row-level timestamps. Return and P&L use the normalized Rs 5 lakh public baseline."
    : "Normalized Rs 5 lakh baseline is published; current prices and returns appear after verified market quotes are available.";
  const state = {
    modelName: "Concentrated 5x Multibagger Model",
    modelCapitalInr: MODEL_CAPITAL_INR,
    modelEntryDate: MODEL_ENTRY_DATE,
    trackingBasis,
    updatedAt: refreshedAt,
    quoteStatus: {
      mode: quoteMode,
      lastRefreshAt: refreshedAt,
      note: quoteNote
    },
    pricing: {
      mode: quoteMode,
      refreshedAt,
      isStale: !hasMarketQuotes,
      refreshCadence: "Static publish fetches latest public quotes; backend refreshes every 5 minutes during Indian market hours when live quotes are enabled",
      benchmark: {
        ...activeBenchmark,
        returnPercent: benchmarkSinceLaunchPercent,
        dayChangePercent: activeBenchmark.isStale ? null : returnPercent(activeBenchmark.previousClose, activeBenchmark.lastPrice)
      },
      note: hasMarketQuotes
        ? "Latest price and day move are public market-data fields with source timestamps. Model return and P&L are computed from the normalized Rs 5 lakh baseline."
        : "Fallback mode keeps the normalized baseline visible while current prices, returns, and P&L wait for verified quotes."
    },
    performance: {
      sinceLaunchPercent,
      launchDate: MODEL_ENTRY_DATE,
      modelEntryDate: MODEL_ENTRY_DATE,
      benchmark: "NIFTY 50",
      benchmarkSinceLaunchPercent,
      currentModelValueInr,
      totalPnlInr,
      note: FILLS_PUBLISHED
        ? "Model performance is calculated from the normalized Rs 5 lakh baseline, published average entries, and latest verified public quotes."
        : "Target weights are research allocations. Return, P&L and current model value remain hidden until exact public fills are published."
    },
    holdings,
    methodology,
    researchEvidence,
    transactions,
    monthlyReviews,
    watchlist,
    sources,
    disclaimer: "Educational research tracker only. It is not investment advice, a recommendation, or a promise of returns."
  };
  validateMultibaggerState(state);
  return state;
}

export async function multibaggerStateWithMarketQuotes() {
  try {
    return multibaggerState(await fetchMarketQuoteSnapshots());
  } catch {
    return multibaggerState();
  }
}

function holdingsWithPerformance(snapshots = priceSnapshots) {
  return baseHoldings.map((holding) => ({
    ...holding,
    screenerUrl: screenerUrls[holding.ticker],
    ...holdingPerformance(holding.ticker, holding.modelAmountInr, snapshots)
  }));
}

function holdingPerformance(ticker, modelAmountInr, snapshots = priceSnapshots) {
  const snapshot = snapshots[ticker] ?? priceSnapshots[ticker];
  const hasVerifiedQuote = !snapshot.isStale && Number.isFinite(Number(snapshot.lastPrice));
  const showPerformance = FILLS_PUBLISHED && hasVerifiedQuote;
  const returnValue = showPerformance ? returnPercent(snapshot.entryPrice, snapshot.lastPrice) : null;
  const dayChangePercent = hasVerifiedQuote ? returnPercent(snapshot.previousClose, snapshot.lastPrice) : null;
  const currentModelValueInr = showPerformance
    ? round(modelAmountInr * (snapshot.lastPrice / snapshot.entryPrice), 2)
    : null;
  const modelPnlInr = showPerformance ? round(currentModelValueInr - modelAmountInr, 2) : null;
  return {
    modelEntryDate: MODEL_ENTRY_DATE,
    entryAt: MODEL_BASELINE_ENTRY_AT,
    entryPrice: snapshot.entryPrice,
    lastPrice: hasVerifiedQuote ? snapshot.lastPrice : null,
    previousClose: hasVerifiedQuote ? snapshot.previousClose : null,
    dayChangePercent,
    lastPriceAt: snapshot.lastPriceAt,
    priceSource: snapshot.priceSource,
    isStale: snapshot.isStale,
    returnPercent: returnValue,
    modelPnlInr,
    currentModelValueInr
  };
}

async function fetchMarketQuoteSnapshots() {
  const nextSnapshots = { ...priceSnapshots };
  const yahooResults = await Promise.all(Object.entries(yahooSymbols).map(async ([ticker, symbol]) => {
    const quote = await fetchYahooQuote(ticker, symbol, priceSnapshots[ticker]);
    return [ticker, quote];
  }));
  for (const [ticker, quote] of yahooResults) {
    if (quote) {
      nextSnapshots[ticker] = quote;
    }
  }

  const bseResults = await Promise.all(Object.entries(bseSymbols).map(async ([ticker, scripcode]) => {
    const quote = await fetchBseQuote(ticker, scripcode, priceSnapshots[ticker]);
    return [ticker, quote];
  }));
  for (const [ticker, quote] of bseResults) {
    if (quote) {
      nextSnapshots[ticker] = quote;
    }
  }

  const nextBenchmark = await fetchYahooBenchmark("^NSEI").catch(() => null);
  const hasLiveQuote = Object.values(nextSnapshots).some((quote) => !quote.isStale && Number.isFinite(Number(quote.lastPrice)));
  return {
    priceSnapshots: hasLiveQuote ? nextSnapshots : priceSnapshots,
    benchmarkSnapshot: nextBenchmark ?? benchmarkSnapshot,
    updatedAt: latestStateTimestamp(hasLiveQuote ? nextSnapshots : priceSnapshots, nextBenchmark ?? benchmarkSnapshot),
    mode: hasLiveQuote ? "public-market-snapshot" : "awaiting-verified-quotes"
  };
}

async function fetchYahooQuote(ticker, yahooSymbol, fallback) {
  try {
    const meta = await fetchYahooMeta(yahooSymbol);
    const lastPrice = numberFrom(meta.regularMarketPrice);
    if (!Number.isFinite(lastPrice)) {
      return null;
    }
    const previousClose = firstFinite(
      numberFrom(meta.chartPreviousClose),
      numberFrom(meta.previousClose),
      numberFrom(meta.regularMarketPreviousClose),
      fallback.previousClose
    );
    const lastPriceAt = timestampFromEpoch(meta.regularMarketTime) ?? new Date().toISOString();
    return {
      ticker,
      entryPrice: fallback.entryPrice,
      lastPrice,
      previousClose,
      lastPriceAt,
      priceSource: `Yahoo Finance (${yahooSymbol})`,
      isStale: isQuoteTimestampStale(lastPriceAt)
    };
  } catch {
    return null;
  }
}

async function fetchYahooBenchmark(yahooSymbol) {
  const meta = await fetchYahooMeta(yahooSymbol);
  const lastPrice = numberFrom(meta.regularMarketPrice);
  if (!Number.isFinite(lastPrice)) {
    return null;
  }
  const previousClose = firstFinite(
    numberFrom(meta.chartPreviousClose),
    numberFrom(meta.previousClose),
    numberFrom(meta.regularMarketPreviousClose),
    benchmarkSnapshot.previousClose
  );
  const lastPriceAt = timestampFromEpoch(meta.regularMarketTime) ?? new Date().toISOString();
  return {
    ...benchmarkSnapshot,
    lastPrice,
    previousClose,
    lastPriceAt,
    source: `Yahoo Finance (${yahooSymbol})`,
    isStale: isQuoteTimestampStale(lastPriceAt)
  };
}

async function fetchYahooMeta(yahooSymbol) {
  const json = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1m`, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) {
    throw new Error(`Yahoo response missing meta for ${yahooSymbol}`);
  }
  return meta;
}

async function fetchBseQuote(ticker, scripcode, fallback) {
  try {
    const url = new URL(BSE_QUOTE_URL);
    url.searchParams.set("scripcode", scripcode);
    url.searchParams.set("flag", "0");
    url.searchParams.set("fromdate", "");
    url.searchParams.set("todate", "");
    url.searchParams.set("seriesid", "");
    const payload = await fetchJson(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.bseindia.com/",
        "Origin": "https://www.bseindia.com"
      }
    });
    const lastPrice = numberFrom(payload?.CurrVal);
    if (!Number.isFinite(lastPrice)) {
      return null;
    }
    const previousClose = firstFinite(numberFrom(payload?.PrevClose), fallback.previousClose);
    const lastPriceAt = parseBseTimestamp(payload?.CurrDate, payload?.CurrTime);
    return {
      ticker,
      entryPrice: fallback.entryPrice,
      lastPrice,
      previousClose,
      lastPriceAt,
      priceSource: `BSE India (${scripcode})`,
      isStale: isQuoteTimestampStale(lastPriceAt)
    };
  } catch {
    return null;
  }
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Quote request failed with HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function latestStateTimestamp(snapshots = priceSnapshots, benchmark = benchmarkSnapshot) {
  const liveTimestamps = [
    !benchmark.isStale && Number.isFinite(Number(benchmark.lastPrice)) ? benchmark.lastPriceAt : null,
    ...Object.values(snapshots).map((snapshot) =>
      !snapshot.isStale && Number.isFinite(Number(snapshot.lastPrice)) ? snapshot.lastPriceAt : null
    )
  ]
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);
  const latest = liveTimestamps.length ? Math.max(...liveTimestamps) : new Date(STATIC_PRICE_REFRESH_AT).getTime();
  return new Date(latest).toISOString();
}

function parseBseTimestamp(dateValue, timeValue) {
  const rawDate = String(dateValue ?? "").trim();
  if (!rawDate) {
    return new Date().toISOString();
  }
  const withOffset = /\bGMT\b|[+-]\d{4}$/.test(rawDate)
    ? rawDate
    : `${rawDate} GMT+0530`;
  const parsed = new Date(withOffset);
  if (Number.isFinite(parsed.getTime())) {
    return parsed.toISOString();
  }
  const fallback = new Date(`${rawDate.slice(0, 15)} ${String(timeValue ?? "15:30").trim()} GMT+0530`);
  return Number.isFinite(fallback.getTime()) ? fallback.toISOString() : new Date().toISOString();
}

function timestampFromEpoch(epochSeconds) {
  const number = Number(epochSeconds);
  if (!Number.isFinite(number)) {
    return null;
  }
  return new Date(number * 1000).toISOString();
}

function isQuoteTimestampStale(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return true;
  }
  return Math.abs(Date.now() - timestamp) > QUOTE_FRESHNESS_HOURS * 60 * 60 * 1000;
}

function numberFrom(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? round(number, 2) : null;
}

function firstFinite(...values) {
  return values.find((value) => Number.isFinite(Number(value))) ?? null;
}

function returnPercent(start, end) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === 0) {
    return null;
  }
  return round(((end - start) / start) * 100, 2);
}

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round(Number(value) * factor) / factor;
}

export function validateMultibaggerState(state = multibaggerState()) {
  const totalWeight = state.holdings.reduce((sum, holding) => sum + Number(holding.targetWeight), 0);
  if (Math.abs(totalWeight - 100) > 0.001) {
    throw new Error(`Multibagger weights must sum to 100, got ${totalWeight}`);
  }

  if (state.modelEntryDate !== MODEL_ENTRY_DATE || state.performance.modelEntryDate !== MODEL_ENTRY_DATE) {
    throw new Error(`Multibagger model entry date must be ${MODEL_ENTRY_DATE}`);
  }

  for (const holding of state.holdings) {
    if (!Number.isFinite(Number(holding.entryPrice))) {
      throw new Error(`${holding.ticker} is missing numeric entryPrice`);
    }
    if (!Number.isFinite(Date.parse(holding.entryAt))) {
      throw new Error(`${holding.ticker} is missing entryAt timestamp`);
    }
    if (!holding.isStale) {
      for (const field of ["lastPrice", "dayChangePercent"]) {
        if (!Number.isFinite(Number(holding[field]))) {
          throw new Error(`${holding.ticker} is missing numeric ${field}`);
        }
      }
      if (holding.returnPercent !== null) {
        const expectedReturn = returnPercent(holding.entryPrice, holding.lastPrice);
        if (Math.abs(expectedReturn - Number(holding.returnPercent)) > 0.01) {
          throw new Error(`${holding.ticker} return math is inconsistent`);
        }
      }
    }
  }

  if (!state.pricing.isStale && state.performance.currentModelValueInr !== null) {
    const expectedCurrentValue = round(state.holdings.reduce((sum, holding) => sum + Number(holding.currentModelValueInr), 0), 2);
    if (Math.abs(expectedCurrentValue - Number(state.performance.currentModelValueInr)) > 0.01) {
      throw new Error("Multibagger portfolio current value math is inconsistent");
    }
  }

  const serialized = JSON.stringify(state).toLowerCase();
  const forbidden = ["screenshot", "rawocr", "raw ocr", "private", "accountvalue", "account value", "quantity", "broker"];
  for (const token of forbidden) {
    if (serialized.includes(token)) {
      throw new Error(`Public multibagger state contains forbidden token: ${token}`);
    }
  }
  return state;
}
