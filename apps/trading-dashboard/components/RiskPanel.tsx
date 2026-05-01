"use client";

import { Power, ShieldAlert } from "lucide-react";
import type { TradingRiskState } from "@market-narrative/api-client";
import { setKillSwitch } from "../lib/api";
import { useMarketStore } from "../store/marketStore";

export function RiskPanel({ risk }: { risk: TradingRiskState | null }) {
  const token = useMarketStore((state) => state.token);

  async function toggleKillSwitch() {
    if (!token) {
      return;
    }
    await setKillSwitch(!risk?.kill_switch_enabled, token);
  }

  return (
    <section className="widget p-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase text-white">Risk Gate</h2>
        <ShieldAlert className="h-4 w-4 text-amber" aria-hidden="true" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <RiskCell label="Live Orders" value={risk?.live_orders_enabled ? "UNLOCKED" : "LOCKED"} tone={risk?.live_orders_enabled ? "gain" : "amber"} />
        <RiskCell label="Kill Switch" value={risk?.kill_switch_enabled ? "ON" : "OFF"} tone={risk?.kill_switch_enabled ? "loss" : "gain"} />
        <RiskCell label="Daily P&L" value={(risk?.daily_realized_pnl ?? 0).toFixed(2)} />
        <RiskCell label="Loss Limit" value={(risk?.daily_loss_limit ?? 0).toFixed(2)} />
      </div>
      <button
        onClick={() => void toggleKillSwitch()}
        className={`mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md px-3 text-sm font-black ${
          risk?.kill_switch_enabled ? "bg-gain text-ink" : "bg-loss text-white"
        }`}
      >
        <Power className="h-4 w-4" aria-hidden="true" />
        {risk?.kill_switch_enabled ? "Release Kill Switch" : "Activate Kill Switch"}
      </button>
    </section>
  );
}

function RiskCell({ label, value, tone }: { label: string; value: string; tone?: "gain" | "loss" | "amber" }) {
  const color = tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : tone === "amber" ? "text-amber" : "text-white";
  return (
    <div className="rounded-md border border-line bg-panelSoft p-2">
      <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
      <div className={`mt-1 truncate text-sm font-black ${color}`}>{value}</div>
    </div>
  );
}
