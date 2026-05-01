"use client";

import type { TradingNewsEvent } from "@market-narrative/api-client";

export function NewsTicker({ news }: { news: TradingNewsEvent[] }) {
  return (
    <section className="widget min-h-[280px] overflow-hidden">
      <div className="border-b border-line px-3 py-2">
        <h2 className="text-sm font-black uppercase text-white">Sentiment Tape</h2>
        <p className="text-xs text-slate-400">{news.length} deduplicated headlines</p>
      </div>
      <div className="max-h-[236px] overflow-auto">
        {news.map((item) => (
          <article key={item.id} className="border-b border-line/60 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-500">{item.source}</span>
              <span className={`text-xs font-black ${item.sentiment_score >= 0 ? "text-gain" : "text-loss"}`}>
                {item.sentiment_score.toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-sm leading-5 text-slate-200">{item.headline}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

