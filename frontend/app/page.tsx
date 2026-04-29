import { MarketSnapshotGrid } from "@/components/MarketSnapshotGrid";
import { NewsCards } from "@/components/NewsCards";
import { SentimentBadge } from "@/components/SentimentBadge";
import { ThumbnailPreview } from "@/components/ThumbnailPreview";
import { TradeSetupTable } from "@/components/TradeSetupTable";
import { getPublicDigest } from "@/lib/api";

export default async function Home() {
  const digest = await getPublicDigest();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: digest.title,
    image: `https://marketnarrative.local${digest.asset?.assetUrl ?? "/assets/mock/daily-thumbnail.webp"}`,
    datePublished: digest.publishedAt ?? `${digest.digestDate}T08:30:00+05:30`,
    author: {
      "@type": "Person",
      name: "Market Narrative Engine",
      url: "https://marketnarrative.local/profile"
    }
  };

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="grid min-h-[calc(100vh-56px)] items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section>
          <div className="flex flex-wrap items-center gap-3">
            <SentimentBadge label={digest.sentimentLabel} />
            <span className="rounded border border-line bg-white px-2.5 py-1 text-xs font-bold text-steel">
              {digest.status}
            </span>
            <span className="text-sm font-bold text-steel">{digest.digestDate}</span>
          </div>
          <h1 className="mt-5 max-w-4xl text-5xl font-black leading-tight text-ink sm:text-6xl">
            {digest.title}
          </h1>
          <p className="mt-5 max-w-2xl whitespace-pre-line text-base leading-7 text-steel">
            {digest.onePageSummary.split("\n\n")[0]}
          </p>
        </section>
        <ThumbnailPreview asset={digest.asset} />
      </header>

      <section className="grid gap-4">
        <h2 className="text-xl font-black text-ink">Global Tape</h2>
        <MarketSnapshotGrid snapshots={digest.marketSnapshots} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="text-xl font-black text-ink">Narrative Themes</h2>
          <div className="mt-4 grid gap-3">
            {digest.themes.map((theme) => (
              <article key={theme.themeType} className="rounded border border-line bg-white p-4 shadow-panel">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-black text-ink">{theme.title}</h3>
                  <span className="text-xs font-bold text-steel">{theme.evidenceCount} sources</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-steel">{theme.summary}</p>
              </article>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-black text-ink">Source Cards</h2>
          <div className="mt-4">
            <NewsCards news={digest.news} />
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-xl font-black text-ink">1:2 RR Setups</h2>
        <TradeSetupTable setups={digest.tradeSetups} />
      </section>
    </main>
  );
}
