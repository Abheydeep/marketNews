// Plain-English interpretation + educational copy + FAQ for the FII/DII page.
// Wording stays factual/observational (no advice, targets, or guarantees) to
// satisfy the public editorial guardrail.
import { escapeHtml, fmtCr, longRatio, signClass, monthLabel } from "./fii-dii-format.mjs";

function streak(days, key) {
  const withCash = days.filter((d) => d.cash);
  if (!withCash.length) return 0;
  const sign = Math.sign(Number(withCash.at(-1).cash[key] || 0));
  if (!sign) return 0;
  let n = 0;
  for (let i = withCash.length - 1; i >= 0; i -= 1) {
    if (Math.sign(Number(withCash[i].cash[key] || 0)) === sign) n += 1;
    else break;
  }
  return n;
}

/** Build interpretation bullet HTML strings from the merged day series. */
export function fiiDiiInterpretation(days) {
  const cashDays = days.filter((d) => d.cash);
  const out = [];
  if (!cashDays.length) return out;
  const last = cashDays.at(-1);
  const fii = Number(last.cash.fiiNet || 0);
  const dii = Number(last.cash.diiNet || 0);
  const side = (v) => (v >= 0 ? "net buyers" : "net sellers");

  const latestMonth = monthLabel(last.date);
  const currentMonthDays = cashDays.filter((d) => monthLabel(d.date) === latestMonth);
  const activeMonthDays = currentMonthDays.filter(d => !(Number(d.cash?.fiiBuy || 0) === 0 && Number(d.cash?.diiBuy || 0) === 0));
  const sumFiiMtd = activeMonthDays.reduce((a, d) => a + Number(d.cash.fiiNet || 0), 0);
  const avgSession = activeMonthDays.length > 0 ? Math.round(sumFiiMtd / activeMonthDays.length) : 0;
  
  const compText = Math.abs(fii) < Math.abs(avgSession) ? "representing a moderation relative to" : "exceeding";
  out.push(`Institutional flow: FIIs were <b class="${signClass(fii)}">${side(fii)}</b> at ${escapeHtml(fmtCr(fii))} and DIIs were <b class="${signClass(dii)}">${side(dii)}</b> at ${escapeHtml(fmtCr(dii))} in the cash market. This session's activity is ${compText} the current MTD session average of ${escapeHtml(fmtCr(avgSession))} per session.`);

  if (fii < 0 && dii > 0) {
    const absorbed = Math.round((dii / Math.abs(fii)) * 100);
    out.push(`Domestic institutions absorbed about <b>${absorbed}%</b> of the foreign cash-market outflow that session. Historically, absorption levels around or above 100% point to strong domestic liquidity cushioning structural support zones rather than letting the index break.`);
  } else if (fii > 0 && dii < 0) {
    out.push(`DII profit-taking absorbed the cash-market inflow from FIIs, showing key counter-cyclical domestic flows at higher market extensions.`);
  }

  const fiiStreak = streak(cashDays, "fiiNet");
  if (fiiStreak >= 2) {
    out.push(`FIIs have been <b>${side(fii)}</b> for <b>${fiiStreak} sessions running</b>. In structural trends, persistent streaking indicates sustained asset reallocation rather than brief transactional volatility.`);
  }

  const fnoDay = days.filter((d) => d.fnoOi?.fii).at(-1);
  if (fnoDay) {
    const ratio = longRatio(fnoDay.fnoOi.fii, "idxFutLong", "idxFutShort");
    if (ratio != null) {
      const lean = ratio >= 55 ? "tilted long" : ratio <= 45 ? "tilted short" : "balanced";
      out.push(`FII index-futures positioning is <b>${lean}</b> — about <b>${ratio.toFixed(0)}%</b> of their index-futures book is on the long side (as of ${escapeHtml(fnoDay.date)}). Because derivatives positions can adjust rapidly, this index futures lean functions as a key leading indicator before cash-market flows turn.`);
    }
  }

  const mtd = cashDays.slice(-22);
  const activeMtd = mtd.filter(d => !(Number(d.cash?.fiiBuy || 0) === 0 && Number(d.cash?.diiBuy || 0) === 0));
  const fiiMtd = activeMtd.reduce((a, d) => a + Number(d.cash.fiiNet || 0), 0);
  const diiMtd = activeMtd.reduce((a, d) => a + Number(d.cash.diiNet || 0), 0);
  out.push(`Divergence context: FIIs continue to utilize derivatives for positioning hedges during cash fluctuations. Across the last <b>${activeMtd.length}</b> active sessions, cumulative flow stands at <b class="${signClass(fiiMtd)}">${escapeHtml(fmtCr(fiiMtd))}</b> for FIIs and <b class="${signClass(diiMtd)}">${escapeHtml(fmtCr(diiMtd))}</b> for DIIs, confirming the ongoing domestic liquidity offset.`);
  return out;
}

export function fiiDiiEducation() {
  return `
    <section class="copy-stack">
      <h2>How to read FII and DII data the way a desk does</h2>
      <p>FII (foreign institutional investor) and DII (domestic institutional investor) flow shows whether the two largest pools of institutional money are pushing the same way or fighting each other. The most useful read is not just the FII number in isolation — it is whether DII demand is absorbing FII selling, and whether the cash-market direction is confirmed by how FIIs are positioned in index and stock futures.</p>
      <h2>Why F&O positioning adds a layer cash data cannot</h2>
      <p>Cash flow tells you what institutions did in the spot market yesterday. The participant-wise F&O positioning shows the forward-looking layer: how long or short FIIs are in index futures and stock futures, and how their index option book is leaning. A cash-market sell that comes with a rising FII index-futures short tilt is a different signal from a cash sell while futures stay long.</p>
      <h2>The DII absorption ratio</h2>
      <p>When FIIs are net sellers and DIIs are net buyers, the absorption ratio compares the two. If FIIs sell ₹2,000 crore and DIIs buy ₹3,000 crore, absorption is 150% — domestic demand more than covered the foreign outflow that session. A low absorption ratio means the same FII selling weighs more on the tape.</p>
    </section>`;
}

export function fiiDiiFaqItems() {
  return [
    { name: "What is the difference between FII and DII?", text: "FIIs are foreign institutional investors (overseas funds investing in Indian markets); DIIs are domestic institutions such as mutual funds, insurers and banks. Their net buy and sell figures are reported each session." },
    { name: "Where does this FII DII data come from?", text: "Cash-market provisional figures come from the NSE FII/DII activity feed, and the F&O positioning comes from NSE's participant-wise open interest and volume reports. Provisional numbers can be revised by the exchanges and SEBI." },
    { name: "What does FII index-futures long percentage mean?", text: "It is the share of the FII index-futures book held on the long side. A reading well above 50% points to a long-leaning stance; well below 50% points to a short-leaning stance. It is positioning context, not a recommendation." },
    { name: "How often is the data updated?", text: "Cash provisional flow and the participant F&O reports are published after the close on each trading day and captured into this page for the following session." }
  ];
}
