"use client";

import type { OptionChain, OptionSnapshot } from "@market-narrative/api-client";

const MAX_VISIBLE_STRIKES = 11;

export function OptionsHeatmap({ chain }: { chain: OptionChain | null }) {
  const rows = selectVisibleRows(groupRows(chain?.snapshots ?? []), chain?.spot);
  const deltaAvailable = rows.some((row) => Math.abs(row.ce?.oi_delta ?? 0) > 0 || Math.abs(row.pe?.oi_delta ?? 0) > 0);
  const maxOi = Math.max(...rows.flatMap((row) => [row.ce?.open_interest ?? 0, row.pe?.open_interest ?? 0]), 1);
  const maxDelta = Math.max(...rows.flatMap((row) => [Math.abs(row.ce?.oi_delta ?? 0), Math.abs(row.pe?.oi_delta ?? 0)]), 1);

  return (
    <section className="widget min-h-[280px] overflow-hidden">
      <div className="border-b border-line px-3 py-2">
        <h2 className="text-sm font-black uppercase text-white">Options OI Heatmap</h2>
        <p className="text-xs text-slate-400">{chain ? chainLabel(chain, deltaAvailable) : "Waiting for chain"}</p>
      </div>
      <div className="grid grid-cols-[1fr_90px_1fr] border-b border-line bg-panelSoft px-3 py-2 text-xs font-black text-slate-400">
        <span>CALL OI</span>
        <span className="text-center">STRIKE</span>
        <span className="text-right">PUT OI</span>
      </div>
      <div className="max-h-[218px] overflow-auto">
        {rows.map((row) => (
          <div
            key={row.strike}
            className={`grid grid-cols-[1fr_90px_1fr] items-center gap-2 border-b px-3 py-1.5 text-xs ${
              row.isAtm ? "border-cyan/50 bg-cyan/5" : "border-line/60"
            }`}
          >
            <HeatCell snapshot={row.ce} side="call" deltaAvailable={deltaAvailable} maxOi={maxOi} maxDelta={maxDelta} />
            <div className="text-center font-black text-slate-100">
              {formatStrike(row.strike)}
              {row.isAtm ? <div className="mt-0.5 text-[9px] uppercase tracking-normal text-cyan">ATM</div> : null}
            </div>
            <HeatCell snapshot={row.pe} side="put" deltaAvailable={deltaAvailable} maxOi={maxOi} maxDelta={maxDelta} />
          </div>
        ))}
        {!rows.length ? (
          <div className="px-3 py-8 text-center text-xs font-bold text-slate-400">Waiting for live option-chain strikes</div>
        ) : null}
      </div>
    </section>
  );
}

function HeatCell({
  snapshot,
  side,
  deltaAvailable,
  maxOi,
  maxDelta
}: {
  snapshot?: OptionSnapshot;
  side: "call" | "put";
  deltaAvailable: boolean;
  maxOi: number;
  maxDelta: number;
}) {
  if (!snapshot) {
    return <span className="h-7 rounded-md border border-line bg-ink" />;
  }
  const intensityBase = deltaAvailable ? Math.abs(snapshot.oi_delta) / maxDelta : snapshot.open_interest / maxOi;
  const intense = Math.min(Math.max(intensityBase, 0), 1);
  const color = side === "call" ? `rgba(219, 59, 77, ${0.16 + intense * 0.58})` : `rgba(17, 163, 106, ${0.16 + intense * 0.58})`;
  const deltaTone = snapshot.oi_delta > 0 ? "text-emerald-100" : snapshot.oi_delta < 0 ? "text-red-100" : "text-slate-300";

  return (
    <div className={`rounded-md border border-line px-2 py-1 ${side === "put" ? "text-right" : ""}`} style={{ background: color }}>
      <div className="font-black">{formatNumber(snapshot.open_interest)}</div>
      <div className={`text-[10px] ${deltaTone}`}>{deltaAvailable ? `Δ ${formatDelta(snapshot.oi_delta)}` : "Δ waiting"}</div>
    </div>
  );
}

type HeatmapRow = { strike: number; ce?: OptionSnapshot; pe?: OptionSnapshot; isAtm?: boolean };

function groupRows(snapshots: OptionSnapshot[]): HeatmapRow[] {
  const rows = new Map<number, HeatmapRow>();
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

function selectVisibleRows(rows: HeatmapRow[], spot?: number): HeatmapRow[] {
  if (!rows.length) {
    return [];
  }
  if (!spot) {
    return rows.slice(0, MAX_VISIBLE_STRIKES);
  }
  const atmIndex = rows.reduce((bestIndex, row, index) => {
    return Math.abs(row.strike - spot) < Math.abs(rows[bestIndex].strike - spot) ? index : bestIndex;
  }, 0);
  const halfWindow = Math.floor(MAX_VISIBLE_STRIKES / 2);
  const start = Math.max(0, Math.min(atmIndex - halfWindow, rows.length - MAX_VISIBLE_STRIKES));
  const visible = rows.slice(start, start + MAX_VISIBLE_STRIKES);
  const atmStrike = rows[atmIndex].strike;
  return visible.map((row) => ({ ...row, isAtm: row.strike === atmStrike }));
}

function chainLabel(chain: OptionChain, deltaAvailable: boolean): string {
  const expiry = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short"
  }).format(new Date(chain.expiry));
  const deltaLabel = deltaAvailable ? "OI Δ live" : "OI Δ warming up";
  return `${chain.oi_status} | Spot ${formatNumber(chain.spot)} | PCR ${chain.pcr.pcr.toFixed(2)} | ${deltaLabel} | Exp ${expiry}`;
}

function formatStrike(value: number): string {
  return Math.round(value).toString();
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("en-IN");
}

function formatDelta(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded.toLocaleString("en-IN")}`;
}
