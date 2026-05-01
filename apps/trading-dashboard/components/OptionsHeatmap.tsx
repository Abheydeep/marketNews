"use client";

import type { OptionChain, OptionSnapshot } from "@market-narrative/api-client";

export function OptionsHeatmap({ chain }: { chain: OptionChain | null }) {
  const rows = groupRows(chain?.snapshots ?? []);
  return (
    <section className="widget min-h-[280px] overflow-hidden">
      <div className="border-b border-line px-3 py-2">
        <h2 className="text-sm font-black uppercase text-white">Options OI Heatmap</h2>
        <p className="text-xs text-slate-400">{chain ? `${chain.oi_status} | Exp ${new Date(chain.expiry).toLocaleDateString()}` : "Waiting for chain"}</p>
      </div>
      <div className="grid grid-cols-[1fr_90px_1fr] border-b border-line bg-panelSoft px-3 py-2 text-xs font-black text-slate-400">
        <span>CALL OI</span>
        <span className="text-center">STRIKE</span>
        <span className="text-right">PUT OI</span>
      </div>
      <div className="max-h-[218px] overflow-auto">
        {rows.map((row) => (
          <div key={row.strike} className="grid grid-cols-[1fr_90px_1fr] items-center gap-2 border-b border-line/60 px-3 py-1.5 text-xs">
            <HeatCell snapshot={row.ce} side="call" />
            <div className="text-center font-black text-slate-100">{row.strike}</div>
            <HeatCell snapshot={row.pe} side="put" />
          </div>
        ))}
      </div>
    </section>
  );
}

function HeatCell({ snapshot, side }: { snapshot?: OptionSnapshot; side: "call" | "put" }) {
  if (!snapshot) {
    return <span className="h-7 rounded-md border border-line bg-ink" />;
  }
  const intense = Math.min(Math.abs(snapshot.oi_delta) / 25000, 1);
  const color = side === "call" ? `rgba(219, 59, 77, ${0.2 + intense * 0.6})` : `rgba(17, 163, 106, ${0.2 + intense * 0.6})`;
  return (
    <div className={`rounded-md border border-line px-2 py-1 ${side === "put" ? "text-right" : ""}`} style={{ background: color }}>
      <div className="font-black">{Math.round(snapshot.open_interest).toLocaleString()}</div>
      <div className="text-[10px] text-slate-200">Delta {Math.round(snapshot.oi_delta).toLocaleString()}</div>
    </div>
  );
}

function groupRows(snapshots: OptionSnapshot[]) {
  const rows = new Map<number, { strike: number; ce?: OptionSnapshot; pe?: OptionSnapshot }>();
  for (const snapshot of snapshots) {
    const strike = snapshot.contract.strike;
    const row = rows.get(strike) ?? { strike };
    if (snapshot.contract.option_type === "CE") {
      row.ce = snapshot;
    } else {
      row.pe = snapshot;
    }
    rows.set(strike, row);
  }
  return Array.from(rows.values()).sort((a, b) => a.strike - b.strike);
}

