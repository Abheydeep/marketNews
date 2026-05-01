export type Permission =
  | "admin:read"
  | "admin:write"
  | "create:script"
  | "edit:script"
  | "generate:assets"
  | "publish:digest"
  | "public:read"
  | "trade:read"
  | "trade:execute";

export type PublicDigest = {
  digestDate: string;
  title: string;
  sentimentLabel: "BULLISH" | "BEARISH" | "VOLATILE" | "NEUTRAL";
  onePageSummary: string;
  publishedAt: string | null;
};

export async function getPublicDigest(date: "today" | string): Promise<PublicDigest> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
  const response = await fetch(`${baseUrl}/api/public/digest/${date}`, {
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error(`Unable to load digest ${date}: HTTP ${response.status}`);
  }

  return response.json() as Promise<PublicDigest>;
}

export type TradingIndex = "NIFTY" | "BANKNIFTY";
export type TradingAction = "BUY" | "SELL" | "WAIT";
export type OptionType = "CE" | "PE";

export type TradingCandle = {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi?: number | null;
};

export type PriceZone = {
  lower: number;
  upper: number;
  center: number;
  kind: "support" | "resistance";
  strength: number;
};

export type Trendline = {
  kind: "support" | "resistance";
  slope: number;
  intercept: number;
  start_index: number;
  end_index: number;
};

export type PivotPoint = {
  index: number;
  ts: string;
  price: number;
  kind: "support" | "resistance";
  strength: number;
};

export type IndicatorSnapshot = {
  ema: number;
  rsi: number;
  macd: number;
  macd_signal: number;
  vwap: number;
};

export type TechnicalSnapshot = {
  indicators: IndicatorSnapshot;
  pivots: PivotPoint[];
  wick_zones: PriceZone[];
  kde_zones: PriceZone[];
  trendlines: Trendline[];
};

export type OptionContract = {
  instrument_token: number;
  tradingsymbol: string;
  exchange: "NFO" | string;
  name: TradingIndex;
  expiry: string;
  strike: number;
  option_type: OptionType;
  lot_size: number;
};

export type OptionSnapshot = {
  contract: OptionContract;
  last_price: number;
  open_interest: number;
  oi_delta: number;
  price_delta: number;
  volume: number;
  ts: string;
};

export type PCRSnapshot = {
  index: TradingIndex;
  put_oi: number;
  call_oi: number;
  pcr: number;
  velocity_5m: number;
  ts: string;
};

export type OptionChain = {
  index: TradingIndex;
  spot: number;
  expiry: string;
  snapshots: OptionSnapshot[];
  pcr: PCRSnapshot;
  oi_status: string;
};

export type TradingNewsEvent = {
  id: string;
  headline: string;
  source: string;
  published_at: string;
  url?: string | null;
  sentiment_label: "positive" | "neutral" | "negative";
  sentiment_score: number;
};

export type TradingSignal = {
  index: TradingIndex;
  action: TradingAction;
  entry_price?: number | null;
  target_price?: number | null;
  stop_loss?: number | null;
  confidence: number;
  reasons: string[];
  generated_at: string;
};

export type TradingRiskState = {
  live_orders_enabled: boolean;
  kill_switch_enabled: boolean;
  daily_realized_pnl: number;
  daily_loss_limit: number;
  open_positions_by_index: Record<TradingIndex, number>;
};

export type TradingMarketEnvelope = {
  candles: Record<TradingIndex, TradingCandle[]>;
  technicals: Record<TradingIndex, TechnicalSnapshot>;
  option_chains: Record<TradingIndex, OptionChain>;
  news: TradingNewsEvent[];
  signals: Record<TradingIndex, TradingSignal>;
  risk: TradingRiskState;
  server_ts?: string;
};

export type OrderProposal = {
  proposal_id: string;
  status: "PROPOSED" | "BLOCKED" | "PLACED" | "REJECTED";
  index: TradingIndex;
  signal_action: "BUY" | "SELL";
  tradingsymbol: string;
  exchange: string;
  transaction_type: "BUY";
  product: "MIS";
  order_type: "LIMIT";
  quantity: number;
  limit_price: number;
  target_price?: number | null;
  stop_loss?: number | null;
  created_at: string;
  expires_at: string;
  reasons: string[];
};

export type OrderResult = {
  proposal_id: string;
  status: "PROPOSED" | "BLOCKED" | "PLACED" | "REJECTED";
  broker_order_id?: string | null;
  reasons: string[];
};
