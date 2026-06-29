import { fetchLiveMarketSnapshots } from "../tools/market-data.mjs";
import { fetchGiftNiftySnapshot } from "../tools/nse-ix.mjs";

// Vercel serverless config — bom1 only works on Pro; harmless on Hobby (ignored).
export const config = { runtime: "nodejs", regions: ["bom1"] };

// In-memory warm cache so repeated invocations on a warm instance skip re-scraping.
let _cache = { data: null, ts: 0 };
const CACHE_TTL_MS = 15_000;

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const now = Date.now();
  if (_cache.data && (now - _cache.ts) < CACHE_TTL_MS) {
    response.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");
    return response.status(200).json(_cache.data);
  }

  try {
    const [snapshots, giftSnapshot] = await Promise.all([
      fetchLiveMarketSnapshots().catch(() => []),
      fetchGiftNiftySnapshot().catch(() => null)
    ]);

    let merged = snapshots || [];
    if (giftSnapshot) {
      const index = merged.findIndex(s => s.symbol === "GIFTNIFTY" || s.symbol === "GIFT Nifty");
      if (index !== -1) {
        merged[index] = giftSnapshot;
      } else {
        merged.push(giftSnapshot);
      }
    }

    const payload = { ok: true, snapshots: merged, ts: new Date().toISOString() };
    _cache = { data: payload, ts: now };

    response.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");
    return response.status(200).json(payload);
  } catch (error) {
    return response.status(500).json({ ok: false, error: error.message });
  }
}
