import { computeGiftNiftyBias } from "./core.mjs";
import { indicesStyles } from "./indices-styles.mjs";
import { escapeHtml } from "./html-utils.mjs";
import { liveStatusBadgeHtml } from "./live-status-badge.mjs";

function formatChange(snap) {
  const chg = Number(snap.changePercent || 0);
  const sign = chg > 0 ? "+" : "";
  const pts = snap.closeValue - (snap.previousClose ?? snap.closeValue);
  const ptsStr = Number.isFinite(pts) ? `${pts > 0 ? "+" : ""}${pts.toFixed(1)} pts` : "";
  return `${sign}${chg.toFixed(2)}% ${ptsStr ? `(${ptsStr})` : ""}`;
}

const DESCRIPTIONS = {
  NIFTY: "Nifty 50: India's benchmark index of large-cap companies. Reflects baseline domestic institutional flow.",
  BANKNIFTY: "Bank Nifty: High-beta driver of cash market sentiment. Highly sensitive to credit cycles and FII flows.",
  GIFTNIFTY: "GIFT Nifty: Active offshore USD-denominated contracts. Implies domestic open bias before local pre-market trading starts.",
  INDIAVIX: "India VIX: Fear gauge representing expected 30-day volatility. VIX spikes signal hedging demand.",
  SPX: "S&P 500: Primary gauge of US equity health. Influences overnight sentiment across global emerging market desks.",
  NDX: "Nasdaq 100: Tech heavy US benchmark. Drives sentiment across Indian IT service exporters.",
  DJI: "Dow Jones: US blue-chip benchmark index reflecting traditional industrial sector health.",
  NIKKEI: "Nikkei 225: Japan's headline index. Shapes early morning Asian willingness to take risk and liquidity transfer.",
  HSI: "Hang Seng: Hong Kong's index. Correlates with FII flows in emerging markets and global tech cues.",
  BRENT: "Brent Crude: Global benchmark for oil prices. Spikes above $85 represent direct inflationary risks for India.",
  DXY: "US Dollar Index: Measures USD strength. Stronger DXY pressure triggers FII capital outflows from India.",
  USDINR: "USD/INR Spot rate: Spot value of Indian Rupee. Depreciations indicate direct FX pressure on domestic import costs.",
  GOLD: "Comex Gold: Safe-haven asset class. Gold rallies highlight defensive rotations across global desks."
};

function getSymbolDescription(symbol, name) {
  return DESCRIPTIONS[symbol] || `${name} acts as global reference point for Indian pre-market desks.`;
}
export function buildSparklinePath(points, cls) {
  const closes = (points || []).map(p => typeof p === "object" ? Number(p.close) : Number(p)).filter(Number.isFinite);
  if (closes.length < 2) return `<line x1="0" y1="18" x2="100" y2="18" stroke="var(--line-idx)" stroke-width="1.5" />`;
  const min = Math.min(...closes), max = Math.max(...closes), range = max - min || 1e-9;
  const pathPoints = closes.map((val, i) => `${((i / (closes.length - 1)) * 100).toFixed(1)},${(34 - ((val - min) / range) * 30).toFixed(1)}`);
  const strokeColor = cls === "idx-pos" ? "var(--up-idx)" : cls === "idx-neg" ? "var(--down-idx)" : "var(--flat-idx)";
  return `<path d="M ${pathPoints.join(" L ")} L 100,36 L 0,36 Z" fill="${strokeColor}" opacity="0.05" /><path d="M ${pathPoints.join(" L ")}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />`;
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
  const gift = snapshots.find(s => s.symbol === "GIFTNIFTY");
  const giftMissing = !gift || gift.dataQuality === "seed";
  const giftSnap = gift || { closeValue: 0, changePercent: 0, previousClose: 0 };
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
          let cardPoints = s.chartPoints || [];
          if (s.symbol === "GIFTNIFTY" && cardPoints.length < 2) {
            const niftyRef = snapshots.find(n => n.symbol === "NIFTY");
            if (niftyRef) cardPoints = niftyRef.chartPoints || [];
          }
          const pts = JSON.stringify(cardPoints.map(p => Number(p.close)).filter(Number.isFinite));
          const displayVal = s.closeValue ? s.closeValue.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "N/A";
          return `<button type="button" class="idx-card ${heatCls}" id="btn-${s.symbol.toLowerCase()}" data-live="${s.symbol}" data-pts="${escapeHtml(pts)}" data-cls="${cls}" data-symbol="${s.symbol}" data-val="${displayVal}" data-name="${escapeHtml(s.name)}" data-change="${escapeHtml(formatChange(s))}" data-ctx="${escapeHtml(getSymbolDescription(s.symbol, s.name))}">
            <div class="idx-card-top">
              <div><small>${s.symbol}</small><strong style="display:block;margin-top:2px;">${escapeHtml(s.name)}</strong></div>
              <strong class="idx-card-change ${cls}" data-field="pct">${escapeHtml(pct > 0 ? "+" : "")}${pct.toFixed(2)}%</strong>
            </div>
            <div class="idx-spark-wrap" style="height:36px;margin:10px 0;width:100%;">
              <svg class="idx-card-spark" viewBox="0 0 100 36" style="width:100%;height:36px;display:block;" data-field="spark" data-pts="${escapeHtml(pts)}" data-cls="${cls}">
                ${buildSparklinePath(cardPoints, s.symbol === "GIFTNIFTY" ? "idx-flat" : cls)}
              </svg>
            </div>
            <div class="idx-card-bottom"><span data-field="ltp">LTP: ${displayVal}</span><span data-field="quality">Snapshot</span></div>
          </button>`;
        }).join("")}
      </div>
    </section>`;
  }).join("");

  const vixPct = Math.min(100, Math.max(0, ((vix.closeValue - 10) / 25) * 100));
  const niftyPrevClose = (snapshots.find(s => s.symbol === "NIFTY") || {}).previousClose || (snapshots.find(s => s.symbol === "NIFTY") || {}).closeValue || 0;

  return `${indicesStyles()}
    <div class="idx" data-nifty-close="${niftyPrevClose}">
      ${liveStatusBadgeHtml({ id: "idx-live-badge", text: `Delayed · Briefing snapshot · ${snapshotTimestamp(digest)}`, extraClass: "idx-live-badge" })}
      <div class="idx-spotlight" data-live="GIFTNIFTY">
        <h3>GIFT Nifty Gap Analysis</h3>
        <div class="idx-spotlight-price">
          <strong data-field="ltp">${giftMissing ? "—" : giftSnap.closeValue.toLocaleString("en-IN")}</strong>
          <span class="${Number(giftSnap.changePercent || 0) >= 0 ? "idx-pos" : "idx-neg"}" data-field="pct">${giftMissing ? "Awaiting live data" : formatChange(giftSnap)}</span>
        </div>
        <div class="idx-spotlight-meta">
          <div class="idx-meta-item"><span>Implied Open Gap</span><strong class="${bias ? (bias.gapPts >= 0 ? "idx-pos" : "idx-neg") : "idx-flat"}" data-field="gap">${(bias && !giftMissing) ? `${bias.gapPts > 0 ? "+" : ""}${bias.gapPts} pts (${bias.gapPct > 0 ? "+" : ""}${bias.gapPct}%)` : "Live gap unavailable"}</strong></div>
          <div class="idx-meta-item"><span>Gap Bias Strength</span><strong style="text-transform:uppercase;">${bias ? bias.bias.replace("_", " ") : "N/A"}</strong></div>
          <div class="idx-meta-item"><span>Actionable Route</span><a href="/indices/gift-nifty/" style="color:var(--cyan-idx);font-weight:800;text-decoration:none;">Detailed analysis &rarr;</a></div>
        </div>
      </div>
      <div class="idx-vix" data-live="INDIAVIX">
        <div class="idx-vix-head"><h3>Market Volatility (India VIX)</h3><strong data-field="ltp">LTP: ${vix.closeValue.toFixed(2)}</strong></div>
        <div class="idx-vix-track"><div class="idx-vix-pin" id="idx-vix-pin" style="left: ${vixPct}%;"></div></div>
        <div class="idx-vix-labels"><span style="flex:none;">10</span><span style="position:absolute;left:${((15-10)/25)*100}%;">15</span><span style="position:absolute;left:${((20-10)/25)*100}%;">20</span><span style="flex:none;margin-left:auto;">35+</span></div>
        <div class="idx-vix-zones" style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted-idx);margin-top:2px;"><span>CALM</span><span>CAUTION</span><span>STRESS</span><span>PANIC</span></div>
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
  const gift = snapshots.find(s => s.symbol === "GIFTNIFTY");
  const giftMissing = !gift || gift.dataQuality === "seed";
  const giftSnap = gift || { closeValue: 0, changePercent: 0, previousClose: 0 };
  const nifty = snapshots.find(s => s.symbol === "NIFTY") || { closeValue: 0 }, niftyGapClose = Number.isFinite(Number(nifty.previousClose)) ? Number(nifty.previousClose) : Number(nifty.closeValue || 0);

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
    <div class="idx" data-nifty-close="${niftyGapClose}">
      ${liveStatusBadgeHtml({ id: "idx-live-badge", text: `Delayed · Briefing snapshot · ${snapshotTimestamp(digest)}`, extraClass: "idx-live-badge" })}
      <div class="idx-spotlight" data-live="GIFTNIFTY">
        <h3>GIFT Nifty Gap Calculator</h3>
        <div class="idx-calc">
          <div class="idx-calc-row"><span>GIFT Nifty LTP</span><strong class="idx-calc-val" data-field="ltp">${giftMissing ? "—" : giftSnap.closeValue.toLocaleString("en-IN")}</strong></div>
          <div class="idx-calc-row"><span>Previous Nifty 50 Close</span><strong class="idx-calc-val">${niftyGapClose ? niftyGapClose.toLocaleString("en-IN") : "—"}</strong></div>
          <div class="idx-calc-row" style="border-top:1px solid var(--line-idx);padding-top:14px;margin-top:10px;">
            <span>Implied Open Gap</span>
            <strong class="idx-calc-val ${(bias && !giftMissing) ? (bias.gapPts >= 0 ? "idx-pos" : "idx-neg") : "idx-flat"}" style="font-size:18px;" data-field="gap">${(bias && !giftMissing) ? `${bias.gapPts > 0 ? "+" : ""}${bias.gapPts} pts (${bias.gapPct > 0 ? "+" : ""}${bias.gapPct}%)` : "Live gap unavailable"}</strong>
          </div>
          <div class="idx-calc-row"><span>Gap Bias Strength</span><strong class="idx-calc-val" style="text-transform:uppercase;color:var(--cyan-idx);">${(bias && !giftMissing) ? bias.bias.replace("_", " ") : "N/A"}</strong></div>
        </div>
      </div>
      <div class="idx-vix" style="text-align:center;">
        <h3 id="nse-session-label" style="margin:0 0 6px;font-size:12px;color:var(--muted-idx);text-transform:uppercase;">NSE Cash Market Status</h3>
        <div id="nse-countdown" style="font-size:28px;font-weight:900;letter-spacing:-0.02em;">--:--:--</div>
        <span id="nse-countdown-status" style="font-size:11px;color:var(--cyan-idx);font-weight:800;text-transform:uppercase;display:block;margin-top:4px;">Checking Session Status</span>
      </div>
      <section style="margin-top:12px;">
        <h2 style="font-size:16px;text-transform:uppercase;color:var(--muted-idx);margin-bottom:6px;">GIFT Nifty Open Gap Logs (Last 15 Sessions)</h2>
        <p style="font-size:12px;color:var(--muted-idx);margin:0 0 12px;">History builds as live GIFT Nifty data accumulates from each session.</p>
        <div class="idx-table-wrap">
          <table class="idx-table">
            <thead>
              <tr><th>Date</th><th>GIFT Nifty (captured)</th><th>Prev Nifty Close</th><th>Gap Implied</th><th>Bias Result</th></tr>
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

function snapshotTimestamp(digest) {
  const value = digest.generatedAt || digest.publishedAt || `${digest.digestDate}T07:15:00+05:30`;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  }).format(new Date(value)) + " IST";
}
