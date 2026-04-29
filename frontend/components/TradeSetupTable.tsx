import type { TradeSetup } from "@/lib/types";

export function TradeSetupTable({ setups }: { setups: TradeSetup[] }) {
  return (
    <section className="overflow-hidden rounded border border-line bg-white shadow-panel">
      <div className="grid grid-cols-5 border-b border-line bg-paper px-4 py-3 text-xs font-bold uppercase text-steel">
        <span>Symbol</span>
        <span>Entry</span>
        <span>Stop</span>
        <span>Target</span>
        <span>RR</span>
      </div>
      {setups.length === 0 ? (
        <p className="p-4 text-sm text-steel">No setup passed all filters.</p>
      ) : (
        setups.map((setup) => (
          <article key={setup.symbol} className="border-b border-line px-4 py-4 last:border-b-0">
            <div className="grid grid-cols-5 items-center text-sm font-bold text-ink">
              <span>{setup.symbol}</span>
              <span>{setup.entry.toLocaleString("en-IN")}</span>
              <span>{setup.stopLoss.toLocaleString("en-IN")}</span>
              <span>{setup.target.toLocaleString("en-IN")}</span>
              <span className="text-moss">{setup.riskReward.toFixed(2)}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-steel">{setup.confidenceReason}</p>
            <p className="mt-1 text-xs font-bold text-risk">{setup.invalidationReason}</p>
          </article>
        ))
      )}
    </section>
  );
}
