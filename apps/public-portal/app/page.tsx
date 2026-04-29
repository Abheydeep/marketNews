import { NewsArticleJsonLd, SentimentBadge } from "@market-narrative/ui";
import { getPublicDigest } from "@market-narrative/api-client";

export default async function PublicPortalPage() {
  const digest = await getPublicDigest("today");

  return (
    <main>
      <NewsArticleJsonLd digest={digest} />
      <h1>{digest.title}</h1>
      <SentimentBadge label={digest.sentimentLabel} />
      <p>{digest.onePageSummary}</p>
    </main>
  );
}
