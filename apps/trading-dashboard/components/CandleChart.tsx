"use client";

import { useEffect, useRef } from "react";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import type { PriceZone, TradingCandle, TradingSignal } from "@market-narrative/api-client";

type Props = {
  candles: TradingCandle[];
  zones: PriceZone[];
  signal: TradingSignal | null;
};

export function CandleChart({ candles, zones, signal }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLinesRef = useRef<Array<ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]>>>([]);

  useEffect(() => {
    let disposed = false;
    async function mount() {
      if (!containerRef.current || chartRef.current) {
        return;
      }
      const { createChart, ColorType } = await import("lightweight-charts");
      if (disposed || !containerRef.current) {
        return;
      }
      const chart = createChart(containerRef.current, {
        autoSize: true,
        height: 430,
        layout: {
          background: { type: ColorType.Solid, color: "#111827" },
          textColor: "#cbd5e1"
        },
        grid: {
          vertLines: { color: "rgba(148, 163, 184, 0.12)" },
          horzLines: { color: "rgba(148, 163, 184, 0.12)" }
        },
        rightPriceScale: { borderColor: "#2c3446" },
        timeScale: { borderColor: "#2c3446", timeVisible: true }
      });
      chartRef.current = chart;
      seriesRef.current = chart.addCandlestickSeries({
        upColor: "#11a36a",
        downColor: "#db3b4d",
        borderUpColor: "#11a36a",
        borderDownColor: "#db3b4d",
        wickUpColor: "#11a36a",
        wickDownColor: "#db3b4d"
      });
    }
    void mount();
    return () => {
      disposed = true;
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) {
      return;
    }
    seriesRef.current.setData(
      candles.map((candle) => ({
        time: Math.floor(new Date(candle.ts).getTime() / 1000) as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close
      }))
    );
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) {
      return;
    }
    for (const line of priceLinesRef.current) {
      series.removePriceLine(line);
    }
    priceLinesRef.current = [];
    for (const zone of zones.slice(0, 8)) {
      priceLinesRef.current.push(
        series.createPriceLine({
          price: zone.center,
          color: zone.kind === "support" ? "#11a36a" : "#db3b4d",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `${zone.kind.toUpperCase()} ${zone.center.toFixed(0)}`
        })
      );
    }
    if (signal?.entry_price) {
      priceLinesRef.current.push(
        series.createPriceLine({
          price: signal.entry_price,
          color: "#31c7d7",
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: "ENTRY"
        })
      );
    }
  }, [signal?.entry_price, zones]);

  const last = candles[candles.length - 1];

  return (
    <section className="widget min-h-[510px] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-2">
        <div>
          <h2 className="text-sm font-black uppercase text-white">Live Price Action</h2>
          <p className="text-xs text-slate-400">
            {last ? `${last.close.toFixed(2)} close | ${new Date(last.ts).toLocaleTimeString()}` : "Waiting for candles"}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right text-xs">
          <Metric label="Entry" value={signal?.entry_price?.toFixed(2) ?? "-"} />
          <Metric label="Target" value={signal?.target_price?.toFixed(2) ?? "-"} />
          <Metric label="Stop" value={signal?.stop_loss?.toFixed(2) ?? "-"} tone="loss" />
        </div>
      </div>
      <div className="relative h-[430px]">
        <div ref={containerRef} className="h-full w-full" />
        <div className="pointer-events-none absolute left-3 top-3 grid gap-2 text-xs">
          {zones.slice(0, 4).map((zone) => (
            <span key={`${zone.kind}-${zone.center}`} className="rounded-md border border-line bg-ink/70 px-2 py-1">
              {zone.kind.toUpperCase()} {zone.center.toFixed(2)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "loss" }) {
  return (
    <div className="min-w-20 rounded-md border border-line bg-panelSoft px-2 py-1">
      <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
      <div className={`font-black ${tone === "loss" ? "text-loss" : "text-slate-100"}`}>{value}</div>
    </div>
  );
}
