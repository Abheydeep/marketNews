import type { MarketSnapshot } from "@/lib/types";

export function MarketSnapshotGrid({ snapshots }: { snapshots: MarketSnapshot[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {snapshots.map((snapshot) => {
        const isPositive = snapshot.changePercent >= 0;
        return (
          <article key={snapshot.symbol} className="rounded border border-line bg-white p-4 shadow-panel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-steel">{snapshot.symbol}</p>
                <h3 className="mt-1 text-sm font-bold text-ink">{snapshot.name}</h3>
              </div>
              <span className={`text-sm font-bold ${isPositive ? "text-moss" : "text-risk"}`}>
                {isPositive ? "+" : ""}
                {snapshot.changePercent.toFixed(2)}%
              </span>
            </div>
            <p className="mt-5 text-2xl font-bold text-ink">{snapshot.closeValue.toLocaleString("en-IN")}</p>
            <p className="mt-1 text-xs text-steel">{snapshot.source}</p>
          </article>
        );
      })}
    </section>
  );
}
