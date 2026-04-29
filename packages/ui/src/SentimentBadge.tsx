import { marketPalette } from "./market-tokens";

type SentimentLabel = "BULLISH" | "BEARISH" | "VOLATILE" | "NEUTRAL";

export function SentimentBadge({ label }: { label: SentimentLabel }) {
  const color = {
    BULLISH: marketPalette.positive,
    BEARISH: marketPalette.negative,
    VOLATILE: marketPalette.volatile,
    NEUTRAL: marketPalette.slate
  }[label];

  return (
    <span style={{ color, fontWeight: 800 }}>
      {label}
    </span>
  );
}
