import { fetchLiveMarketSnapshots } from "../tools/market-data.mjs";
import { fetchGiftNiftySnapshot } from "../tools/nse-ix.mjs";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ ok: false, error: "method_not_allowed" });
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

    response.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=15");
    return response.status(200).json({ ok: true, snapshots: merged });
  } catch (error) {
    return response.status(500).json({ ok: false, error: error.message });
  }
}
