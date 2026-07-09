import { indicesPageBody, giftNiftyPageBody } from "./indices-page.mjs";
import { escapeHtml } from "./html-utils.mjs";
import { indicesLiveScript } from "./indices-live.mjs";
import { indicesChartScript } from "./indices-chart.mjs";
import { DISCLAIMER, DISCLAIMER_COMPACT } from "./site-constants.mjs";
import { pageShell } from "./page-shell.mjs";
import { marketSessionClientScript } from "./market-session-client.mjs";
import { socialCardUrl } from "./public-page-registry.mjs";

export function indicesPageHtml(digest, siteOrigin, lastUpdated, jsonLd) {
  const tickerItems = [
    ["NIFTY", "Nifty 50"], ["BANKNIFTY", "Bank Nifty"], ["GIFTNIFTY", "GIFT Nifty"],
    ["SPX", "S&P 500"], ["NDX", "Nasdaq 100"], ["NIKKEI", "Nikkei 225"],
    ["HSI", "Hang Seng"], ["BRENT", "Brent Crude"], ["GOLD", "Gold"]
  ].map(([s, n]) => `<div class="idx-ticker-item" data-live="${s}"><span>${n}</span><strong data-field="ltp">LTP: —</strong> <strong data-field="pct">—</strong></div>`).join("");
  const tickerHtml = `<div class="idx-ticker-strip"><div class="idx-ticker-wrap">${tickerItems}${tickerItems}</div></div>`;

  const head = `
  ${jsonLd}
  <style>
    .idx-m { display:none;position:fixed;inset:0;z-index:200;background:rgba(5,8,22,.9);align-items:center;justify-content:center }
    .idx-m.open { display:flex }
    .idx-panel { background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:24px 28px;width:min(580px,calc(100vw - 32px));max-height:90vh;overflow-y:auto;position:relative }
    .idx-close { position:absolute;top:12px;right:16px;background:none;border:none;color:var(--muted);font-size:24px;cursor:pointer;line-height:1;padding:0 }
    .idx-tab-btn { background: rgba(255,255,255,0.04); border: 1px solid var(--line-idx); color: var(--muted-idx); border-radius: 6px; padding: 6px 12px; font-size: 11px; font-weight: 800; cursor: pointer; transition: all 0.2s; white-space: nowrap; flex: 0 0 auto; }
    .idx-tab-btn:hover { color: var(--text-idx); border-color: var(--muted-idx); }
    .idx-tab-btn.active { background: rgba(103, 232, 249, 0.1); border-color: var(--cyan-idx); color: var(--cyan-idx); }
  </style>
  `;

  const main = `
  ${tickerHtml}
  <div class="idx-layout-shell">
    <header class="idx-layout-hero">
      <p class="idx-layout-eyebrow">Global Indices Watch</p>
      <h1 class="idx-layout-h1">Nifty, Bank Nifty, Asia, US futures context and macro hedges in one board.</h1>
      <p class="idx-layout-hero-p">Captured from the same Yahoo price-series snapshots used in the daily briefing. Last briefing update: ${escapeHtml(lastUpdated)} IST. Use this as market context; the Trading Guide still owns execution levels.</p>
    </header>
    ${indicesPageBody(digest)}
    <section class="seo-context" aria-label="How to use the indices board" style="border-top:1px solid rgba(148, 163, 184, 0.22); display:grid; gap:16px; grid-template-columns:repeat(2,1fr); margin:34px 0 0; padding-top:22px;">
      <div><h2>What this board tracks</h2><p style="color:#cbd5e1;line-height:1.6;margin:0;">Market Narrative tracks Nifty, Bank Nifty, GIFT Nifty, US indices, Asian markets, Brent crude, USD/INR, DXY and gold from captured Yahoo price-series snapshots so the morning brief has one consistent reference layer.</p></div>
      <div><h2>How traders use it before open</h2><p style="color:#cbd5e1;line-height:1.6;margin:0;">Use the board to separate overnight willingness to take risk from India confirmation: US close for sentiment, Asia for handoff, GIFT Nifty for gap context, Bank Nifty for confirmation, and crude or rupee for macro pressure.</p></div>
    </section>
    <p class="idx-layout-footer-note">${DISCLAIMER}</p>
  </div>
  <div class="idx-m" id="idx-m" role="dialog" aria-modal="true" aria-labelledby="idx-name" aria-hidden="true">
    <div class="idx-panel" tabindex="-1">
      <button type="button" class="idx-close" data-dialog-close aria-label="Close index chart">×</button>
      <small id="idx-sym" style="display:block;margin-bottom:4px;color:var(--muted-idx);font-weight:900;letter-spacing:0.05em;"></small>
      <h3 id="idx-name" style="margin:0 0 6px;font-size:22px"></h3>
      <strong id="idx-val" class="move" style="display:block;font-size:16px;margin-bottom:12px"></strong>
      <p id="idx-ctx" style="color:var(--muted-idx);font-size:12px;line-height:1.5;margin:0 0 12px;"></p>
      <p id="idx-proxy-note" style="display:none;color:var(--muted-idx);font-size:11px;line-height:1.5;"></p>
      
      <!-- Timeframe Tabs -->
      <div class="idx-modal-tabs" style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;padding-bottom:4px;scrollbar-width:none;-ms-overflow-style:none;">
        ${["1d", "5d", "1mo", "3mo", "6mo", "1y", "3y", "5y", "max"].map((range, index) => `<button type="button" class="idx-tab-btn${index === 0 ? " active" : ""}" data-range="${range}">${range === "1mo" ? "1M" : range === "3mo" ? "3M" : range === "6mo" ? "6M" : range.toUpperCase()}</button>`).join("")}
      </div>

      <!-- Live Chart Area -->
      <div class="idx-modal-chart" style="width:100%;height:220px;position:relative;background:rgba(255,255,255,0.01);border:1px solid var(--line-idx);border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <svg id="idx-svg" width="540" height="220" viewBox="0 0 540 220" style="width:100%;height:100%;overflow:visible;"></svg>
      </div>

      <!-- Stats Grid -->
      <div class="idx-modal-stats" style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:14px;border-top:1px solid var(--line-idx);padding-top:14px;">
        <div>
          <span style="display:block;font-size:10px;color:var(--muted-idx);font-weight:900;letter-spacing:0.05em;text-transform:uppercase;">Range High</span>
          <strong id="idx-stat-max" style="font-size:16px;color:#fff;">—</strong>
        </div>
        <div>
          <span style="display:block;font-size:10px;color:var(--muted-idx);font-weight:900;letter-spacing:0.05em;text-transform:uppercase;">Range Low</span>
          <strong id="idx-stat-min" style="font-size:16px;color:#fff;">—</strong>
        </div>
        <div>
          <span style="display:block;font-size:10px;color:var(--muted-idx);font-weight:900;letter-spacing:0.05em;text-transform:uppercase;">Range Change</span>
          <strong id="idx-stat-chg" style="font-size:16px;">—</strong>
        </div>
      </div>
      
      <!-- Market Open Countdown (Tier 4 / item 30) -->
      <div id="idx-countdown-wrap" style="margin-top:14px;background:rgba(34,211,238,0.04);border:1px solid rgba(34,211,238,0.14);border-radius:8px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;">
        <span id="idx-countdown-status" style="font-size:11px;color:#cffafe;font-weight:800;letter-spacing:0.02em;">Pre-market Open in progress</span>
        <strong id="idx-countdown-clock" style="font-family:monospace;font-size:14px;color:#22d3ee;">00:00:00</strong>
      </div>
    </div>
  </div>

  ${marketSessionClientScript({ clockId: "idx-countdown-clock", statusId: "idx-countdown-status" })}
  <script>
    function openIndexHash(){const id=window.location.hash?.slice(1);if(!id)return;const el=document.getElementById(id);if(el?.tagName==="BUTTON")el.click();}window.addEventListener("hashchange",openIndexHash);openIndexHash();
  </script>
  <script>
    function updateClocks() {
      const el = document.getElementById("market-clocks"); if (!el) return;
      const now = new Date(), utc = now.getTime() + now.getTimezoneOffset() * 60000, ist = new Date(utc + 3600000 * 5.5), day = ist.getDay();
      const timeStr = (timeZone) => now.toLocaleTimeString("en-IN", { timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const sessions = [
        { name: "GIFT Nifty", tz: "Asia/Kolkata", open: 6.5, close: 23.5 }, { name: "NSE Cash", tz: "Asia/Kolkata", open: 9.25, close: 15.5 },
        { name: "Tokyo", tz: "Asia/Tokyo", open: 5.5, close: 11.5 }, { name: "London", tz: "Europe/London", open: 12.5, close: 21.0 },
        { name: "New York", tz: "America/New_York", open: 19.0, close: 2.5 }
      ];
      el.innerHTML = sessions.map(s => {
        const h = ist.getHours() + ist.getMinutes() / 60;
        const isOpen = day > 0 && day < 6 && (s.open < s.close ? (h >= s.open && h < s.close) : (h >= s.open || h < s.close));
        return \`<div class="idx-clock"><span>\${s.name}</span><strong>\${timeStr(s.tz)}</strong><div class="idx-clock-pill \${isOpen ? "open" : "closed"}">\${isOpen ? "Open" : "Closed"}</div></div>\`;
      }).join("");
    }
    setInterval(updateClocks, 1000); updateClocks();
  </script>
  ${indicesLiveScript()}
  ${indicesChartScript()}
  `;

  return pageShell({
    title: "Global Indices Watch | Market Narrative",
    description: "Live and reference global indices watch for Nifty, Bank Nifty, US markets, Asian markets, crude, dollar, rupee and gold with captured Yahoo price-series context.",
    canonicalUrl: `${siteOrigin}/indices/`,
    ogImage: socialCardUrl("indices", siteOrigin),
    head,
    bodyClass: "has-btb",
    activeHref: "/indices/",
    mobileActiveKey: "indices",
    main
  });
}
