// FII/DII data sources: NSE cash provisional flows + participant-wise F&O reports.
// Cash comes from market-data.mjs; F&O comes from the NSE archives participant CSVs.
import { fetchFiiDiiFlows } from "./market-data.mjs";

export { fetchFiiDiiFlows };

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Column order shared by both fao_participant_oi and fao_participant_vol reports.
// Index 0 is the participant label (Client/DII/FII/Pro/TOTAL); the rest are contract counts.
const COLS = [
  "idxFutLong", "idxFutShort", "stkFutLong", "stkFutShort",
  "idxCeLong", "idxPeLong", "idxCeShort", "idxPeShort",
  "stkCeLong", "stkPeLong", "stkCeShort", "stkPeShort",
  "totalLong", "totalShort"
];

/** Format a Date as DDMMYYYY for the NSE archive filename. */
export function ddmmyyyy(date) {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}${m}${date.getUTCFullYear()}`;
}

/** Format a Date as "DD-Mon-YYYY" to match the cash API's date label. */
export function dayLabel(date) {
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${d}-${MONTHS[date.getUTCMonth()]}-${date.getUTCFullYear()}`;
}

/** ISO yyyy-mm-dd key used by the history store. */
export function isoKey(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Parse a participant-wise CSV (OI or volume) into FII and DII rows.
 * Returns { fii, dii } where each is a map of COLS -> Number, or null if absent.
 * @param {string} text raw CSV text
 */
export function parseParticipantCsv(text) {
  if (typeof text !== "string" || !text.includes("Client Type")) return null;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = { fii: null, dii: null };
  for (const line of lines) {
    const cells = line.split(",").map((c) => c.trim());
    const label = cells[0].toUpperCase();
    const key = label === "FII" ? "fii" : label === "DII" ? "dii" : null;
    if (!key) continue;
    const row = {};
    let ok = false;
    COLS.forEach((name, i) => {
      const value = Number(cells[i + 1]);
      row[name] = Number.isFinite(value) ? value : 0;
      if (Number.isFinite(value)) ok = true;
    });
    if (ok) out[key] = row;
  }
  return out.fii || out.dii ? out : null;
}

async function fetchCsv(url, signal) {
  const res = await fetch(url, { signal, headers: { "User-Agent": UA, Accept: "text/csv,*/*" } });
  if (!res.ok) return null;
  return res.text();
}

/**
 * Fetch participant-wise OI + volume F&O reports for a trading day.
 * @param {Date} date the trading day (UTC date parts are used for the filename)
 * @returns {Promise<{date: string, fnoOi: object|null, fnoVol: object|null} | null>}
 */
export async function fetchFnoParticipant(date, { timeoutMs = 8_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const stamp = ddmmyyyy(date);
    const base = "https://archives.nseindia.com/content/nsccl";
    const [oiText, volText] = await Promise.all([
      fetchCsv(`${base}/fao_participant_oi_${stamp}.csv`, controller.signal),
      fetchCsv(`${base}/fao_participant_vol_${stamp}.csv`, controller.signal)
    ]);
    const fnoOi = oiText ? parseParticipantCsv(oiText) : null;
    const fnoVol = volText ? parseParticipantCsv(volText) : null;
    if (!fnoOi && !fnoVol) return null;
    return { date: dayLabel(date), fnoOi, fnoVol };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
