import { indicesPageBody, giftNiftyPageBody } from "./indices-page.mjs";
import { escapeHtml } from "./html-utils.mjs";
import { indicesLiveScript } from "./indices-live.mjs";
import { indicesChartScript } from "./indices-chart.mjs";
import { DISCLAIMER, DISCLAIMER_COMPACT } from "./site-constants.mjs";

export function indicesPageHtml(digest, siteOrigin, lastUpdated, jsonLd, assets) {
  const tickerItems = [
    ["NIFTY", "Nifty 50"], ["BANKNIFTY", "Bank Nifty"], ["GIFTNIFTY", "GIFT Nifty"],
    ["SPX", "S&P 500"], ["NDX", "Nasdaq 100"], ["NIKKEI", "Nikkei 225"],
    ["HSI", "Hang Seng"], ["BRENT", "Brent Crude"], ["GOLD", "Gold"]
  ].map(([s, n]) => `<div class="idx-ticker-item" data-live="${s}"><span>${n}</span><strong data-field="ltp">LTP: —</strong> <strong data-field="pct">—</strong></div>`).join("");
  const tickerHtml = `<div class="idx-ticker-strip"><div class="idx-ticker-wrap">${tickerItems}${tickerItems}</div></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  ${assets.headLinks}
  <title>Global Indices Watch | Market Narrative</title>
  <meta name="description" content="Live and reference global indices watch for Nifty, Bank Nifty, US markets, Asian markets, crude, dollar, rupee and gold with captured Yahoo price-series context.">
  <link rel="canonical" href="${siteOrigin}/indices/">
  ${jsonLd}
  <style>
    ${assets.markCss}
    ${assets.bottomTabBarCss}
    ${assets.mobileTypographyCss}
    ${assets.proPolishCss}
    ${assets.siteFooterCss}
    .idx-m { display:none;position:fixed;inset:0;z-index:200;background:rgba(5,8,22,.9);align-items:center;justify-content:center }
    .idx-m.open { display:flex }
    .idx-panel { background:#0b1220;border:1px solid rgba(148,163,184,.22);border-radius:12px;padding:24px 28px;width:min(580px,calc(100vw - 32px));max-height:90vh;overflow-y:auto;position:relative }
    .idx-close { position:absolute;top:12px;right:16px;background:none;border:none;color:#94a3b8;font-size:24px;cursor:pointer;line-height:1;padding:0 }
    .idx-tab-btn { background: rgba(255,255,255,0.04); border: 1px solid var(--line-idx); color: var(--muted-idx); border-radius: 6px; padding: 6px 12px; font-size: 11px; font-weight: 800; cursor: pointer; transition: all 0.2s; white-space: nowrap; flex: 0 0 auto; }
    .idx-tab-btn:hover { color: var(--text-idx); border-color: var(--muted-idx); }
    .idx-tab-btn.active { background: rgba(103, 232, 249, 0.1); border-color: var(--cyan-idx); color: var(--cyan-idx); }
  </style>
</head>
<body class="idx-layout-body has-btb">
  ${assets.topbarHtml}
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
  ${assets.bottomTabBarHtml}
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

      <!-- Stat Meta Row -->
      <div class="idx-modal-meta" style="display:flex;justify-content:space-between;background:rgba(11,18,32,0.4);border:1px solid var(--line-idx);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;">
        <div class="idx-meta-stat">
          <span style="display:block;color:var(--muted-idx);font-size:10px;text-transform:uppercase;margin-bottom:2px;">High</span>
          <strong id="idx-stat-max" style="font-weight:800;">—</strong>
        </div>
        <div class="idx-meta-stat" style="text-align:center;">
          <span style="display:block;color:var(--muted-idx);font-size:10px;text-transform:uppercase;margin-bottom:2px;">Low</span>
          <strong id="idx-stat-min" style="font-weight:800;">—</strong>
        </div>
        <div class="idx-meta-stat" style="text-align:right;">
          <span style="display:block;color:var(--muted-idx);font-size:10px;text-transform:uppercase;margin-bottom:2px;">Range Change</span>
          <strong id="idx-stat-chg" style="font-weight:800;">—</strong>
        </div>
      </div>

      <svg id="idx-svg" viewBox="0 0 540 220" style="width:100%;height:220px;display:block;margin-bottom:12px;background:rgba(5,8,22,0.3);border-radius:8px;border:1px solid var(--line-idx);"></svg>
      <p id="idx-ctx" style="color:#cbd5e1;line-height:1.6;margin:0;font-size:14px"></p>
      <p id="idx-proxy-note" style="color:var(--muted-idx);font-size:11px;margin-top:10px;display:none;line-height:1.4;"></p>
    </div>
  </div>
  <script>
    function openIndexHash(){const id=window.location.hash?.slice(1);if(!id)return;const el=document.getElementById(id);if(el?.tagName==="BUTTON")el.click();}window.addEventListener("hashchange",openIndexHash);openIndexHash();
  </script>
  ${indicesChartScript()}
  ${indicesLiveScript()}
  <script>
    function updateClocks() {
      const el = document.getElementById("market-clocks");
      if (!el) return;
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const ist = new Date(utc + 3600000 * 5.5);
      const day = ist.getDay();
      const timeStr = ist.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const sessions = [
        { name: "GIFT Nifty", openHour: 6.5, closeHour: 23.5, active: day > 0 && day < 6 },
        { name: "NSE Cash", openHour: 9.25, closeHour: 15.5, active: day > 0 && day < 6 },
        { name: "Tokyo", openHour: 5.5, closeHour: 11.5, active: day > 0 && day < 6 },
        { name: "London", openHour: 12.5, closeHour: 21.0, active: day > 0 && day < 6 },
        { name: "New York", openHour: 19.0, closeHour: 2.5, active: day > 0 && day < 6 }
      ];
      el.innerHTML = sessions.map(s => {
        const h = ist.getHours() + ist.getMinutes() / 60;
        let isOpen = false;
        if (s.active) {
          if (s.openHour < s.closeHour) { isOpen = h >= s.openHour && h < s.closeHour; }
          else { isOpen = h >= s.openHour || h < s.closeHour; }
        }
        return \`<div class="idx-clock"><span>\${s.name}</span><strong>\${timeStr}</strong><div class="idx-clock-pill \${isOpen ? "open" : "closed"}">\${isOpen ? "Open" : "Closed"}</div></div>\`;
      }).join("");
    }
    setInterval(updateClocks, 1000); updateClocks();
  </script>
  ${assets.mobileShellScript}
</body>
</html>`;
}

export function giftNiftyPageHtml(digest, archiveDigests, siteOrigin, jsonLd, assets) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  ${assets.headLinks}
  <title>GIFT Nifty Live Open Gap Calculator | Market Narrative</title>
  <meta name="description" content="Live GIFT Nifty index futures price, gap calculator to predict Nifty 50 opening direction, historical gap open logs and session countdowns.">
  <link rel="canonical" href="${siteOrigin}/indices/gift-nifty/">
  ${jsonLd}
  <style>
    ${assets.markCss}
    ${assets.bottomTabBarCss}
    ${assets.mobileTypographyCss}
    ${assets.proPolishCss}
    ${assets.siteFooterCss}
  </style>
</head>
<body class="idx-layout-body has-btb">
  ${assets.topbarHtml}
  <main class="idx-layout-shell">
    <header class="idx-layout-hero">
      <p class="idx-layout-eyebrow">GIFT Nifty Watch</p>
      <h1 class="idx-layout-h1">GIFT Nifty Live Quote & Opening Gap Calculator</h1>
      <p class="idx-layout-hero-p">Calculates implied open gaps for Indian markets based on active GIFT Nifty contracts traded at GIFT City, Gujarat.</p>
    </header>
    ${giftNiftyPageBody(digest, archiveDigests)}
    <p class="idx-layout-footer-note">${DISCLAIMER_COMPACT}</p>
    ${assets.footerLinksHtml}
  </main>
  ${assets.bottomTabBarHtml}
  <script>
    function updateCountdown() {
      const el = document.getElementById("nse-countdown");
      const statusEl = document.getElementById("nse-countdown-status");
      if (!el || !statusEl) return;
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const ist = new Date(utc + 3600000 * 5.5);
      const target = new Date(ist);
      target.setHours(9, 15, 0, 0);
      if (ist.getHours() > 9 || (ist.getHours() === 9 && ist.getMinutes() >= 15)) {
        statusEl.textContent = "Market is Open"; el.textContent = "00:00:00"; return;
      }
      const diff = target - ist;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const pad = (n) => String(n).padStart(2, "0");
      el.textContent = pad(h) + ":" + pad(m) + ":" + pad(s);
      statusEl.textContent = "Pre-market Open in progress";
    }
    setInterval(updateCountdown, 1000); updateCountdown();
  </script>
  ${indicesLiveScript()}
  ${assets.mobileShellScript}
</body>
</html>`;
}
