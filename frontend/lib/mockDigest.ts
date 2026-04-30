import type { PublicDigest } from "./types";

export const mockDigest: PublicDigest = {
  scriptId: 1,
  digestDate: new Date().toISOString().slice(0, 10),
  title: "Nifty Pre-Market: Global Pressure Meets Domestic Selectivity",
  status: "DRAFT",
  overallSentiment: -0.267,
  sentimentLabel: "BEARISH",
  onePageSummary:
    "Market Mood: BEARISH\n\nGlobal Cues: S&P 500 -0.82%, Nasdaq 100 -1.21%, Brent Crude +1.64%, GIFT Nifty -0.38%\n\nNarrative Themes:\n- Negative Macro Impact: Energy prices moved higher overnight as traders priced fresh supply risk.\n- Sector-Specific Cushion: Domestic banking indicators remained resilient.\n\nValidated Trading Setups:\n- BANKNIFTY BULLISH entry 50960, stop 50383.23, target 52228.89 (RR 2.2)\n- NIFTY BULLISH entry 22705, stop 22428.45, target 23313.41 (RR 2.2)",
  teleprompterScript:
    "[OPENING]\nGood morning. The overnight setup is cautious, with global pressure visible before the Indian open.\n\n[GLOBAL CUES]\nS&P 500 closed -0.82%. Nasdaq 100 closed -1.21%. Brent Crude closed +1.64%.\n\n[NARRATIVE THEMES]\nTheme: Negative Macro Impact. Energy prices moved higher overnight as traders priced fresh supply risk.\n\n[VALIDATED SETUPS]\nNIFTY and BANKNIFTY are valid only if price respects the listed invalidation levels.\n\n[RISK DISCLAIMER]\nThis is educational analysis for content planning.",
  reelScript:
    "[REEL SCRIPT | 45-60 sec]\n\n[HOOK]\nBefore the open, Indian traders need to watch crude and banks first.\n\n[GLOBAL CUES]\nUS risk appetite softened and Brent is firm, so the open needs confirmation.\n\n[TRADE PLAN]\nNo chasing. I only take a 1:2 setup if price accepts the level and respects the stop.\n\n[CLOSE]\nEducational market preparation only, not investment advice.",
  publishedAt: null,
  marketSnapshots: [
    { symbol: "SPX", name: "S&P 500", closeValue: 5069.53, changePercent: -0.82, source: "Alpha Vantage Mock", marketRegion: "US Overnight", session: "us", tradingViewSymbol: "SP:SPX" },
    { symbol: "NDX", name: "Nasdaq 100", closeValue: 17718.11, changePercent: -1.21, source: "Yahoo Finance Mock", marketRegion: "US Overnight", session: "us", tradingViewSymbol: "NASDAQ:NDX" },
    { symbol: "NIKKEI", name: "Nikkei 225", closeValue: 38105.2, changePercent: 0.51, source: "Yahoo Finance Mock", marketRegion: "Asia Watch", country: "Japan", session: "tokyo", tradingViewSymbol: "TVC:NI225" },
    { symbol: "HSI", name: "Hang Seng", closeValue: 17763.03, changePercent: -0.34, source: "Yahoo Finance Mock", marketRegion: "Asia Watch", country: "Hong Kong", session: "hongkong", tradingViewSymbol: "TVC:HSI" },
    { symbol: "SHCOMP", name: "Shanghai Composite", closeValue: 3048.23, changePercent: 0.12, source: "Yahoo Finance Mock", marketRegion: "Asia Watch", country: "Mainland China", session: "shanghai", tradingViewSymbol: "SSE:000001" },
    { symbol: "KOSPI", name: "KOSPI", closeValue: 2692.06, changePercent: -0.27, source: "Yahoo Finance Mock", marketRegion: "Asia Watch", country: "South Korea", session: "seoul", tradingViewSymbol: "KRX:KOSPI" },
    { symbol: "TAIEX", name: "Taiwan Weighted", closeValue: 20328.64, changePercent: 0.44, source: "Yahoo Finance Mock", marketRegion: "Asia Watch", country: "Taiwan", session: "taipei", tradingViewSymbol: "TWSE:TAIEX" },
    { symbol: "GIFTNIFTY", name: "GIFT Nifty", closeValue: 22480.5, changePercent: -0.38, source: "Exchange Mock", marketRegion: "India Open", session: "india", tradingViewSymbol: "NSEIX:NIFTY1!" },
    { symbol: "DXY", name: "US Dollar Index", closeValue: 106.18, changePercent: 0.34, source: "MarketAux Mock", marketRegion: "Macro Hedges", session: "macro", tradingViewSymbol: "TVC:DXY" },
    { symbol: "BRENT", name: "Brent Crude", closeValue: 91.42, changePercent: 1.64, source: "MarketAux Mock", marketRegion: "Macro Hedges", session: "macro", tradingViewSymbol: "TVC:UKOIL" }
  ],
  news: [
    {
      headline: "Brent crude extends gains as supply risk returns to focus",
      summary: "Energy prices moved higher overnight as traders priced fresh supply risk.",
      sourceName: "Reuters Markets",
      sourceUrl: "https://www.reuters.com/markets/commodities/",
      sentimentScore: -0.76,
      entityName: "NIFTY",
      thumbnail: {
        label: "Crude",
        theme: "energy",
        accent: "#b91c1c",
        alt: "Brent crude thumbnail for supply-risk pressure"
      }
    },
    {
      headline: "Private banks show relative strength as credit growth stays firm",
      summary: "Domestic banking indicators remained resilient.",
      sourceName: "NSE India Data",
      sourceUrl: "https://www.nseindia.com/market-data/live-market-indices",
      sentimentScore: 0.31,
      entityName: "BANKNIFTY",
      thumbnail: {
        label: "Banks",
        theme: "banking",
        accent: "#059669",
        alt: "Banking sector thumbnail for Bank Nifty resilience"
      }
    }
  ],
  themes: [
    {
      themeType: "macro_negative",
      title: "Negative Macro Impact",
      summary: "Energy prices moved higher overnight as traders priced fresh supply risk.",
      sentimentScore: -0.76,
      evidenceCount: 1
    },
    {
      themeType: "sector_positive",
      title: "Sector-Specific Cushion",
      summary: "Domestic banking indicators remained resilient.",
      sentimentScore: 0.31,
      evidenceCount: 1
    }
  ],
  tradeSetups: [
    {
      symbol: "BANKNIFTY",
      direction: "BULLISH",
      entry: 50960,
      stopLoss: 50383.23,
      target: 52228.89,
      riskReward: 2.2,
      confidenceReason: "Price is above the 20-period EMA, RSI-14 is above 50 and rising, and volume is elevated.",
      invalidationReason: "Invalidate the setup if price closes below 50383.23."
    },
    {
      symbol: "NIFTY",
      direction: "BULLISH",
      entry: 22705,
      stopLoss: 22428.45,
      target: 23313.41,
      riskReward: 2.2,
      confidenceReason: "Price is above the 20-period EMA, RSI-14 is above 50 and rising, and volume is elevated.",
      invalidationReason: "Invalidate the setup if price closes below 22428.45."
    }
  ],
  asset: {
    sentimentLabel: "BEARISH",
    positivePrompt:
      "photorealistic Indian financial news thumbnail, identity-locked creator portrait, crimson risk dashboard, falling candles",
    negativePrompt: "plastic skin, distorted eyes, extra fingers, cartoonish, low resolution",
    palette: "crimson, graphite, cool white",
    referenceImageId: "creator-ref-001",
    controlNetMode: "ControlNet Canny + Depth identity lock",
    assetUrl: "/assets/mock/daily-thumbnail.webp"
  }
};
