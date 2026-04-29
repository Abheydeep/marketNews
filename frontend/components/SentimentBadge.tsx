import type { SentimentLabel } from "@/lib/types";

const styles: Record<SentimentLabel, string> = {
  BULLISH: "border-moss/20 bg-moss/10 text-moss",
  BEARISH: "border-risk/20 bg-risk/10 text-risk",
  NEUTRAL: "border-steel/20 bg-steel/10 text-steel",
  VOLATILE: "border-amber/20 bg-amber/10 text-amber"
};

export function SentimentBadge({ label }: { label: SentimentLabel }) {
  return (
    <span className={`inline-flex items-center rounded border px-2.5 py-1 text-xs font-bold ${styles[label]}`}>
      {label}
    </span>
  );
}
