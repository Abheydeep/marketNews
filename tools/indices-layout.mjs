import { indicesPageBody, giftNiftyPageBody, escapeHtml } from "./indices-page.mjs";
import { indicesLiveScript } from "./indices-live.mjs";

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
    body { margin: 0; background: #050816; color: #f8fafc; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .shell { width: min(1160px, calc(100% - 32px)); margin: 0 auto; }
    .topbar { border-bottom: 1px solid rgba(148, 163, 184, 0.22); background: rgba(5, 8, 22, 0.86); position: sticky; top: 0; backdrop-filter: blur(16px); z-index: 10; }
    .nav-inner { min-height: 60px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
    .brand { display: inline-flex; align-items: center; gap: 10px; color: #f8fafc; text-decoration: none; font-weight: 900; }
    .tabs { display: flex; gap: 14px; overflow-x: auto; }
    .tab-link { align-items: center; color: #94a3b8; display: inline-flex; min-height: 44px; text-decoration: none; font-size: 13px; font-weight: 800; white-space: nowrap; }
    .tab-link.active { color: #67e8f9; }
    .hero { padding: 46px 0 26px; }
    .eyebrow { margin: 0 0 10px; color: #67e8f9; font-size: 12px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
    h1 { margin: 0; max-width: 780px; font-size: clamp(34px, 5vw, 64px); line-height: 1.02; letter-spacing: 0; }
    .hero p { max-width: 760px; color: #cbd5e1; font-size: 17px; line-height: 1.7; }
    .footer-note { margin: 38px 0 46px; padding-top: 18px; border-top: 1px solid rgba(148, 163, 184, 0.22); color: #94a3b8; font-size: 12px; line-height: 1.6; }
    @media (max-width: 760px) { .hero { padding: 30px 0 18px; } .footer-note { margin-bottom: 84px; } }
    ${assets.bottomTabBarCss}
    ${assets.mobileTypographyCss}
    ${assets.proPolishCss}
    ${assets.siteFooterCss}
    .idx-m { display:none;position:fixed;inset:0;z-index:200;background:rgba(5,8,22,.9);align-items:center;justify-content:center }
    .idx-m.open { display:flex }
    .idx-panel { background:#0b1220;border:1px solid rgba(148,163,184,.22);border-radius:12px;padding:24px 28px;width:min(580px,calc(100vw - 32px));max-height:90vh;overflow-y:auto;position:relative }
    .idx-close { position:absolute;top:12px;right:16px;background:none;border:none;color:#94a3b8;font-size:24px;cursor:pointer;line-height:1;padding:0 }
  </style>
</head>
<body class="has-btb">
  ${assets.topbarHtml}
  ${tickerHtml}
  <main class="shell">
    <header class="hero">
      <p class="eyebrow">Global Indices Watch</p>
      <h1>Nifty, Bank Nifty, Asia, US futures context and macro hedges in one board.</h1>
      <p>Captured from the same Yahoo price-series snapshots used in the daily briefing. Last briefing update: ${escapeHtml(lastUpdated)} IST. Use this as market context; the Trading Guide still owns execution levels.</p>
    </header>
    ${indicesPageBody(digest)}
    <section class="seo-context" aria-label="How to use the indices board" style="border-top:1px solid rgba(148, 163, 184, 0.22); display:grid; gap:16px; grid-template-columns:repeat(2,1fr); margin:34px 0 0; padding-top:22px;">
      <div><h2>What this board tracks</h2><p style="color:#cbd5e1;line-height:1.6;margin:0;">Market Narrative tracks Nifty, Bank Nifty, GIFT Nifty, US indices, Asian markets, Brent crude, USD/INR, DXY and gold from captured Yahoo price-series snapshots so the morning brief has one consistent reference layer.</p></div>
      <div><h2>How traders use it before open</h2><p style="color:#cbd5e1;line-height:1.6;margin:0;">Use the board to separate overnight risk appetite from India confirmation: US close for sentiment, Asia for handoff, GIFT Nifty for gap context, Bank Nifty for confirmation, and crude or rupee for macro pressure.</p></div>
    </section>
    <p class="footer-note">Educational market research only. This is not SEBI-registered investment advice, a research recommendation, or a solicitation to buy or sell securities or derivatives. No returns are assured; use your own risk plan.</p>
    ${assets.footerLinksHtml}
  </main>
  ${assets.bottomTabBarHtml}
  <div class="idx-m" id="idx-m" onclick="if(event.target===this)this.classList.remove('open')"><div class="idx-panel"><button class="idx-close" onclick="document.getElementById('idx-m').classList.remove('open')" aria-label="Close">×</button><small id="idx-sym" style="display:block;margin-bottom:4px"></small><h3 id="idx-name" style="margin:0 0 6px;font-size:22px"></h3><strong id="idx-val" class="move" style="display:block;font-size:16px;margin-bottom:12px"></strong><svg id="idx-svg" viewBox="0 0 540 200" style="width:100%;height:200px;display:block;margin-bottom:12px"></svg><p id="idx-ctx" style="color:#cbd5e1;line-height:1.6;margin:0;font-size:14px"></p></div></div>
  <script>
    function openIndexHash(){const id=window.location.hash?.slice(1);if(!id)return;const el=document.getElementById(id);if(el?.tagName==="BUTTON")el.click();}window.addEventListener("hashchange",openIndexHash);openIndexHash();
    (function(){
      var m=document.getElementById("idx-m");
      document.body.addEventListener("click", function(e) {
        var c = e.target.closest(".idx-card");
        if (!c) return;
        var d=c.dataset,s=document.getElementById("idx-svg"),t=d.cls==="idx-pos"?"#34d399":d.cls==="idx-neg"?"#fb7185":"#fbbf24";
        document.getElementById("idx-sym").textContent=d.symbol;
        document.getElementById("idx-name").textContent=d.name;
        var v=document.getElementById("idx-val");
        v.className="move "+d.cls;
        v.textContent=d.val+" \xb7 "+d.change;
        document.getElementById("idx-ctx").textContent=d.ctx || (d.name + " is tracked as index reference.");
        var pts=JSON.parse(d.pts||"[]");
        if(pts.length>1){
          var mn=Math.min.apply(null,pts),mx=Math.max.apply(null,pts),r=Math.max(1e-9,mx-mn),
              p=pts.map(function(v,i){return(i?"L":"M")+(4+i/(pts.length-1)*532).toFixed(1)+" "+(190-(v-mn)/r*180).toFixed(1);}).join(" ");
          s.innerHTML="<path d='"+p+" L536 196 L4 196 Z' fill='"+t+"' opacity='.14'/><path d='"+p+"' fill='none' stroke='"+t+"' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/>";
        } else { s.innerHTML="<line x1='4' y1='100' x2='536' y2='100' stroke='"+t+"' stroke-width='2'/>"; }
        m.classList.add("open");
      });
    }());
  </script>
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
  ${indicesLiveScript()}
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
    body { margin: 0; background: #050816; color: #f8fafc; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .shell { width: min(1160px, calc(100% - 32px)); margin: 0 auto; }
    .topbar { border-bottom: 1px solid rgba(148, 163, 184, 0.22); background: rgba(5, 8, 22, 0.86); position: sticky; top: 0; backdrop-filter: blur(16px); z-index: 10; }
    .nav-inner { min-height: 60px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
    .brand { display: inline-flex; align-items: center; gap: 10px; color: #f8fafc; text-decoration: none; font-weight: 900; }
    .tabs { display: flex; gap: 14px; overflow-x: auto; }
    .tab-link { align-items: center; color: #94a3b8; display: inline-flex; min-height: 44px; text-decoration: none; font-size: 13px; font-weight: 800; white-space: nowrap; }
    .tab-link.active { color: #67e8f9; }
    .hero { padding: 46px 0 26px; }
    .eyebrow { margin: 0 0 10px; color: #67e8f9; font-size: 12px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
    h1 { margin: 0; max-width: 780px; font-size: clamp(34px, 5vw, 64px); line-height: 1.02; letter-spacing: 0; }
    .hero p { max-width: 760px; color: #cbd5e1; font-size: 17px; line-height: 1.7; }
    .footer-note { margin: 38px 0 46px; padding-top: 18px; border-top: 1px solid rgba(148, 163, 184, 0.22); color: #94a3b8; font-size: 12px; line-height: 1.6; }
    @media (max-width: 760px) { .hero { padding: 30px 0 18px; } .footer-note { margin-bottom: 84px; } }
    ${assets.bottomTabBarCss}
    ${assets.mobileTypographyCss}
    ${assets.proPolishCss}
    ${assets.siteFooterCss}
  </style>
</head>
<body class="has-btb">
  ${assets.topbarHtml}
  <main class="shell">
    <header class="hero">
      <p class="eyebrow">GIFT Nifty Watch</p>
      <h1>GIFT Nifty Live Quote & Opening Gap Calculator</h1>
      <p>Calculates implied open gaps for Indian markets based on active GIFT Nifty contracts traded at GIFT City, Gujarat.</p>
    </header>
    ${giftNiftyPageBody(digest, archiveDigests)}
    <p class="footer-note">Educational market research only. This is not SEBI-registered investment advice.</p>
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
