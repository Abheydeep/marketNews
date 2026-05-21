"use client";

import { FlaskConical } from "lucide-react";
import type { TradingIndex, TradingSignal } from "@market-narrative/api-client";

export function FvgPaperPanel({ index, observation }: { index: TradingIndex; observation: TradingSignal | null }) {
  const action = observation?.action ?? "WAIT";
  const actionTone = action === "BUY" ? "text-gain" : action === "SELL" ? "text-loss" : "text-amber";

  return (
    <section className="widget overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <FlaskConical className="h-4 w-4 shrink-0 text-cyan" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-sm font-black uppercase text-white">FVG Paper Lab</h2>
            <p className="truncate text-xs text-slate-400">{index} · observe-only, no orders</p>
          </div>
        </div>
        <span className={`text-2xl font-black ${actionTone}`}>{action}</span>
      </div>
      <div className="grid gap-3 p-3">
        <div className="rounded-md border border-cyan/40 bg-cyan/10 px-2 py-1.5 text-[11px] font-bold uppercase text-cyan">
          Paper / observe-only — this signal never places or proposes an order
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <Box label="Confidence" value={`${observation?.confidence?.toFixed(0) ?? 0}%`} />
          <Box label="Entry" value={observation?.entry_price?.toFixed(2) ?? "-"} />
          <Box label="Target" value={observation?.target_price?.toFixed(2) ?? "-"} />
          <Box label="Stop" value={observation?.stop_loss?.toFixed(2) ?? "-"} />
        </div>
        <div className="min-h-28 rounded-md border border-line bg-ink p-2">
          <ul className="grid gap-1 text-xs leading-5 text-slate-300">
            {(observation?.reasons ?? ["Waiting for the FVG paper strategy"]).slice(0, 5).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-panelSoft p-2">
      <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
      <div className="mt-1 truncate text-sm font-black text-white">{value}</div>
    </div>
  );
}
