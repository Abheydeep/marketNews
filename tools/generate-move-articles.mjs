// tools/generate-move-articles.mjs
// Detect significant live market moves, generate concise Pulse articles with an LLM, and publish static move pages.

import { writeFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchLiveMarketSnapshots } from "./market-data.mjs";
import { movePage } from "./move-page.mjs";

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
  const outDir = join(rootDir, "out", "moves", dateStr, slug);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  await writeFile(join(outDir, "article.json"), `${JSON.stringify({ ...article, move }, null, 2)}\n`, "utf8");
  await writeFile(join(outDir, "index.html"), movePage({ date: dateStr, slug, article, symbol: move.symbol, change: move.priceChangePct }), "utf8");

  return { symbol: move.symbol, slug, href: `/moves/${dateStr}/${slug}/`, headline: article.headline };
}

export async function generateMoveArticle(move, options = {}) {
  const raw = options.rawArticle ?? await callPulseArticleModel(move, options);
  const article = parseArticleJson(raw);
  if (!article) {
    throw new Error(`Pulse LLM did not return valid article JSON for ${move.symbol}`);
  }
  return {
    ...article,
    llmProvider: "nvidia",
    llmModel: raw.model || pulseModel()
  };
}

async function callPulseArticleModel(move, options = {}) {
  const apiKey = options.apiKey ?? process.env.NVIDIA_PULSE_API_KEY ?? process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("missing_nvidia_pulse_api_key");
  const model = options.model ?? pulseModel();
  const baseUrl = String(options.baseUrl ?? process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: pulseArticleSystemPrompt() },
        { role: "user", content: pulseArticleUserPrompt(move) }
      ],
      response_format: { type: "json_object" },
      temperature: Number(options.temperature ?? process.env.NVIDIA_PULSE_TEMPERATURE ?? 0.35),
      top_p: Number(options.topP ?? process.env.NVIDIA_PULSE_TOP_P ?? 0.9),
      max_tokens: Number(options.maxTokens ?? process.env.NVIDIA_PULSE_MAX_TOKENS ?? 900),
      chat_template_kwargs: { thinking: false },
      stream: false
    }),
    signal: AbortSignal.timeout(Number(options.timeoutMs ?? process.env.NVIDIA_PULSE_TIMEOUT_MS ?? 15000))
  });
  if (!response.ok) {
    throw new Error(`NVIDIA Pulse article call failed with HTTP ${response.status}: ${await response.text()}`);
  }
  const data = await response.json();
  return {
    content: (data?.choices ?? []).map((choice) => choice?.message?.content ?? "").filter(Boolean).join("\n"),
    model
  };
}

function pulseModel() {
  return process.env.NVIDIA_PULSE_MODEL || "meta/llama-4-maverick-17b-128e-instruct";
}

function pulseArticleSystemPrompt() {
  return [
    "You are Market Narrative's Pulse editor for Indian markets.",
    "Write only verified, plain-English market context for traders.",
    "Do not give buy/sell advice, price targets, or assured direction.",
    "Return strict JSON only. No markdown."
  ].join(" ");
}

function pulseArticleUserPrompt(move) {
  const direction = move.priceChangePct >= 0 ? "up" : "down";
  return JSON.stringify({
    task: "Write a concise Pulse article from this live market move.",
    requiredJsonShape: { headline: "string", summary: "string" },
    rules: [
      "headline <= 90 characters",
      "summary <= 120 words",
      "explain the likely India-market transmission path",
      "mention Nifty, Bank Nifty, sector, crude, USD/INR, or breadth only when relevant",
      "no trading calls, no guaranteed language, no invented causes"
    ],
    move: {
      symbol: move.symbol,
      name: move.name,
      direction,
      changePercent: Number(move.priceChangePct.toFixed(2)),
      marketRegion: move.marketRegion,
      closeValue: move.closeValue,
      previousClose: move.previousClose,
      timestamp: move.timestamp,
      source: move.source
    }
  }, null, 2);
}

function parseArticleJson(raw) {
  const text = typeof raw === "string" ? raw : raw?.content;
  if (!text) return null;
  const cleaned = String(text).trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
  const headline = cleanArticleField(parsed.headline, 110);
  const summary = cleanArticleField(parsed.summary, 900);
  if (!headline || headline.length < 18 || !summary || summary.length < 40) return null;
  return { headline, summary };
}

function cleanArticleField(value, maxLength) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
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

export async function main(options = {}) {
  const thresholds = parseThresholds(options.env ?? process.env);
  const moves = await detectMoves(thresholds, options);
  const dateStr = options.date ?? readArg("--date") ?? todayInIst();
  if (options.dryRun || process.argv.includes("--dry-run")) {
    return { date: dateStr, moveCount: moves.length, generatedCount: 0, moves };
  }
  const limit = Number(options.limit ?? process.env.MOVE_ARTICLE_LIMIT ?? 5);
  const generated = [];
  for (const move of moves.slice(0, limit)) {
    generated.push(await generateAndPublish(move, dateStr, options));
  }
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
