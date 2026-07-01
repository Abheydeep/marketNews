const DIRECT_MARKET_CUE = /\b(nifty|sensex|gift nifty|bank nifty|brent|crude|oil|gold|silver|usd\/inr|rupee|dollar index|dxy|bond yields?|treasury yields?|fed|rbi|sebi|finance ministry|fii|dii|inflation|tariffs?|trade talks?|manufactur|pmi|asian markets?|nikkei|hang seng|kospi|nasdaq|s&p|dow|iran|israel|opec|hormuz|red sea|monsoon|gst|budget)\b/i;
const LOW_SIGNAL_PULSE = /\b(stock picks? today|stocks? to buy|shares? in focus|cross above (?:their )?\d+|target price|maintains? (?:add|buy|sell|hold|neutral)|ipos? opening for subscription|gmps?|who is .{0,60}\bfir filed|rains? live updates?|ai couldn.{0,12}replace experience)\b/i;

export function isPulseMarketCandidate(article) {
  const text = `${article?.headline ?? article?.title ?? ""} ${article?.summary ?? ""}`;
  return DIRECT_MARKET_CUE.test(text) && !LOW_SIGNAL_PULSE.test(text);
}
