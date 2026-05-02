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
    url: "https://kpenergy.in/kpedata/assets/uploads/Investor%20Presentation%20Q3%20FY26%20Performance.pdf"
  },
  {
    label: "Dhabriya Polywood Q3/9M FY26 release",
    url: "https://www.polywood.org/wp-content/uploads/2020/12/Press-Release-Q3-9M-FY26.pdf"
  },
  {
    label: "PIGL Q3 FY26 and order-book summary",
    url: "https://www.whalesbook.com/news/English/industrial-goodsservices/Power-and-Instrumentation-Q3-FY26-Revenue-Surges-43percent-Bags-indian-rupee124-Cr-Orders/69999ca0730b6847a5176b11"
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
