"use client";

import type { OptionChain } from "@market-narrative/api-client";

export function PcrStrip({ chain }: { chain: OptionChain | null }) {
  const pcr = chain?.pcr.pcr ?? 0;
  const velocity = chain?.pcr.velocity_5m ?? 0;
  const width = Math.max(6, Math.min(pcr * 50, 100));
  return (
    <section className="widget p-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase text-white">PCR Velocity</h2>
        <span className={`text-sm font-black ${velocity >= 0 ? "text-gain" : "text-loss"}`}>{velocity.toFixed(3)}</span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-md bg-ink">
        <div className={`h-full ${pcr >= 1 ? "bg-gain" : "bg-loss"}`} style={{ width: `${width}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>PCR {pcr.toFixed(2)}</span>
        <span>{chain?.oi_status ?? "No OI state"}</span>
      </div>
    </section>
  );
}

