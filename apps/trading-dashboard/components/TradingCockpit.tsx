"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Shield, Unplug, Wifi } from "lucide-react";
import type { TradingIndex } from "@market-narrative/api-client";
import { BrandMark } from "./BrandMark";
import { useMarketStore } from "../store/marketStore";
import { CandleChart } from "./CandleChart";
import { FvgPaperPanel } from "./FvgPaperPanel";
import { NewsTicker } from "./NewsTicker";
import { OptionsHeatmap } from "./OptionsHeatmap";
import { OrderConfirmationModal } from "./OrderConfirmationModal";
import { PcrStrip } from "./PcrStrip";
import { RiskPanel } from "./RiskPanel";
import { SignalModule } from "./SignalModule";
import { TradingAdminGate } from "./TradingAdminGate";
import { tokenStorageKey } from "../lib/auth";
import { fetchKiteLoginUrl, refreshMarketData } from "../lib/api";

const indices: TradingIndex[] = ["BANKNIFTY", "NIFTY"];

export function TradingCockpit() {
  const { envelope, selectedIndex, connected, error, token, admin, loadSnapshot, connect, setSelectedIndex, setAuthToken } = useMarketStore();

  useEffect(() => {
    const stored = window.localStorage.getItem(tokenStorageKey);
    if (stored && !token) {
      setAuthToken(stored);
      return;
    }
    if (!token) {
      return;
    }
    void loadSnapshot();
    connect();
  }, [connect, loadSnapshot, setAuthToken, token]);

  if (!token || !admin) {
    return <TradingAdminGate />;
  }

  const chain = envelope?.option_chains[selectedIndex];
  const signal = envelope?.signals[selectedIndex];
  const fvgObservation = envelope?.fvg_observations?.[selectedIndex];
  const candles = envelope?.candles[selectedIndex] ?? [];
  const technical = envelope?.technicals[selectedIndex];
  const status = envelope?.status;

  async function connectKite() {
    if (!token) {
      return;
    }
    try {
      const loginUrl = await fetchKiteLoginUrl(token);
      window.location.assign(loginUrl);
    } catch (error) {
      useMarketStore.setState({ error: error instanceof Error ? error.message : "Unable to start Kite login" });
    }
  }

  async function refreshKite() {
    if (!token) {
      return;
    }
    try {
      await refreshMarketData(token);
      await loadSnapshot();
    } catch (error) {
      useMarketStore.setState({ error: error instanceof Error ? error.message : "Unable to refresh Kite data" });
    }
  }

  return (
    <main className="min-h-screen px-3 py-3 lg:px-5">
      <header className="mb-3 grid gap-3 border-b border-line pb-3 lg:grid-cols-[1fr_auto]">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center">
            <BrandMark className="h-11 w-11" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-normal text-white">Nifty/Bank Nifty Trading Cockpit</h1>
            <p className="text-xs font-bold uppercase text-slate-400">Abhey admin | Manual-confirm live options execution</p>
          </div>
          <div className="flex rounded-md border border-line bg-panel p-1">
            {indices.map((index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`h-8 px-3 text-xs font-black ${
                  selectedIndex === index ? "rounded bg-cyan text-ink" : "text-slate-300"
                }`}
              >
                {index}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className={`inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 ${connected ? "text-gain" : "text-amber"}`}>
            <Wifi className="h-4 w-4" aria-hidden="true" />
            {connected ? "STREAMING" : "CONNECTING"}
          </span>
          {envelope?.risk.kill_switch_enabled ? (
            <span className="inline-flex items-center gap-2 rounded-md border border-loss/60 px-3 py-2 text-loss">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              KILL SWITCH
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-slate-300">
              <Shield className="h-4 w-4" aria-hidden="true" />
              RISK GATED
            </span>
          )}
        </div>
      </header>

      {error ? <div className="mb-3 rounded-md border border-loss/60 bg-loss/10 p-3 text-sm text-red-100">{error}</div> : null}
      {status ? (
        <section
          className={`mb-3 flex flex-col gap-3 rounded-md border p-3 text-sm md:flex-row md:items-center md:justify-between ${
            status.is_live ? "border-gain/40 bg-gain/10 text-emerald-100" : "border-amber/50 bg-amber/10 text-amber"
          }`}
        >
          <div className="flex items-start gap-2">
            {status.is_live ? <Wifi className="mt-0.5 h-4 w-4" aria-hidden="true" /> : <Unplug className="mt-0.5 h-4 w-4" aria-hidden="true" />}
            <div>
              <p className="font-black">{status.is_live ? "Kite live data active" : status.mode === "kite" ? "Kite live data waiting" : "Demo stream active"}</p>
              <p className="mt-1 text-xs text-slate-300">{status.message}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {status.mode === "kite" && !status.kite_session_valid ? (
              <button onClick={() => void connectKite()} className="inline-flex h-9 items-center gap-2 rounded-md bg-cyan px-3 text-xs font-black text-ink">
                <Unplug className="h-4 w-4" aria-hidden="true" />
                Connect Kite
              </button>
            ) : null}
            {status.mode === "kite" ? (
              <button onClick={() => void refreshKite()} className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-xs font-black text-slate-100">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Refresh
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.9fr)]">
        <div className="grid min-w-0 gap-3">
          <CandleChart
            index={selectedIndex}
            candles={candles}
            zones={technical?.kde_zones ?? []}
            signal={signal ?? null}
            paperSignal={fvgObservation ?? null}
          />
          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <OptionsHeatmap chain={chain ?? null} />
            <NewsTicker news={envelope?.news ?? []} />
          </div>
        </div>

        <aside className="grid content-start gap-3">
          <SignalModule index={selectedIndex} signal={signal ?? null} chain={chain ?? null} />
          <FvgPaperPanel index={selectedIndex} observation={fvgObservation ?? null} />
          <PcrStrip chain={chain ?? null} />
          <RiskPanel risk={envelope?.risk ?? null} />
        </aside>
      </section>

      <OrderConfirmationModal />
    </main>
  );
}
