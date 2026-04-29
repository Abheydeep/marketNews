export type SentimentLabel = "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE";
export type DigestStatus = "DRAFT" | "PUBLISHED";

export type MarketSnapshot = {
  symbol: string;
  name: string;
  closeValue: number;
  changePercent: number;
  source: string;
};

export type NewsCard = {
  headline: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  sentimentScore: number;
  entityName: string;
};

export type Theme = {
  themeType: string;
  title: string;
  summary: string;
  sentimentScore: number;
  evidenceCount: number;
};

export type TradeSetup = {
  symbol: string;
  direction: string;
  entry: number;
  stopLoss: number;
  target: number;
  riskReward: number;
  confidenceReason: string;
  invalidationReason: string;
};

export type AssetPrompt = {
  sentimentLabel: SentimentLabel;
  positivePrompt: string;
  negativePrompt: string;
  palette: string;
  referenceImageId: string;
  controlNetMode: string;
  assetUrl: string;
};

export type PublicDigest = {
  scriptId: number;
  digestDate: string;
  title: string;
  status: DigestStatus;
  overallSentiment: number;
  sentimentLabel: SentimentLabel;
  onePageSummary: string;
  teleprompterScript: string;
  publishedAt: string | null;
  marketSnapshots: MarketSnapshot[];
  news: NewsCard[];
  themes: Theme[];
  tradeSetups: TradeSetup[];
  asset: AssetPrompt | null;
};
