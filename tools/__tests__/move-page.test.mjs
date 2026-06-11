import assert from "node:assert/strict";
import { movePage } from "../move-page.mjs";

// Sample article data
const sampleArticle = {
  headline: "NIFTY surges 1.2% after strong earnings",
  summary: "NIFTY rose by 1.2% driven by IT sector gains and positive macro data.",
  thumbnail: { url: "https://example.com/thumb.jpg" }
};

const date = "2026-06-11";
const slug = "nifty-1-2-pct";
const symbol = "NIFTY";
const change = 1.2;

const html = movePage({ date, slug, article: sampleArticle, symbol, change });

// Basic checks
assert.ok(html.includes("<title>NIFTY surges 1.2% – Market Move"), "Title should be present");
assert.ok(html.includes("<meta name=\"description\""), "Meta description present");
assert.ok(html.includes(sampleArticle.headline), "Headline present in body");
assert.ok(html.includes(sampleArticle.summary), "Summary present");
assert.ok(html.includes(sampleArticle.thumbnail.url), "Thumbnail URL present");

// Check JSON‑LD block contains expected fields
assert.ok(html.includes("\"@type\": \"NewsArticle\""), "JSON‑LD type present");
assert.ok(html.includes(`"symbol":"${symbol}"`) || html.includes(`"articleSection":"${symbol}"`), "JSON‑LD includes symbol");

console.log("movePage test passed");
