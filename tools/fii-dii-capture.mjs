#!/usr/bin/env node
// Daily capture: pull the latest cash provisional flow + the matching day's
// participant-wise F&O reports and upsert them into data/fii-dii-history.json.
// Invoked from the daily generation workflow (not from core.mjs).
import { fetchFiiDiiFlows, fetchFnoParticipant, isoKey } from "./fii-dii-source.mjs";
import { loadHistory, saveHistory, upsertDay } from "./fii-dii-store.mjs";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Parse a "DD-Mon-YYYY" label into a UTC Date, or null. */
export function parseDayLabel(label) {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(String(label || "").trim());
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLowerCase());
  if (month < 0) return null;
  return new Date(Date.UTC(Number(m[3]), month, Number(m[1])));
}

export async function capture({ log = console } = {}) {
  const cash = await fetchFiiDiiFlows({ timeoutMs: 12_000 });
  if (!cash || !cash.date) {
    log.error?.("capture: cash flow unavailable");
    return null;
  }
  const date = parseDayLabel(cash.date);
  const iso = date ? isoKey(date) : null;
  if (!iso) {
    log.error?.(`capture: unparseable cash date ${cash.date}`);
    return null;
  }
  const { date: _drop, ...cashFields } = cash;
  const record = { date: cash.date, cash: cashFields };
  const fno = date ? await fetchFnoParticipant(date, { timeoutMs: 12_000 }) : null;
  if (fno) {
    record.fnoOi = fno.fnoOi;
    record.fnoVol = fno.fnoVol;
  }
  const history = await loadHistory();
  upsertDay(history, iso, record);
  await saveHistory(history);
  log.info?.(`capture: stored ${iso} (cash${fno ? " + F&O" : " only"})`);
  return { iso, record };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  capture().then((r) => process.exit(r ? 0 : 1));
}
