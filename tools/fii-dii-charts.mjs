// Pure inline-SVG chart builders for the FII/DII page (no client JS).
import { escapeHtml, fmtCr } from "./fii-dii-format.mjs";

function frame(inner, w, h) {
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img">${inner}</svg>`;
}

function niceMax(value) {
  const v = Math.max(Math.abs(value), 1);
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / mag) * mag;
}

export function divergingBars(days) {
  if (!days.length) return "";
  const w = 960, h = 340, pad = { t: 26, r: 75, b: 30, l: 75 };
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
  const zero = pad.t + plotH / 2;
  
  const flows = days.flatMap((d) => [Math.abs(d.fii || 0), Math.abs(d.dii || 0)]);
  flows.sort((a, b) => a - b);
  const p90Idx = Math.floor(flows.length * 0.9);
  const p90Val = flows[p90Idx] || 2000;
  const max = niceMax(p90Val * 1.15);

  const slot = plotW / days.length;
  const bw = Math.max(4, Math.min(18, slot / 2.6));
  const scale = (v) => (v / max) * (plotH / 2);
  
  const bars = days.map((d, i) => {
    const cx = pad.l + slot * (i + 0.5);
    const col = (v, off) => {
      const isClipped = Math.abs(v) > max;
      const displayV = isClipped ? Math.sign(v) * max : v;
      const ch = Math.abs(scale(displayV));
      const cy = displayV >= 0 ? zero - ch : zero;
      const color = v >= 0 ? "var(--up-fill)" : "var(--dn-fill)";
      const title = `<title>${escapeHtml(d.label)}: ${escapeHtml(fmtCr(v))}</title>`;
      const rect = `<rect x="${(cx + off).toFixed(1)}" y="${cy.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(ch, 0.6).toFixed(1)}" rx="1.5" fill="${color}" opacity="${v >= 0 ? 0.95 : 0.85}">${title}</rect>`;
      if (isClipped) {
        const dotY = v >= 0 ? cy - 4 : cy + ch + 12;
        const arrow = v >= 0 ? "▲" : "▼";
        return rect + `<text x="${(cx + off + bw/2).toFixed(1)}" y="${dotY.toFixed(1)}" fill="var(--accent)" font-size="11" font-weight="900" text-anchor="middle">${arrow}</text>`;
      }
      return rect;
    };
    return col(d.fii || 0, -bw - 0.5) + col(d.dii || 0, 0.5);
  }).join("");

  let niftyOverlay = "";
  const niftyCloses = days.map((d) => d.niftyClose).filter((v) => v != null);
  if (niftyCloses.length > 1) {
    const minNifty = Math.min(...niftyCloses), maxNifty = Math.max(...niftyCloses);
    const niftySpan = maxNifty - minNifty || 1;
    const chartYRange = plotH * 0.7, chartYOffset = pad.t + plotH * 0.15;
    const points = days.map((d, i) => {
      if (d.niftyClose == null) return null;
      const cx = pad.l + slot * (i + 0.5);
      const cy = chartYOffset + chartYRange - ((d.niftyClose - minNifty) / niftySpan) * chartYRange;
      return `${cx.toFixed(1)},${cy.toFixed(1)}`;
    }).filter(Boolean);
    if (points.length > 1) {
      niftyOverlay = `<line x1="${w - pad.r}" y1="${pad.t}" x2="${w - pad.r}" y2="${h - pad.b}" stroke="rgba(255,255,255,.12)"></line>` +
        `<text x="${w - pad.r + 6}" y="${(chartYOffset + 4).toFixed(0)}" fill="#d4a847" font-size="11" font-weight="800">${Math.round(maxNifty)}</text>` +
        `<text x="${w - pad.r + 6}" y="${(chartYOffset + chartYRange + 4).toFixed(0)}" fill="#d4a847" font-size="11" font-weight="800">${Math.round(minNifty)}</text>` +
        `<path d="M${points.join(" L")}" fill="none" stroke="#d4a847" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.95"></path>`;
    }
  }

  const axis = `<line x1="${pad.l}" y1="${zero}" x2="${w - pad.r}" y2="${zero}" stroke="rgba(255,255,255,.22)"></line>`;
  const cap = `<text x="${pad.l - 6}" y="${pad.t + 4}" fill="#64748b" font-size="11" font-weight="800" text-anchor="end">+${(max / 1000).toFixed(0)}k Cr</text>`;
  const capNeg = `<text x="${pad.l - 6}" y="${h - pad.b}" fill="#64748b" font-size="11" font-weight="800" text-anchor="end">-${(max / 1000).toFixed(0)}k Cr</text>`;
  return frame(axis + bars + niftyOverlay + cap + capNeg, w, h);
}

export function lineChart(series, labels, fmt = (v) => String(Math.round(v))) {
  const flat = series.flatMap((s) => s.values.filter((v) => v != null));
  if (!flat.length) return "";
  const w = 480, h = 300, pad = { t: 20, r: 24, b: 30, l: 24 };
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
  const isPercent = series[0]?.name.toLowerCase().includes("long");
  
  const min = isPercent ? 0 : Math.min(...flat);
  const max = isPercent ? 100 : Math.max(...flat);
  const span = max - min || 1;
  const n = labels.length;
  
  const x = (i) => pad.l + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v) => pad.t + plotH - ((v - min) / span) * plotH;
  
  let decor = "";
  if (isPercent) {
    decor += `<rect x="${pad.l}" y="${y(100).toFixed(1)}" width="${plotW}" height="${(y(60) - y(100)).toFixed(1)}" fill="var(--up-bg)"></rect>`;
    decor += `<rect x="${pad.l}" y="${y(40).toFixed(1)}" width="${plotW}" height="${(y(0) - y(40)).toFixed(1)}" fill="var(--dn-bg)"></rect>`;
    decor += `<line x1="${pad.l}" y1="${y(50).toFixed(1)}" x2="${w - pad.r}" y2="${y(50).toFixed(1)}" stroke="rgba(255,255,255,.2)" stroke-dasharray="4 4"></line>`;
    decor += `<text x="${pad.l + 6}" y="${(y(50) - 4).toFixed(1)}" fill="var(--flat)" font-size="11" font-weight="900" opacity="0.6">50% NEUTRAL</text>`;
  }

  const grid = [0, 0.5, 1].map((f) => {
    const gy = pad.t + plotH * f;
    return `<line x1="${pad.l}" y1="${gy.toFixed(1)}" x2="${w - pad.r}" y2="${gy.toFixed(1)}" stroke="rgba(255,255,255,.08)"></line>`;
  }).join("");

  const zeroLine = !isPercent && min < 0 && max > 0
    ? `<line x1="${pad.l}" y1="${y(0).toFixed(1)}" x2="${w - pad.r}" y2="${y(0).toFixed(1)}" stroke="rgba(255,255,255,.28)" stroke-dasharray="3 3"></line>`
    : "";

  const paths = series.map((s) => {
    let d = "";
    s.values.forEach((v, i) => {
      if (v == null) return;
      d += `${d ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
    });
    const last = s.values.map((v, i) => [v, i]).filter(([v]) => v != null).pop();
    let dot = "";
    if (last) {
      dot = `<circle cx="${x(last[1]).toFixed(1)}" cy="${y(last[0]).toFixed(1)}" r="${isPercent ? 4.5 : 3}" fill="${s.color}"></circle>`;
      if (isPercent) {
        const tx = x(last[1]) - 135;
        const ty = y(last[0]) - 20;
        const colorCls = last[0] >= 50 ? "var(--up-fill)" : "var(--dn-fill)";
        dot += `<rect x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" width="130" height="17" rx="3" fill="${colorCls}" opacity="0.95"></rect>` +
               `<text x="${(tx + 6).toFixed(1)}" y="${(ty + 12).toFixed(1)}" fill="#fff" font-size="11" font-weight="900">Now: ${last[0].toFixed(0)}% → ${(100 - last[0]).toFixed(0)}% short</text>`;
      }
    }
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"></path>${dot}`;
  }).join("");

  const top = `<text x="${pad.l}" y="${pad.t - 4}" fill="#64748b" font-size="11" font-weight="800">${escapeHtml(fmt(max))}</text>`;
  const bot = `<text x="${pad.l}" y="${(pad.t + plotH + 16).toFixed(0)}" fill="#64748b" font-size="11" font-weight="800">${escapeHtml(labels[0] || "")}</text>` +
    `<text x="${w - pad.r}" y="${(pad.t + plotH + 16).toFixed(0)}" fill="#64748b" font-size="11" font-weight="800" text-anchor="end">${escapeHtml(labels[n - 1] || "")}</text>`;
  return frame(decor + grid + zeroLine + paths + top + bot, w, h);
}

export function chartCard(title, sub, svg, legend = [], wide = false) {
  if (!svg) return "";
  const labelled = svg.replace('role="img"', `role="img" aria-label="${escapeHtml(`${title} — ${sub}`)}"`);
  const leg = legend.length
    ? `<div class="mf-legend">${legend.map((l) => `<span><i style="background:${l.color}"></i>${escapeHtml(l.name)}</span>`).join("")}</div>`
    : "";
  return `<div class="mf-chart${wide ? " mf-chart--wide" : ""}"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(sub)}</p>${labelled}${leg}</div>`;
}

export { fmtCr };
