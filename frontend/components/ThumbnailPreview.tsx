import type { AssetPrompt, SentimentLabel } from "@/lib/types";

const glow: Record<SentimentLabel, string> = {
  BULLISH: "from-moss/70 via-ink to-ink",
  BEARISH: "from-risk/70 via-ink to-ink",
  NEUTRAL: "from-steel/70 via-ink to-ink",
  VOLATILE: "from-amber/70 via-ink to-ink"
};

export function ThumbnailPreview({ asset }: { asset: AssetPrompt | null }) {
  const label = asset?.sentimentLabel ?? "NEUTRAL";
  return (
    <section className={`market-board rounded border border-ink bg-gradient-to-br ${glow[label]} p-5 text-white shadow-panel`}>
      <div className="flex min-h-[260px] flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs font-bold">{label}</span>
          <span className="text-xs font-bold uppercase text-white/70">ControlNet ID Lock</span>
        </div>
        <div className="grid grid-cols-[1fr_96px] items-end gap-5">
          <div>
            <h2 className="max-w-[14ch] text-4xl font-black leading-none">PRE-MARKET STORYBOARD</h2>
            <p className="mt-3 text-sm leading-6 text-white/75">{asset?.palette ?? "steel, white, muted green"}</p>
          </div>
          <div className="space-y-2">
            {[60, 44, 72, 36, 82].map((height, index) => (
              <div key={index} className="flex items-end gap-1">
                <span className="h-8 w-2 bg-white/35" style={{ height }} />
                <span className="h-8 w-2 bg-white/70" style={{ height: Math.max(18, height - 16) }} />
                <span className="h-8 w-2 bg-white/25" style={{ height: Math.max(20, height + 8) }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
