// tools/generate-move-articles.mjs
// CLI script to detect significant market moves, generate concise articles via the LLM pipeline, and publish them.

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

// Import existing utilities
import { nimCall } from "./core.mjs";
import { marketDataFetch } from "./market-data.mjs"; // placeholder for better service
import { brandHeadLinks, brandFaviconSvg } from "./brand-assets.mjs";
import { movePage } from "./move-page.mjs"; // will create later

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

// Load thresholds from env or defaults
const DEFAULT_THRESHOLDS = {
  index: 0.8,
  largeCap: 3.0,
  midCap: 4.0,
  smallCap: 5.0,
};

function parseThresholds() {
  const thresholds = { ...DEFAULT_THRESHOLDS };
  for (const key of Object.keys(DEFAULT_THRESHOLDS)) {
    const envKey = `MOVE_THRESHOLDS_${key.toUpperCase()}`;
    if (process.env[envKey]) {
      const val = parseFloat(process.env[envKey]);
      if (!isNaN(val)) thresholds[key] = val;
    }
  }
  return thresholds;
}

async function detectMoves(thresholds) {
  // Use the external market data service. For now we call marketDataFetch which should return an array of
  // objects: { symbol, index, priceChangePct, marketCapCategory }
  const data = await marketDataFetch();
  const moves = [];
  for (const item of data) {
    const category = item.marketCapCategory; // "index", "largeCap", "midCap", "smallCap"
    const limit = thresholds[category] ?? thresholds.index;
    if (Math.abs(item.priceChangePct) >= limit) {
      moves.push(item);
    }
  }
  return moves;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function generateAndPublish(move, dateStr) {
  // Build the article prompt according to guardrails (max 120 words, no passive voice, etc.)
  const prompt = `Write a concise news article (max 120 words) explaining why ${move.symbol} moved ${move.priceChangePct.toFixed(1)}% today. Use active voice, avoid "market participants" and similar phrases. Return JSON with fields: {"headline":"...","summary":"..."}.`;

  const article = await nimCall("You are a concise market news article generator.", prompt);
  // article expected to be { headline, summary }

  const slug = slugify(`${move.symbol}-${Math.abs(move.priceChangePct).toFixed(1)}-pct`);
  const outDir = join(rootDir, "out", "moves", dateStr, slug);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  // Write JSON article payload
  await writeFile(join(outDir, "article.json"), JSON.stringify(article, null, 2), "utf8");

  // Generate HTML using movePage component (to be created)
  const html = movePage({
    date: dateStr,
    slug,
    article,
    symbol: move.symbol,
    change: move.priceChangePct,
  });
  await writeFile(join(outDir, "index.html"), html, "utf8");

  // Update sitemap and archive – for simplicity we append to a temp file; real implementation will be in publish-site.
  console.log(`Generated move article for ${move.symbol} at /moves/${dateStr}/${slug}/`);
}

async function main() {
  const thresholds = parseThresholds();
  const moves = await detectMoves(thresholds);
  if (moves.length === 0) {
    console.log("No significant moves detected for today.");
    return;
  }
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  for (const move of moves) {
    await generateAndPublish(move, dateStr);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Allow a dry-run flag for testing
  const args = process.argv.slice(2);
  if (args.includes("--dry-run")) {
    console.log("Dry run enabled – detecting moves only.");
    (async () => {
      const thresholds = parseThresholds();
      const moves = await detectMoves(thresholds);
      console.log(JSON.stringify(moves, null, 2));
    })();
  } else {
    main().catch((e) => {
      console.error("Error generating move articles:", e);
      process.exit(1);
    });
  }
}
