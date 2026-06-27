#!/usr/bin/env node
// Resumable historical backfill of the participant-wise F&O reports.
// Cash provisional history is not archived per-day by NSE, so this backfills
// F&O positioning (OI + volume); cash accumulates forward via capture + digests.
//
// Usage:
//   node tools/fii-dii-backfill.mjs                 # default: last 24 months
//   node tools/fii-dii-backfill.mjs --from=2015-01-01
//   node tools/fii-dii-backfill.mjs --from=2015-01-01 --to=2015-12-31
import { fetchFnoParticipant, isoKey } from "./fii-dii-source.mjs";
import { loadHistory, saveHistory, upsertDay } from "./fii-dii-store.mjs";

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function parseDate(value, fallback) {
  const d = value ? new Date(`${value}T00:00:00Z`) : fallback;
  return Number.isNaN(d?.getTime?.()) ? fallback : d;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const to = parseDate(arg("to"), new Date());
  const defaultFrom = new Date(Date.UTC(to.getUTCFullYear() - 2, to.getUTCMonth(), to.getUTCDate()));
  const from = parseDate(arg("from"), defaultFrom);
  const delayMs = Number(arg("delay", "350"));

  const history = await loadHistory();
  let scanned = 0;
  let fetched = 0;
  let saved = 0;

  for (let d = new Date(to); d >= from; d.setUTCDate(d.getUTCDate() - 1)) {
    const day = d.getUTCDay();
    if (day === 0 || day === 6) continue; // skip weekends
    const iso = isoKey(d);
    if (history[iso]?.fnoOi) continue; // already have F&O for this day
    scanned += 1;
    const fno = await fetchFnoParticipant(new Date(d), { timeoutMs: 12_000 });
    if (fno && (fno.fnoOi || fno.fnoVol)) {
      upsertDay(history, iso, { date: fno.date, fnoOi: fno.fnoOi, fnoVol: fno.fnoVol });
      fetched += 1;
      if (fetched % 20 === 0) {
        await saveHistory(history);
        saved += 1;
        console.log(`  …checkpoint ${iso} (${fetched} fetched)`);
      }
    }
    await sleep(delayMs);
  }

  await saveHistory(history);
  console.log(`backfill done: scanned ${scanned} weekdays, fetched ${fetched}, checkpoints ${saved}`);
}

main().catch((err) => {
  console.error("backfill failed:", err.message);
  process.exit(1);
});
