"use client";

import { Send } from "lucide-react";
import type { OptionChain, TradingIndex, TradingSignal } from "@market-narrative/api-client";
import { createOrderProposal } from "../lib/api";
import { useMarketStore } from "../store/marketStore";

export function SignalModule({ index, signal, chain }: { index: TradingIndex; signal: TradingSignal | null; chain: OptionChain | null }) {
  const setPendingProposal = useMarketStore((state) => state.setPendingProposal);
  const token = useMarketStore((state) => state.token);
  const actionTone = signal?.action === "BUY" ? "text-gain" : signal?.action === "SELL" ? "text-loss" : "text-amber";
  const disabled = !signal || signal.action === "WAIT" || !chain;

  async function propose() {
    if (!token) {
      return;
    }
    const proposal = await createOrderProposal(index, token);
    setPendingProposal(proposal);
  }

  return (
    <section className="widget overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
        <div>
          <h2 className="text-sm font-black uppercase text-white">Command Module</h2>
          <p className="text-xs text-slate-400">{index} signal payload</p>
        </div>
        <span className={`text-2xl font-black ${actionTone}`}>{signal?.action ?? "WAIT"}</span>
      </div>
      <div className="grid gap-3 p-3">
        <div className="grid grid-cols-4 gap-2 text-xs">
          <Box label="Confidence" value={`${signal?.confidence?.toFixed(0) ?? 0}%`} />
          <Box label="Entry" value={signal?.entry_price?.toFixed(2) ?? "-"} />
          <Box label="Target" value={signal?.target_price?.toFixed(2) ?? "-"} />
          <Box label="Stop" value={signal?.stop_loss?.toFixed(2) ?? "-"} />
        </div>
        <div className="min-h-28 rounded-md border border-line bg-ink p-2">
          <ul className="grid gap-1 text-xs leading-5 text-slate-300">
            {(signal?.reasons ?? ["Waiting for confluence engine"]).slice(0, 5).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
        <button
          disabled={disabled}
          onClick={() => void propose()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan px-3 text-sm font-black text-ink"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          Prepare Manual Order
        </button>
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
