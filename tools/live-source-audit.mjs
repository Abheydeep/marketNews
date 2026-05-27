import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchLiveNewsArticles } from "./news-sources.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const date = readArg("--date") ?? todayInIst();
const maxPolished = Number(readArg("--max-polished") ?? 6);
const outputDir = join(rootDir, "out", "reports");
const startedAt = new Date().toISOString();

const suspiciousPatterns = [
  /\b(world['’]s oldest doctor|long, happy life|wellness|patients)\b/i,
  /\b(youtube whisperers?|mrbeast|creator economy|content creators?)\b/i,
  /\b(passive income|dividend stock|how to invest|good stock to buy now)\b/i,
  /\b(crypto|bitcoin|web3|nft)\b/i,
  /\b(hollywood|paramount|netflix|sports|pickleball)\b/i,
  /\b(mlb|yankees|mariano rivera|salary cap)\b/i,
  /\b(real estate agent|mortgage rates|home prices)\b/i,
  /\b(weight loss|wegovy|glp-?1|obesity)\b/i,
  /\b(q[1-4]\s+earnings call highlights|peloton|mcdonald['’]?s?|grindr|grove collaborative)\b/i,
  /\b(gold card|world['’]s wealthy|wealthy investors|trump accounts?|fanduel|coinbase)\b/i,
  /\b(should you buy|restaurant brands|burger king|wearable patches?|supplement industry|cd rates|heloc|home equity|gold and silver prices today)\b/i
];

const weakEditorialPatterns = [
  /\bwatchlist cue only\b/i,
  /\bno index bias unless\b/i,
  /\brequire first-range breadth\b/i,
  /\bmixed global cues keep the India open\b/i,
  /\bconditional India input\b/i,
  /\bwatch input only\b/i,
  /\brisk appetite is supportive only if Indian breadth confirms\b/i,
  /\bglobal cue matters for India only if margins, guidance, or demand\b/i,
  /\bNifty can open firmer, but Bank Nifty, USD\/INR and advance-decline\b/i
];

const baseArticles = await fetchLiveNewsArticles(date, {
  llmArticleEnrichment: false,
  strictFetch: false
});

const polishedArticles = await fetchLiveNewsArticles(date, {
  strictFetch: false,
  maxArticleEditorialEnrichmentCalls: maxPolished
});

const baseByUrl = new Map(baseArticles.map((article) => [article.sourceUrl, article]));
const rows = polishedArticles.map((article) => {
  const base = baseByUrl.get(article.sourceUrl) ?? {};
  return {
    headline: article.headline,
    publisher: article.sourceName,
    category: article.category,
    entity: article.entityName,
    sourceUrl: article.sourceUrl,
    polished: textChanged(base, article),
    takeaway: article.takeaway,
    indiaImpact: article.indiaImpact,
    watchFor: article.watchFor,
    warnings: warningsForArticle(article)
  };
});

await mkdir(outputDir, { recursive: true });

const report = {
  date,
  startedAt,
  finishedAt: new Date().toISOString(),
  counts: {
    base: baseArticles.length,
    polished: polishedArticles.length,
    polishedCards: rows.filter((row) => row.polished).length,
    warningCards: rows.filter((row) => row.warnings.length).length
  },
  provider: {
    gemini: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    nvidia: Boolean(process.env.NVIDIA_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY)
  },
  rows
};

await writeFile(join(outputDir, `live-source-audit-${date}-${stampForFile()}.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (report.counts.warningCards > 0) {
  process.exitCode = 2;
}

function warningsForArticle(article) {
  const text = [
    article.headline,
    article.summary,
    article.takeaway,
    article.indiaImpact,
    article.watchFor
  ].filter(Boolean).join(" ");
  const warnings = [];
  if (suspiciousPatterns.some((pattern) => pattern.test(text))) {
    warnings.push("possible_off_topic_source");
  }
  if (weakEditorialPatterns.some((pattern) => pattern.test(text))) {
    warnings.push("generic_readthrough_copy");
  }
  if (/global-only context/i.test(text) && !/(Brent|USD\/INR|Nifty|Bank Nifty|India VIX|G-sec|sector breadth)/i.test(text)) {
    warnings.push("global_only_without_market_check");
  }
  return warnings;
}

function textChanged(left, right) {
  return ["takeaway", "indiaImpact", "watchFor"].some((key) =>
    clean(left?.[key]) !== clean(right?.[key])
  );
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function stampForFile() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
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
  return index === -1 ? null : process.argv[index + 1];
}
