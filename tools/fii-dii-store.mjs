// Persistent store for the FII/DII history that backs the public page.
// Committed to the repo as data/fii-dii-history.json so the Vercel build never
// needs to reach NSE at build time.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const storePath = join(rootDir, "data", "fii-dii-history.json");

/** Load the history map ({ "yyyy-mm-dd": record }), or {} if absent/corrupt. */
export async function loadHistory() {
  try {
    const parsed = JSON.parse(await readFile(storePath, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Persist the history map, sorted by date key for stable diffs. */
export async function saveHistory(history) {
  const sorted = {};
  for (const key of Object.keys(history).sort()) sorted[key] = history[key];
  await mkdir(dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

/**
 * Merge a day's record into the history map in place. Existing fields are kept
 * unless the incoming record supplies a non-null replacement, so a cash-only
 * capture never wipes previously stored F&O data (and vice versa).
 * @param {object} history the map to mutate
 * @param {string} isoKey yyyy-mm-dd
 * @param {object} record { date, cash?, fnoOi?, fnoVol? }
 */
export function upsertDay(history, isoKey, record) {
  const prev = history[isoKey] || {};
  const next = { ...prev };
  if (record.date) next.date = record.date;
  for (const field of ["cash", "fnoOi", "fnoVol"]) {
    if (record[field] != null) next[field] = record[field];
  }
  history[isoKey] = next;
  return next;
}

/** Return history as a date-ascending array of records, each with `iso` added. */
export function historyArray(history) {
  return Object.keys(history)
    .sort()
    .map((iso) => ({ iso, ...history[iso] }));
}

export { storePath };
