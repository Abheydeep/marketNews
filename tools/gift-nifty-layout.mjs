import { giftNiftyPageBody } from "./indices-page.mjs";
import { indicesLiveScript } from "./indices-live.mjs";
import { DISCLAIMER_COMPACT } from "./site-constants.mjs";
import { pageShell } from "./page-shell.mjs";

export function giftNiftyPageHtml(digest, archiveDigests, siteOrigin, jsonLd, assets) {
  const head = jsonLd;

  const main = `
  <div class="idx-layout-shell">
    <header class="idx-layout-hero">
      <p class="idx-layout-eyebrow">GIFT Nifty Watch</p>
      <h1 class="idx-layout-h1">GIFT Nifty Live Quote & Opening Gap Calculator</h1>
      <p class="idx-layout-hero-p">Calculates implied open gaps for Indian markets based on active GIFT Nifty contracts traded at GIFT City, Gujarat.</p>
    </header>
    ${giftNiftyPageBody(digest, archiveDigests)}
    <p class="idx-layout-footer-note">${DISCLAIMER_COMPACT}</p>
    ${assets.footerLinksHtml}
  </div>
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
  `;

  return pageShell({
    title: "GIFT Nifty Live Open Gap Calculator | Market Narrative",
    description: "Live GIFT Nifty index futures price, gap calculator to predict Nifty 50 opening direction, historical gap open logs and session countdowns.",
    canonicalUrl: `${siteOrigin}/indices/gift-nifty/`,
    ogImage: `${siteOrigin}/og-card.svg`,
    head,
    bodyClass: "idx-layout-body has-btb",
    activeHref: "/indices/",
    mobileActiveKey: "indices",
    main
  });
}
