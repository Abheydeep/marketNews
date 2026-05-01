const MODEL_CAPITAL_INR = 500_000;

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
    status: "Core hold / buy staged"
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
    status: "Core hold / buy staged"
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
    status: "Capped alpha"
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
    status: "Capped alpha"
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
    status: "Quality alpha"
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
    status: "Speculative cap"
  }
];

const transactions = holdings.map((holding) => ({
  date: "2026-05-01",
  ticker: holding.ticker,
  action: "MODEL_START",
  weightChange: holding.targetWeight,
  publicNote: `Initial model allocation for ${holding.role.toLowerCase()}.`,
  referencePrice: null,
  performanceNote: "Entry will be locked from the first published quote snapshot."
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
  const state = {
    modelName: "Concentrated 5x Multibagger Model",
    modelCapitalInr: MODEL_CAPITAL_INR,
    updatedAt: "2026-05-01T08:30:00+05:30",
    quoteStatus: {
      mode: "static-fallback",
      lastRefreshAt: null,
      note: "Daily quote refresh is expected from the backend or scheduled publisher. Static data keeps the public page readable when the backend is offline."
    },
    performance: {
      sinceLaunchPercent: 0,
      launchDate: "2026-05-01",
      benchmark: "NIFTY 50",
      benchmarkSinceLaunchPercent: 0,
      note: "Performance starts from the first published quote snapshot after launch."
    },
    holdings,
    transactions,
    monthlyReviews,
    watchlist,
    sources,
    disclaimer: "Educational research tracker only. It is not investment advice, a recommendation, or a promise of returns."
  };
  validateMultibaggerState(state);
  return state;
}

export function validateMultibaggerState(state = multibaggerState()) {
  const totalWeight = state.holdings.reduce((sum, holding) => sum + Number(holding.targetWeight), 0);
  if (Math.abs(totalWeight - 100) > 0.001) {
    throw new Error(`Multibagger weights must sum to 100, got ${totalWeight}`);
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
