import { brandHeadLinks, brandMarkCss, brandMarkHtml } from "./brand-assets.mjs";
import { escapeHtml } from "./html-utils.mjs";
import { DISCLAIMER_COMPACT } from "./site-constants.mjs";
import { bottomTabBarCss, bottomTabBarHtml, mobileShellScript, mobileTypographyCss, proPolishCss } from "./mobile-shell.mjs";
import { siteThemeCss } from "./site-theme.mjs";
import { siteHeaderHtml, siteHeaderCss, siteFooterHtml, siteFooterCss } from "./site-chrome.mjs";
import { multibaggerState } from "./multibagger-data.mjs";
import { brandedTitle, publicSiteOrigin, socialCardUrl } from "./public-page-registry.mjs";
import { sanitizePublicHtml } from "./public-copy-sanitizer.mjs";
import { legacyPublicPageShell } from "./legacy-public-shell.mjs";

const siteOrigin = publicSiteOrigin();
const adminSiteOrigin = process.env.ADMIN_SITE_ORIGIN ?? "https://admin.marketnarrative.in";
const apiOrigin = process.env.MARKET_NARRATIVE_API_BASE ?? "https://api.marketnarrative.in";

export function multibaggerPage(state = multibaggerState(), options = {}) {
  const serializedState = JSON.stringify(state).replaceAll("<", "\\u003c");
  const pageTitle = brandedTitle("Multibagger Model Tracker");
  const modelCount = state.holdings?.length ?? 0;
  const pageDescription = "A public Market Narrative research model tracking a normalized Rs 5 lakh Indian equities baseline, methodology, investor discipline, review history, and public-safe performance updates.";
  const canonicalUrl = `${siteOrigin}/multibagger/`;
  const previewImageUrl = `${siteOrigin}/og-portfolio.svg`;
  const latestBriefingHref = absoluteHref(options.latestBriefingPath ?? "/", siteOrigin);
  const tradingGuideHref = `${latestBriefingHref.replace(/#.*$/, "").replace(/\/?$/, "/")}trading-guide/`;
  const renderedPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  ${brandHeadLinks(siteOrigin)}
  <meta name="description" content="${escapeHtml(pageDescription)}">
  <meta name="author" content="Editorial Desk">
  <meta name="keywords" content="Market Narrative multibagger, Indian equities model tracker, KPEL, Dhabriya Polywood, Sharda Motor, public portfolio tracker">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <meta name="theme-color" content="#050816">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="en_IN">
  <meta property="og:site_name" content="Market Narrative">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDescription)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:image" content="${escapeHtml(previewImageUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(pageDescription)}">
  <meta name="twitter:image" content="${escapeHtml(previewImageUrl)}">
  <title>${escapeHtml(pageTitle)}</title>
  <script type="application/ld+json">${jsonLdPayload(multibaggerJsonLd(pageTitle, pageDescription, canonicalUrl, modelCount))}</script>
  <style>
    * { box-sizing: border-box; }

    html, body { overflow-x: hidden; }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 12% 0%, rgba(34, 211, 238, 0.28), transparent 30vw),
        radial-gradient(circle at 86% 4%, rgba(96, 165, 250, 0.26), transparent 34vw),
        linear-gradient(135deg, #030712 0%, #07111f 46%, #111827 100%);
      color: var(--ink);
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    a { color: inherit; text-decoration: none; }

    .shell {
      width: min(1120px, calc(100% - 36px));
      margin: 0 auto;
    }

    .share-panel {
      display: grid;
      gap: 10px;
      margin-top: 14px;
    }

    .share-panel-title {
      color: #dbeafe;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .share-actions {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }

    .share-action {
      align-items: center;
      border: 1px solid rgba(52, 211, 153, 0.34);
      border-radius: 8px;
      background: rgba(52, 211, 153, 0.12);
      color: #d1fae5;
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-size: 12px;
      font-weight: 850;
      justify-content: center;
      min-height: 38px;
      padding: 8px 10px;
      text-align: center;
    }

    .share-action.copy {
      color: #dbeafe;
      background: rgba(96, 165, 250, 0.12);
      border-color: rgba(96, 165, 250, 0.34);
    }

    .share-icon {
      display: block;
      height: 18px;
      width: 18px;
    }

    .sr-only {
      border: 0;
      clip: rect(0, 0, 0, 0);
      height: 1px;
      margin: -1px;
      overflow: hidden;
      padding: 0;
      position: absolute;
      white-space: nowrap;
      width: 1px;
    }

    .share-action:focus-visible,
    .tab-link:focus-visible,
    details.panel summary:focus-visible {
      outline: 2px solid var(--cyan);
      outline-offset: 3px;
    }

    .hero {
      padding: 56px 0 26px;
      display: grid;
      gap: 24px;
      grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
      align-items: end;
    }

    .eyebrow {
      color: var(--cyan);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin: 0 0 12px;
    }

    h1 {
      margin: 0;
      font-size: clamp(40px, 7vw, 76px);
      line-height: 0.98;
      letter-spacing: 0;
    }

    .hero p {
      color: var(--muted);
      font-size: 17px;
      line-height: 1.7;
      margin: 16px 0 0;
      max-width: 780px;
    }

    .hero-stat {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--panel);
      padding: 18px;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.22);
    }

    .hero-stat span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .hero-stat strong {
      display: block;
      margin-top: 8px;
      font-size: clamp(28px, 4vw, 42px);
      line-height: 1;
    }

    .hero-stat p {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.55;
      margin: 12px 0 0;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin: 18px 0 24px;
    }

    .return-strip {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 12px;
      margin: 18px 0 12px;
    }

    .metric {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.58);
      padding: 15px;
    }

    .metric span {
      color: var(--muted);
      display: block;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .metric strong {
      display: block;
      margin-top: 8px;
      font-size: clamp(18px, 2vw, 24px);
      line-height: 1.15;
    }

    .metric small {
      color: var(--muted);
      display: block;
      font-size: 12px;
      font-weight: 750;
      line-height: 1.45;
      margin-top: 7px;
    }

    .return-strip.prefill {
      grid-template-columns: 1.05fr 1fr 1fr 0.9fr;
    }

    .tracking-rail {
      border: 1px solid rgba(34, 211, 238, 0.24);
      border-radius: 10px;
      background: rgba(15, 23, 42, 0.64);
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin: 0 0 18px;
      padding: 12px;
    }

    .tracking-chip {
      border: 1px solid rgba(255, 255, 255, 0.10);
      border-radius: 8px;
      background: rgba(2, 6, 23, 0.28);
      color: #d7e0ee;
      display: grid;
      gap: 4px;
      min-height: 64px;
      padding: 11px 12px;
    }

    .tracking-chip span {
      color: var(--cyan);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .tracking-chip strong {
      color: #fff;
      font-size: 14px;
      line-height: 1.3;
    }

    .positive { color: var(--green) !important; }
    .negative { color: var(--red) !important; }
    .neutral { color: #dbeafe !important; }
    .stale { color: var(--amber) !important; }

    .price-status {
      border: 1px solid rgba(251, 191, 36, 0.24);
      border-radius: 8px;
      background: rgba(251, 191, 36, 0.08);
      color: #fde68a;
      display: flex;
      justify-content: space-between;
      gap: 14px;
      margin: 0 0 16px;
      padding: 12px 14px;
      font-size: 13px;
      line-height: 1.55;
    }

    .price-status.fresh {
      border-color: rgba(52, 211, 153, 0.28);
      background: rgba(52, 211, 153, 0.08);
      color: #bbf7d0;
    }

    .performance-note {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
      margin: 0 0 24px;
    }

    .execution-status {
      border: 1px solid rgba(34, 211, 238, 0.26);
      border-radius: 8px;
      background: rgba(34, 211, 238, 0.08);
      color: #d7e0ee;
      display: grid;
      gap: 4px;
      margin: 0 0 18px;
      padding: 13px 14px;
    }

    .execution-status strong {
      color: #fff;
      font-size: 14px;
    }

    .execution-status span {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.55;
    }

    .allocation-visual {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: rgba(15, 23, 42, 0.62);
      display: grid;
      grid-template-columns: minmax(240px, 0.75fr) minmax(0, 1.25fr);
      gap: 22px;
      margin: 18px 0 22px;
      padding: 20px;
      box-shadow: 0 20px 70px rgba(0, 0, 0, 0.18);
    }

    .holdings-showcase {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: rgba(15, 23, 42, 0.62);
      margin: 18px 0 22px;
      padding: 20px;
    }

    .reader-orientation {
      border: 1px solid rgba(34, 211, 238, 0.22);
      border-radius: 10px;
      background: rgba(15, 23, 42, 0.62);
      display: grid;
      gap: 14px;
      margin: 0 0 22px;
      padding: 18px;
    }

    .reader-orientation h2 {
      color: #fff;
      font-size: 22px;
      line-height: 1.12;
      margin: 0;
    }

    .reader-orientation p {
      color: var(--muted);
      line-height: 1.55;
      margin: 0;
      max-width: 820px;
    }

    .orientation-steps {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }

    .orientation-step {
      border: 1px solid rgba(255, 255, 255, 0.10);
      border-radius: 8px;
      background: rgba(2, 6, 23, 0.32);
      display: grid;
      gap: 5px;
      min-height: 104px;
      padding: 12px;
    }

    .orientation-step span {
      color: var(--cyan);
      font-size: 10px;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .orientation-step strong {
      color: #fff;
      font-size: 15px;
      line-height: 1.25;
    }

    .orientation-step small {
      color: var(--muted);
      font-size: 12px;
      font-weight: 720;
      line-height: 1.45;
    }

    .section-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin: 0 0 16px;
    }

    .section-head h2 {
      color: #fff;
      font-size: 24px;
      line-height: 1.1;
      margin: 0 0 8px;
    }

    .section-head p:last-child {
      color: var(--muted);
      line-height: 1.55;
      margin: 0;
    }

    .allocation-donut-wrap {
      align-items: center;
      display: grid;
      gap: 12px;
      justify-items: center;
    }

    .allocation-donut {
      align-items: center;
      aspect-ratio: 1;
      background: var(--donut);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 50%;
      display: grid;
      justify-items: center;
      max-width: 250px;
      position: relative;
      width: 100%;
    }

    .allocation-donut::after {
      background: #081120;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 50%;
      content: "";
      inset: 23%;
      position: absolute;
    }

    .donut-center {
      color: #fff;
      display: grid;
      font-size: 28px;
      font-weight: 950;
      gap: 4px;
      line-height: 1;
      position: relative;
      text-align: center;
      z-index: 1;
    }

    .donut-center span {
      color: var(--muted);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .donut-caption {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
      text-align: center;
    }

    .allocation-legend {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .allocation-legend-disclosure {
      align-self: center;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      background: rgba(2, 6, 23, 0.28);
      overflow: hidden;
    }

    .allocation-legend-disclosure > summary {
      align-items: center;
      cursor: pointer;
      display: flex;
      gap: 12px;
      justify-content: space-between;
      list-style: none;
      padding: 14px;
    }

    .allocation-legend-disclosure > summary::-webkit-details-marker {
      display: none;
    }

    .allocation-legend-title {
      display: grid;
      gap: 4px;
    }

    .allocation-legend-title strong {
      color: #fff;
      font-size: 16px;
      line-height: 1.2;
    }

    .allocation-legend-title span {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.4;
    }

    .allocation-legend-disclosure .allocation-legend {
      border-top: 1px solid var(--line);
      padding: 12px;
    }

    .legend-item {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      background: rgba(2, 6, 23, 0.32);
      display: grid;
      gap: 6px;
      padding: 12px;
    }

    .legend-top {
      align-items: center;
      display: flex;
      gap: 9px;
      justify-content: space-between;
    }

    .legend-name {
      align-items: center;
      color: #fff;
      display: inline-flex;
      font-size: 14px;
      font-weight: 950;
      gap: 8px;
    }

    .legend-dot {
      border-radius: 999px;
      display: inline-block;
      height: 11px;
      width: 11px;
    }

    .legend-weight {
      color: var(--green);
      font-size: 13px;
      font-weight: 950;
      white-space: nowrap;
    }

    .legend-item p {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
      margin: 0;
    }

    .module-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      margin: 22px 0 0;
    }

    .module-grid .performance-panel { order: 1; }
    .module-grid .holdings-panel { order: 2; }
    .module-grid .why-panel { order: 3; }
    .module-grid .evidence-panel { order: 4; }
    .module-grid .reviews-panel { order: 5; }
    .module-grid .watchlist-panel { order: 6; }
    .module-grid .sources-panel { order: 7; }
    .module-grid .research-framework-panel { order: 8; }

    details.panel {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.74);
      margin: 0;
      min-height: 0;
      order: 10;
      overflow: hidden;
      position: relative;
      box-shadow: 0 14px 48px rgba(0, 0, 0, 0.16);
      isolation: isolate;
    }

    .module-grid details.panel[open] {
      grid-column: 1 / -1;
      min-height: 0;
    }

    .module-grid details.panel:not([open]) {
      min-height: 132px;
    }

    .module-grid details.panel:not([open])::before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: 4px;
      background: var(--cyan);
      opacity: 0.72;
      pointer-events: none;
      z-index: 0;
    }

    details.panel summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      cursor: pointer;
      padding: 18px 20px;
      list-style: none;
    }

    .module-grid details.panel:not([open]) summary {
      align-items: flex-start;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-rows: auto 1fr;
      min-height: 132px;
      padding: 18px 18px 16px 22px;
    }

    .module-grid details.panel[open] summary {
      min-height: 0;
    }

    details.panel summary::-webkit-details-marker { display: none; }

    .summary-title {
      display: grid;
      gap: 4px;
    }

    .summary-title strong {
      font-size: 18px;
    }

    .module-grid details.panel:not([open]) .summary-title strong {
      font-size: 19px;
      line-height: 1.18;
    }

    .summary-title span {
      color: var(--muted);
      font-size: 13px;
    }

    .module-grid details.panel:not([open]) .summary-title span {
      font-size: 13px;
      line-height: 1.45;
    }

    .detail-toggle {
      align-items: center;
      border: 1px solid rgba(34, 211, 238, 0.34);
      border-radius: 8px;
      color: var(--cyan);
      display: inline-flex;
      flex: 0 0 auto;
      font-size: 12px;
      font-weight: 900;
      height: 32px;
      justify-content: center;
      line-height: 1;
      min-width: 104px;
      padding: 0 10px;
      white-space: nowrap;
    }

    .hide-label { display: none; }
    details[open] > summary .show-label { display: none; }
    details[open] > summary .hide-label { display: inline; }

    .module-preview {
      display: none;
    }

    .module-grid details.panel:not([open]) .module-preview {
      align-self: end;
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      grid-column: 1 / -1;
      margin-top: 18px;
      padding-right: 112px;
    }

    .preview-pill {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 999px;
      background: rgba(2, 6, 23, 0.32);
      color: #d7e0ee;
      display: inline-flex;
      font-size: 12px;
      font-weight: 850;
      line-height: 1;
      padding: 7px 9px;
      white-space: nowrap;
    }

    .panel-body {
      border-top: 1px solid var(--line);
      padding: 18px 20px 20px;
    }

    .table-wrap {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border: 1px solid var(--line);
      border-radius: 8px;
      scrollbar-width: thin;
    }

    table {
      width: 100%;
      min-width: 720px;
      border-collapse: collapse;
    }

    th, td {
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid rgba(255, 255, 255, 0.10);
      padding: 12px 13px;
      font-size: 14px;
      line-height: 1.55;
    }

    th {
      color: #dbeafe;
      background: rgba(30, 41, 59, 0.76);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .th-note {
      color: var(--muted);
      display: block;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0;
      margin-top: 3px;
      text-transform: none;
    }

    td { color: #d7e0ee; }

    tr:last-child td { border-bottom: 0; }

    .price-cell {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .holdings-table {
      table-layout: fixed;
      min-width: 1040px;
    }

    .holdings-table th,
    .holdings-table td {
      padding: 11px 12px;
      vertical-align: middle;
    }

    .holdings-table .col-ticker { width: 13%; }
    .holdings-table .col-weight { width: 8%; }
    .holdings-table .col-deployed { width: 12%; }
    .holdings-table .col-entry { width: 10%; }
    .holdings-table .col-current { width: 32%; }
    .holdings-table .col-return { width: 8%; }
    .holdings-table .col-pnl { width: 9%; }
    .holdings-table .col-day { width: 8%; }

    .holding-name-line {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .quote-source-line {
      line-height: 1.35;
      margin-top: 4px;
      max-width: 380px;
      white-space: normal;
    }

    .entry-source-line {
      line-height: 1.35;
      margin-top: 4px;
      white-space: normal;
    }

    .ticker {
      color: #fff;
      display: block;
      font-weight: 950;
      white-space: nowrap;
    }

    .subtext {
      color: var(--muted);
      display: block;
      font-size: 12px;
      margin-top: 2px;
    }

    .allocation-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .holding-card-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin: 0 0 14px;
    }

    .holding-card {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      background: rgba(2, 6, 23, 0.38);
      overflow: hidden;
      padding: 0;
    }

    .holding-card[open] {
      border-color: rgba(34, 211, 238, 0.28);
      background: rgba(2, 6, 23, 0.46);
    }

    .holding-card > summary {
      cursor: pointer;
      display: grid;
      gap: 12px;
      list-style: none;
      padding: 15px;
    }

    .holding-card > summary::-webkit-details-marker {
      display: none;
    }

    .holding-card > summary .detail-toggle {
      justify-self: start;
    }

    .holding-card-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }

    .holding-card-title {
      display: grid;
      gap: 3px;
    }

    .holding-card-title strong {
      color: #fff;
      font-size: 20px;
      font-weight: 950;
      line-height: 1;
    }

    .holding-card-title span {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }

    .holding-card-role {
      border: 1px solid rgba(34, 211, 238, 0.28);
      border-radius: 999px;
      color: #cffafe;
      font-size: 12px;
      font-weight: 900;
      height: fit-content;
      padding: 5px 8px;
      text-align: right;
      white-space: nowrap;
    }

    .holding-card-closed-metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }

    .holding-card-body {
      border-top: 1px solid var(--line);
      display: grid;
      gap: 12px;
      padding: 14px 15px 15px;
    }

    .holding-card-summary {
      color: #dbeafe;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.5;
      margin: 0;
    }

    .holding-card-key-metrics {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .holding-card-metrics {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .holding-card-stat {
      border: 1px solid rgba(255, 255, 255, 0.10);
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.54);
      display: grid;
      gap: 3px;
      min-height: 62px;
      padding: 9px;
    }

    .holding-card-stat span {
      color: var(--muted);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .holding-card-stat strong {
      color: #fff;
      font-size: 14px;
      line-height: 1.25;
    }

    .holding-card-stat.movement {
      background: rgba(15, 23, 42, 0.72);
      border-color: rgba(34, 211, 238, 0.20);
    }

    .holding-card-stat.movement strong {
      font-size: 18px;
    }

    .holding-card-key-metrics .holding-card-stat {
      min-height: 66px;
      padding: 9px;
    }

    .holding-card-key-metrics .holding-card-stat strong {
      font-size: 16px;
    }

    .holding-card-secondary {
      border: 1px solid rgba(255, 255, 255, 0.10);
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.24);
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      opacity: 0.82;
      padding: 8px;
    }

    .holding-card-secondary span {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.4;
    }

    .holding-card-secondary strong {
      color: #dbeafe;
      display: block;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
      margin-bottom: 3px;
      text-transform: uppercase;
    }

    .holding-card-foot {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: space-between;
    }

    .ledger-disclosure {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      background: rgba(2, 6, 23, 0.24);
      overflow: hidden;
    }

    .ledger-disclosure > summary {
      align-items: center;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      list-style: none;
      padding: 14px;
    }

    .ledger-disclosure > summary::-webkit-details-marker { display: none; }

    .ledger-disclosure-body {
      border-top: 1px solid var(--line);
      padding: 14px;
    }

    .allocation-tile {
      position: relative;
      min-height: 178px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 8px;
      background: rgba(2, 6, 23, 0.46);
      padding: 16px;
      display: grid;
      align-content: space-between;
      gap: 14px;
      isolation: isolate;
    }

    .allocation-tile::before {
      content: "";
      position: absolute;
      inset: auto 0 0;
      height: var(--tile-fill);
      background: linear-gradient(135deg, rgba(34, 211, 238, 0.28), rgba(52, 211, 153, 0.20));
      z-index: -1;
    }

    .allocation-tile:nth-child(2)::before,
    .allocation-tile:nth-child(5)::before {
      background: linear-gradient(135deg, rgba(96, 165, 250, 0.28), rgba(251, 191, 36, 0.16));
    }

    .allocation-tile:nth-child(3)::before,
    .allocation-tile:nth-child(6)::before {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(34, 211, 238, 0.18));
    }

    .allocation-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }

    .allocation-ticker {
      color: #fff;
      font-size: 24px;
      font-weight: 950;
      line-height: 1;
    }

    .allocation-weight {
      color: var(--green);
      font-size: 28px;
      font-weight: 950;
      line-height: 1;
      white-space: nowrap;
    }

    .allocation-role {
      color: #d7e0ee;
      font-size: 14px;
      line-height: 1.45;
      margin: 0;
    }

    .allocation-status {
      color: var(--muted);
      display: block;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .allocation-quote {
      align-items: center;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 999px;
      display: inline-flex;
      font-size: 12px;
      font-weight: 900;
      justify-self: start;
      padding: 5px 8px;
      width: fit-content;
    }

    .stock-link {
      color: #a7f3d0;
      display: inline-flex;
      font-size: 12px;
      font-weight: 900;
      margin-top: 0;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .role-legend {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      background: rgba(2, 6, 23, 0.30);
      display: grid;
      gap: 9px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin: 0 0 14px;
      padding: 12px;
    }

    .role-legend span {
      color: #d7e0ee;
      font-size: 12px;
      line-height: 1.45;
    }

    .role-legend strong {
      color: #fff;
      display: block;
      font-size: 12px;
      margin-bottom: 2px;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .method-snapshot,
    .method-strip,
    .regime-snapshot,
    .discipline-snapshot {
      border: 1px solid rgba(34, 211, 238, 0.26);
      border-radius: 10px;
      background: rgba(2, 6, 23, 0.42);
      margin: 0 0 18px;
      padding: 17px;
    }

    .regime-snapshot {
      border-color: rgba(52, 211, 153, 0.24);
    }

    .discipline-snapshot {
      border-color: rgba(251, 191, 36, 0.28);
      margin-bottom: 0;
    }

    .method-snapshot-head,
    .method-strip-head,
    .regime-snapshot-head,
    .discipline-snapshot-head {
      align-items: end;
      display: flex;
      gap: 14px;
      justify-content: space-between;
      margin: 0 0 12px;
    }

    .method-snapshot-head span,
    .method-strip-head span,
    .method-pill span,
    .regime-snapshot-head span,
    .regime-pill span,
    .discipline-snapshot-head span,
    .discipline-card span,
    .evidence-card span {
      color: var(--cyan);
      display: block;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .regime-snapshot-head span,
    .regime-pill span {
      color: var(--green);
    }

    .discipline-snapshot-head span,
    .discipline-card span {
      color: var(--amber);
    }

    .method-snapshot-head strong,
    .method-strip-head strong,
    .regime-snapshot-head strong,
    .discipline-snapshot-head strong {
      color: #fff;
      font-size: 17px;
      line-height: 1.35;
      text-align: right;
    }

    .method-snapshot-grid,
    .method-strip-grid,
    .regime-snapshot-grid,
    .discipline-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .method-snapshot-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .method-strip {
      margin: 18px 0 18px;
    }

    .method-strip-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .method-pill,
    .regime-pill,
    .discipline-card {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.56);
      padding: 13px;
    }

    .method-pill p,
    .regime-pill p,
    .discipline-card p,
    .evidence-card p,
    .evidence-card li {
      color: #d7e0ee;
      font-size: 14px;
      line-height: 1.55;
      margin: 7px 0 0;
    }

    .regime-pill a,
    .evidence-card a {
      color: #a7f3d0;
      display: inline-block;
      font-size: 12px;
      font-weight: 900;
      margin-top: 10px;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .evidence-card ul {
      margin: 8px 0 0;
      padding-left: 18px;
    }

    .mini-card {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      background: rgba(2, 6, 23, 0.38);
      padding: 15px;
    }

    .mini-card h3 {
      margin: 0 0 8px;
      font-size: 17px;
    }

    .mini-card p {
      color: var(--muted);
      margin: 0;
      font-size: 14px;
      line-height: 1.62;
    }

    .watchlist-lead {
      border: 1px solid rgba(34, 211, 238, 0.18);
      border-radius: 8px;
      background: rgba(34, 211, 238, 0.08);
      color: #d7e0ee;
      font-size: 14px;
      line-height: 1.55;
      margin: 0 0 12px;
      padding: 11px 12px;
    }

    .watch-pressure {
      border-radius: 999px;
      display: inline-flex;
      font-size: 12px;
      font-weight: 900;
      line-height: 1;
      margin: 0 0 10px;
      padding: 6px 8px;
      text-transform: uppercase;
    }

    .watch-pressure.high {
      background: rgba(251, 113, 133, 0.18);
      border: 1px solid rgba(251, 113, 133, 0.42);
      color: #fecdd3;
    }

    .watch-pressure.medium {
      background: rgba(251, 191, 36, 0.18);
      border: 1px solid rgba(251, 191, 36, 0.38);
      color: #fde68a;
    }

    .watch-pressure.low {
      background: rgba(52, 211, 153, 0.18);
      border: 1px solid rgba(52, 211, 153, 0.38);
      color: #bbf7d0;
    }

    .decision {
      display: inline-flex;
      border: 1px solid rgba(52, 211, 153, 0.45);
      border-radius: 999px;
      background: rgba(52, 211, 153, 0.12);
      color: #a7f3d0;
      padding: 4px 9px;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }

    .watch-flags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
    }

    .watch-flag {
      border-radius: 999px;
      color: #fff;
      display: inline-flex;
      font-size: 12px;
      font-weight: 900;
      line-height: 1;
      padding: 6px 8px;
    }

    .watch-flag.green {
      background: rgba(52, 211, 153, 0.20);
      border: 1px solid rgba(52, 211, 153, 0.44);
      color: #bbf7d0;
    }

    .watch-flag.yellow {
      background: rgba(251, 191, 36, 0.18);
      border: 1px solid rgba(251, 191, 36, 0.38);
      color: #fde68a;
    }

    .watch-flag.red {
      background: rgba(251, 113, 133, 0.18);
      border: 1px solid rgba(251, 113, 133, 0.42);
      color: #fecdd3;
    }

    .note {
      border-left: 4px solid var(--amber);
      background: rgba(251, 191, 36, 0.10);
      border-radius: 8px;
      color: #fde68a;
      padding: 14px 16px;
      line-height: 1.65;
    }

    footer {
      color: var(--muted);
      padding: 28px 0 48px;
      font-size: 13px;
      line-height: 1.65;
    }

    @media (max-width: 900px) {
      .hero,
      .summary-grid,
      .return-strip,
      .return-strip.prefill,
      .allocation-visual,
      .tracking-rail,
      .module-grid,
      .allocation-grid,
      .orientation-steps,
      .holding-card-closed-metrics,
      .holding-card-key-metrics,
      .holding-card-metrics,
      .holding-card-secondary {
        grid-template-columns: 1fr;
      }

      .holding-card-grid,
      .role-legend,
      .method-snapshot-grid,
      .method-strip-grid,
      .regime-snapshot-grid,
      .discipline-grid,
      .cards {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .allocation-legend {
        grid-template-columns: 1fr;
      }

      .method-snapshot-head,
      .method-strip-head,
      .regime-snapshot-head,
      .discipline-snapshot-head {
        align-items: flex-start;
        flex-direction: column;
      }

      .method-snapshot-head strong,
      .method-strip-head strong,
      .regime-snapshot-head strong,
      .discipline-snapshot-head strong {
        text-align: left;
      }
    }

    @media (max-width: 600px) {
      .holding-card-grid,
      .role-legend,
      .method-snapshot-grid,
      .method-strip-grid,
      .regime-snapshot-grid,
      .discipline-grid,
      .cards {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 760px) {
      details.panel summary {
        padding: 16px;
      }

      .section-head {
        align-items: flex-start;
        flex-direction: column;
      }

      .module-grid details.panel:not([open]) summary {
        grid-template-columns: 1fr;
        min-height: 0;
      }

      .module-grid details.panel:not([open]),
      .module-grid details.panel:not([open]) summary {
        min-height: 0;
      }

      .module-grid details.panel:not([open]) .module-preview {
        padding-right: 0;
      }

      .detail-toggle {
        justify-self: start;
        min-height: 44px;
      }

      .table-wrap {
        margin-left: -4px;
        margin-right: -4px;
      }

      table {
        min-width: 680px;
      }

      .holdings-table {
        min-width: 980px;
      }

      .module-grid details.panel:not([open]) summary {
        padding: 18px;
      }

      .panel-body {
        padding: 16px;
      }
    }
    ${proPolishCss()}
  </style>
</head>
<body class="glass-v2 has-btb">
  <a class="mn-skip" href="#mn-main">Skip to content</a>
  ${siteHeaderHtml("/multibagger/")}

  <main id="mn-main" class="shell">
    <header class="hero">
      <div>
        <p class="eyebrow">Market Narrative Research</p>
        <h1>Market Narrative Multibagger Portfolio</h1>
        <p>A public ${escapeHtml(modelCount)}-stock ₹5 lakh model portfolio tracking entries, latest verified prices, P&amp;L, evidence, and monthly keep-or-replace decisions.</p>
      </div>
      <aside class="hero-stat">
        <span>Model status</span>
        <strong id="portfolioReturn" class="${toneClass(state.performance.sinceLaunchPercent)}">${escapeHtml(heroStatusLabel(state))}</strong>
        <p id="shareTrackerStatus">${escapeHtml(heroRefreshText(state))}</p>
        <div class="share-panel" aria-label="Share this public tracker">
          <span class="share-panel-title">Share this public tracker</span>
          <div class="share-actions">
            ${shareActionsHtml(canonicalUrl)}
          </div>
        </div>
      </aside>
    </header>

    <section class="reader-orientation" aria-label="How to read this page">
      <div>
        <p class="eyebrow">How to read this page</p>
        <h2>Start with the live model, then open details only when you need evidence.</h2>
        <p>The public tracker is dense by design, so the default path is compact: current slots first, performance second, methodology third, and the full ledger only for audit.</p>
      </div>
      <div class="orientation-steps">
        <article class="orientation-step"><span>1</span><strong>Slots</strong><small>Five collapsed holdings show ticker, role, weight, return, day move, and current price.</small></article>
        <article class="orientation-step"><span>2</span><strong>Performance</strong><small>Use the metric rail for model value, public baseline, and quote freshness.</small></article>
        <article class="orientation-step"><span>3</span><strong>Evidence</strong><small>Open research modules when you want thesis, proof gaps, and source boundaries.</small></article>
        <article class="orientation-step"><span>4</span><strong>Ledger</strong><small>Open the detailed table only when you need entries, timestamps, and Screener links.</small></article>
      </div>
    </section>

    <section class="holdings-showcase" aria-label="Current model holdings">
      <div class="section-head">
        <div>
          <p class="eyebrow">Holdings first</p>
          <h2>Five public model slots</h2>
          <p>Start with what is owned, why it is there, and how it is moving since the public entry timestamp.</p>
        </div>
      </div>
      <div class="holding-card-grid" id="modelHoldingCards">
        ${holdingCardsHtml(state.holdings)}
      </div>
    </section>

    ${performanceStripHtml(state)}
    ${trackingRailHtml(state)}

    <section class="allocation-visual" aria-label="Portfolio allocation visual">
      <div class="allocation-donut-wrap">
        <div class="allocation-donut" style="--donut:${escapeHtml(allocationDonutGradient(state.holdings))};" role="img" aria-label="Portfolio allocation donut chart for the ${escapeHtml(modelCount)} stock model">
          <div class="donut-center">${escapeHtml(modelCount)}<span>stock model</span></div>
        </div>
        <p class="donut-caption">Weights are normalized to Rs 5 lakh. Current value, return, and P&L move with the latest verified public quote refresh.</p>
      </div>
      <details class="allocation-legend-disclosure">
        <summary>
          <span class="allocation-legend-title"><strong>Allocation breakdown</strong><span>Open only when you want the full slot-to-weight map.</span></span>
          ${detailToggleHtml()}
        </summary>
        <div class="allocation-legend">
          ${state.holdings.map((holding, index) => `
          <article class="legend-item">
            <div class="legend-top">
              <span class="legend-name"><span class="legend-dot" style="background:${holdingColor(index)}"></span>${escapeHtml(holding.ticker)}</span>
              <strong class="legend-weight">${formatPercent(holding.targetWeight)}</strong>
            </div>
            <p><strong>${escapeHtml(displayLabelForHolding(holding))}:</strong> ${escapeHtml(holding.rolePlain ?? holding.role)}</p>
          </article>`).join("")}
        </div>
      </details>
    </section>

    ${methodStripHtml(state)}

    <section class="module-grid" aria-label="Expandable portfolio research modules">
      <details class="panel performance-panel" open>
        <summary>
          <span class="summary-title"><strong>Performance</strong><span>Public baseline, live quote refresh, and benchmark context.</span></span>
          ${detailToggleHtml()}
          <span class="module-preview"><span class="preview-pill">₹5 lakh baseline</span><span class="preview-pill">Entry timestamp</span><span class="preview-pill">Latest quotes</span></span>
        </summary>
        <div class="panel-body">
          <p class="note">Performance is shown in the top metric rail. The holdings cards above show stock-level return, P&amp;L, and day move so this section does not repeat the same five names again.</p>
        </div>
      </details>

      <details class="panel holdings-panel">
        <summary>
          <span class="summary-title"><strong>Holdings</strong><span>Detailed ledger for normalized Rs 5 lakh allocation, entries, quotes, return, P&L, and day move.</span></span>
          ${detailToggleHtml()}
          <span class="module-preview"><span class="preview-pill">Detailed ledger</span><span class="preview-pill">Entry timestamp</span><span class="preview-pill">Screener links</span></span>
        </summary>
        <div class="panel-body">
          <details class="ledger-disclosure" id="detailedLedger">
            <summary><strong>Detailed Ledger</strong>${detailToggleHtml()}</summary>
            <div class="ledger-disclosure-body">
              <div class="role-legend" aria-label="Plain-English role legend">
                <span><strong>Core staged</strong> Larger allocation, but still staged until working-capital proof holds.</span>
                <span><strong>Capped slot</strong> Upside exists, but execution, margin, or liquidity proof limits sizing.</span>
                <span><strong>Quality slot</strong> Cleaner business quality with more measured upside torque.</span>
                <span><strong>Speculative cap</strong> Optionality only; governance and cash-flow evidence must improve.</span>
              </div>
              <div class="table-wrap">
                <table class="holdings-table">
                  <colgroup>
                    <col class="col-ticker">
                    <col class="col-weight">
                    <col class="col-deployed">
                    <col class="col-entry">
                    <col class="col-current">
                    <col class="col-return">
                    <col class="col-pnl">
                    <col class="col-day">
                  </colgroup>
                  <thead><tr><th>Ticker</th><th>Weight</th><th>₹5 lakh deployed</th><th>Avg entry<span class="th-note">Entry timestamp</span></th><th id="latestPriceColumnLabel">${latestPriceColumnText(state)}</th><th>Return</th><th>P&amp;L</th><th>Day</th></tr></thead>
                  <tbody id="modelHoldingsRows">
                    ${holdingsRowsHtml(state.holdings)}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </div>
      </details>

      <details class="panel why-panel">
        <summary>
          <span class="summary-title"><strong>Why These 5</strong><span>Why each stock belongs, and what would force a change.</span></span>
          ${detailToggleHtml()}
          <span class="module-preview"><span class="preview-pill">Thesis</span><span class="preview-pill">Buy rule</span><span class="preview-pill">Break rule</span></span>
        </summary>
        <div class="panel-body">
          <div class="cards">
            ${state.holdings.map((holding) => `
            <article class="mini-card">
              <h3>${escapeHtml(holding.ticker)} - ${escapeHtml(displayLabelForHolding(holding))}</h3>
              <p><strong>Thesis:</strong> ${escapeHtml(holding.thesis)}</p>
              <p><strong>Buy rule:</strong> ${escapeHtml(holding.buyRule)}</p>
              <p><strong>Break rule:</strong> ${escapeHtml(holding.breakRule)}</p>
              <p><strong>Profitability:</strong> ${escapeHtml(holding.profitabilityLens ?? "")}</p>
              <p><strong>Valuation:</strong> ${escapeHtml(holding.valuationLens ?? "")}</p>
              <p><strong>Growth catalyst:</strong> ${escapeHtml(holding.growthCatalyst ?? "")}</p>
              <p><strong>Conversion risk:</strong> ${escapeHtml(holding.conversionRisk ?? "")}</p>
              <p><strong>Capital structure:</strong> ${escapeHtml(holding.capitalStructureRisk ?? "")}</p>
            </article>`).join("")}
          </div>
          <p class="note" style="margin-top:12px;">The public model ignores the larger deployed rupee total and normalizes everything to Rs 5 lakh. CPCL remains outside this model because refinery-cycle value is not treated as permanent compounding.</p>
        </div>
      </details>

      <details class="panel evidence-panel">
        <summary>
          <span class="summary-title"><strong>Evidence Ledger</strong><span>Dated facts supporting each model slot, plus the proof still needed.</span></span>
          ${detailToggleHtml()}
          <span class="module-preview"><span class="preview-pill">${escapeHtml(modelCount)} tickers</span><span class="preview-pill">Source backed</span><span class="preview-pill">Proof gaps</span></span>
        </summary>
        <div class="panel-body">
          <div class="cards">
            ${(state.researchEvidence?.holdingEvidence ?? []).map((item) => `
            <article class="mini-card evidence-card">
              <h3>${escapeHtml(item.ticker)}</h3>
              <span>Verified Evidence</span>
              <ul>
                ${(item.evidence ?? []).map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
              </ul>
              <p><strong>Needs proof:</strong> ${escapeHtml(item.needsProof)}</p>
              <a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.sourceLabel)}</a>
            </article>`).join("")}
          </div>
          <p class="note" style="margin-top:12px;">${escapeHtml((state.researchEvidence?.researchBoundaries ?? [])[0] ?? "This evidence layer is dated context, not a trading signal or return promise.")}</p>
        </div>
      </details>

      <details class="panel reviews-panel">
        <summary>
          <span class="summary-title"><strong>Reviews And Changes</strong><span>Published baseline notes, buy/sell changes, and keep-or-replace history.</span></span>
          ${detailToggleHtml()}
          <span class="module-preview"><span class="preview-pill">Public tracking active</span><span class="preview-pill">May 2026</span><span class="preview-pill">Changes logged</span></span>
        </summary>
        <div class="panel-body">
          ${state.transactions.length ? `<div class="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Ticker</th><th>Action</th><th>Weight Change</th><th>Reference</th><th>Public Note</th></tr></thead>
              <tbody>
                ${state.transactions.map((item) => `
                <tr>
                  <td>${escapeHtml(item.date)}</td>
                  <td><span class="ticker">${escapeHtml(item.ticker)}</span></td>
                  <td>${escapeHtml(item.action)}</td>
                  <td>${formatPercent(item.weightChange)}</td>
                  <td class="price-cell">${formatPrice(item.referencePrice)}</td>
                  <td>${escapeHtml(item.publicNote)}</td>
                </tr>`).join("")}
              </tbody>
            </table>
          </div>` : `<p class="note">Baseline entries are published through the Holdings table. Buy/sell changes after this baseline will be logged here.</p>`}
          ${state.monthlyReviews.map((review) => `
          <article class="mini-card" style="margin:12px 0;">
            <h3>${escapeHtml(review.month)} - ${escapeHtml(review.headline)}</h3>
            <p>Published ${escapeHtml(review.publishedDate)}.</p>
          </article>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Ticker</th><th>Decision</th><th>Public Rationale</th></tr></thead>
              <tbody>
                ${review.decisions.map((decision) => `
                <tr>
                  <td><span class="ticker">${escapeHtml(decision.ticker)}</span></td>
                  <td><span class="decision">${escapeHtml(decision.decision)}</span></td>
                  <td>${escapeHtml(decision.publicRationale)}</td>
                </tr>`).join("")}
              </tbody>
            </table>
          </div>`).join("")}
        </div>
      </details>

      <details class="panel watchlist-panel">
        <summary>
          <span class="summary-title"><strong>Watchlist</strong><span>Names that can challenge the normalized ${escapeHtml(modelCount)}-stock model.</span></span>
          ${detailToggleHtml()}
          <span class="module-preview"><span class="preview-pill">${escapeHtml(state.watchlist.slice(0, 3).map((item) => item.ticker).join(" · "))}</span><span class="preview-pill">Challengers</span></span>
        </summary>
        <div class="panel-body">
          ${watchlistLeadHtml(state.watchlist)}
          <div class="cards">
            ${state.watchlist.map((item) => `
            <article class="mini-card">
              <h3>${escapeHtml(item.ticker)}</h3>
              <span class="watch-pressure ${escapeHtml(watchPressureClass(item.replacementPressure))}">${escapeHtml(item.replacementPressure ?? "Low")} replacement pressure</span>
              <p><strong>${escapeHtml(item.status)}:</strong> ${escapeHtml(item.reason)}</p>
              <div class="watch-flags">${watchFlagsHtml(item.evaluationFlags)}</div>
            </article>`).join("")}
          </div>
        </div>
      </details>

      <details class="panel sources-panel">
        <summary>
          <span class="summary-title"><strong>Sources</strong><span>Primary filings and reference summaries used for the public model.</span></span>
          ${detailToggleHtml()}
          <span class="module-preview"><span class="preview-pill">${escapeHtml(state.sources?.length ?? 0)} links</span><span class="preview-pill">Filings</span><span class="preview-pill">Market data</span></span>
        </summary>
        <div class="panel-body">
          <div class="cards">
            ${state.sources.map((source) => `
            <a class="mini-card" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">
              <h3>${escapeHtml(source.label)}</h3>
              <p>Open source</p>
            </a>`).join("")}
          </div>
        </div>
      </details>

      <details class="panel research-framework-panel">
        <summary>
          <span class="summary-title"><strong>Research Framework</strong><span>Full method notes, dated market-regime evidence, investor discipline, and boundaries.</span></span>
          ${detailToggleHtml()}
          <span class="module-preview"><span class="preview-pill">Definition</span><span class="preview-pill">Evaluation</span><span class="preview-pill">FOMO filter</span><span class="preview-pill">4 regime checks</span></span>
        </summary>
        <div class="panel-body">
          <section class="regime-snapshot" aria-labelledby="marketRegimeEvidenceTitle">
            <div class="regime-snapshot-head">
              <span>Market Regime Evidence</span>
              <strong id="marketRegimeEvidenceTitle">Dated source context as of ${escapeHtml(state.researchEvidence?.asOf ?? "2026-05-02")}.</strong>
            </div>
            <div class="regime-snapshot-grid">
              ${(state.researchEvidence?.marketRegime ?? []).map((item) => `
              <article class="regime-pill">
                <span>${escapeHtml(item.label)}</span>
                <p>${escapeHtml(item.summary)}</p>
                <a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.sourceLabel)}</a>
              </article>`).join("")}
            </div>
          </section>

          <section class="discipline-snapshot" aria-labelledby="investorDisciplineTitle">
            <div class="discipline-snapshot-head">
              <span>Investor Discipline</span>
              <strong id="investorDisciplineTitle">What keeps the model from becoming a famous-story chase.</strong>
            </div>
            <div class="discipline-grid">
              <article class="discipline-card">
                <span>Not A Dip Screen</span>
                <p>A 52-week low is not a thesis. The model needs improving fundamentals, clean balance-sheet risk, and a clear reason earnings can compound.</p>
              </article>
              <article class="discipline-card">
                <span>Not A Penny Bet</span>
                <p>A low share price does not make a stock cheap. Valuation is judged against cash conversion, growth durability, governance, and dilution risk.</p>
              </article>
              <article class="discipline-card">
                <span>Time Horizon</span>
                <p>This is full-cycle compounding research. A holding must survive monthly evidence review before patience is treated as conviction.</p>
              </article>
              <article class="discipline-card">
                <span>FOMO Filter</span>
                <p>Vertical rallies, social screenshots, and media frenzy are not entry signals. The model waits for evidence, sizing discipline, and published review logic.</p>
              </article>
            </div>
            <p class="note" style="margin-top:12px;">This page is educational research; ${DISCLAIMER_COMPACT} Not a PMS offer, and not a promise of 5x returns.</p>
          </section>
        </div>
      </details>
    </section>
  </main>
  ${siteFooterHtml()}

  <script>
    window.MARKET_NARRATIVE_API_BASE = ${JSON.stringify(apiOrigin)};
    window.__MULTIBAGGER_STATE__ = ${serializedState};
    renderMultibaggerState(window.__MULTIBAGGER_STATE__);
    bindShareActions();
    collapseMobileLedger();
    (async function refreshMultibaggerState() {
      const configuredBase = window.MARKET_NARRATIVE_API_BASE || "";
      const urls = configuredBase
        ? [configuredBase.replace(/\\/$/, "") + "/api/public/multibagger/state", "./state.json"]
        : ["./state.json"];
      for (const url of urls) {
        try {
          const response = await fetch(url, { cache: "no-store" });
          if (response.ok) {
            const incomingState = await response.json();
            if (shouldKeepExistingState(window.__MULTIBAGGER_STATE__, incomingState)) {
              continue;
            }
            window.__MULTIBAGGER_STATE__ = incomingState;
            renderMultibaggerState(window.__MULTIBAGGER_STATE__);
            document.documentElement.dataset.multibaggerSource = url;
            return;
          }
        } catch {
          // Static HTML remains usable when the live endpoint is unavailable.
        }
      }
    })();

    function renderMultibaggerState(state) {
      if (!state || !Array.isArray(state.holdings)) return;
      setText("portfolioReturn", heroStatusLabel(state));
      setTone("portfolioReturn", state.performance?.sinceLaunchPercent);
      setText("shareTrackerStatus", heroRefreshText(state));
      setText("modelCapitalMetric", formatInr(state.modelCapitalInr));
      setText("currentValueMetric", formatPerformanceValueInr(state.performance?.currentModelValueInr));
      setText("modelPnlMetric", formatPerformanceInr(state.performance?.totalPnlInr));
      setTone("modelPnlMetric", state.performance?.totalPnlInr);
      setText("portfolioReturnMetric", formatPerformancePercent(state.performance?.sinceLaunchPercent));
      setTone("portfolioReturnMetric", state.performance?.sinceLaunchPercent);
      setText("benchmarkReturnMetric", formatQuotePercent(state.performance?.benchmarkSinceLaunchPercent));
      setTone("benchmarkReturnMetric", state.performance?.benchmarkSinceLaunchPercent);
      setText("trackingBaselineMetric", "₹5 lakh public baseline");
      setText("trackingEntriesMetric", shortEntryCapturedLabel(state));
      setText("trackingQuotesMetric", shortQuoteLabel(state));
      setText("latestPriceColumnLabel", latestPriceColumnText(state));
      const rows = document.getElementById("modelHoldingsRows");
      if (rows) rows.innerHTML = state.holdings.map(holdingRowHtml).join("");
      const cards = document.getElementById("modelHoldingCards");
      if (cards) cards.innerHTML = state.holdings.map(holdingCardHtml).join("");
      const tiles = document.getElementById("modelAllocationTiles");
      if (tiles) tiles.innerHTML = state.holdings.map((holding, index) => allocationTileHtml(holding, index)).join("");
    }

    function bindShareActions() {
      const shareUrl = window.location.origin + window.location.pathname;
      const pageTitle = "Multibagger Model Tracker | Market Narrative";
      document.querySelectorAll("[data-share-action]").forEach((node) => {
        const action = node.getAttribute("data-share-action");
        if (node.tagName === "A") {
          node.href = shareHref(action, shareUrl, pageTitle);
        }
        node.addEventListener("click", async (event) => {
          if (action !== "copy") {
            setText("shareTrackerStatus", "Opening " + node.textContent.trim() + " share.");
            return;
          }
          event.preventDefault();
          try {
            await navigator.clipboard.writeText(shareUrl);
            setText("shareTrackerStatus", "Tracker link copied.");
          } catch {
            setText("shareTrackerStatus", "Use the address bar to copy this tracker link.");
          }
        });
      });
    }

    function shareHref(action, url, title) {
      const encodedUrl = encodeURIComponent(url);
      const encodedTitle = encodeURIComponent(title);
      if (action === "whatsapp") return "https://wa.me/?text=" + encodedTitle + "%20" + encodedUrl;
      if (action === "x") return "https://twitter.com/intent/tweet?text=" + encodedTitle + "&url=" + encodedUrl;
      if (action === "linkedin") return "https://www.linkedin.com/sharing/share-offsite/?url=" + encodedUrl;
      return url;
    }

    function collapseMobileLedger() {
      const ledger = document.getElementById("detailedLedger");
      if (ledger && window.matchMedia("(max-width: 760px)").matches) {
        ledger.open = false;
      }
    }

    function shouldKeepExistingState(currentState, incomingState) {
      return freshQuoteCount(currentState) > freshQuoteCount(incomingState);
    }

    function freshQuoteCount(state) {
      return (state?.holdings || []).filter((holding) =>
        !holding.isStale && Number.isFinite(Number(holding.lastPrice))
      ).length;
    }

    function holdingRowHtml(holding) {
      const dayTone = toneClass(holding.dayChangePercent);
      const currentTone = holding.isStale ? "stale" : "neutral";
      return "<tr>"
        + "<td data-label=\\"Ticker\\"><span class=\\"holding-name-line\\"><span class=\\"ticker\\">" + escapeHtml(holding.ticker) + "</span>" + stockLinkHtml(holding) + "</span><span class=\\"subtext\\">" + escapeHtml(holding.name) + "</span></td>"
        + "<td data-label=\\"Weight\\" class=\\"price-cell\\">" + formatPercent(holding.targetWeight) + "</td>"
        + "<td data-label=\\"₹5 lakh deployed\\" class=\\"price-cell\\">" + formatInr(holding.modelAmountInr) + "</td>"
        + "<td data-label=\\"Avg entry\\" class=\\"price-cell\\">" + formatPrice(holding.entryPrice) + "<span class=\\"subtext entry-source-line\\">" + escapeHtml(holdingEntrySourceLine(holding)) + "</span></td>"
        + "<td data-label=\\"" + escapeHtml(latestPriceCellLabel(window.__MULTIBAGGER_STATE__)) + "\\" class=\\"price-cell " + currentTone + "\\">" + formatPrice(holding.lastPrice) + "<span class=\\"subtext quote-source-line\\">" + escapeHtml(holdingPriceSourceLine(holding)) + "</span></td>"
        + "<td data-label=\\"Return\\" class=\\"price-cell " + toneClass(holding.returnPercent) + "\\">" + formatPerformancePercent(holding.returnPercent) + "</td>"
        + "<td data-label=\\"P&L\\" class=\\"price-cell " + toneClass(holding.modelPnlInr) + "\\">" + formatPerformanceInr(holding.modelPnlInr) + "</td>"
        + "<td data-label=\\"Day\\" class=\\"price-cell " + dayTone + "\\">" + formatSignedPercent(holding.dayChangePercent) + "</td>"
        + "</tr>";
    }

    function holdingCardHtml(holding) {
      const dayTone = holding.isStale ? "stale" : toneClass(holding.dayChangePercent);
      return "<details class=\\"holding-card\\">"
        + "<summary>"
        + "<div class=\\"holding-card-head\\"><span class=\\"holding-card-title\\"><strong>" + escapeHtml(holding.ticker) + "</strong><span>" + escapeHtml(holding.name) + "</span></span><span class=\\"holding-card-role\\">" + escapeHtml(displayLabelForHolding(holding)) + "</span></div>"
        + "<div class=\\"holding-card-closed-metrics\\">"
        + "<span class=\\"holding-card-stat\\"><span>Weight</span><strong>" + formatPercent(holding.targetWeight) + "</strong></span>"
        + "<span class=\\"holding-card-stat movement\\"><span>Since entry</span><strong class=\\"" + toneClass(holding.returnPercent) + "\\">" + formatPerformancePercent(holding.returnPercent) + "</strong></span>"
        + "<span class=\\"holding-card-stat\\"><span>Day</span><strong class=\\"" + dayTone + "\\">" + formatSignedPercent(holding.dayChangePercent) + "</strong></span>"
        + "<span class=\\"holding-card-stat\\"><span>Current</span><strong class=\\"" + (holding.isStale ? "stale" : "neutral") + "\\">" + formatPrice(holding.lastPrice) + "</strong></span>"
        + "</div>"
        + "<span class=\\"detail-toggle\\" aria-hidden=\\"true\\"><span class=\\"show-label\\">Show details v</span><span class=\\"hide-label\\">Hide details ^</span></span>"
        + "</summary>"
        + "<div class=\\"holding-card-body\\">"
        + "<div class=\\"holding-card-key-metrics\\">"
        + "<span class=\\"holding-card-stat movement\\"><span>P&L</span><strong class=\\"" + toneClass(holding.modelPnlInr) + "\\">" + formatPerformanceInr(holding.modelPnlInr) + "</strong></span>"
        + "<span class=\\"holding-card-stat\\"><span>Deployed</span><strong>" + formatInr(holding.modelAmountInr) + "</strong></span>"
        + "<span class=\\"holding-card-stat\\"><span>Avg entry</span><strong>" + formatPrice(holding.entryPrice) + "</strong></span>"
        + "</div>"
        + "<div class=\\"holding-card-secondary\\">"
        + "<span><strong>Entry timestamp</strong>" + escapeHtml(holdingEntrySourceLine(holding).replace(/^Entry: /, "")) + "</span>"
        + "<span><strong>Quote timestamp</strong>" + escapeHtml(holdingPriceShortLine(holding)) + "</span>"
        + "<span><strong>Research link</strong>" + stockLinkHtml(holding) + "</span>"
        + "</div>"
        + "</div>"
        + "</details>";
    }

    function allocationTileHtml(holding, index) {
      const dayTone = holding.isStale ? "stale" : toneClass(holding.dayChangePercent);
      const dayText = holding.isStale ? "Quote pending" : formatSignedPercent(holding.dayChangePercent) + " today";
      return "<article class=\\"allocation-tile\\" style=\\"--tile-fill:" + Math.min(88, 22 + Number(holding.targetWeight || 0) * 2.2) + "%;\\">"
        + "<div class=\\"allocation-top\\"><span class=\\"allocation-ticker\\">" + escapeHtml(holding.ticker) + "</span><strong class=\\"allocation-weight\\">" + formatPercent(holding.targetWeight) + "</strong></div>"
        + "<span class=\\"allocation-quote " + dayTone + "\\">" + escapeHtml(dayText) + "</span>"
        + "<p class=\\"allocation-role\\"><strong>" + escapeHtml(displayLabelForHolding(holding)) + ":</strong> " + escapeHtml(holding.rolePlain || holding.role) + "</p>"
        + "<span class=\\"allocation-status\\">" + escapeHtml(statusPlain(holding.status)) + "</span>"
        + stockLinkHtml(holding)
        + "</article>";
    }

    function stockLinkHtml(holding) {
      const url = holding.screenerUrl || screenerUrlForTicker(holding.ticker);
      return "<a class=\\"stock-link\\" href=\\"" + escapeHtml(url) + "\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">Screener</a>";
    }

    function screenerUrlForTicker(ticker) {
      return "https://www.screener.in/company/" + encodeURIComponent(String(ticker || "")) + "/";
    }

    function setText(id, value) {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    }

    function setTone(id, value) {
      const node = document.getElementById(id);
      if (!node) return;
      node.classList.remove("positive", "negative", "neutral", "stale");
      node.classList.add(toneClass(value));
    }

    function toneClass(value) {
      const number = Number(value);
      if (number > 0) return "positive";
      if (number < 0) return "negative";
      return "neutral";
    }

    function hasPublishedFillPerformance(state) {
      return isFiniteMetric(state?.performance?.currentModelValueInr)
        || isFiniteMetric(state?.performance?.totalPnlInr)
        || isFiniteMetric(state?.performance?.sinceLaunchPercent);
    }

    function heroStatusLabel(state) {
      return hasPublishedFillPerformance(state) ? "Tracking active" : "Public tracking active";
    }

    function isFiniteMetric(value) {
      return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
    }

    function formatInr(value) {
      if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "Pending quote";
      return "INR " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value));
    }

    function formatSignedInr(value) {
      if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "--";
      const number = Number(value);
      const prefix = number > 0 ? "+" : number < 0 ? "-" : "";
      return prefix + "INR " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.abs(number));
    }

    function formatPrice(value) {
      if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "Awaiting quote";
      return "INR " + new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
    }

    function formatPercent(value) {
      if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "--";
      return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 1 }) + "%";
    }

    function formatSignedPercent(value) {
      if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "--";
      const number = Number(value);
      const prefix = number > 0 ? "+" : "";
      return prefix + number.toLocaleString("en-IN", { maximumFractionDigits: 2 }) + "%";
    }

    function formatPerformanceInr(value) {
      if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "Awaiting quote";
      return formatSignedInr(value);
    }

    function formatPerformanceValueInr(value) {
      if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "Awaiting quote";
      return formatInr(value);
    }

    function formatPerformancePercent(value) {
      if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "Awaiting quote";
      return formatSignedPercent(value);
    }

    function formatQuotePercent(value) {
      if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "Quote pending";
      return formatSignedPercent(value);
    }

    function latestPriceColumnText(state) {
      const label = latestPriceCellLabel(state);
      const asOf = latestQuoteAsOf(state);
      return asOf ? label + " (" + asOf + ")" : label;
    }

    function latestPriceCellLabel(state) {
      return state?.pricing?.isStale ? "Current price" : "Current price";
    }

    function latestQuoteStatusStamp(state) {
      const asOf = latestQuoteAsOf(state);
      return asOf ? "Price as of: " + asOf : "Last check: " + formatDateTime(state?.updatedAt || state?.pricing?.refreshedAt);
    }

    function latestQuoteAsOf(state) {
      const timestamps = (state?.holdings || [])
        .filter((holding) => !holding.isStale && Number.isFinite(Number(holding.lastPrice)))
        .map((holding) => Date.parse(holding.lastPriceAt))
        .filter(Number.isFinite);
      if (!timestamps.length) return "";
      return formatDateTime(new Date(Math.max(...timestamps)).toISOString());
    }

    function holdingPriceSourceLine(holding) {
      const source = holding.priceSource || "Price snapshot";
      if (holding.isStale || !holding.lastPriceAt) return source;
      return source + " - as of " + formatDateTime(holding.lastPriceAt);
    }

    function holdingPriceShortLine(holding) {
      if (holding.isStale || !holding.lastPriceAt) return "Quote pending";
      return formatDateTime(holding.lastPriceAt);
    }

    function holdingEntrySourceLine(holding) {
      const value = holding.entryAt || holding.modelEntryAt || holding.modelEntryDate;
      if (!value) return "Entry time pending";
      return "Entry: " + (/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? formatDateOnly(value) : formatDateTime(value));
    }

    function statusPlain(status) {
      const value = String(status || "Model slot");
      if (/core/i.test(value)) return "Core staged";
      if (/quality/i.test(value)) return "Quality slot";
      if (/speculative/i.test(value)) return "Speculative cap";
      if (/capped/i.test(value)) return "Capped slot";
      return value;
    }

    function fillStatusText(state) {
      return state?.performance?.currentModelValueInr === null || state?.performance?.currentModelValueInr === undefined
        ? "Public baseline is live; quote movement updates in holdings."
        : "Public baseline performance is live.";
    }

    function heroRefreshText(state) {
      const asOf = latestQuoteAsOf(state);
      const returnText = hasPublishedFillPerformance(state)
        ? formatPerformancePercent(state?.performance?.sinceLaunchPercent) + " since entry; "
        : "";
      return asOf ? returnText + "latest quote refresh: " + asOf : returnText + "latest quote refresh: waiting for verified quote";
    }

    function shortEntryCapturedLabel(state) {
      const basis = state?.trackingBasis?.publicFillBaselineAt || state?.holdings?.[0]?.entryAt || state?.modelEntryDate;
      return basis ? "Entries captured " + formatDateTime(basis) : "Entries captured";
    }

    function shortQuoteLabel(state) {
      const asOf = latestQuoteAsOf(state);
      return asOf || "Waiting for verified quote";
    }

    function holdingSummaryLine(holding) {
      const returnText = Number.isFinite(Number(holding.returnPercent))
        ? formatPerformancePercent(holding.returnPercent) + " since entry"
        : "return awaiting verified quote";
      const quoteText = holding.isStale
        ? "quote pending"
        : "quote updated " + holdingPriceShortLine(holding);
      return holding.ticker + ": " + displayLabelForHolding(holding) + " thesis; " + returnText + "; " + quoteText + ".";
    }

    function displayLabelForHolding(holding) {
      return holding?.displayLabel || holding?.rolePlain || holding?.role || "Model slot";
    }

    function formatDateTime(value) {
      const date = value ? new Date(value) : new Date();
      return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
    }

    function formatDateOnly(value) {
      return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
    }
  </script>
  ${bottomTabBarHtml("portfolio")}
  ${mobileShellScript()}
</body>
</html>`;
  return sanitizePublicHtml(legacyPublicPageShell(renderedPage, {
    title: pageTitle, description: pageDescription, canonicalUrl, ogImage: previewImageUrl,
    bodyClass: "glass-v2 has-btb", activeHref: "/multibagger/", mobileActiveKey: "portfolio"
  }));
}

export function multibaggerAdminPage(state = multibaggerState()) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  ${brandHeadLinks(adminSiteOrigin)}
  <meta name="robots" content="noindex,nofollow">
  <title>Market Narrative | Multibagger Admin Review</title>
  <style>${siteThemeCss()}${adminCss()}</style>
</head>
<body class="admin-auth-required auth-pending has-btb">
  ${adminAuthGateHtml()}
  <nav class="topbar">
    <div class="shell nav-inner">
      <a class="brand" href="${escapeHtml(adminSiteOrigin)}/">${brandMarkHtml()}<span>Market Narrative</span></a>
      <div class="nav-actions">
        <a class="nav-link" href="${escapeHtml(adminSiteOrigin)}/">Admin studio</a>
        <button id="adminLogoutBtn" class="nav-link" type="button">Logout</button>
      </div>
    </div>
  </nav>
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Private monthly review</p>
      <h1>Multibagger Review Desk</h1>
      <p>Upload the current portfolio image, run the monthly keep-or-replace review, correct extracted positions, and publish only the public-safe decision summary.</p>
    </section>

    <section class="admin-grid">
      <article class="panel">
        <h2>1. Portfolio Image</h2>
        <input id="portfolioFile" type="file" accept="image/png,image/jpeg,image/webp">
        <button id="uploadSnapshotBtn" type="button">Upload Snapshot</button>
        <p id="snapshotState" class="state-line">No upload yet.</p>
      </article>
      <article class="panel">
        <h2>2. Monthly Review</h2>
        <label>Review month <input id="reviewMonth" type="month" value="2026-05"></label>
        <button id="runReviewBtn" type="button">Run Monthly Review</button>
        <p id="reviewState" class="state-line">Waiting for a snapshot or manual review run.</p>
      </article>
      <article class="panel">
        <h2>3. Publish</h2>
        <button id="publishReviewBtn" type="button" disabled>Publish Sanitized Review</button>
        <p id="publishState" class="state-line">Nothing published in this session.</p>
      </article>
    </section>

    <details class="panel" open>
      <summary><strong>Current Public Model</strong><span>+</span></summary>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ticker</th><th>Weight</th><th>Review Rule</th></tr></thead>
          <tbody>${state.holdings.map((holding) => `
            <tr><td>${escapeHtml(holding.ticker)}</td><td>${formatPercent(holding.targetWeight)}</td><td>${escapeHtml(holding.breakRule)}</td></tr>
          `).join("")}</tbody>
        </table>
      </div>
    </details>

    <details class="panel" open>
      <summary><strong>Agent Output</strong><span>+</span></summary>
      <pre id="reviewOutput">${escapeHtml(JSON.stringify({ status: "idle", expectedDecisions: ["KEEP", "ADD", "TRIM", "SELL", "REPLACE"] }, null, 2))}</pre>
    </details>
  </main>
  <script>
    window.MARKET_NARRATIVE_API_BASE = ${JSON.stringify(apiOrigin)};
    window.__ADMIN_AUTH_HASH__ = "80b6c184bff356be9b060287583d6c10afe1d425a98410dcd5bfd72e251c40f6";
    window.__MULTIBAGGER_STATE__ = ${JSON.stringify(state)};
    ${adminScript()}
  </script>
</body>
</html>`;
}

function adminCss() {
  return `
    * { box-sizing:border-box; }

    /* === Global mobile base (Tier 1) === */
    html, body { overflow-x: hidden; }
    body {
      padding-left: env(safe-area-inset-left, 0px);
      padding-right: env(safe-area-inset-right, 0px);
    }
    img, svg, video, canvas { max-width: 100%; height: auto; }
    a, button { touch-action: manipulation; }
    a, button, [tabindex] { -webkit-tap-highlight-color: transparent; }
    *:focus { outline: none; }
    *:focus-visible { outline: 2px solid #22d3ee; outline-offset: 2px; border-radius: 4px; }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    /* === End global mobile base === */

    body { margin:0; min-height:100vh; background:linear-gradient(135deg,#030712,#0f172a); color:var(--ink); font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
    a { color:inherit; text-decoration:none; }
    .shell { width:min(1120px,calc(100% - 36px)); margin:0 auto; }
    .topbar { position:sticky; top:0; z-index:20; background:rgba(3,7,18,.72); border-bottom:1px solid var(--line); backdrop-filter:blur(18px); }
    .nav-inner { min-height:64px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
    .brand { display:flex; align-items:center; gap:12px; font-size:20px; font-weight:850; }
    .brand-mark { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:9px; background:linear-gradient(135deg,var(--cyan),#6366f1 54%,#f43f5e); font-weight:900; }
    ${brandMarkCss()}
    .nav-actions { display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; }
    .nav-link, button { border:1px solid var(--line); border-radius:8px; background:rgba(15,23,42,.7); color:var(--ink); padding:10px 12px; font-size:13px; font-weight:850; cursor:pointer; }
    main { padding:34px 0 64px; }
    .hero { margin-bottom:20px; }
    .eyebrow { color:var(--cyan); font-size:12px; font-weight:900; letter-spacing:.12em; text-transform:uppercase; margin:0 0 10px; }
    h1 { margin:0; font-size:clamp(36px,6vw,64px); line-height:1; }
    h2 { margin:0 0 14px; font-size:19px; }
    p { color:var(--muted); line-height:1.65; }
    .admin-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
    .panel { border:1px solid var(--line); border-radius:10px; background:var(--panel); padding:18px; margin:14px 0; }
    details.panel summary { display:flex; justify-content:space-between; cursor:pointer; list-style:none; }
    details.panel summary::-webkit-details-marker { display:none; }
    input { width:100%; border:1px solid var(--line); border-radius:8px; background:#020617; color:var(--ink); padding:10px; margin:8px 0 12px; }
    .state-line { min-height:24px; margin:10px 0 0; }
    .table-wrap { overflow-x:auto; border:1px solid var(--line); border-radius:8px; margin-top:14px; }
    table { width:100%; min-width:max-content; border-collapse:collapse; }
    th,td { text-align:left; border-bottom:1px solid rgba(255,255,255,.1); padding:11px 12px; font-size:14px; }
    th { color:#dbeafe; background:rgba(30,41,59,.76); }
    pre { overflow:auto; border:1px solid var(--line); border-radius:8px; background:#020617; color:#dbeafe; padding:14px; }
    .auth-gate { min-height:100vh; display:grid; place-items:center; padding:28px; }
    .auth-card { width:min(460px,100%); border:1px solid var(--line); border-radius:16px; background:var(--panel); padding:28px; }
    .auth-card h1 { font-size:32px; }
    .auth-field { display:grid; gap:7px; margin-bottom:12px; }
    .auth-submit { width:100%; background:linear-gradient(135deg,#67e8f9,#60a5fa 48%,#818cf8); color:#020617; }
    .auth-error { color:#fecaca; }
    .auth-error[hidden] { display:none; }
    body.admin-auth-required.auth-pending .topbar, body.admin-auth-required.auth-pending main.shell { display:none; }
    body.admin-auth-required.auth-ready #adminAuthGate { display:none; }
    @media (max-width:900px) { .admin-grid { grid-template-columns:1fr; } .nav-inner { align-items:flex-start; flex-direction:column; padding:13px 0; } }
  `;
}

function adminAuthGateHtml() {
  return `
  <section id="adminAuthGate" class="auth-gate" aria-label="Admin login">
    <form id="adminLoginForm" class="auth-card" autocomplete="on">
      <p class="eyebrow">Private Studio</p>
      <h1>Admin Login</h1>
      <p>Sign in to open the private multibagger monthly review workflow.</p>
      <label class="auth-field"><span>Email</span><input id="adminEmail" name="email" type="email" autocomplete="username" required></label>
      <label class="auth-field"><span>Password</span><input id="adminPassword" name="password" type="password" autocomplete="current-password" required></label>
      <button class="auth-submit" type="submit">Open Review Desk</button>
      <p id="adminAuthError" class="auth-error" role="alert" hidden>Could not sign in with those credentials.</p>
    </form>
  </section>`;
}

function adminScript() {
  return `
    const apiBase = window.MARKET_NARRATIVE_API_BASE || "";
    let snapshotId = null;
    let reviewId = null;
    bindAdminAuth();
    bindReviewActions();
    if (hasAdminSession()) unlockAdminGate(); else showAdminGate();

    function bindReviewActions() {
      document.getElementById('uploadSnapshotBtn')?.addEventListener('click', uploadSnapshot);
      document.getElementById('runReviewBtn')?.addEventListener('click', runReview);
      document.getElementById('publishReviewBtn')?.addEventListener('click', publishReview);
    }

    async function uploadSnapshot() {
      const file = document.getElementById('portfolioFile')?.files?.[0];
      if (!file) return setText('snapshotState', 'Choose an image first.');
      const form = new FormData();
      form.append('file', file);
      setText('snapshotState', 'Uploading...');
      try {
        const response = await fetch(apiBase + '/api/admin/multibagger/snapshots', { method: 'POST', headers: authHeaders(), body: form });
        const payload = await response.json();
        snapshotId = payload.snapshotId;
        setText('snapshotState', 'Snapshot stored for review: ' + snapshotId);
      } catch {
        snapshotId = 'local-static-snapshot';
        setText('snapshotState', 'Backend unavailable. Static preview mode is active.');
      }
    }

    async function runReview() {
      const month = document.getElementById('reviewMonth')?.value || new Date().toISOString().slice(0, 7);
      setText('reviewState', 'Running review...');
      const body = JSON.stringify({ snapshotId, month, corrections: [] });
      try {
        const response = await fetch(apiBase + '/api/admin/multibagger/reviews/run', { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body });
        const payload = await response.json();
        reviewId = payload.reviewId;
        document.getElementById('reviewOutput').textContent = JSON.stringify(payload, null, 2);
        document.getElementById('publishReviewBtn').disabled = false;
        setText('reviewState', 'Review ready.');
      } catch {
        const fallback = localReview(month);
        reviewId = fallback.reviewId;
        document.getElementById('reviewOutput').textContent = JSON.stringify(fallback, null, 2);
        document.getElementById('publishReviewBtn').disabled = false;
        setText('reviewState', 'Static preview review ready.');
      }
    }

    async function publishReview() {
      if (!reviewId) return setText('publishState', 'Run a review first.');
      try {
        const response = await fetch(apiBase + '/api/admin/multibagger/reviews/' + encodeURIComponent(reviewId) + '/publish', { method: 'POST', headers: authHeaders() });
        const payload = await response.json();
        setText('publishState', 'Published sanitized review for ' + (payload.month || 'current month') + '.');
      } catch {
        setText('publishState', 'Backend unavailable. Nothing was published from this static preview.');
      }
    }

    function localReview(month) {
      return {
        reviewId: 'static-' + month,
        month,
        decisions: window.__MULTIBAGGER_STATE__.holdings.map((holding) => ({
          ticker: holding.ticker,
          action: /capped/i.test(holding.status || '') ? 'KEEP_CAPPED' : 'KEEP',
          confidence: /capped/i.test(holding.status || '') ? 0.66 : 0.74,
          evidence: holding.breakRule,
          publicSummary: holding.status
        })),
        note: 'Preview only. Publish requires the Spring backend.'
      };
    }

    function setText(id, value) {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    }

    function bindAdminAuth() {
      const form = document.getElementById('adminLoginForm');
      const logout = document.getElementById('adminLogoutBtn');
      if (form) {
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          const email = document.getElementById('adminEmail')?.value ?? '';
          const password = document.getElementById('adminPassword')?.value ?? '';
          const error = document.getElementById('adminAuthError');
          const hash = await adminCredentialHash(email, password);
          const token = await requestBackendToken(email, password);
          if (hash === window.__ADMIN_AUTH_HASH__) {
            sessionStorage.setItem('marketNarrativeAdminSession', hash);
            if (token) sessionStorage.setItem('marketNarrativeAdminToken', token);
            if (error) error.hidden = true;
            unlockAdminGate();
            return;
          }
          if (error) error.hidden = false;
        });
      }
      if (logout) {
        logout.addEventListener('click', () => {
          sessionStorage.removeItem('marketNarrativeAdminSession');
          sessionStorage.removeItem('marketNarrativeAdminToken');
          window.location.reload();
        });
      }
    }

    function hasAdminSession() {
      try { return sessionStorage.getItem('marketNarrativeAdminSession') === window.__ADMIN_AUTH_HASH__; } catch { return false; }
    }

    function showAdminGate() {
      document.body.classList.add('auth-pending');
      document.body.classList.remove('auth-ready');
      document.getElementById('adminEmail')?.focus();
    }

    function unlockAdminGate() {
      document.body.classList.remove('auth-pending');
      document.body.classList.add('auth-ready');
    }

    async function adminCredentialHash(email, password) {
      const identity = String(email || '').trim().toLowerCase() + ':' + String(password || '');
      const bytes = new TextEncoder().encode(identity);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
    }

    async function requestBackendToken(email, password) {
      try {
        const response = await fetch(apiBase + '/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (!response.ok) return null;
        const payload = await response.json();
        return payload.token || null;
      } catch {
        return null;
      }
    }

    function authHeaders(extra = {}) {
      const token = sessionStorage.getItem('marketNarrativeAdminToken');
      return token ? { ...extra, Authorization: 'Bearer ' + token } : extra;
    }
  `;
}

function holdingsRowsHtml(holdings) {
  return holdings.map((holding) => `
              <tr>
                <td data-label="Ticker"><span class="holding-name-line"><span class="ticker">${escapeHtml(holding.ticker)}</span>${stockLinkHtml(holding)}</span><span class="subtext">${escapeHtml(holding.name)}</span></td>
                <td data-label="Weight" class="price-cell">${formatPercent(holding.targetWeight)}</td>
                <td data-label="₹5 lakh deployed" class="price-cell">${formatInr(holding.modelAmountInr)}</td>
                <td data-label="Avg entry" class="price-cell">${formatPrice(holding.entryPrice)}<span class="subtext entry-source-line">${escapeHtml(holdingEntrySourceLine(holding))}</span></td>
                <td data-label="Current price" class="price-cell ${holding.isStale ? "stale" : "neutral"}">${formatPrice(holding.lastPrice)}<span class="subtext quote-source-line">${escapeHtml(holdingPriceSourceLine(holding))}</span></td>
                <td data-label="Return" class="price-cell ${toneClass(holding.returnPercent)}">${formatPerformancePercent(holding.returnPercent)}</td>
                <td data-label="P&L" class="price-cell ${toneClass(holding.modelPnlInr)}">${formatPerformanceInr(holding.modelPnlInr)}</td>
                <td data-label="Day" class="price-cell ${toneClass(holding.dayChangePercent)}">${formatSignedPercent(holding.dayChangePercent)}</td>
              </tr>`).join("");
}

function allocationTilesHtml(holdings) {
  return holdings.map((holding, index) => `
          <article class="allocation-tile" style="--tile-fill:${Math.min(88, 22 + holding.targetWeight * 2.2)}%;">
            <div class="allocation-top">
              <span class="allocation-ticker">${escapeHtml(holding.ticker)}</span>
              <strong class="allocation-weight">${formatPercent(holding.targetWeight)}</strong>
            </div>
            <span class="allocation-quote ${holding.isStale ? "stale" : toneClass(holding.dayChangePercent)}">${escapeHtml(holding.isStale ? "Quote pending" : `${formatSignedPercent(holding.dayChangePercent)} today`)}</span>
            <p class="allocation-role">${escapeHtml(holding.rolePlain ?? holding.role)}</p>
            <span class="allocation-status">${escapeHtml(statusPlain(holding.status))}</span>
            ${stockLinkHtml(holding)}
          </article>`).join("");
}

function stockLinkHtml(holding) {
  const url = holding.screenerUrl ?? `https://www.screener.in/company/${encodeURIComponent(holding.ticker)}/`;
  return `<a class="stock-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Screener</a>`;
}

function shareActionsHtml(url) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent("Market Narrative Multibagger Tracker");
  return `
            <a class="share-action" data-share-action="whatsapp" aria-label="Share tracker on WhatsApp" href="https://wa.me/?text=${encodedTitle}%20${encodedUrl}" target="_blank" rel="noopener noreferrer">${shareIconHtml("whatsapp")}<span class="sr-only">WhatsApp</span></a>
            <a class="share-action" data-share-action="x" aria-label="Share tracker on X" href="https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}" target="_blank" rel="noopener noreferrer">${shareIconHtml("x")}<span class="sr-only">X</span></a>
            <a class="share-action" data-share-action="linkedin" aria-label="Share tracker on LinkedIn" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}" target="_blank" rel="noopener noreferrer">${shareIconHtml("linkedin")}<span class="sr-only">LinkedIn</span></a>
            <button class="share-action copy" data-share-action="copy" aria-label="Copy tracker link" type="button">${shareIconHtml("copy")}<span class="sr-only">Copy tracker link</span></button>`;
}

function detailToggleHtml() {
  return `<span class="detail-toggle" aria-hidden="true"><span class="show-label">Show details v</span><span class="hide-label">Hide details ^</span></span>`;
}

function shareIconHtml(type) {
  const icons = {
    whatsapp: `<svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.1 19.2 6 16.1a7.6 7.6 0 1 1 2.9 2.6l-3.8.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.1 8.6c.2-.4.4-.5.7-.5h.5c.2 0 .4.1.5.4l.7 1.7c.1.3 0 .5-.2.7l-.4.4c.6 1.1 1.5 2 2.7 2.6l.5-.5c.2-.2.4-.3.7-.2l1.6.8c.3.1.4.3.4.6v.4c0 .4-.2.7-.5.9-.7.4-1.9.3-3.3-.4-1.6-.8-3-2.1-3.8-3.8-.7-1.4-.9-2.5-.6-3.1Z" fill="currentColor"/></svg>`,
    x: `<svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5l14 14M19 5 5 19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
    linkedin: `<svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 10v7M8 7.7v.1M12 17v-4.1c0-1.7 1-2.9 2.6-2.9 1.5 0 2.4 1 2.4 2.9V17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`,
    copy: `<svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="8" y="8" width="10" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M6 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`
  };
  return icons[type] ?? icons.copy;
}

function trackingRailHtml(state) {
  const basis = trackingBasisForState(state);
  const entryShort = compactDateTime(basis.publicFillBaselineAt);
  return `
    <section class="tracking-rail" aria-label="Tracking basis">
      <article class="tracking-chip"><span>Baseline</span><strong id="trackingBaselineMetric">₹5 lakh public baseline</strong></article>
      <article class="tracking-chip"><span>Entries</span><strong id="trackingEntriesMetric">Entries captured ${escapeHtml(entryShort)}</strong></article>
      <article class="tracking-chip"><span>Latest quote refresh</span><strong id="trackingQuotesMetric">${escapeHtml(shortQuoteLabel(state))}</strong></article>
      <article class="tracking-chip"><span>Boundary</span><strong>Educational research only</strong></article>
    </section>`;
}

function trackingBasisForState(state) {
  return {
    researchModelStartedOn: state.trackingBasis?.researchModelStartedOn ?? state.modelEntryDate,
    publicFillBaselineAt: state.trackingBasis?.publicFillBaselineAt ?? state.holdings?.[0]?.entryAt ?? state.modelEntryDate,
    returnsCalculatedFrom: state.trackingBasis?.returnsCalculatedFrom ?? "publicFillBaselineAt"
  };
}

function methodStripHtml(state) {
  return `
    <section class="method-strip" aria-label="Research Method summary">
      <div class="method-strip-head">
        <span>Research Method</span>
        <strong>What has to keep earning a slot.</strong>
      </div>
      <div class="method-strip-grid">
        <article class="method-pill">
          <span>Not tips</span>
          <p>Public research tracker, not stock advice or guaranteed return.</p>
        </article>
        <article class="method-pill">
          <span>Evidence reviewed monthly</span>
          <p>Every slot faces a keep-or-replace check after fresh public evidence.</p>
        </article>
        <article class="method-pill">
          <span>Replace weak slots</span>
          <p>A cleaner challenger can replace a holding that loses evidence quality.</p>
        </article>
        <article class="method-pill">
          <span>Cash conversion matters</span>
          <p>Reported growth must become cash, not just revenue or headline orders.</p>
        </article>
      </div>
    </section>`;
}

function holdingCardsHtml(holdings) {
  return holdings.map((holding) => holdingCardHtml(holding)).join("");
}

function holdingCardHtml(holding) {
  const dayTone = holding.isStale ? "stale" : toneClass(holding.dayChangePercent);
  return `
          <details class="holding-card">
            <summary>
              <div class="holding-card-head">
                <span class="holding-card-title"><strong>${escapeHtml(holding.ticker)}</strong><span>${escapeHtml(holding.name)}</span></span>
                <span class="holding-card-role">${escapeHtml(displayLabelForHolding(holding))}</span>
              </div>
              <div class="holding-card-closed-metrics">
                <span class="holding-card-stat"><span>Weight</span><strong>${formatPercent(holding.targetWeight)}</strong></span>
                <span class="holding-card-stat movement"><span>Since entry</span><strong class="${toneClass(holding.returnPercent)}">${formatPerformancePercent(holding.returnPercent)}</strong></span>
                <span class="holding-card-stat"><span>Day</span><strong class="${dayTone}">${formatSignedPercent(holding.dayChangePercent)}</strong></span>
                <span class="holding-card-stat"><span>Current</span><strong class="${holding.isStale ? "stale" : "neutral"}">${formatPrice(holding.lastPrice)}</strong></span>
              </div>
              ${detailToggleHtml()}
            </summary>
            <div class="holding-card-body">
              <div class="holding-card-key-metrics">
                <span class="holding-card-stat movement"><span>P&amp;L</span><strong class="${toneClass(holding.modelPnlInr)}">${formatPerformanceInr(holding.modelPnlInr)}</strong></span>
                <span class="holding-card-stat"><span>Deployed</span><strong>${formatInr(holding.modelAmountInr)}</strong></span>
                <span class="holding-card-stat"><span>Avg entry</span><strong>${formatPrice(holding.entryPrice)}</strong></span>
              </div>
              <div class="holding-card-secondary">
                <span><strong>Entry timestamp</strong>${escapeHtml(holdingEntrySourceLine(holding).replace(/^Entry: /, ""))}</span>
                <span><strong>Quote timestamp</strong>${escapeHtml(holdingPriceShortLine(holding))}</span>
                <span><strong>Research link</strong>${stockLinkHtml(holding)}</span>
              </div>
            </div>
          </details>`;
}

function watchFlagsHtml(flags = []) {
  return flags.map((flag) => `<span class="watch-flag ${escapeHtml(flag.tone ?? "yellow")}">${escapeHtml(flag.label)}</span>`).join("");
}

function watchlistLeadHtml(watchlist = []) {
  const challenger = closestWatchlistChallenger(watchlist);
  if (!challenger) {
    return "";
  }
  return `<p class="watchlist-lead"><strong>Closest challenger:</strong> ${escapeHtml(challenger.ticker)} - ${escapeHtml(challenger.reason)}</p>`;
}

function closestWatchlistChallenger(watchlist = []) {
  return watchlist.find((item) => /high/i.test(item.replacementPressure ?? "")) ?? watchlist[0] ?? null;
}

function watchPressureClass(value) {
  const label = String(value ?? "low").toLowerCase();
  if (label.includes("high")) return "high";
  if (label.includes("medium")) return "medium";
  return "low";
}

function allocationDonutGradient(holdings) {
  let cursor = 0;
  const slices = holdings.map((holding, index) => {
    const start = cursor;
    const end = cursor + Number(holding.targetWeight ?? 0);
    cursor = end;
    return `${holdingColor(index)} ${start}% ${end}%`;
  });
  return `conic-gradient(${slices.join(", ")})`;
}

function holdingColor(index) {
  return ["#22d3ee", "#34d399", "#fbbf24", "#60a5fa", "#fb7185", "#a78bfa"][index % 6];
}

function priceStatusText(state) {
  if (state.pricing?.isStale) {
    return "Normalized INR 5 lakh baseline is published; current prices and returns appear after verified market quotes are available.";
  }
  return "Latest Yahoo/BSE public quotes are shown with row-level timestamps. Return and P&L use the normalized INR 5 lakh public baseline.";
}

function hasPublishedFillPerformance(state) {
  return isFiniteMetric(state.performance?.currentModelValueInr)
    || isFiniteMetric(state.performance?.totalPnlInr)
    || isFiniteMetric(state.performance?.sinceLaunchPercent);
}

function heroStatusLabel(state) {
  return hasPublishedFillPerformance(state) ? "Tracking active" : "Public tracking active";
}

function performanceStripHtml(state) {
  const basis = trackingBasisForState(state);
  return `
    <section class="return-strip" aria-label="Public model performance">
      <div class="metric"><span>Model capital</span><strong id="modelCapitalMetric">${formatInr(state.modelCapitalInr)}</strong><small>Normalized baseline</small></div>
      <div class="metric"><span>Current value</span><strong id="currentValueMetric">${formatPerformanceValueInr(state.performance.currentModelValueInr)}</strong><small>Latest quote marked</small></div>
      <div class="metric"><span>Model P&L</span><strong id="modelPnlMetric" class="${toneClass(state.performance.totalPnlInr)}">${formatPerformanceInr(state.performance.totalPnlInr)}</strong><small>Against Rs 5 lakh</small></div>
      <div class="metric"><span>Return</span><strong id="portfolioReturnMetric" class="${toneClass(state.performance.sinceLaunchPercent)}">${formatPerformancePercent(state.performance.sinceLaunchPercent)}</strong><small>Since entry (${escapeHtml(formatDateTime(basis.publicFillBaselineAt))})</small></div>
      <div class="metric"><span>${escapeHtml(state.performance.benchmark)}</span><strong id="benchmarkReturnMetric" class="${toneClass(state.performance.benchmarkSinceLaunchPercent)}">${formatQuotePercent(state.performance.benchmarkSinceLaunchPercent)}</strong><small>Research model started ${escapeHtml(formatDateOnly(basis.researchModelStartedOn))}</small></div>
    </section>`;
}

function isFiniteMetric(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function toneClass(value) {
  const number = Number(value);
  if (number > 0) return "positive";
  if (number < 0) return "negative";
  return "neutral";
}

function formatInr(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "Pending quote";
  }
  return `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value))}`;
}

function formatSignedInr(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "--";
  }
  const number = Number(value);
  const prefix = number > 0 ? "+" : number < 0 ? "-" : "";
  return `${prefix}INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.abs(number))}`;
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "Awaiting quote";
  }
  return `INR ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))}`;
}

function formatPercent(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "--";
  }
  return `${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`;
}

function formatSignedPercent(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "--";
  }
  const number = Number(value);
  const prefix = number > 0 ? "+" : "";
  return `${prefix}${number.toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`;
}

function formatPerformanceInr(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "Awaiting quote";
  }
  return formatSignedInr(value);
}

function formatPerformanceValueInr(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "Awaiting quote";
  }
  return formatInr(value);
}

function formatPerformancePercent(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "Awaiting quote";
  }
  return formatSignedPercent(value);
}

function formatQuotePercent(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "Quote pending";
  }
  return formatSignedPercent(value);
}

function latestPriceColumnText(state) {
  const label = "Current price";
  const asOf = latestQuoteAsOf(state);
  return asOf ? `${label}<span class="th-note">${asOf}</span>` : label;
}

function latestQuoteStatusStamp(state) {
  const asOf = latestQuoteAsOf(state);
  return asOf ? `Price as of: ${asOf}` : `Last check: ${formatDateTime(state?.updatedAt ?? state?.pricing?.refreshedAt)}`;
}

function latestQuoteAsOf(state) {
  const timestamps = (state?.holdings ?? [])
    .filter((holding) => !holding.isStale && Number.isFinite(Number(holding.lastPrice)))
    .map((holding) => Date.parse(holding.lastPriceAt))
    .filter(Number.isFinite);
  if (!timestamps.length) {
    return "";
  }
  return formatDateTime(new Date(Math.max(...timestamps)).toISOString());
}

function holdingPriceSourceLine(holding) {
  const source = holding.priceSource ?? "Price snapshot";
  if (holding.isStale || !holding.lastPriceAt) {
    return source;
  }
  return `${source} - as of ${formatDateTime(holding.lastPriceAt)}`;
}

function holdingPriceShortLine(holding) {
  if (holding.isStale || !holding.lastPriceAt) {
    return "Quote pending";
  }
  return formatDateTime(holding.lastPriceAt);
}

function holdingEntrySourceLine(holding) {
  const value = holding.entryAt ?? holding.modelEntryAt ?? holding.modelEntryDate;
  if (!value) {
    return "Entry time pending";
  }
  const stamp = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? formatDateOnly(value) : formatDateTime(value);
  return `Entry: ${stamp}`;
}

function statusPlain(status) {
  const value = String(status ?? "Model slot");
  if (/core/i.test(value)) return "Core staged";
  if (/quality/i.test(value)) return "Quality slot";
  if (/speculative/i.test(value)) return "Speculative cap";
  if (/capped/i.test(value)) return "Capped slot";
  return value;
}

function fillStatusText(state) {
  return state.performance?.currentModelValueInr === null || state.performance?.currentModelValueInr === undefined
    ? "Public baseline is live; quote movement updates in holdings."
    : "Public baseline performance is live.";
}

function heroRefreshText(state) {
  const asOf = latestQuoteAsOf(state);
  const returnText = hasPublishedFillPerformance(state)
    ? `${formatPerformancePercent(state.performance?.sinceLaunchPercent)} since entry; `
    : "";
  return asOf ? `${returnText}latest quote refresh: ${asOf}` : `${returnText}latest quote refresh: waiting for verified quote`;
}

function entryCapturedLongLabel(state) {
  const basis = trackingBasisForState(state);
  return `Entries captured ${formatDateTime(basis.publicFillBaselineAt)}`;
}

function shortQuoteLabel(state) {
  const asOf = latestQuoteAsOf(state);
  return asOf || "Waiting for verified quote";
}

function holdingSummaryLine(holding) {
  const returnText = Number.isFinite(Number(holding.returnPercent))
    ? `${formatPerformancePercent(holding.returnPercent)} since entry`
    : "return awaiting verified quote";
  const quoteText = holding.isStale
    ? "quote pending"
    : `quote updated ${holdingPriceShortLine(holding)}`;
  return `${holding.ticker}: ${displayLabelForHolding(holding)} thesis; ${returnText}; ${quoteText}.`;
}

function displayLabelForHolding(holding) {
  return holding?.displayLabel ?? holding?.rolePlain ?? holding?.role ?? "Model slot";
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDateOnly(value) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function compactDateTime(value) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function methodologyEvaluationSummary(methodology) {
  const categories = methodology?.evaluationCategories ?? [];
  const labels = categories
    .slice(0, 5)
    .map((item) => String(item).split(":")[0].trim())
    .filter(Boolean);
  return labels.length > 0
    ? labels.join(", ")
    : "Profitability, valuation, growth catalysts, cash conversion, and capital structure.";
}

function absoluteHref(path, origin) {
  const value = String(path || "/");
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `${origin}${value.startsWith("/") ? value : `/${value}`}`;
}

function multibaggerJsonLd(pageTitle, pageDescription, canonicalUrl, modelCount) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: pageTitle,
    description: pageDescription,
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    publisher: {
      "@type": "Organization",
      name: "Market Narrative",
      url: siteOrigin
    },
    author: {
      "@type": "Person",
      name: "Editorial Desk",
      url: `${siteOrigin}/about/`
    },
    about: ["Indian equities", "multibagger research", "portfolio tracker", `${modelCount} stock model`]
  };
}

function jsonLdPayload(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
}
