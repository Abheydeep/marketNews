import { escapeHtml } from "./html-utils.mjs";

export function brandMarkHtml(label = "Market Narrative", idPrefix = "mn-inline") {
  return `<span class="brand-mark" aria-hidden="true">${brandMarkSvg({ title: label, idPrefix })}</span>`;
}

export function brandHeadLinks(origin = "") {
  const base = String(origin || "").replace(/\/$/, "");
  return [
    `<link rel="icon" href="${escapeHtml(`${base}/favicon.svg`)}" type="image/svg+xml">`,
    `<link rel="apple-touch-icon" href="${escapeHtml(`${base}/apple-touch-icon.svg`)}">`,
    `<link rel="manifest" href="${escapeHtml(`${base}/manifest.json`)}">`,
    `<meta name="theme-color" content="#050816">`,
    `<meta name="apple-mobile-web-app-capable" content="yes">`,
    `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`,
    `<meta name="apple-mobile-web-app-title" content="Market Narrative">`,
  ].join("\n  ");
}

export function brandMarkCss() {
  return `
    .brand .brand-mark,
    .footer-logo .brand-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      flex: 0 0 38px;
      border-radius: 12px;
      background: transparent;
      color: inherit;
      box-shadow: none;
      overflow: visible;
      padding: 0;
      line-height: 1;
    }

    .brand-mark svg {
      display: block;
      width: 100%;
      height: 100%;
    }`;
}

export function brandMarkSvg({ title = "Market Narrative", idPrefix = "mn-asset" } = {}) {
  const prefix = escapeHtml(String(idPrefix).replace(/[^a-zA-Z0-9_-]/g, "-"));
  return `<svg class="mn-logo-mark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${escapeHtml(title)}">
  <defs>
    <linearGradient id="${prefix}-bg" x1="10" y1="6" x2="88" y2="92" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#07111f"/>
      <stop offset="0.52" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="${prefix}-edge" x1="8" y1="8" x2="88" y2="88" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#67e8f9"/>
      <stop offset="0.42" stop-color="#818cf8"/>
      <stop offset="0.72" stop-color="#f43f5e"/>
      <stop offset="1" stop-color="#fbbf24"/>
    </linearGradient>
    <linearGradient id="${prefix}-stroke" x1="20" y1="30" x2="76" y2="68" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#e0f2fe"/>
      <stop offset="0.45" stop-color="#67e8f9"/>
      <stop offset="1" stop-color="#a5b4fc"/>
    </linearGradient>
    <linearGradient id="${prefix}-signal" x1="18" y1="72" x2="78" y2="38" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#34d399"/>
      <stop offset="0.52" stop-color="#22d3ee"/>
      <stop offset="1" stop-color="#fbbf24"/>
    </linearGradient>
    <filter id="${prefix}-shadow" x="-20%" y="-20%" width="140%" height="150%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#020617" flood-opacity="0.42"/>
      <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#22d3ee" flood-opacity="0.24"/>
    </filter>
  </defs>
  <rect x="7" y="7" width="82" height="82" rx="22" fill="url(#${prefix}-bg)" stroke="url(#${prefix}-edge)" stroke-width="3" filter="url(#${prefix}-shadow)"/>
  <path d="M24 67V30l15 25 14-25v37" fill="none" stroke="url(#${prefix}-stroke)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M56 67V30l20 37V30" fill="none" stroke="url(#${prefix}-stroke)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.94"/>
  <path d="M18 72c11-10 20-5 29-15 8-9 13-18 30-15" fill="none" stroke="url(#${prefix}-signal)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="78" cy="42" r="4.8" fill="#fbbf24"/>
</svg>`;
}

export function brandFaviconSvg() {
  return brandMarkSvg({ title: "Market Narrative", idPrefix: "mn-favicon" });
}

export function brandSocialCardSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">Market Narrative</title>
  <desc id="desc">Daily pre-market intelligence for Nifty, Bank Nifty, global cues, and Asian markets.</desc>
  <defs>
    <linearGradient id="card-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#030712"/>
      <stop offset="0.5" stop-color="#08111f"/>
      <stop offset="1" stop-color="#172554"/>
    </linearGradient>
    <linearGradient id="card-line" x1="96" y1="448" x2="1106" y2="258" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#34d399"/>
      <stop offset="0.45" stop-color="#22d3ee"/>
      <stop offset="0.72" stop-color="#818cf8"/>
      <stop offset="1" stop-color="#f43f5e"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#card-bg)"/>
  <path d="M96 448 C238 360 308 392 420 305 S632 173 805 220 S1010 351 1106 258" fill="none" stroke="url(#card-line)" stroke-width="16" stroke-linecap="round"/>
  <rect x="78" y="72" width="1044" height="486" rx="42" fill="#020617" opacity="0.62" stroke="#ffffff" stroke-opacity="0.16"/>
  <g transform="translate(126 118) scale(1.48)">${brandMarkSvg({ title: "Market Narrative", idPrefix: "mn-social" }).replace("<svg class=\"mn-logo-mark\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 96 96\" role=\"img\" aria-label=\"Market Narrative\">", "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 96 96\">").replace("</svg>", "</svg>")}</g>
  <text x="292" y="174" fill="#67e8f9" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="800" letter-spacing="6">MARKET NARRATIVE</text>
  <text x="126" y="318" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="76" font-weight="900">Daily Pre-Market Intelligence</text>
  <text x="126" y="398" fill="#cbd5e1" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="650">Nifty, Bank Nifty, global cues, Asia watch, charts, and source-backed context.</text>
  <text x="126" y="496" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="800">marketnarrative.in</text>
</svg>
`;
}
