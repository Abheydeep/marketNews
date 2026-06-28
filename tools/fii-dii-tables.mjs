// Table builders for the FII/DII page: cash + F&O positioning, daily & monthly.
import { escapeHtml, fmtCr, fmtNum, signClass, fnoNet, longRatio, monthLabel, fmtLakh } from "./fii-dii-format.mjs";

const RECENT = 25;

function cell(c, label = "") {
  if (c == null || typeof c !== "object") return `<td data-lbl="${escapeHtml(label)}">${escapeHtml(c ?? "—")}</td>`;
  const val = c.isHtml ? c.v : escapeHtml(c.v);
  const styleAttr = c.style ? ` style="${c.style}"` : "";
  return `<td data-lbl="${escapeHtml(label)}" class="${c.cls || ""}" title="${escapeHtml(c.title || "")}"${styleAttr}>${val}</td>`;
}

function table({ caption, headers, rows, foot }) {
  const head = `<tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`;
  const body = rows.map((r) => {
    const cells = Array.isArray(r) ? r : r.cells;
    const trCls = (!Array.isArray(r) && r.cls) ? ` class="${r.cls}"` : "";
    const cellHtml = cells.map((c, idx) => cell(c, headers[idx] || "")).join("");
    return `<tr${trCls}>${cellHtml}</tr>`;
  }).join("");
  const tfoot = foot ? `<tfoot><tr>${foot.map((c, idx) => cell(c, headers[idx] || "")).join("")}</tr></tfoot>` : "";
  return `<div class="mf-tablewrap"><table class="mf-table"><caption>${escapeHtml(caption)}</caption>` +
    `<thead>${head}</thead><tbody>${body}</tbody>${tfoot}</table></div>`;
}

function barCell(v, colMax, fmt) {
  const text = fmt(v);
  const cls = signClass(v);
  if (colMax && Number.isFinite(v) && v !== 0) {
    const w = Math.min(100, Math.round((Math.abs(v) / colMax) * 100));
    const bar = `<div class="mf-bar-bg" style="width:${w}%;background:${v >= 0 ? "var(--up-fill)" : "var(--dn-fill)"}"></div>`;
    return { v: `${bar}<span>${escapeHtml(text)}</span>`, isHtml: true, cls };
  }
  return { v: text, cls };
}

function ratioCell(ratio) {
  if (ratio == null) return { v: "—", cls: "flat" };
  const factor = Math.min(1, Math.abs(ratio - 50) / 50);
  const bg = ratio < 50
    ? `rgba(215, 120, 132, ${(factor * 0.16).toFixed(3)})`
    : `rgba(79, 174, 131, ${(factor * 0.16).toFixed(3)})`;
  return { v: `<span>${ratio.toFixed(0)}%</span>`, isHtml: true, cls: ratio >= 50 ? "pos" : "neg", style: `background:${bg}` };
}

function lakhCell(v) {
  return (v == null || !Number.isFinite(Number(v))) ? { v: "—", cls: "flat" } : { v: fmtLakh(v), title: fmtNum(v) };
}

export function cashDaily(days) {
  const cashDays = days.filter((d) => d.cash);
  if (!cashDays.length) return `<p class="mf-note">Cash-market flow history is being captured and will populate here.</p>`;
  const recent = cashDays.slice(-RECENT);
  const activeDays = recent.filter(d => !(Number(d.cash?.fiiBuy || 0) === 0 && Number(d.cash?.diiBuy || 0) === 0));
  const maxFii = Math.max(...activeDays.map(d => Math.abs(Number(d.cash?.fiiNet || 0))), 1);
  const maxDii = Math.max(...activeDays.map(d => Math.abs(Number(d.cash?.diiNet || 0))), 1);
  const maxTotal = Math.max(...activeDays.map(d => Math.abs(Number(d.cash?.fiiNet || 0) + Number(d.cash?.diiNet || 0))), 1);

  const rows = recent.slice().reverse().map((d) => {
    const c = d.cash;
    if (Number(c.fiiBuy || 0) === 0 && Number(c.diiBuy || 0) === 0) {
      return {
        cls: "mf-row-missing",
        cells: [d.date, { v: "—", cls: "flat" }, { v: "—", cls: "flat" }, { v: "—", cls: "flat" }, { v: "—", cls: "flat" }, { v: "Holiday", cls: "flat" }]
      };
    }
    const fii = Number(c.fiiNet || 0), dii = Number(c.diiNet || 0), total = fii + dii;
    const abs = fii < 0 && dii > 0 ? `${Math.round((dii / Math.abs(fii)) * 100)}%` : "—";
    const niftyCell = d.niftyChangePercent != null ? { v: `${d.niftyChangePercent > 0 ? "+" : ""}${Number(d.niftyChangePercent).toFixed(2)}%`, cls: signClass(d.niftyChangePercent) } : { v: "—", cls: "flat" };
    return [d.date, barCell(fii, maxFii, fmtCr), barCell(dii, maxDii, fmtCr), barCell(total, maxTotal, fmtCr), { v: abs, cls: abs === "—" ? "flat" : "pos" }, niftyCell];
  });

  const sum = (k) => activeDays.reduce((a, d) => a + Number(d.cash?.[k] || 0), 0);
  const fiiN = sum("fiiNet"); const diiN = sum("diiNet");
  const foot = [
    { v: `Period total (${activeDays.length})` },
    barCell(fiiN, maxFii, fmtCr),
    barCell(diiN, maxDii, fmtCr),
    barCell(fiiN + diiN, maxTotal, fmtCr),
    { v: fiiN < 0 && diiN > 0 ? `${Math.round((diiN / Math.abs(fiiN)) * 100)}%` : "—", cls: "pos" },
    { v: "—" }
  ];
  return table({
    caption: "Cash flow · daily",
    headers: ["Date", "FII Net", "DII Net", "FII+DII Net", "Absorb %", "Nifty 50"],
    rows, foot
  });
}

export function cashMonthly(days) {
  const byMonth = new Map();
  for (const d of days) {
    if (!d.cash || (Number(d.cash.fiiBuy || 0) === 0 && Number(d.cash.diiBuy || 0) === 0)) continue;
    const key = monthLabel(d.date);
    if (!key) continue;
    const m = byMonth.get(key) || { key, fii: 0, dii: 0, n: 0 };
    m.fii += Number(d.cash.fiiNet || 0); m.dii += Number(d.cash.diiNet || 0); m.n += 1;
    byMonth.set(key, m);
  }
  const months = [...byMonth.values()];
  const maxFii = Math.max(...months.map(m => Math.abs(m.fii)), 1);
  const maxDii = Math.max(...months.map(m => Math.abs(m.dii)), 1);
  const maxTotal = Math.max(...months.map(m => Math.abs(m.fii + m.dii)), 1);

  const rows = months.reverse().map((m) => [
    m.key, { v: String(m.n) }, barCell(m.fii, maxFii, fmtCr), barCell(m.dii, maxDii, fmtCr), barCell(m.fii + m.dii, maxTotal, fmtCr)
  ]);
  return table({
    caption: "Cash flow · monthly",
    headers: ["Month", "Sessions", "FII Net", "DII Net", "FII+DII Net"], rows
  });
}

export function fnoDaily(days, scope) {
  const longK = scope === "idx" ? "idxFutLong" : "stkFutLong";
  const shortK = scope === "idx" ? "idxFutShort" : "stkFutShort";
  const have = days.filter((d) => d.fnoOi?.fii).slice(-RECENT);
  if (!have.length) return `<p class="mf-note">F&O positioning history is still being backfilled for this view.</p>`;
  const maxF = Math.max(...have.map(d => Math.abs(fnoNet(d.fnoOi?.fii, longK, shortK) || 0)), 1);
  const maxD = Math.max(...have.map(d => Math.abs(fnoNet(d.fnoOi?.dii, longK, shortK) || 0)), 1);

  const rows = have.reverse().map((d) => [
    d.date, lakhCell(d.fnoOi.fii[longK]), lakhCell(d.fnoOi.fii[shortK]),
    barCell(fnoNet(d.fnoOi.fii, longK, shortK), maxF, fmtNum),
    ratioCell(longRatio(d.fnoOi.fii, longK, shortK)),
    barCell(fnoNet(d.fnoOi.dii, longK, shortK), maxD, fmtNum)
  ]);
  return table({
    caption: `Futures · daily net (${scope === "idx" ? "index" : "stock"})`,
    headers: ["Date", "FII Long", "FII Short", "FII Net", "FII Long %", "DII Net"], rows
  });
}

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
  const months = [...byMonth.values()];
  const maxF = Math.max(...months.map(m => Math.abs(Math.round(m.fNet / m.n))), 1);
  const maxD = Math.max(...months.map(m => Math.abs(Math.round(m.dNet / m.n))), 1);

  const rows = months.reverse().map((m) => [
    m.key, { v: String(m.n) }, ratioCell(m.ratio / m.n),
    barCell(Math.round(m.fNet / m.n), maxF, fmtNum),
    barCell(Math.round(m.dNet / m.n), maxD, fmtNum)
  ]);
  return table({
    caption: `Futures · monthly average (${scope === "idx" ? "index" : "stock"})`,
    headers: ["Month", "Sessions", "FII Long %", "FII Net", "DII Net"], rows
  });
}
