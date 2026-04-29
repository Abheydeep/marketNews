import type { NewsCard } from "@/lib/types";

export function NewsCards({ news }: { news: NewsCard[] }) {
  return (
    <section className="grid gap-3 lg:grid-cols-2">
      {news.map((item) => {
        const isPositive = item.sentimentScore >= 0;
        return (
          <a
            key={item.headline}
            href={item.sourceUrl}
            className="rounded border border-line bg-white p-4 shadow-panel transition hover:-translate-y-0.5 hover:border-steel"
            target="_blank"
            rel="noreferrer"
          >
            <div className="flex items-center justify-between gap-4">
              <span className={`h-3 w-3 rounded-sm ${isPositive ? "bg-moss" : "bg-risk"}`} />
              <span className="text-xs font-bold uppercase text-steel">{item.entityName}</span>
            </div>
            <h3 className="mt-3 text-base font-bold leading-snug text-ink">{item.headline}</h3>
            <p className="mt-2 text-sm leading-6 text-steel">{item.summary}</p>
            <p className="mt-4 text-xs font-bold text-ink">{item.sourceName}</p>
          </a>
        );
      })}
    </section>
  );
}
