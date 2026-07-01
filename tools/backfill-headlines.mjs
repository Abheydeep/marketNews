import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { generateEditorialHeadline, sanitizeEditorialHeadline } from "./core.mjs";
import { isMarketUpdateDate } from "./market-calendar.mjs";
import { isLivePriceTracker } from "./article-triage.mjs";
import { sourceUrlLooksArticleLevel } from "./news-sources.mjs";
import { mapWithConcurrency } from "./limited-concurrency.mjs";
import { log } from "./logger.mjs";
import { stripPublicJargon } from "./public-copy-sanitizer.mjs";

const execFileAsync = promisify(execFile);
const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const archiveDir = join(rootDir, "archive", "daily");
const reportPath = join(rootDir, "out", "headline-backfill-report.json");
const formulaPattern = /\b(?:opening range|risk appetite|Nifty overnight|gap-(?:up|down) bias|crude\s*\/\s*energy risk|rates\s*\/\s*Fed path|Bank Nifty breadth|market breadth)\b|\.{2,}$/i;
const taxonomySubjectPattern = /^(?:currency pressure|global risk|market pressure|sector support|crude|rates|tech breadth)\s+(?:shape|support|test|weigh|set)s?\b/i;
const bannedPattern = /\b(?:VWAP|breadth|opening range|risk appetite|risk-on|risk-off|advance-decline)\b/i;

export function headlineNeedsBackfill(title) {
  const value = String(title || "").trim();
  return !value || formulaPattern.test(value) || taxonomySubjectPattern.test(value) || !validateHistoricalHeadline(value).ok;
}

export function validateHistoricalHeadline(title, lead = null) {
  const value = String(title || "").replace(/\s+/g, " ").trim();
  const reasons = [];
  if (value.length < 28 || value.length > 120) reasons.push("length");
  if (bannedPattern.test(value)) reasons.push("jargon");
  if (formulaPattern.test(value) || taxonomySubjectPattern.test(value)) reasons.push("formula");
  if (/\.{2,}$|[,:;\-–—]$/.test(value)) reasons.push("punctuation");
  if (/\b(?:buy|sell|hold|target)\b/i.test(value)) reasons.push("advice_language");
  if (lead && tokenOverlap(value, `${lead.headline || ""} ${lead.summary || ""}`) < 1) reasons.push("source_relevance");
  return { ok: reasons.length === 0, reasons };
}

export function selectBackfillLead(digest) {
  const candidates = [...(digest.news || [])]
    .filter((article) => sourceUrlLooksArticleLevel(article.sourceUrl || article.link || article.url || ""))
    .filter((article) => !isLivePriceTracker(article))
    .sort((a, b) => Number(b.score || b.relevanceScore || 0) - Number(a.score || a.relevanceScore || 0));
  const stored = digest.dailyLead;
  if (stored && !isLivePriceTracker(stored) && sourceUrlLooksArticleLevel(stored.sourceUrl || stored.link || stored.url || "")) candidates.unshift(stored);
  if (candidates[0]) return candidates[0];
  const context = digest.archiveSummary || digest.deskNote || digest.themes?.[0]?.summary || "";
  return context ? { id: "archived_digest_context", headline: context, summary: context } : null;
}

async function run() {
  const dryRun = process.argv.includes("--dry-run");
  const files = (await readdir(archiveDir)).filter((file) => file.endsWith("-digest.json")).sort();
  const records = await mapWithConcurrency(files, 2, async (file) => processArchive(file, dryRun));
  const flagged = records.filter((item) => item.status !== "clean");
  const unresolved = records.filter((item) => item.status === "failed");
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), dryRun, flagged, unresolved }, null, 2)}\n`);
  log.info("headline backfill complete", { dryRun, scanned: files.length, flagged: flagged.length, unresolved: unresolved.length });
  if (unresolved.length) throw new Error(`${unresolved.length} archive headline corrections remain unresolved`);
}

async function processArchive(file, dryRun) {
  const path = join(archiveDir, file);
  const digest = JSON.parse(await readFile(path, "utf8"));
  const baseline = await baselineDigest(path);
  const previousTitle = baseline?.title || digest.title || "";
  const baselineFlagged = headlineNeedsBackfill(previousTitle);
  if (!baselineFlagged && !headlineNeedsBackfill(digest.title)) return { file, status: "clean", title: digest.title };
  const lead = selectBackfillLead(digest);
  if (!lead) return { file, status: "failed", previousTitle, reasons: ["no_eligible_source"] };
  let nextTitle = digest.title;
  let validation = validateHistoricalHeadline(nextTitle, lead);
  let method = nextTitle !== previousTitle ? "existing_proposal" : "nvidia";
  for (let attempt = 1; !validation.ok && attempt <= 2; attempt++) {
    nextTitle = await generateEditorialHeadline({ dailyLead: lead, marketSnapshots: digest.marketSnapshots || [], marketUpdate: isMarketUpdateDate(digest.digestDate) });
    validation = validateHistoricalHeadline(nextTitle, lead);
  }
  if (!validation.ok) {
    nextTitle = sanitizeEditorialHeadline(lead.headline || "") || fallbackHeadline(lead);
    validation = validateHistoricalHeadline(nextTitle, lead);
    method = "source_headline_fallback";
  }
  if (!validation.ok) return { file, status: "failed", previousTitle, proposedTitle: nextTitle, reasons: validation.reasons };
  if (!dryRun) {
    digest.title = nextTitle;
    digest.titleCorrection = {
      previousTitle, correctedTitle: nextTitle, correctedAt: new Date().toISOString(),
      method, model: method === "nvidia" ? (process.env.NVIDIA_MODEL || "configured NVIDIA model") : null,
      sourceArticleId: lead.id || lead.link || lead.url || null, validation: "passed"
    };
    await writeFile(path, `${JSON.stringify(digest, null, 2)}\n`, "utf8");
  }
  return { file, status: dryRun ? "proposed" : "corrected", previousTitle, proposedTitle: nextTitle, method };
}

async function baselineDigest(path) {
  try {
    const repoPath = relative(rootDir, path).replaceAll("\\", "/");
    const { stdout } = await execFileAsync("git", ["show", `HEAD:${repoPath}`], { cwd: rootDir, maxBuffer: 4_000_000 });
    return JSON.parse(stdout);
  } catch { return null; }
}

function tokenOverlap(a, b) {
  const tokens = (value) => new Set(String(value).toLowerCase().match(/[a-z]{4,}/g) || []);
  const left = tokens(a), right = tokens(b);
  return [...left].filter((token) => right.has(token)).length;
}

function fallbackHeadline(lead) {
  const clean = stripPublicJargon(lead.headline || lead.summary || "")
    .replace(/\b(?:live updates?|liveblog)\b:?/gi, "").replace(/\s+/g, " ").trim();
  const words = clean.split(" ").filter(Boolean).slice(0, 16);
  let title = words.join(" ").replace(/[,;:—-]+$/g, "").trim();
  if (title.length < 28) title = `${title} Shapes the Indian Market Focus`.trim();
  return title.slice(0, 120).replace(/\s+\S*$/, "").replace(/[,;:—-]+$/g, "").trim();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) run().catch((error) => { log.error("headline backfill failed", { error: error.message }); process.exitCode = 1; });
