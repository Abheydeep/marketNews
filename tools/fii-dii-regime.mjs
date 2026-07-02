import { escapeHtml, longRatio, fnoNet, fmtNum } from "./fii-dii-format.mjs";

export function determineRegime(fii, dii, ratio) {
  const isFiiSelling = fii < 0, isFiiBuying = fii > 0, isDiiBuying = dii > 0, isDiiSelling = dii < 0;
  const absFii = Math.abs(fii) || 1;
  const absorption = (isFiiSelling && isDiiBuying) ? (dii / absFii) : 0;
  let cls = "neutral", label = "FII futures evenly split", regime = "Cash flows mixed";
  if (ratio != null) {
    if (ratio < 40) {
      cls = "bearish";
      label = "FII index futures mostly short";
      regime = isFiiSelling ? (absorption >= 0.8 ? "Foreign selling, domestic buying" : "Foreign selling exceeds domestic buying") : "Futures mostly short; cash mixed";
    } else if (ratio > 60) {
      cls = "bullish";
      label = "FII index futures mostly long";
      regime = isFiiBuying ? (isDiiSelling ? "Foreign buying, domestic selling" : "Both groups buying shares") : "Futures mostly long; cash mixed";
    }
  }
  const details = [label];
  if (isFiiSelling && isDiiBuying) details.push("DII buying offsets FII selling");
  else if (isFiiBuying && isDiiBuying) details.push("Both buying");
  details.push(regime);
  return { cls, text: details.join(" · ") };
}

export function getHistoricalExtremeMonths(days, currentRatio) {
  const fnoDays = days.filter((d) => d.fnoOi?.fii);
  if (fnoDays.length < 2 || currentRatio == null) return "";
  const isBearish = currentRatio < 50;
  let sessions = 0;
  for (let i = fnoDays.length - 2; i >= 0; i--) {
    const r = longRatio(fnoDays[i].fnoOi.fii, "idxFutLong", "idxFutShort");
    if (r == null) continue;
    if (isBearish ? r <= currentRatio : r >= currentRatio) break;
    sessions++;
  }
  const months = Math.round(sessions / 21);
  const lean = currentRatio <= 20 ? "Mostly short" : currentRatio < 40 ? "More short than long" : currentRatio <= 60 ? "Evenly split" : currentRatio <= 80 ? "More long than short" : "Mostly long";
  if (months >= 1) {
    return `<span class="${isBearish ? "neg" : "pos"}" style="font-weight:850">${lean} — lowest ${isBearish ? "long" : "short"} share in ${months} month${months > 1 ? "s" : ""}</span>`;
  }
  return `<span class="${isBearish ? "neg" : "pos"}" style="font-weight:850">${lean} positioning</span>`;
}

export function regimeBanner(days) {
  const lastCash = days.filter((d) => d.cash).at(-1);
  const lastFno = days.filter((d) => d.fnoOi?.fii).at(-1);
  const fii = Number(lastCash?.cash?.fiiNet ?? NaN);
  const dii = Number(lastCash?.cash?.diiNet ?? NaN);
  const ratio = lastFno ? longRatio(lastFno.fnoOi.fii, "idxFutLong", "idxFutShort") : null;
  const regime = determineRegime(fii, dii, ratio);
  return `<div class="mf-regime ${regime.cls}"><span class="mf-regime-dot"></span>${escapeHtml(regime.text)}</div>`;
}
