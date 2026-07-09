import { giftNiftyPageBody } from "./indices-page.mjs";
import { indicesLiveScript } from "./indices-live.mjs";
import { DISCLAIMER_COMPACT } from "./site-constants.mjs";
import { pageShell } from "./page-shell.mjs";
import { marketSessionClientScript } from "./market-session-client.mjs";
import { socialCardUrl } from "./public-page-registry.mjs";

export function giftNiftyPageHtml(digest, archiveDigests, siteOrigin, jsonLd) {
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
  </div>
  ${marketSessionClientScript({ clockId: "nse-countdown", statusId: "nse-countdown-status", labelId: "nse-session-label" })}
  ${indicesLiveScript()}
  `;

  return pageShell({
    title: "GIFT Nifty Live Open Gap Calculator | Market Narrative",
    description: "Live GIFT Nifty index futures price, gap calculator to predict Nifty 50 opening direction, historical gap open logs and session countdowns.",
    canonicalUrl: `${siteOrigin}/indices/gift-nifty/`,
    ogImage: socialCardUrl("indices", siteOrigin),
    head,
    bodyClass: "has-btb",
    activeHref: "/indices/",
    mobileActiveKey: "indices",
    main
  });
}
