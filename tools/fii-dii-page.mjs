// Orchestrator for the rich FII/DII page body. Composes the cash + F&O history
// into hero cards, charts, an interpretation read, and tabbed tables.
// Returns { bodyHtml, faqItems } so publish-site can wrap it with the shared
// SEO shell and keep the FAQ JSON-LD in sync.
import { escapeHtml, fmtCr, signClass, longRatio, shortDay } from "./fii-dii-format.mjs";
import { fiiDiiStyles } from "./fii-dii-styles.mjs";
import { divergingBars, lineChart, chartCard } from "./fii-dii-charts.mjs";
import { cashDaily, cashMonthly, fnoDaily, fnoMonthly } from "./fii-dii-tables.mjs";
import { fiiDiiInterpretation, fiiDiiEducation, fiiDiiFaqItems } from "./fii-dii-copy.mjs";

/** Merge cash records and F&O records into one date-ascending day series. */
function mergeDays(cashRecords, fnoRecords) {
  const map = new Map();
  for (const r of fnoRecords || []) {
    map.set(r.iso, { iso: r.iso, date: r.date, cash: r.cash || null, fnoOi: r.fnoOi || null, fnoVol: r.fnoVol || null });
  }
  for (const c of cashRecords || []) {
    const prev = map.get(c.iso) || { iso: c.iso, date: c.date, fnoOi: null, fnoVol: null };
    prev.date = prev.date || c.date;
    prev.cash = prev.cash || c.cash;
    map.set(c.iso, prev);
  }
  return [...map.values()].sort((a, b) => a.iso.localeCompare(b.iso));
}

function card(label, value, cls, note) {
  return `<div class="mf-card"><span>${escapeHtml(label)}</span><strong class="${cls}">${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></div>`;
}

function heroCards(days) {
  const lastCash = days.filter((d) => d.cash).at(-1);
  const lastFno = days.filter((d) => d.fnoOi?.fii).at(-1);
  const fii = Number(lastCash?.cash?.fiiNet ?? NaN);
  const dii = Number(lastCash?.cash?.diiNet ?? NaN);
  const ratio = lastFno ? longRatio(lastFno.fnoOi.fii, "idxFutLong", "idxFutShort") : null;
  const absorption = fii < 0 && dii > 0 ? `${Math.round((dii / Math.abs(fii)) * 100)}%` : "—";
  return `<div class="mf-cards">
    ${card("FII cash net", Number.isFinite(fii) ? fmtCr(fii) : "—", signClass(fii), "Foreign institutional net flow, latest session")}
    ${card("DII cash net", Number.isFinite(dii) ? fmtCr(dii) : "—", signClass(dii), "Domestic institutional net flow, latest session")}
    ${card("FII index-fut long %", ratio == null ? "—" : `${ratio.toFixed(0)}%`, ratio == null ? "flat" : ratio >= 50 ? "pos" : "neg", "Long share of FII index-futures book")}
    ${card("DII absorption", absorption, absorption === "—" ? "flat" : "pos", "Domestic buying vs FII cash outflow")}
  </div>`;
}

function chartsBlock(days) {
  const cash = days.filter((d) => d.cash).slice(-22);
  const bars = divergingBars(cash.map((d) => ({ label: shortDay(d.date), fii: Number(d.cash.fiiNet || 0), dii: Number(d.cash.diiNet || 0) })));
  let cf = 0; let cd = 0;
  const cumFii = []; const cumDii = []; const cumLabels = [];
  for (const d of cash) { cf += Number(d.cash.fiiNet || 0); cd += Number(d.cash.diiNet || 0); cumFii.push(cf); cumDii.push(cd); cumLabels.push(shortDay(d.date)); }
  const cum = lineChart([
    { name: "FII", color: "#22d3ee", values: cumFii },
    { name: "DII", color: "#a78bfa", values: cumDii }
  ], cumLabels, fmtCr);
  const fno = days.filter((d) => d.fnoOi?.fii).slice(-40);
  const ratios = fno.map((d) => longRatio(d.fnoOi.fii, "idxFutLong", "idxFutShort"));
  const ratioChart = lineChart([{ name: "FII long %", color: "#34d399", values: ratios }], fno.map((d) => shortDay(d.date)), (v) => `${Math.round(v)}%`);
  return `<div>
    <h2 class="mf-section-h">Flow &amp; positioning charts</h2>
    <p class="mf-section-s">FII and DII cash flow, the running cumulative, and how FIIs are leaning in index futures — the three views a desk checks before the open.</p>
    <div class="mf-charts">
      ${chartCard("FII vs DII daily cash net", "Net buy/sell per session, ₹ crore", bars, [{ name: "FII", color: "#22d3ee" }, { name: "DII", color: "#a78bfa" }])}
      ${chartCard("Cumulative cash flow", "Running net over recent sessions, ₹ crore", cum, [{ name: "FII", color: "#22d3ee" }, { name: "DII", color: "#a78bfa" }])}
      ${chartCard("FII index-futures long %", "Long share of the FII index-futures book", ratioChart, [{ name: "FII long %", color: "#34d399" }])}
    </div>
  </div>`;
}

function tablesBlock(days) {
  return `<div>
    <h2 class="mf-section-h">Daily &amp; monthly data</h2>
    <p class="mf-section-s">Switch between cash-market flow and F&amp;O index / stock positioning. Tables show recent sessions plus a monthly roll-up.</p>
    <div>
      <input type="radio" name="mftab" id="mf-cash" checked>
      <input type="radio" name="mftab" id="mf-idx">
      <input type="radio" name="mftab" id="mf-stk">
      <div class="mf-tabs">
        <label for="mf-cash">Cash</label>
        <label for="mf-idx">F&amp;O Index</label>
        <label for="mf-stk">F&amp;O Stock</label>
      </div>
      <div class="mf-tw">
        <div class="mf-panel cash">${cashDaily(days)}${cashMonthly(days)}</div>
        <div class="mf-panel idx">${fnoDaily(days, "idx")}${fnoMonthly(days, "idx")}</div>
        <div class="mf-panel stk">${fnoDaily(days, "stk")}${fnoMonthly(days, "stk")}</div>
      </div>
    </div>
  </div>`;
}

/**
 * @param {Array<{iso,date,cash}>} cashRecords from the digest archive
 * @param {Array<{iso,date,cash?,fnoOi,fnoVol}>} fnoRecords from the history store
 */
export function fiiDiiPageBody(cashRecords, fnoRecords) {
  const days = mergeDays(cashRecords, fnoRecords);
  const reads = fiiDiiInterpretation(days);
  const readBlock = reads.length
    ? `<div class="mf-read"><h3>What the flow is saying</h3><ul>${reads.map((r) => `<li>${r}</li>`).join("")}</ul></div>`
    : "";
  const lastDate = days.at(-1)?.date || "";
  const fnoDays = days.filter((d) => d.fnoOi).length;
  const note = `Coverage: cash provisional flow and NSE participant-wise F&amp;O positioning. F&amp;O positioning history currently spans ${fnoDays} captured sessions and extends as the daily backfill runs; figures are exchange-provisional and may be revised.`;
  const bodyHtml = `${fiiDiiStyles()}
  <div class="mf">
    <div class="mf-asof">Data as of <b>${escapeHtml(lastDate)}</b> · cash from NSE FII/DII activity, F&amp;O from NSE participant reports</div>
    ${heroCards(days)}
    ${readBlock}
    ${chartsBlock(days)}
    ${tablesBlock(days)}
    <div class="mf-note">${note}</div>
  </div>
  ${fiiDiiEducation()}`;
  return { bodyHtml, faqItems: fiiDiiFaqItems() };
}
