// Orchestrator for the rich FII/DII page body. Composes the cash + F&O history
// into hero cards, charts, an interpretation read, and tabbed tables.
// Returns { bodyHtml, faqItems } so publish-site can wrap it with the shared
// SEO shell and keep the FAQ JSON-LD in sync.
import { escapeHtml, fmtCr, fmtNum, signClass, fnoNet, longRatio, shortDay, monthLabel } from "./fii-dii-format.mjs";
import { fiiDiiStyles } from "./fii-dii-styles.mjs";
import { divergingBars, lineChart, chartCard } from "./fii-dii-charts.mjs";
import { cashDaily, cashMonthly, fnoDaily, fnoMonthly } from "./fii-dii-tables.mjs";
import { fiiDiiInterpretation, fiiDiiEducation, fiiDiiFaqItems } from "./fii-dii-copy.mjs";
import { regimeBanner, getHistoricalExtremeMonths } from "./fii-dii-regime.mjs";

/** Merge cash records and F&O records into one date-ascending day series. */
function mergeDays(cashRecords, fnoRecords) {
  const map = new Map();
  for (const r of fnoRecords || []) map.set(r.iso, { iso: r.iso, date: r.date, cash: r.cash || null, fnoOi: r.fnoOi || null, fnoVol: r.fnoVol || null, niftyChangePercent: null, niftyClose: null });
  for (const c of cashRecords || []) {
    const prev = map.get(c.iso) || { iso: c.iso, date: c.date, fnoOi: null, fnoVol: null };
    prev.date = prev.date || c.date; prev.cash = prev.cash || c.cash;
    prev.niftyChangePercent = c.niftyChangePercent !== undefined ? c.niftyChangePercent : null;
    prev.niftyClose = c.niftyClose !== undefined ? c.niftyClose : null;
    map.set(c.iso, prev);
  }
  return [...map.values()].sort((a, b) => a.iso.localeCompare(b.iso));
}

function heroCards(days) {
  const lastCash = days.filter((d) => d.cash).at(-1);
  const lastFno = days.filter((d) => d.fnoOi?.fii).at(-1);
  const fii = Number(lastCash?.cash?.fiiNet ?? NaN);
  const dii = Number(lastCash?.cash?.diiNet ?? NaN);
  const ratio = lastFno ? longRatio(lastFno.fnoOi.fii, "idxFutLong", "idxFutShort") : null;
  
  const absFii = Math.abs(fii) || 1;
  const absorption = fii < 0 && dii > 0 ? `${Math.round((dii / absFii) * 100)}%` : "—";
  const scaleLimit = Math.max(Math.abs(fii), Math.abs(dii), 2000);
  const fiiWidth = Math.max(5, Math.round((Math.abs(fii) / scaleLimit) * 100));
  const diiWidth = Math.max(5, Math.round((Math.abs(dii) / scaleLimit) * 100));
  
  const cashDays = days.filter((d) => d.cash);
  const latestMonth = lastCash ? monthLabel(lastCash.date) : "";
  const currentMonthDays = cashDays.filter((d) => monthLabel(d.date) === latestMonth);
  const fiiMtd = currentMonthDays.reduce((a, d) => a + Number(d.cash.fiiNet || 0), 0);
  const diiMtd = currentMonthDays.reduce((a, d) => a + Number(d.cash.diiNet || 0), 0);

  const fiiColor = fii >= 0 ? "var(--up-fill)" : "var(--dn-fill)";
  const diiColor = dii >= 0 ? "var(--up-fill)" : "var(--dn-fill)";

  const longVal = ratio != null ? ratio : 0;
  const shortVal = ratio != null ? 100 - ratio : 0;
  const diiFnoNet = lastFno ? fnoNet(lastFno.fnoOi.dii, "idxFutLong", "idxFutShort") : 0;

  return `<div class="mf-cards">
    <!-- Card 1: Cash Flow Today -->
    <div class="mf-card">
      <span>Cash Flow Today · ${escapeHtml(lastCash?.date || "latest")}</span>
      <div class="mf-battle">
        <div class="mf-battle-row">
          <div class="mf-battle-lbl" style="color:var(--dn)">FII</div>
          <div class="mf-battle-track"><div class="mf-battle-fill" style="background:${fiiColor};width:${fiiWidth}%"></div></div>
          <div class="mf-battle-num ${signClass(fii)}">${Number.isFinite(fii) ? fmtCr(fii) : "—"}</div>
        </div>
        <div class="mf-battle-row">
          <div class="mf-battle-lbl" style="color:var(--mf-up)">DII</div>
          <div class="mf-battle-track"><div class="mf-battle-fill" style="background:${diiColor};width:${diiWidth}%"></div></div>
          <div class="mf-battle-num ${signClass(dii)}">${Number.isFinite(dii) ? fmtCr(dii) : "—"}</div>
        </div>
      </div>
      <div class="mf-battle-stats">
        <div>
          <small>Combined Net</small>
          <strong class="${signClass(fii + dii)}" style="font-size:15px;margin:2px 0">${fmtCr(fii + dii)}</strong>
        </div>
        <div>
          <small title="DII net buying as a percentage of FII net selling">DII Buying vs FII Selling</small>
          <strong class="${absorption === "—" ? "flat" : "pos"}" style="font-size:15px;margin:2px 0">${absorption}</strong>
        </div>
        <div style="grid-column: span 2; border-top: 1px dashed var(--line); padding-top: 8px; margin-top: 4px; display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); font-weight: 800; letter-spacing: .02em">
          <span>${escapeHtml(latestMonth)} FII: <span class="${signClass(fiiMtd)}">${fmtCr(fiiMtd)}</span></span>
          <span>${escapeHtml(latestMonth)} DII: <span class="${signClass(diiMtd)}">${fmtCr(diiMtd)}</span></span>
        </div>
      </div>
    </div>

    <!-- Card 2: FII Futures Bias -->
    <div class="mf-card">
      <span>FII Index Futures</span>
      <div class="mf-gauge-wrap">
        <div class="mf-gauge-header">
          <span style="color:var(--mf-up)">Long: ${longVal.toFixed(0)}%</span>
          <span style="color:var(--dn)">Short: ${shortVal.toFixed(0)}%</span>
        </div>
        <div class="mf-gauge-track">
          <div class="mf-gauge-long" style="width:${longVal.toFixed(1)}%"></div>
          <div class="mf-gauge-short" style="width:${shortVal.toFixed(1)}%"></div>
        </div>
        <div class="mf-gauge-labels">
          <span>Long contracts</span>
          <span style="opacity:0.6">50 / 50</span>
          <span>Short contracts</span>
        </div>
      </div>
      <div class="mf-battle-stats">
        <div>
          <small>Contracts Long</small>
          <strong style="font-size:15px;margin:2px 0;color:var(--mf-up)">${lastFno ? fmtNum(lastFno.fnoOi.fii.idxFutLong) : "—"}</strong>
        </div>
        <div>
          <small>Contracts Short</small>
          <strong style="font-size:15px;margin:2px 0;color:var(--dn)">${lastFno ? fmtNum(lastFno.fnoOi.fii.idxFutShort) : "—"}</strong>
        </div>
        <div style="grid-column: span 2; border-top: 1px dashed var(--line); padding-top: 8px; margin-top: 4px; display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); font-weight: 800; letter-spacing: .02em">
          <span>FII Trend: ${getHistoricalExtremeMonths(days, ratio)}</span>
          <span>DII index futures net: <span class="${signClass(diiFnoNet)}">${diiFnoNet >= 0 ? "Long" : "Short"} ${fmtNum(Math.abs(diiFnoNet))}</span></span>
        </div>
      </div>
    </div>
  </div>`;
}

function chartsBlock(days) {
  const cash = days.filter((d) => d.cash).slice(-22);
  const bars = divergingBars(cash.map((d) => ({ label: shortDay(d.date), fii: Number(d.cash.fiiNet || 0), dii: Number(d.cash.diiNet || 0), niftyChangePercent: d.niftyChangePercent, niftyClose: d.niftyClose })));
  let cf = 0; let cd = 0;
  const cumFii = []; const cumDii = []; const cumLabels = [];
  for (const d of cash) { cf += Number(d.cash.fiiNet || 0); cd += Number(d.cash.diiNet || 0); cumFii.push(cf); cumDii.push(cd); cumLabels.push(shortDay(d.date)); }
  const cum = lineChart([
    { name: "FII", color: "var(--dn)", values: cumFii },
    { name: "DII", color: "var(--mf-up)", values: cumDii }
  ], cumLabels, fmtCr);
  const fno = days.filter((d) => d.fnoOi?.fii).slice(-40);
  const ratios = fno.map((d) => longRatio(d.fnoOi.fii, "idxFutLong", "idxFutShort"));
  const ratioChart = lineChart([{ name: "FII long %", color: "var(--mf-up)", values: ratios }], fno.map((d) => shortDay(d.date)), (v) => `${Math.round(v)}%`);

  const latestRatio = ratios.at(-1);
  let futuresTakeaway = "";
  if (latestRatio != null) {
    const isShort = latestRatio < 50;
    const pct = isShort ? (100 - latestRatio) : latestRatio;
    const direction = isShort ? "short" : "long";
    const extremeLabel = (isShort && latestRatio <= 20) || (!isShort && latestRatio >= 80)
      ? " — historically extreme positioning"
      : "";
    futuresTakeaway = `<div class="mf-read" style="margin: 12px 0 16px; padding: 12px 14px; background: rgba(70,173,196,0.06); border: 1px solid var(--line); border-radius: 8px;">
      <strong>Takeaway:</strong> FIIs are currently <strong>${Math.round(pct)}% ${direction}</strong> on index futures${extremeLabel}.
    </div>`;
  }

  return `<div>
    <h2 class="mf-section-h">Flow &amp; positioning charts</h2>
    <p class="mf-section-s">FII and DII cash flow, the running cumulative, and how FIIs are leaning in index futures — the three views market participants check before the open.</p>
    ${futuresTakeaway}
    <div class="mf-charts">
      ${chartCard("FII vs DII daily cash net", "Net flow (FII left, DII right bar) · green = buy · red = sell · Nifty in gold", bars, [{ name: "Buying support", color: "var(--mf-up)" }, { name: "Selling pressure", color: "var(--dn)" }, { name: "Nifty 50", color: "#d4a847" }])}
      ${chartCard("Cumulative cash flow", "Running net over recent sessions, ₹ crore", cum, [{ name: "FII", color: "var(--dn)" }, { name: "DII", color: "var(--mf-up)" }])}
      ${chartCard("FII index-futures long %", "Long share of the FII index-futures book · shaded zones show extreme bias", ratioChart, [{ name: "FII long %", color: "var(--mf-up)" }], true)}
    </div>
  </div>`;
}

function tablesBlock(days) {
  return `<div><h2 class="mf-section-h">Daily &amp; monthly data</h2><p class="mf-section-s">Switch between cash-market flow and F&amp;O index / stock positioning. Tables show recent sessions plus a monthly roll-up.</p><div><input type="radio" name="mftab" id="mf-cash" checked><input type="radio" name="mftab" id="mf-idx"><input type="radio" name="mftab" id="mf-stk"><div class="mf-tabs"><label for="mf-cash">Cash</label><label for="mf-idx">F&amp;O Index</label><label for="mf-stk">F&amp;O Stock</label></div><div class="mf-tw"><div class="mf-panel cash">${cashDaily(days)}${cashMonthly(days)}</div><div class="mf-panel idx">${fnoDaily(days, "idx")}${fnoMonthly(days, "idx")}</div><div class="mf-panel stk">${fnoDaily(days, "stk")}${fnoMonthly(days, "stk")}</div></div></div></div>`;
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
    ${regimeBanner(days)}
    ${heroCards(days)}
    ${readBlock}
    ${chartsBlock(days)}
    ${tablesBlock(days)}
    <div class="mf-note">${note}</div>
  </div>
  ${fiiDiiEducation()}`;
  return { bodyHtml, faqItems: fiiDiiFaqItems() };
}
