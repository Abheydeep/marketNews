// Table builders for the FII/DII page: cash + F&O positioning, daily & monthly.
import { escapeHtml, fmtCr, fmtNum, signClass, fnoNet, longRatio, monthLabel } from "./fii-dii-format.mjs";

const RECENT = 25;

function cell(c) {
  if (c == null || typeof c !== "object") return `<td>${escapeHtml(c ?? "—")}</td>`;
  return `<td class="${c.cls || ""}">${escapeHtml(c.v)}</td>`;
}

function table({ caption, headers, rows, foot }) {
  const head = `<tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`;
  const body = rows.map((r) => `<tr>${r.map(cell).join("")}</tr>`).join("");
  const tfoot = foot ? `<tfoot><tr>${foot.map(cell).join("")}</tr></tfoot>` : "";
  return `<div class="mf-tablewrap"><table class="mf-table"><caption>${escapeHtml(caption)}</caption>` +
    `<thead>${head}</thead><tbody>${body}</tbody>${tfoot}</table></div>`;
}

function crCell(v) { return { v: fmtCr(v), cls: signClass(v) }; }

/** Daily cash table, most-recent-first, with period totals. */
export function cashDaily(days) {
  const cashDays = days.filter((d) => d.cash);
  if (!cashDays.length) return `<p class="mf-note">Cash-market flow history is being captured and will populate here.</p>`;
  const recent = cashDays.slice(-RECENT);
  const rows = recent.slice().reverse().map((d) => {
    const c = d.cash;
    const total = Number(c.fiiNet || 0) + Number(c.diiNet || 0);
    return [d.date, fmtCr(c.fiiBuy), fmtCr(c.fiiSell), crCell(c.fiiNet),
      fmtCr(c.diiBuy), fmtCr(c.diiSell), crCell(c.diiNet), crCell(total)];
  });
  const sum = (k) => recent.reduce((a, d) => a + Number(d.cash?.[k] || 0), 0);
  const fiiN = sum("fiiNet"); const diiN = sum("diiNet");
  const foot = [{ v: `Period total (${recent.length})` }, "", "", crCell(fiiN), "", "", crCell(diiN), crCell(fiiN + diiN)];
  return table({
    caption: "Daily cash-market flow (₹ crore)",
    headers: ["Date", "FII Buy", "FII Sell", "FII Net", "DII Buy", "DII Sell", "DII Net", "FII+DII Net"],
    rows, foot
  });
}

/** Month-by-month cash aggregate. */
export function cashMonthly(days) {
  const byMonth = new Map();
  for (const d of days) {
    if (!d.cash) continue;
    const key = monthLabel(d.date);
    if (!key) continue;
    const m = byMonth.get(key) || { key, fii: 0, dii: 0, n: 0 };
    m.fii += Number(d.cash.fiiNet || 0); m.dii += Number(d.cash.diiNet || 0); m.n += 1;
    byMonth.set(key, m);
  }
  const rows = [...byMonth.values()].reverse().map((m) => [
    m.key, { v: String(m.n) }, crCell(m.fii), crCell(m.dii), crCell(m.fii + m.dii)
  ]);
  return table({
    caption: "Monthly cash-market net flow (₹ crore)",
    headers: ["Month", "Sessions", "FII Net", "DII Net", "FII+DII Net"], rows
  });
}

/** Daily F&O positioning for a scope ("idx" futures or "stk" futures). */
export function fnoDaily(days, scope) {
  const longK = scope === "idx" ? "idxFutLong" : "stkFutLong";
  const shortK = scope === "idx" ? "idxFutShort" : "stkFutShort";
  const have = days.filter((d) => d.fnoOi?.fii).slice(-RECENT).reverse();
  if (!have.length) return `<p class="mf-note">F&O positioning history is still being backfilled for this view.</p>`;
  const rows = have.map((d) => {
    const fii = d.fnoOi.fii; const dii = d.fnoOi.dii;
    const fNet = fnoNet(fii, longK, shortK);
    const dNet = fnoNet(dii, longK, shortK);
    const ratio = longRatio(fii, longK, shortK);
    return [d.date, fmtNum(fii[longK]), fmtNum(fii[shortK]),
      { v: fmtNum(fNet), cls: signClass(fNet) },
      { v: ratio == null ? "—" : `${ratio.toFixed(0)}%`, cls: ratio >= 50 ? "pos" : "neg" },
      { v: fmtNum(dNet), cls: signClass(dNet) }];
  });
  const label = scope === "idx" ? "index futures" : "stock futures";
  return table({
    caption: `Daily FII/DII ${label} positioning (net long contracts)`,
    headers: ["Date", "FII Long", "FII Short", "FII Net", "FII Long %", "DII Net"], rows
  });
}

/** Month-by-month F&O positioning summary (surfaces the deep history). */
export function fnoMonthly(days, scope) {
  const longK = scope === "idx" ? "idxFutLong" : "stkFutLong";
  const shortK = scope === "idx" ? "idxFutShort" : "stkFutShort";
  const byMonth = new Map();
  for (const d of days) {
    if (!d.fnoOi?.fii) continue;
    const key = monthLabel(d.date);
    if (!key) continue;
    const m = byMonth.get(key) || { key, ratio: 0, fNet: 0, dNet: 0, n: 0 };
    m.ratio += longRatio(d.fnoOi.fii, longK, shortK) || 0;
    m.fNet += fnoNet(d.fnoOi.fii, longK, shortK) || 0;
    m.dNet += fnoNet(d.fnoOi.dii, longK, shortK) || 0;
    m.n += 1;
    byMonth.set(key, m);
  }
  if (!byMonth.size) return "";
  const rows = [...byMonth.values()].reverse().map((m) => {
    const avgRatio = m.ratio / m.n;
    const avgF = Math.round(m.fNet / m.n);
    return [m.key, { v: String(m.n) },
      { v: `${avgRatio.toFixed(0)}%`, cls: avgRatio >= 50 ? "pos" : "neg" },
      { v: fmtNum(avgF), cls: signClass(avgF) },
      { v: fmtNum(Math.round(m.dNet / m.n)), cls: signClass(m.dNet) }];
  });
  const label = scope === "idx" ? "index futures" : "stock futures";
  return table({
    caption: `Monthly FII/DII ${label} positioning (session averages)`,
    headers: ["Month", "Sessions", "FII Long %", "FII Net", "DII Net"], rows
  });
}
