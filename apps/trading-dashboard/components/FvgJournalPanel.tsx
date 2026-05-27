"use client";

import { BookOpen } from "lucide-react";
import type { FVGPaperTrade } from "@market-narrative/api-client";

const STATUS_STYLE: Record<string, string> = {
  WIN: "bg-gain/20 text-gain border-gain/40",
  LOSS: "bg-loss/20 text-loss border-loss/40",
  TIMEOUT: "bg-amber/20 text-amber border-amber/40",
  OPEN: "bg-cyan/20 text-cyan border-cyan/40",
};

function fmt(price: number | null | undefined) {
  return price != null ? price.toFixed(2) : "-";
}

function shortTs(ts: string | null | undefined) {
  if (!ts) return "-";
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
  } catch {
    return ts.slice(11, 16);
  }
}

export function FvgJournalPanel({ trades }: { trades: FVGPaperTrade[] }) {
  const summary = trades.reduce(
    (acc, t) => {
      if (t.status === "WIN") acc.wins++;
      else if (t.status === "LOSS") acc.losses++;
      else if (t.status === "TIMEOUT") acc.timeouts++;
      else acc.open++;
      return acc;
    },
    { wins: 0, losses: 0, timeouts: 0, open: 0 },
  );

  const closed = summary.wins + summary.losses + summary.timeouts;
  const winRate = closed > 0 ? ((summary.wins / closed) * 100).toFixed(1) : "-";

  return (
    <section className="widget overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <BookOpen className="h-4 w-4 shrink-0 text-cyan" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-sm font-black uppercase text-white">FVG Journal</h2>
            <p className="truncate text-xs text-slate-400">Paper trade log · observe-only</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gain font-bold">{summary.wins}W</span>
          <span className="text-loss font-bold">{summary.losses}L</span>
          <span className="text-amber font-bold">{summary.timeouts}T</span>
          <span className="text-cyan font-bold">{summary.open} open</span>
          {closed > 0 && (
            <span className="rounded border border-line px-1.5 py-0.5 font-mono font-bold text-white">
              {winRate}% WR
            </span>
          )}
        </div>
      </div>

      {trades.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-xs text-slate-500">
          No paper trades recorded yet — signals appear here in real-time.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-xs">
            <thead>
              <tr className="border-b border-line bg-panelSoft text-[10px] font-bold uppercase text-slate-500">
                <th className="px-2 py-1.5 text-left">Index</th>
                <th className="px-2 py-1.5 text-left">Dir</th>
                <th className="px-2 py-1.5 text-left">Entry time</th>
                <th className="px-2 py-1.5 text-right">Entry</th>
                <th className="px-2 py-1.5 text-right">Stop</th>
                <th className="px-2 py-1.5 text-right">Target</th>
                <th className="px-2 py-1.5 text-right">Exit</th>
                <th className="px-2 py-1.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice(0, 20).map((t) => (
                <tr key={t.id} className="border-b border-line/40 hover:bg-panelSoft/60">
                  <td className="px-2 py-1.5 font-bold text-white">{t.index}</td>
                  <td className={`px-2 py-1.5 font-bold ${t.direction === "BUY" ? "text-gain" : "text-loss"}`}>
                    {t.direction}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-slate-400">{shortTs(t.entry_ts)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-white">{fmt(t.entry_price)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-loss">{fmt(t.stop_loss)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-gain">{fmt(t.target_price)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-300">{fmt(t.exit_price)}</td>
                  <td className="px-2 py-1.5 text-center">
                    <span
                      className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[t.status] ?? ""}`}
                    >
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
