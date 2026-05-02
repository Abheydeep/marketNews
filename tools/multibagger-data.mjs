const MODEL_CAPITAL_INR = 500_000;
const MODEL_ENTRY_DATE = "2026-04-27";
const STATIC_PRICE_REFRESH_AT = "2026-05-01T15:30:00+05:30";

const priceSnapshots = {
  KPEL: {
    entryPrice: 486.4,
    lastPrice: null,
    previousClose: null,
    lastPriceAt: STATIC_PRICE_REFRESH_AT,
    priceSource: "Awaiting verified live quote",
    isStale: true
  },
  DHABRIYA: {
    entryPrice: 308.2,
    lastPrice: null,
    previousClose: null,
    lastPriceAt: STATIC_PRICE_REFRESH_AT,
    priceSource: "Awaiting verified live quote",
    isStale: true
  },
  PIGL: {
    entryPrice: 148.8,
    lastPrice: null,
    previousClose: null,
    lastPriceAt: STATIC_PRICE_REFRESH_AT,
    priceSource: "Awaiting verified live quote",
    isStale: true
  },
  JNKINDIA: {
    entryPrice: 608.5,
    lastPrice: null,
    previousClose: null,
    lastPriceAt: STATIC_PRICE_REFRESH_AT,
    priceSource: "Awaiting verified live quote",
    isStale: true
  },
  DYCL: {
    entryPrice: 505.1,
    lastPrice: null,
    previousClose: null,
    lastPriceAt: STATIC_PRICE_REFRESH_AT,
    priceSource: "Awaiting verified live quote",
    isStale: true
  },
  TEMBO: {
    entryPrice: 246.3,
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
        "The public thesis is execution-led renewable growth, not a generic green-energy story."
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
      ticker: "PIGL",
      evidence: [
        "Power & Instrumentation Gujarat reported Q3 FY26 total income of Rs 48.89 crore, up 43.2% YoY.",
        "Q3 FY26 PAT was Rs 3.57 crore, up 14.4% YoY but down 24.2% QoQ.",
        "The evidence supports capped sizing because revenue growth is ahead of profit growth."
      ],
      needsProof: "Order wins must convert into better PAT margin and clean working-capital collection.",
      sourceLabel: "PIGL Q3 FY26 summary",
      sourceUrl: "https://www.kotakneo.com/financial-results/power-instrumentation-gujarat-share-price-q3fy2025-26-results/"
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
      ticker: "TEMBO",
      evidence: [
        "Tembo public announcements cited Q3 revenue near Rs 251 crore and an order book near Rs 1,484 crore.",
        "Screener's announcement list also shows NSE fine disclosure and large EGM approvals for borrowings, charges, investments and guarantees.",
        "The evidence supports optionality but also explains why the model caps the weight."
      ],
      needsProof: "Cash-flow confirmation, governance cleanup and financing discipline are required before any higher-conviction role.",
      sourceLabel: "Tembo public filings/announcements",
      sourceUrl: "https://www.screener.in/company/TEMBO/"
    }
  ],
  researchBoundaries: [
    "This evidence layer is dated context, not a trading signal or return promise.",
    "The model avoids unverified percentile claims, unsourced ROE figures and short-term return claims.",
    "Public data excludes demat-level positions, account values and unpublished admin review notes."
  ]
};

const holdings = [
  {
    ticker: "KPEL",
    yahooSymbol: "KPEL.BO",
    name: "KP Energy",
    targetWeight: 25,
    modelAmountInr: 125_000,
    role: "Anchor renewable alpha",
    thesis: "Low-PE renewable execution with strong revenue growth and a valuation that still leaves room for rerating.",
    buyRule: "Build first while valuation remains a small-cap growth bargain and receivables stay controlled.",
    breakRule: "Trim if project execution slips, receivables stretch, or group complexity starts driving the story.",
    profitabilityLens: "Revenue growth and execution momentum must keep translating into reported profit and operating cash flow.",
    valuationLens: "Still treated as the valuation-growth anchor; rerating room matters more than headline theme popularity.",
    growthCatalyst: "Renewable project execution, order conversion, and sector capex visibility.",
    conversionRisk: "Receivables or delayed project cash collection would weaken the anchor role.",
    capitalStructureRisk: "Group complexity, debt-funded expansion, or guarantees must stay contained.",
    status: "Core hold / buy staged",
    ...holdingPerformance("KPEL", 125_000)
  },
  {
    ticker: "DHABRIYA",
    yahooSymbol: "538715.BO",
    name: "Dhabriya Polywood",
    targetWeight: 20,
    modelAmountInr: 100_000,
    role: "Hidden-quality margin inflection",
    thesis: "Microcap quality candidate with PAT doubling, expanded EBITDA margin and a still-sane valuation base.",
    buyRule: "Build after confirming liquidity; add only if FY26 keeps the new margin band intact.",
    breakRule: "Reduce if inventory, debt or receivables absorb the reported earnings growth.",
    profitabilityLens: "The key proof is whether the improved margin band survives beyond one strong result.",
    valuationLens: "Microcap valuation is acceptable only while earnings quality and liquidity improve together.",
    growthCatalyst: "Operating leverage from scale, product mix, and margin recovery.",
    conversionRisk: "Inventory build-up or debtor stretch would turn reported PAT into lower-quality growth.",
    capitalStructureRisk: "Debt and working-capital funding must not rise faster than earnings.",
    status: "Core hold / buy staged",
    ...holdingPerformance("DHABRIYA", 100_000)
  },
  {
    ticker: "PIGL",
    yahooSymbol: "PIGL.NS",
    name: "Power & Instrumentation Gujarat",
    targetWeight: 17.5,
    modelAmountInr: 87_500,
    role: "Microcap order-book asymmetry",
    thesis: "Order book is materially larger than market cap, with RDSS work and Peaton busduct optionality.",
    buyRule: "Build capped exposure only while PAT margin begins catching up with revenue growth.",
    breakRule: "Do not average down if orders convert into low-margin working-capital strain.",
    profitabilityLens: "Revenue growth has to become PAT-margin expansion, not just larger low-margin execution.",
    valuationLens: "Order-book-to-market-cap asymmetry is attractive but only if margins and cash collection improve.",
    growthCatalyst: "RDSS execution, busduct optionality, and electrical infrastructure order conversion.",
    conversionRisk: "Large orders can destroy value if they arrive with low margins, slow billing, or debtor stress.",
    capitalStructureRisk: "Working-capital borrowing and customer concentration need monthly review.",
    status: "Capped alpha",
    ...holdingPerformance("PIGL", 87_500)
  },
  {
    ticker: "JNKINDIA",
    yahooSymbol: "JNKINDIA.NS",
    name: "JNK India",
    targetWeight: 15,
    modelAmountInr: 75_000,
    role: "Order book entering P&L",
    thesis: "Q3 revenue and PAT acceleration show that order visibility is already touching reported earnings.",
    buyRule: "Start now; scale only after the next result confirms conversion without debtor blowout.",
    breakRule: "Reduce if receivables expand faster than sales or order conversion stalls.",
    profitabilityLens: "Reported PAT acceleration must be supported by execution quality and margin stability.",
    valuationLens: "The stock earns a slot only while the market still underprices order conversion.",
    growthCatalyst: "Order book entering P&L through process-heating and industrial capex execution.",
    conversionRisk: "Receivables expanding faster than sales would be the main evidence break.",
    capitalStructureRisk: "Balance-sheet strain from execution scale-up should stay modest.",
    status: "Capped alpha",
    ...holdingPerformance("JNKINDIA", 75_000)
  },
  {
    ticker: "DYCL",
    yahooSymbol: "DYCL.NS",
    name: "Dynamic Cables",
    targetWeight: 12.5,
    modelAmountInr: 62_500,
    role: "Cleaner cable-cycle quality alpha",
    thesis: "Mid-teens valuation, PAT growth, order visibility and solar DC/e-beam capacity provide a second trigger.",
    buyRule: "Build measured exposure; add if order inflow, spreads and capacity ramp remain disciplined.",
    breakRule: "Trim if cable spreads turn, receivables worsen, or capacity ramp disappoints.",
    profitabilityLens: "PAT growth should remain visible without relying on a one-off commodity spread tailwind.",
    valuationLens: "Mid-teens style valuation keeps it in the model while capacity optionality is still underpriced.",
    growthCatalyst: "Cable-cycle demand, solar DC products, e-beam capacity, and order inflow.",
    conversionRisk: "Receivable quality and commodity-linked margin swings are the main conversion checks.",
    capitalStructureRisk: "Capacity ramp must avoid excessive leverage or weak interest coverage.",
    status: "Quality alpha",
    ...holdingPerformance("DYCL", 62_500)
  },
  {
    ticker: "TEMBO",
    yahooSymbol: "TEMBO.NS",
    name: "Tembo Global",
    targetWeight: 10,
    modelAmountInr: 50_000,
    role: "Capped high-asymmetry optionality",
    thesis: "Large order book and scaled 9M profit create upside, but cash-flow and governance risks cap sizing.",
    buyRule: "Hold as option-sized exposure; do not average up without cash-flow and governance proof.",
    breakRule: "Reduce quickly on weak operating cash flow, guarantees, related-party issues or dilution.",
    profitabilityLens: "Profit scale-up matters only if operating cash flow confirms it.",
    valuationLens: "The market-cap/order-book gap offers upside, but the discount is partly deserved until governance proof improves.",
    growthCatalyst: "Large order-book execution and exports or infrastructure-linked demand.",
    conversionRisk: "Cash-flow slippage, guarantees, or delayed collections would break the optionality case.",
    capitalStructureRisk: "Dilution, pledges, guarantees, and related-party risk keep sizing capped.",
    status: "Speculative cap",
    ...holdingPerformance("TEMBO", 50_000)
  }
];

const transactions = holdings.map((holding) => ({
  date: MODEL_ENTRY_DATE,
  ticker: holding.ticker,
  action: "MODEL_BUY",
  weightChange: holding.targetWeight,
  publicNote: `Public model buy for ${holding.role.toLowerCase()}.`,
  referencePrice: holding.entryPrice,
  performanceNote: `Return tracking starts from the ${MODEL_ENTRY_DATE} model price.`
}));

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
        ticker: "PIGL",
        decision: "KEEP",
        publicRationale: "Order-book asymmetry is strong, but sizing remains capped until margin proof improves."
      },
      {
        ticker: "JNKINDIA",
        decision: "KEEP",
        publicRationale: "Order conversion has started, while working capital remains the review point."
      },
      {
        ticker: "DYCL",
        decision: "KEEP",
        publicRationale: "Cleaner cable-cycle exposure with capacity optionality and sane valuation."
      },
      {
        ticker: "TEMBO",
        decision: "KEEP CAPPED",
        publicRationale: "Upside is attractive, but governance and cash-flow checks prevent higher sizing."
      }
    ],
    changesMade: [
      "Moved from a broad 10-name basket to a concentrated 6-stock public model.",
      "Kept CPCL outside the model as a tactical refinery trade.",
      "Moved HPL, EPack, eMudhra and Windlas to backup/watch status."
    ]
  }
];

const watchlist = [
  {
    ticker: "DELTNCBL",
    name: "Delton Cables",
    status: "Watch / capped challenger",
    reason: "Order-book-to-market-cap math is attractive, but leverage and copper/input-cost risk need proof."
  },
  {
    ticker: "GALAPREC",
    name: "Gala Precision",
    status: "Watch / quality challenger",
    reason: "Precision industrial growth is good, but near-30x PE and margin compression keep it outside the top six."
  },
  {
    ticker: "SHARDAMOTR",
    name: "Sharda Motor",
    status: "Quality ballast",
    reason: "Useful low-PE quality name, but lower 5x torque than the concentrated alpha basket."
  },
  {
    ticker: "MARKOLINES",
    name: "Markolines",
    status: "Tiny optionality",
    reason: "Interesting order-book asymmetry, but liquidity and debtor risk make it too small for the primary model."
  },
  {
    ticker: "CPCL",
    name: "Chennai Petroleum",
    status: "Tactical side trade",
    reason: "Refinery-cycle value is real, but it is not treated as a permanent multibagger compounder."
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
    label: "PIGL Q3 FY26 summary",
    url: "https://www.kotakneo.com/financial-results/power-instrumentation-gujarat-share-price-q3fy2025-26-results/"
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
    label: "Tembo Global public filings and result material",
    url: "https://www.screener.in/company/TEMBO/"
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

export function multibaggerState() {
  const hasVerifiedPrices = holdings.every((holding) => !holding.isStale && Number.isFinite(Number(holding.currentModelValueInr)));
  const currentModelValueInr = hasVerifiedPrices
    ? round(holdings.reduce((sum, holding) => sum + holding.currentModelValueInr, 0), 2)
    : null;
  const totalPnlInr = hasVerifiedPrices ? round(currentModelValueInr - MODEL_CAPITAL_INR, 2) : null;
  const sinceLaunchPercent = hasVerifiedPrices ? round((totalPnlInr / MODEL_CAPITAL_INR) * 100, 2) : null;
  const benchmarkSinceLaunchPercent = returnPercent(benchmarkSnapshot.entryPrice, benchmarkSnapshot.lastPrice);
  const state = {
    modelName: "Concentrated 5x Multibagger Model",
    modelCapitalInr: MODEL_CAPITAL_INR,
    modelEntryDate: MODEL_ENTRY_DATE,
    updatedAt: STATIC_PRICE_REFRESH_AT,
    quoteStatus: {
      mode: "awaiting-verified-quotes",
      lastRefreshAt: STATIC_PRICE_REFRESH_AT,
      note: "Current prices and returns are hidden until the server supplies verified live quotes."
    },
    pricing: {
      mode: "awaiting-verified-quotes",
      refreshedAt: STATIC_PRICE_REFRESH_AT,
      isStale: true,
      refreshCadence: "Every 5 minutes during Indian market hours when the backend is live",
      benchmark: {
        ...benchmarkSnapshot,
        returnPercent: benchmarkSinceLaunchPercent,
        dayChangePercent: returnPercent(benchmarkSnapshot.previousClose, benchmarkSnapshot.lastPrice)
      },
      note: "Fallback mode does not publish current prices, returns, or P&L."
    },
    performance: {
      sinceLaunchPercent,
      launchDate: MODEL_ENTRY_DATE,
      modelEntryDate: MODEL_ENTRY_DATE,
      benchmark: "NIFTY 50",
      benchmarkSinceLaunchPercent,
      currentModelValueInr,
      totalPnlInr,
      note: "Model performance is calculated from the public model start date and model allocation weights."
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

function holdingPerformance(ticker, modelAmountInr) {
  const snapshot = priceSnapshots[ticker];
  const returnValue = returnPercent(snapshot.entryPrice, snapshot.lastPrice);
  const dayChangePercent = returnPercent(snapshot.previousClose, snapshot.lastPrice);
  const hasVerifiedQuote = !snapshot.isStale && Number.isFinite(Number(snapshot.lastPrice));
  const currentModelValueInr = hasVerifiedQuote
    ? round(modelAmountInr * (snapshot.lastPrice / snapshot.entryPrice), 2)
    : null;
  const modelPnlInr = hasVerifiedQuote ? round(currentModelValueInr - modelAmountInr, 2) : null;
  return {
    modelEntryDate: MODEL_ENTRY_DATE,
    entryPrice: snapshot.entryPrice,
    lastPrice: snapshot.lastPrice,
    previousClose: snapshot.previousClose,
    dayChangePercent,
    lastPriceAt: snapshot.lastPriceAt,
    priceSource: snapshot.priceSource,
    isStale: snapshot.isStale,
    returnPercent: returnValue,
    modelPnlInr,
    currentModelValueInr
  };
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
    if (!holding.isStale) {
      for (const field of ["lastPrice", "returnPercent", "modelPnlInr", "currentModelValueInr", "dayChangePercent"]) {
        if (!Number.isFinite(Number(holding[field]))) {
          throw new Error(`${holding.ticker} is missing numeric ${field}`);
        }
      }
      const expectedReturn = returnPercent(holding.entryPrice, holding.lastPrice);
      if (Math.abs(expectedReturn - Number(holding.returnPercent)) > 0.01) {
        throw new Error(`${holding.ticker} return math is inconsistent`);
      }
    }
  }

  if (!state.pricing.isStale) {
    const expectedCurrentValue = round(state.holdings.reduce((sum, holding) => sum + Number(holding.currentModelValueInr), 0), 2);
    if (Math.abs(expectedCurrentValue - Number(state.performance.currentModelValueInr)) > 0.01) {
      throw new Error("Multibagger portfolio current value math is inconsistent");
    }
  }

  const serialized = JSON.stringify(state).toLowerCase();
  const forbidden = ["screenshot", "rawocr", "private", "accountvalue", "quantity", "broker"];
  for (const token of forbidden) {
    if (serialized.includes(token)) {
      throw new Error(`Public multibagger state contains forbidden token: ${token}`);
    }
  }
  return state;
}
