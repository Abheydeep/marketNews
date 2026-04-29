export type Permission =
  | "admin:read"
  | "create:script"
  | "edit:script"
  | "generate:assets"
  | "publish:digest";

export type PublicDigest = {
  digestDate: string;
  title: string;
  sentimentLabel: "BULLISH" | "BEARISH" | "VOLATILE" | "NEUTRAL";
  onePageSummary: string;
  publishedAt: string | null;
};

export async function getPublicDigest(date: "today" | string): Promise<PublicDigest> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
  const response = await fetch(`${baseUrl}/api/public/digest/${date}`, {
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error(`Unable to load digest ${date}: HTTP ${response.status}`);
  }

  return response.json() as Promise<PublicDigest>;
}
