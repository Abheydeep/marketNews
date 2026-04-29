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
  publishedAt: null,
  marketSnapshots: [
    { symbol: "BRENT", name: "Brent Crude", closeValue: 91.42, changePercent: 1.64, source: "MarketAux Mock" },
    { symbol: "DXY", name: "US Dollar Index", closeValue: 106.18, changePercent: 0.34, source: "MarketAux Mock" },
    { symbol: "GIFTNIFTY", name: "GIFT Nifty", closeValue: 22480.5, changePercent: -0.38, source: "Exchange Mock" },
    { symbol: "NDX", name: "Nasdaq 100", closeValue: 17718.11, changePercent: -1.21, source: "Yahoo Finance Mock" },
    { symbol: "SPX", name: "S&P 500", closeValue: 5069.53, changePercent: -0.82, source: "Alpha Vantage Mock" }
  ],
  news: [
    {
      headline: "Brent crude extends gains as supply risk returns to focus",
      summary: "Energy prices moved higher overnight as traders priced fresh supply risk.",
      sourceName: "Global Macro Wire",
      sourceUrl: "https://example.com/brent-supply-risk",
      sentimentScore: -0.76,
      entityName: "NIFTY"
    },
    {
      headline: "Private banks show relative strength as credit growth stays firm",
      summary: "Domestic banking indicators remained resilient.",
      sourceName: "Banking Desk",
      sourceUrl: "https://example.com/private-bank-strength",
      sentimentScore: 0.31,
      entityName: "BANKNIFTY"
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
