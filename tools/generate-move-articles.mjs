// tools/generate-move-articles.mjs
// Detect significant live market moves, generate concise Pulse articles with an LLM, and publish static move pages.

import { writeFile, mkdir, rm } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchLiveMarketSnapshots } from "./market-data.mjs";
import { mapWithConcurrency } from "./limited-concurrency.mjs";
import { movePage } from "./move-page.mjs";
import { generateMoveArticle } from "./pulse-move-article.mjs";
import { buildMoveImagePrompt, generateArticleImage } from "./generate-article-image.mjs";
import { writeOgImageAsset } from "./og-image-assets.mjs";
import { log } from "./logger.mjs";

export { generateMoveArticle } from "./pulse-move-article.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

const DEFAULT_THRESHOLDS = {
  index: 0.8,
  macro: 1.0,
  largeCap: 3.0,
  midCap: 4.0,
  smallCap: 5.0
};

export function parseThresholds(env = process.env) {
  const thresholds = { ...DEFAULT_THRESHOLDS };
  for (const key of Object.keys(DEFAULT_THRESHOLDS)) {
    const envKey = `MOVE_THRESHOLDS_${key.toUpperCase()}`;
    if (env[envKey]) {
      const val = Number.parseFloat(env[envKey]);
      if (Number.isFinite(val) && val > 0) thresholds[key] = val;
    }
  }
  return thresholds;
}

export async function detectMoves(thresholds = parseThresholds(), options = {}) {
  const data = options.marketData ?? await fetchMoveMarketData(options);
  return data
    .filter(isValidMove)
    .filter((item) => Math.abs(item.priceChangePct) >= (thresholds[item.marketCapCategory] ?? thresholds.index))
    .sort((left, right) => Math.abs(right.priceChangePct) - Math.abs(left.priceChangePct));
}

export async function fetchMoveMarketData(options = {}) {
  const snapshots = options.snapshots ?? await fetchLiveMarketSnapshots(options.marketDataOptions);
  return snapshots.map(snapshotToMove).filter(Boolean);
}

function snapshotToMove(snapshot) {
  const priceChangePct = Number(snapshot?.changePercent);
  if (!Number.isFinite(priceChangePct)) return null;
  return {
    symbol: String(snapshot.symbol || snapshot.name || "").toUpperCase(),
    name: snapshot.name || snapshot.symbol || "Market",
    priceChangePct,
    marketCapCategory: moveCategoryForSnapshot(snapshot),
    source: snapshot.source || "live_market_snapshot",
    timestamp: snapshot.dataTimestamp || new Date().toISOString(),
    closeValue: snapshot.closeValue ?? null,
    previousClose: snapshot.previousClose ?? null,
    marketRegion: snapshot.marketRegion || "Market"
  };
}

function moveCategoryForSnapshot(snapshot) {
  const symbol = String(snapshot?.symbol || "").toUpperCase();
  if (["BRENT", "DXY", "USDINR", "GOLD", "INDIAVIX"].includes(symbol)) return "macro";
  return "index";
}

function isValidMove(item) {
  return Boolean(item?.symbol) && Number.isFinite(Number(item.priceChangePct));
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export async function generateAndPublish(move, dateStr, options = {}) {
  const article = await generateMoveArticle(move, options);
  const slug = slugify(`${move.symbol}-${Math.abs(move.priceChangePct).toFixed(1)}-pct`);
  const imageAsset = await generatedMoveOgImage(move, dateStr, options);
  const outDir = join(moveOutputRoot(options), dateStr, slug);
  const pageArticle = {
    ...article,
    ogImageUrl: imageAsset?.url ?? article.ogImageUrl ?? null,
    publishedAt: article.publishedAt || move.timestamp || `${dateStr}T09:15:00+05:30`,
    modifiedAt: article.modifiedAt || article.publishedAt || move.timestamp || `${dateStr}T09:15:00+05:30`
  };
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  await writeFile(join(outDir, "article.json"), `${JSON.stringify({ ...pageArticle, move }, null, 2)}\n`, "utf8");
  await writeFile(join(outDir, "index.html"), movePage({ date: dateStr, slug, article: pageArticle, symbol: move.symbol, change: move.priceChangePct }), "utf8");

  return { symbol: move.symbol, slug, href: `/moves/${dateStr}/${slug}/`, headline: article.headline };
}

async function generatedMoveOgImage(move, dateStr, options = {}) {
  const prompt = buildMoveImagePrompt({ ...move, entityName: move.entityName || move.name, change: move.priceChangePct });
  const buffer = await generateArticleImage(prompt, options.nvidiaApiKey ? { apiKey: options.nvidiaApiKey } : {});
  return writeOgImageAsset(buffer, `move-${dateStr}-${slugify(move.symbol || move.name || "market")}.jpg`, { origin: options.origin }).catch((error) => {
    log.warn("move image asset write failed", { symbol: move.symbol, date: dateStr, error: error.message });
    return null;
  });
}

function todayInIst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function moveOutputRoot(options = {}) {
  const value = options.outputRoot ?? readArg("--output-root") ?? process.env.MOVE_ARTICLE_OUTPUT_ROOT;
  if (!value) {
    return join(rootDir, "out", "moves");
  }
  return isAbsolute(value) ? value : join(rootDir, value);
}

export async function main(options = {}) {
  const thresholds = parseThresholds(options.env ?? process.env);
  const moves = await detectMoves(thresholds, options);
  const dateStr = options.date ?? readArg("--date") ?? todayInIst();
  if (options.dryRun || process.argv.includes("--dry-run")) {
    return { date: dateStr, moveCount: moves.length, generatedCount: 0, moves };
  }
  const limit = Number(options.limit ?? process.env.MOVE_ARTICLE_LIMIT ?? 5);
  const concurrency = Number(options.concurrency ?? process.env.MOVE_ARTICLE_CONCURRENCY ?? 10);
  const generated = await mapWithConcurrency(
    moves.slice(0, limit),
    concurrency,
    (move) => generateAndPublish(move, dateStr, options)
  );
  return { date: dateStr, moveCount: moves.length, generatedCount: generated.length, generated };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((result) => {
    console.log(JSON.stringify(result, null, 2));
  }).catch((error) => {
    console.error("Error generating move articles:", error);
    process.exit(1);
  });
}
