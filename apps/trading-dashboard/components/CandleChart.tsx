"use client";

import { useEffect, useRef } from "react";
import type { IChartApi, ISeriesApi, SeriesMarker, Time, UTCTimestamp } from "lightweight-charts";
import type { PriceZone, TradingCandle, TradingIndex, TradingSignal } from "@market-narrative/api-client";

type Props = {
  index: TradingIndex;
  candles: TradingCandle[];
  zones: PriceZone[];
  signal: TradingSignal | null;
  paperSignal?: TradingSignal | null;
};

const IST_OFFSET_SECONDS = 5.5 * 60 * 60;

export function CandleChart({ index, candles, zones, signal, paperSignal = null }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLinesRef = useRef<Array<ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]>>>([]);
  const candlesRef = useRef<TradingCandle[]>(candles);

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
        localization: {
          timeFormatter: formatChartAxisTime
        },
        rightPriceScale: { borderColor: "#2c3446" },
        timeScale: { borderColor: "#2c3446", timeVisible: true, tickMarkFormatter: formatChartAxisTime }
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
      renderCandles(seriesRef.current, candlesRef.current);
      chart.timeScale().fitContent();
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
    candlesRef.current = candles;
    if (!seriesRef.current) {
      return;
    }
    renderCandles(seriesRef.current, candles);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // When the selected index changes, NIFTY (~24k) and BANKNIFTY (~54k) live on
  // very different price scales — without this, the manual price-zoom from the
  // previous index leaves the new candles way off-screen.
  useEffect(() => {
    if (!chartRef.current) {
      return;
    }
    chartRef.current.priceScale("right").applyOptions({ autoScale: true });
    chartRef.current.timeScale().fitContent();
  }, [index]);

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
    const activePaperSignal = paperSignal?.action && paperSignal.action !== "WAIT" ? paperSignal : null;
    if (activePaperSignal?.entry_price) {
      priceLinesRef.current.push(
        series.createPriceLine({
          price: activePaperSignal.entry_price,
          color: "#60a5fa",
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `FVG PAPER ${activePaperSignal.action}`
        })
      );
    }
    if (activePaperSignal?.target_price) {
      priceLinesRef.current.push(
        series.createPriceLine({
          price: activePaperSignal.target_price,
          color: "#22c55e",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "FVG TARGET"
        })
      );
    }
    if (activePaperSignal?.stop_loss) {
      priceLinesRef.current.push(
        series.createPriceLine({
          price: activePaperSignal.stop_loss,
          color: "#f97316",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "FVG STOP"
        })
      );
    }
    const markers: SeriesMarker<UTCTimestamp>[] = activePaperSignal?.entry_price
      ? [
          {
            time: toIstChartTimestamp(activePaperSignal.generated_at),
            position: activePaperSignal.action === "BUY" ? "belowBar" : "aboveBar",
            shape: activePaperSignal.action === "BUY" ? "arrowUp" : "arrowDown",
            color: activePaperSignal.action === "BUY" ? "#22c55e" : "#f97316",
            text: `FVG PAPER ${activePaperSignal.action}`
          }
        ]
      : [];
    series.setMarkers(markers);
  }, [paperSignal, signal?.entry_price, zones]);

  const last = candles[candles.length - 1];

  return (
    <section className="widget min-h-[510px] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-2">
        <div>
          <h2 className="text-sm font-black uppercase text-white">Live Price Action</h2>
          <p className="text-xs text-slate-400">
            {last ? `${last.close.toFixed(2)} close | ${formatIstClock(last.ts)}` : `Waiting for ${index} candles`}
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
        {!candles.length ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/40 text-sm font-bold text-slate-300">
            Waiting for live {index} candles
          </div>
        ) : null}
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

function renderCandles(series: ISeriesApi<"Candlestick">, candles: TradingCandle[]) {
  let previousTime = 0;
  const data = [...candles]
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
    .map((candle) => ({
      time: toIstChartTimestamp(candle.ts),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close
    }))
    .filter((point) => {
      const currentTime = Number(point.time);
      if (currentTime <= previousTime) {
        return false;
      }
      previousTime = currentTime;
      return true;
    });
  series.setData(data);
}

function toIstChartTimestamp(value: string): UTCTimestamp {
  return (Math.floor(new Date(value).getTime() / 1000) + IST_OFFSET_SECONDS) as UTCTimestamp;
}

function formatChartAxisTime(time: Time): string {
  if (typeof time !== "number") {
    return "";
  }
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(time * 1000));
}

function formatIstClock(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "loss" }) {
  return (
    <div className="min-w-20 rounded-md border border-line bg-panelSoft px-2 py-1">
      <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
      <div className={`font-black ${tone === "loss" ? "text-loss" : "text-slate-100"}`}>{value}</div>
    </div>
  );
}
