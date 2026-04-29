import type { PublicDigest } from "@market-narrative/api-client";

export function NewsArticleJsonLd({ digest }: { digest: PublicDigest }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: digest.title,
    datePublished: digest.publishedAt ?? `${digest.digestDate}T08:30:00+05:30`,
    author: {
      "@type": "Person",
      name: "Market Narrative Engine"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
