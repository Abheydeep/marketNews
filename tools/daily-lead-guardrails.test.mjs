import { test } from "node:test";
import assert from "node:assert/strict";
import { computeGiftNiftyBias, dailyLeadForDigest, dailyLeadForDigestWithAgent } from "./core.mjs";

const article = (headline, publishedAt, extra = {}) => ({ headline, publishedAt, sourceUrl: `https://example.com/${encodeURIComponent(headline)}`, indiaImpact: "Indian markets may react.", ...extra });

test("daily lead keeps the selected source driver and its own support", async () => {
  const articles = [article("Rupee falls beyond 95 as dollar stays firm", "2026-07-02T00:00:00Z"), article("India-France visit may lift investment", "2026-07-02T00:00:00Z", { sentimentScore: 0.5 })];
  const lead = await dailyLeadForDigestWithAgent("2026-07-02", articles, { dailyLeadReranker: ({ candidates }) => ({ rankedIds: [candidates.find((item) => /Rupee/.test(item.headline)).id], driverType: "crude" }) });
  assert.equal(lead.driverType, "currency");
  assert.doesNotMatch(lead.supportSide, /France|investment/i);
});

test("daily lead rejects stale reranker overrides", async () => {
  const fresh = article("Nifty and Bank Nifty track fresh Asian bond flows", "2026-07-02T00:06:45Z", { sourceName: "Business Standard Markets" });
  const old = article("India imported record crude volumes in June", "2026-07-01T08:38:43Z");
  const lead = await dailyLeadForDigestWithAgent("2026-07-02", [fresh, old], { dailyLeadReranker: ({ candidates }) => ({ rankedIds: [candidates.find((item) => /crude/.test(item.headline)).id] }) });
  assert.equal(lead.headline, fresh.headline);
});

test("daily lead rejects court notices, stale enforcement, and prior-session recaps", () => {
  const bonds = article("Emerging Asia bonds draw funds despite Fed hike fears", "2026-07-02T00:06:45Z", { summary: "Bond investors returned before the Asia open." });
  const rejected = [
    article("Delhi HC rules NSE a public authority under RTI", "2026-07-01T14:20:25Z"),
    article("Sebi bars entities for manipulation in five companies", "2026-07-01T12:31:58Z", { indiaImpact: "Bank Nifty could be impacted." }),
    article("Benchmark indices snap two-day decline as crude eases", "2026-07-01T14:15:42Z", { summary: "Nifty closed higher." })
  ];
  assert.equal(dailyLeadForDigest("2026-07-02", [bonds, ...rejected]).headline, bonds.headline);
});

test("daily lead rejects broker buy lists", () => {
  const bonds = article("Asian bonds draw funds before India opens", "2026-07-02T00:06:45Z");
  const picks = article("Nifty rangebound; Buy Nestle, HDFC AMC, DLF, says Teji Mandi", "2026-07-02T01:20:32Z");
  assert.equal(dailyLeadForDigest("2026-07-02", [bonds, picks]).headline, bonds.headline);
});

test("daily lead rejects analyst chart forecasts", () => {
  const bonds = article("Asian bonds draw funds before India opens", "2026-07-02T00:06:45Z");
  const forecast = article("Can Sensex, Nifty hit new highs by Dec 2026? Tech analysts decode charts", "2026-07-02T01:42:40Z");
  assert.equal(dailyLeadForDigest("2026-07-02", [bonds, forecast]).headline, bonds.headline);
});

test("GIFT bias requires both GIFT and Nifty to be live", () => {
  assert.equal(computeGiftNiftyBias([
    { symbol: "GIFTNIFTY", closeValue: 24163.5, dataQuality: "live", source: "NSE IFSC" },
    { symbol: "NIFTY", closeValue: 22475.85, dataQuality: "mock-fallback", source: "Exchange Mock fallback" }
  ]), null);
});
