// Pure inline-SVG chart builders for the FII/DII page (no client JS).
import { escapeHtml, fmtCr } from "./fii-dii-format.mjs";

const W = 640;
const H = 230;
const PAD = { t: 16, r: 14, b: 26, l: 14 };

function frame(inner) {
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img">${inner}</svg>`;
}

function niceMax(value) {
  const v = Math.max(Math.abs(value), 1);
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / mag) * mag;
}

/**
 * Diverging grouped columns: FII and DII net around a zero baseline.
 * @param {Array<{label:string, fii:number, dii:number}>} days ascending
 */
export function divergingBars(days) {
  if (!days.length) return "";
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const zero = PAD.t + plotH / 2;
  const max = niceMax(Math.max(...days.flatMap((d) => [Math.abs(d.fii || 0), Math.abs(d.dii || 0)])));
  const slot = plotW / days.length;
  const bw = Math.max(2, Math.min(10, slot / 2.6));
  const scale = (v) => (v / max) * (plotH / 2);
  const bars = days.map((d, i) => {
    const cx = PAD.l + slot * (i + 0.5);
    const col = (v, off, color) => {
      const h = Math.abs(scale(v));
      const y = v >= 0 ? zero - h : zero;
      return `<rect x="${(cx + off).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, 0.6).toFixed(1)}" rx="1.5" fill="${color}" opacity="${v >= 0 ? 0.95 : 0.85}"></rect>`;
    };
    return col(d.fii || 0, -bw - 0.5, "#22d3ee") + col(d.dii || 0, 0.5, "#a78bfa");
  }).join("");
  const axis = `<line x1="${PAD.l}" y1="${zero}" x2="${W - PAD.r}" y2="${zero}" stroke="rgba(255,255,255,.22)" stroke-width="1"></line>`;
  const cap = `<text x="${PAD.l}" y="${PAD.t - 4}" fill="#64748b" font-size="10">+${(max / 1000).toFixed(max >= 1000 ? 0 : 1)}k Cr</text>`;
  return frame(axis + bars + cap);
}

/**
 * Multi-line chart over an index axis.
 * @param {Array<{name:string,color:string,values:Array<number|null>}>} series
 * @param {string[]} labels x labels (sparse-rendered)
 * @param {(v:number)=>string} fmt y formatter for the top label
 */
export function lineChart(series, labels, fmt = (v) => String(Math.round(v))) {
  const flat = series.flatMap((s) => s.values.filter((v) => v != null));
  if (!flat.length) return "";
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const min = Math.min(...flat);
  const max = Math.max(...flat);
  const span = max - min || 1;
  const n = labels.length;
  const x = (i) => PAD.l + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v) => PAD.t + plotH - ((v - min) / span) * plotH;
  const grid = [0, 0.5, 1].map((f) => {
    const gy = PAD.t + plotH * f;
    return `<line x1="${PAD.l}" y1="${gy.toFixed(1)}" x2="${W - PAD.r}" y2="${gy.toFixed(1)}" stroke="rgba(255,255,255,.08)"></line>`;
  }).join("");
  const zeroLine = min < 0 && max > 0
    ? `<line x1="${PAD.l}" y1="${y(0).toFixed(1)}" x2="${W - PAD.r}" y2="${y(0).toFixed(1)}" stroke="rgba(255,255,255,.28)" stroke-dasharray="3 3"></line>`
    : "";
  const paths = series.map((s) => {
    let d = "";
    s.values.forEach((v, i) => {
      if (v == null) return;
      d += `${d ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
    });
    const last = s.values.map((v, i) => [v, i]).filter(([v]) => v != null).pop();
    const dot = last ? `<circle cx="${x(last[1]).toFixed(1)}" cy="${y(last[0]).toFixed(1)}" r="3" fill="${s.color}"></circle>` : "";
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"></path>${dot}`;
  }).join("");
  const top = `<text x="${PAD.l}" y="${PAD.t - 4}" fill="#64748b" font-size="10">${escapeHtml(fmt(max))}</text>`;
  const bot = `<text x="${PAD.l}" y="${(PAD.t + plotH + 16).toFixed(0)}" fill="#64748b" font-size="10">${escapeHtml(labels[0] || "")}</text>` +
    `<text x="${W - PAD.r}" y="${(PAD.t + plotH + 16).toFixed(0)}" fill="#64748b" font-size="10" text-anchor="end">${escapeHtml(labels[n - 1] || "")}</text>`;
  return frame(grid + zeroLine + paths + top + bot);
}

/** Wrap a chart SVG with a titled card and legend. */
export function chartCard(title, sub, svg, legend = []) {
  if (!svg) return "";
  // Give the inline chart an accessible name so screen readers announce the
  // chart's meaning instead of treating it as an unlabelled image.
  const labelled = svg.replace('role="img"', `role="img" aria-label="${escapeHtml(`${title} — ${sub}`)}"`);
  svg = labelled;
  const leg = legend.length
    ? `<div class="mf-legend">${legend.map((l) => `<span><i style="background:${l.color}"></i>${escapeHtml(l.name)}</span>`).join("")}</div>`
    : "";
  return `<div class="mf-chart"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(sub)}</p>${svg}${leg}</div>`;
}

export { fmtCr };
