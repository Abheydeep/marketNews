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
  
  const compText = Math.abs(fii) < Math.abs(avgSession) ? "below" : "above";
  out.push(`Institutional flow: FIIs were <b class="${signClass(fii)}">${side(fii)}</b> at ${escapeHtml(fmtCr(fii))} and DIIs were <b class="${signClass(dii)}">${side(dii)}</b> at ${escapeHtml(fmtCr(dii))} in the cash market. FII activity was ${compText} this month's daily average of ${escapeHtml(fmtCr(avgSession))}.`);

  if (fii < 0 && dii > 0) {
    const absorbed = Math.round((dii / Math.abs(fii)) * 100);
    out.push(`Domestic institutions bought an amount equal to about <b>${absorbed}%</b> of FII net selling that session. A reading above 100% means DII buying exceeded the foreign outflow that day; it does not guarantee index support.`);
  } else if (fii > 0 && dii < 0) {
    out.push(`DII net selling offset part of the FII cash-market inflow that session.`);
  }

  const fiiStreak = streak(cashDays, "fiiNet");
  if (fiiStreak >= 2) {
    out.push(`FIIs have been <b>${side(fii)}</b> for <b>${fiiStreak} sessions running</b>, so this is more than a one-day cash-flow move.`);
  }

  const fnoDay = days.filter((d) => d.fnoOi?.fii).at(-1);
  if (fnoDay) {
    const ratio = longRatio(fnoDay.fnoOi.fii, "idxFutLong", "idxFutShort");
    if (ratio != null) {
      const lean = ratio >= 55 ? "mostly long" : ratio <= 45 ? "mostly short" : "evenly split";
      out.push(`FII index-futures contracts are <b>${lean}</b>: about <b>${ratio.toFixed(0)}%</b> are long as of ${escapeHtml(fnoDay.date)}. Futures positions can change quickly, so use this as context rather than a forecast.`);
    }
  }

  const mtd = cashDays.slice(-22);
  const activeMtd = mtd.filter(d => !(Number(d.cash?.fiiBuy || 0) === 0 && Number(d.cash?.diiBuy || 0) === 0));
  const fiiMtd = activeMtd.reduce((a, d) => a + Number(d.cash.fiiNet || 0), 0);
  const diiMtd = activeMtd.reduce((a, d) => a + Number(d.cash.diiNet || 0), 0);
  out.push(`Across the last <b>${activeMtd.length}</b> active sessions, cumulative cash flow is <b class="${signClass(fiiMtd)}">${escapeHtml(fmtCr(fiiMtd))}</b> for FIIs and <b class="${signClass(diiMtd)}">${escapeHtml(fmtCr(diiMtd))}</b> for DIIs.`);
  return out;
}

export function fiiDiiEducation() {
  return `
    <section class="copy-stack">
      <h2>How to read FII and DII data the way a desk does</h2>
      <p>FII (foreign institutional investor) and DII (domestic institutional investor) flow shows whether foreign and domestic institutions bought or sold Indian shares on balance.</p>
      <h2>What the futures data adds</h2>
      <p>Cash flow shows what institutions did in shares during the previous session. Index-futures data separately shows how many FII contracts were long or short. It is useful context, but positions can change quickly and do not predict the next session.</p>
      <h2>How much DII buying covered</h2>
      <p>When FIIs sell and DIIs buy, the percentage compares DII net buying with FII net selling. If FIIs sell ₹2,000 crore and DIIs buy ₹3,000 crore, the reading is 150% because domestic buying was larger than the foreign outflow.</p>
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
