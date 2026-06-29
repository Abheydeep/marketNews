import { indicesPageBody, giftNiftyPageBody } from "./indices-page.mjs";
import { escapeHtml } from "./html-utils.mjs";
import { indicesLiveScript } from "./indices-live.mjs";
import { indicesChartScript } from "./indices-chart.mjs";
import { DISCLAIMER, DISCLAIMER_COMPACT } from "./site-constants.mjs";
import { pageShell } from "./page-shell.mjs";

export function indicesPageHtml(digest, siteOrigin, lastUpdated, jsonLd, assets) {
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
    .idx-panel { background:#0b1220;border:1px solid rgba(148,163,184,.22);border-radius:12px;padding:24px 28px;width:min(580px,calc(100vw - 32px));max-height:90vh;overflow-y:auto;position:relative }
    .idx-close { position:absolute;top:12px;right:16px;background:none;border:none;color:#94a3b8;font-size:24px;cursor:pointer;line-height:1;padding:0 }
    .idx-tab-btn { background: rgba(255,255,255,0.04); border: 1px solid var(--line-idx); color: var(--muted-idx); border-radius: 6px; padding: 6px 12px; font-size: 11px; font-weight: 800; cursor: pointer; transition: all 0.2s; white-space: nowrap; flex: 0 0 auto; }
    .idx-tab-btn:hover { color: var(--text-idx); border-color: var(--muted-idx); }
    .idx-tab-btn.active { background: rgba(103, 232, 249, 0.1); border-color: var(--cyan-idx); color: var(--cyan-idx); }
  </style>
  `;

  const main = `
  ${tickerHtml}
  <main class="idx-layout-shell">
    <header class="idx-layout-hero">
      <p class="idx-layout-eyebrow">Global Indices Watch</p>
      <h1 class="idx-layout-h1">Nifty, Bank Nifty, Asia, US futures context and macro hedges in one board.</h1>
      <p class="idx-layout-hero-p">Captured from the same Yahoo price-series snapshots used in the daily briefing. Last briefing update: ${escapeHtml(lastUpdated)} IST. Use this as market context; the Trading Guide still owns execution levels.</p>
    </header>
    ${indicesPageBody(digest)}
    <section class="seo-context" aria-label="How to use the indices board" style="border-top:1px solid rgba(148, 163, 184, 0.22); display:grid; gap:16px; grid-template-columns:repeat(2,1fr); margin:34px 0 0; padding-top:22px;">
      <div><h2>What this board tracks</h2><p style="color:#cbd5e1;line-height:1.6;margin:0;">Market Narrative tracks Nifty, Bank Nifty, GIFT Nifty, US indices, Asian markets, Brent crude, USD/INR, DXY and gold from captured Yahoo price-series snapshots so the morning brief has one consistent reference layer.</p></div>
      <div><h2>How traders use it before open</h2><p style="color:#cbd5e1;line-height:1.6;margin:0;">Use the board to separate overnight risk appetite from India confirmation: US close for sentiment, Asia for handoff, GIFT Nifty for gap context, Bank Nifty for confirmation, and crude or rupee for macro pressure.</p></div>
    </section>
    <p class="idx-layout-footer-note">${DISCLAIMER}</p>
    ${assets.footerLinksHtml}
  </main>
  <div class="idx-m" id="idx-m" onclick="if(e=event,e.target===this)this.classList.remove('open')">
    <div class="idx-panel">
      <button class="idx-close" onclick="document.getElementById('idx-m').classList.remove('open')" aria-label="Close">×</button>
      <small id="idx-sym" style="display:block;margin-bottom:4px;color:var(--muted-idx);font-weight:900;letter-spacing:0.05em;"></small>
      <h3 id="idx-name" style="margin:0 0 6px;font-size:22px"></h3>
      <strong id="idx-val" class="move" style="display:block;font-size:16px;margin-bottom:12px"></strong>
      
      <!-- Timeframe Tabs -->
      <div class="idx-modal-tabs" style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;padding-bottom:4px;scrollbar-width:none;-ms-overflow-style:none;">
        <button class="idx-tab-btn active" data-range="1d">1D</button>
        <button class="idx-tab-btn" data-range="5d">5D</button>
        <button class="idx-tab-btn" data-range="1mo">1M</button>
        <button class="idx-tab-btn" data-range="3mo">3M</button>
        <button class="idx-tab-btn" data-range="6mo">6M</button>
        <button class="idx-tab-btn" data-range="1y">1Y</button>
        <button class="idx-tab-btn" data-range="3y">3Y</button>
        <button class="idx-tab-btn" data-range="5y">5Y</button>
        <button class="idx-tab-btn" data-range="max">MAX</button>
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
      </div>
      
      <!-- Market Open Countdown (Tier 4 / item 30) -->
      <div id="idx-countdown-wrap" style="margin-top:14px;background:rgba(34,211,238,0.04);border:1px solid rgba(34,211,238,0.14);border-radius:8px;padding:10px 12px;display:flex;align-items:center;justify-content:between;">
        <span id="idx-countdown-status" style="font-size:11px;color:#cffafe;font-weight:800;letter-spacing:0.02em;">Pre-market Open in progress</span>
        <strong id="idx-countdown-clock" style="font-family:monospace;font-size:14px;color:#22d3ee;">00:00:00</strong>
      </div>
    </div>
  </div>

  <script>
    const prevPrices = {};
    let lastSuccess = Date.now();
    
    function getPollIntervalMs() {
      const date = new Date();
      const utc = date.getTime() + date.getTimezoneOffset() * 60000;
      const ist = new Date(utc + 3600000 * 5.5);
      const day = ist.getDay();
      const hour = ist.getHours();
      const min = ist.getMinutes();
      if (day === 0 || day === 6) return 300000; // 5m weekends
      if (hour === 9 && min >= 0 && min <= 15) return 15000; // 15s pre-market
      if (hour >= 9 && hour < 16) return 30000; // 30s live market
      return 120000; // 2m offline
    }

    function formatChangeStr(close, prev, pct) {
      if (!close || !prev) return "—";
      const diff = close - prev;
      const sign = diff >= 0 ? "+" : "";
      return sign + diff.toFixed(2) + " (" + (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%)";
    }

    function getHeatClass(pct) {
      if (pct > 2.0) return "heat-max-pos";
      if (pct > 0.8) return "heat-mid-pos";
      if (pct > 0.05) return "heat-min-pos";
      if (pct < -2.0) return "heat-max-neg";
      if (pct < -0.8) return "heat-mid-neg";
      if (pct < -0.05) return "heat-min-neg";
      return "heat-flat";
    }

    function updateCountdown() {
      const el = document.getElementById("idx-countdown-clock"), statusEl = document.getElementById("idx-countdown-status");
      if (!el || !statusEl) return;
      const now = new Date(), utc = now.getTime() + now.getTimezoneOffset() * 60000, ist = new Date(utc + 3600000 * 5.5), day = ist.getDay();
      if (day === 0 || day === 6) { statusEl.textContent = "Market is Closed"; el.textContent = "Weekend"; return; }
      const hour = ist.getHours(), min = ist.getMinutes();
      if (hour * 60 + min >= 540) { statusEl.textContent = "Market is Open"; el.textContent = "00:00:00"; return; }
      const target = new Date(ist); target.setHours(9, 0, 0, 0);
      const diff = target - ist, h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
      el.textContent = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
      statusEl.textContent = "Pre-market Open in progress";
    }
    setInterval(updateCountdown, 1000); updateCountdown();
  </script>
  <script>
    function openIndexHash(){const id=window.location.hash?.slice(1);if(!id)return;const el=document.getElementById(id);if(el?.tagName==="BUTTON")el.click();}window.addEventListener("hashchange",openIndexHash);openIndexHash();
  </script>
  <script>
    function updateClocks() {
      const el = document.getElementById("market-clocks"); if (!el) return;
      const now = new Date(), utc = now.getTime() + now.getTimezoneOffset() * 60000, ist = new Date(utc + 3600000 * 5.5), day = ist.getDay();
      const timeStr = ist.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const sessions = [
        { name: "GIFT Nifty", open: 6.5, close: 23.5 }, { name: "NSE Cash", open: 9.25, close: 15.5 },
        { name: "Tokyo", open: 5.5, close: 11.5 }, { name: "London", open: 12.5, close: 21.0 },
        { name: "New York", open: 19.0, close: 2.5 }
      ];
      el.innerHTML = sessions.map(s => {
        const h = ist.getHours() + ist.getMinutes() / 60;
        const isOpen = day > 0 && day < 6 && (s.open < s.close ? (h >= s.open && h < s.close) : (h >= s.open || h < s.close));
        return \`<div class="idx-clock"><span>\${s.name}</span><strong>\${timeStr}</strong><div class="idx-clock-pill \${isOpen ? "open" : "closed"}">\${isOpen ? "Open" : "Closed"}</div></div>\`;
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
    ogImage: `${siteOrigin}/og-card.svg`,
    head,
    bodyClass: "idx-layout-body has-btb",
    activeHref: "/indices/",
    mobileActiveKey: "indices",
    main
  });
}

