import { computeGiftNiftyBias } from "./core.mjs";
import { indicesStyles } from "./indices-styles.mjs";

export function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function formatChange(snap) {
  const chg = Number(snap.changePercent || 0);
  const sign = chg > 0 ? "+" : "";
  const pts = snap.closeValue - (snap.previousClose ?? snap.closeValue);
  const ptsStr = Number.isFinite(pts) ? `${pts > 0 ? "+" : ""}${pts.toFixed(1)} pts` : "";
  return `${sign}${chg.toFixed(2)}% ${ptsStr ? `(${ptsStr})` : ""}`;
}

function getHeatClass(pct) {
  if (pct > 1.5) return "idx-heat-bg-pos-3";
  if (pct > 0.5) return "idx-heat-bg-pos-2";
  if (pct > 0.05) return "idx-heat-bg-pos-1";
  if (pct < -1.5) return "idx-heat-bg-neg-3";
  if (pct < -0.5) return "idx-heat-bg-neg-2";
  if (pct < -0.05) return "idx-heat-bg-neg-1";
  return "";
}

export function indicesPageBody(digest) {
  const snapshots = digest.marketSnapshots || [];
  const bias = computeGiftNiftyBias(snapshots);
  const gift = snapshots.find(s => s.symbol === "GIFTNIFTY") || { closeValue: 24000, changePercent: 0, previousClose: 24000 };
  const vix = snapshots.find(s => s.symbol === "INDIAVIX") || { closeValue: 12 };
  
  const groups = [
    ["India Markets", ["NIFTY", "BANKNIFTY", "GIFTNIFTY", "INDIAVIX"]],
    ["US Overnight", ["SPX", "NDX", "DJI"]],
    ["Asia handoff", ["NIKKEI", "HSI", "SHCOMP", "KOSPI", "TAIEX", "STI", "ASX200"]],
    ["Macro Hedges", ["BRENT", "DXY", "USDINR", "GOLD"]]
  ];

  const cardsHtml = groups.map(([title, symbols]) => {
    const list = symbols.map(sym => snapshots.find(s => s.symbol === sym)).filter(Boolean);
    if (!list.length) return "";
    return `<section style="margin-bottom: 24px;">
      <h2 style="font-size:16px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;color:var(--cyan-idx);">${escapeHtml(title)}</h2>
      <div class="idx-grid">
        ${list.map(s => {
          const pct = Number(s.changePercent || 0);
          const cls = pct > 0.05 ? "idx-pos" : pct < -0.05 ? "idx-neg" : "idx-flat";
          const heatCls = getHeatClass(pct);
          const pts = JSON.stringify((s.chartPoints ?? []).map(p => Number(p.close)).filter(Number.isFinite));
          const displayVal = s.closeValue ? s.closeValue.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "N/A";
          return `<button class="idx-card ${heatCls}" id="btn-${s.symbol.toLowerCase()}" data-pts="${escapeHtml(pts)}" data-cls="${cls}" data-symbol="${s.symbol}" data-val="${displayVal}" data-name="${escapeHtml(s.name)}" data-change="${escapeHtml(formatChange(s))}">
            <div class="idx-card-top">
              <div><small>${s.symbol}</small><strong style="display:block;margin-top:2px;">${escapeHtml(s.name)}</strong></div>
              <strong class="idx-card-change ${cls}">${escapeHtml(pct > 0 ? "+" : "")}${pct.toFixed(2)}%</strong>
            </div>
            <div class="idx-card-bottom"><span>LTP: ${displayVal}</span><span>${s.dataQuality === "live" ? "● Live" : "Delayed"}</span></div>
          </button>`;
        }).join("")}
      </div>
    </section>`;
  }).join("");

  const vixPct = Math.min(100, Math.max(0, ((vix.closeValue - 10) / 25) * 100));

  return `${indicesStyles()}
    <div class="idx">
      <div class="idx-spotlight">
        <h3>GIFT Nifty Gap Analysis</h3>
        <div class="idx-spotlight-price">
          <strong>${gift.closeValue.toLocaleString("en-IN")}</strong>
          <span class="${Number(gift.changePercent || 0) >= 0 ? "idx-pos" : "idx-neg"}">${formatChange(gift)}</span>
        </div>
        <div class="idx-spotlight-meta">
          <div class="idx-meta-item"><span>Implied Open Gap</span><strong class="${bias ? (bias.gapPts >= 0 ? "idx-pos" : "idx-neg") : "idx-flat"}">${bias ? `${bias.gapPts > 0 ? "+" : ""}${bias.gapPts} pts (${bias.gapPct > 0 ? "+" : ""}${bias.gapPct}%)` : "Live Gap Unavailable"}</strong></div>
          <div class="idx-meta-item"><span>Gap Bias Strength</span><strong style="text-transform:uppercase;">${bias ? bias.bias.replace("_", " ") : "N/A"}</strong></div>
          <div class="idx-meta-item"><span>Actionable Route</span><a href="/indices/gift-nifty/" style="color:var(--cyan-idx);font-weight:800;text-decoration:none;">Detailed analysis &rarr;</a></div>
        </div>
      </div>
      <div class="idx-vix">
        <div class="idx-vix-head"><h3>Market Volatility (India VIX)</h3><strong>LTP: ${vix.closeValue.toFixed(2)}</strong></div>
        <div class="idx-vix-track"><div class="idx-vix-pin" style="left: ${vixPct}%;"></div></div>
        <div class="idx-vix-labels"><span>10 (CALM)</span><span>15 (CAUTION)</span><span>20 (STRESS)</span><span>35+ (PANIC)</span></div>
      </div>
      ${cardsHtml}
      <section style="margin-top:12px;">
        <h2 style="font-size:14px;text-transform:uppercase;color:var(--muted-idx);margin-bottom:12px;">Global Market Session Status</h2>
        <div class="idx-clocks" id="market-clocks"></div>
      </section>
    </div>`;
}

export function giftNiftyPageBody(digest, archiveDigests = []) {
  const snapshots = digest.marketSnapshots || [];
  const bias = computeGiftNiftyBias(snapshots);
  const gift = snapshots.find(s => s.symbol === "GIFTNIFTY") || { closeValue: 24000, changePercent: 0, previousClose: 24000 };
  const nifty = snapshots.find(s => s.symbol === "NIFTY") || { closeValue: 24000 };

  const historyRows = archiveDigests.slice(0, 15).map(d => {
    const dBias = computeGiftNiftyBias(d.marketSnapshots || []);
    if (!dBias) return "";
    return `<tr>
      <td>${escapeHtml(d.digestDate)}</td>
      <td>${dBias.giftPrice.toLocaleString("en-IN")}</td>
      <td>${dBias.niftyClose.toLocaleString("en-IN")}</td>
      <td class="${dBias.gapPts >= 0 ? "idx-pos" : "idx-neg"}">${dBias.gapPts > 0 ? "+" : ""}${dBias.gapPts} pts</td>
      <td style="text-transform:uppercase;">${dBias.bias.replace("_", " ")}</td>
    </tr>`;
  }).filter(Boolean).join("");

  return `${indicesStyles()}
    <div class="idx">
      <div class="idx-spotlight">
        <h3>GIFT Nifty Gap Calculator</h3>
        <div class="idx-calc">
          <div class="idx-calc-row"><span>GIFT Nifty LTP</span><strong class="idx-calc-val">${gift.closeValue.toLocaleString("en-IN")}</strong></div>
          <div class="idx-calc-row"><span>Previous Nifty 50 Close</span><strong class="idx-calc-val">${nifty.closeValue.toLocaleString("en-IN")}</strong></div>
          <div class="idx-calc-row" style="border-top:1px solid var(--line-idx);padding-top:14px;margin-top:10px;">
            <span>Implied Open Gap</span>
            <strong class="idx-calc-val ${bias ? (bias.gapPts >= 0 ? "idx-pos" : "idx-neg") : "idx-flat"}" style="font-size:18px;">${bias ? `${bias.gapPts > 0 ? "+" : ""}${bias.gapPts} pts (${bias.gapPct > 0 ? "+" : ""}${bias.gapPct}%)` : "Live Gap Unavailable"}</strong>
          </div>
          <div class="idx-calc-row"><span>Gap Bias Strength</span><strong class="idx-calc-val" style="text-transform:uppercase;color:var(--cyan-idx);">${bias ? bias.bias.replace("_", " ") : "N/A"}</strong></div>
        </div>
      </div>
      <div class="idx-vix" style="text-align:center;">
        <h3 style="margin:0 0 6px;font-size:12px;color:var(--muted-idx);text-transform:uppercase;">NSE Cash Market Open</h3>
        <div id="nse-countdown" style="font-size:28px;font-weight:900;letter-spacing:-0.02em;">--:--:--</div>
        <span id="nse-countdown-status" style="font-size:11px;color:var(--cyan-idx);font-weight:800;text-transform:uppercase;display:block;margin-top:4px;">Checking Session Status</span>
      </div>
      <section style="margin-top:12px;">
        <h2 style="font-size:16px;text-transform:uppercase;color:var(--muted-idx);margin-bottom:12px;">GIFT Nifty Open Gap Logs (Last 15 Sessions)</h2>
        <div class="idx-table-wrap">
          <table class="idx-table">
            <thead>
              <tr><th>Date</th><th>GIFT Nifty at 7:15 AM</th><th>Prev Nifty Close</th><th>Gap Implied</th><th>Bias Result</th></tr>
            </thead>
            <tbody>${historyRows || '<tr><td colspan="5" style="text-align:center;color:var(--muted-idx)">No gap history available</td></tr>'}</tbody>
          </table>
        </div>
      </section>
      <section style="margin-top:20px;">
        <h2 style="font-size:16px;text-transform:uppercase;color:var(--muted-idx);margin-bottom:12px;">Frequently Asked Questions</h2>
        <details class="idx-vix" style="margin-bottom:8px;cursor:pointer;"><summary style="font-weight:800;font-size:14px;outline:none;">What is GIFT Nifty?</summary><p style="color:var(--muted-idx);font-size:13px;line-height:1.6;margin:8px 0 0;">GIFT Nifty is a US Dollar-denominated index futures contract traded on the NSE International Exchange (NSE IX) at GIFT City, Gujarat.</p></details>
        <details class="idx-vix" style="margin-bottom:8px;cursor:pointer;"><summary style="font-weight:800;font-size:14px;outline:none;">How does it predict Nifty open?</summary><p style="color:var(--muted-idx);font-size:13px;line-height:1.6;margin:8px 0 0;">The difference between GIFT Nifty's current price and the Nifty 50's previous close indicates the likely gap open.</p></details>
      </section>
    </div>`;
}
