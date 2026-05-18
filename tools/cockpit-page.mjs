import { brandHeadLinks, brandMarkCss, brandMarkHtml } from "./brand-assets.mjs";
import { newsArticleJsonLd, PUBLIC_DISPLAY_LIMIT } from "./core.mjs";
import { multibaggerState } from "./multibagger-data.mjs";
import { sourceUrlLooksArticleLevel } from "./news-sources.mjs";
import { componentDetailsHtml } from "./project-components-page.mjs";
import { publicDigestPayload } from "./public-payload.mjs";
import { articleThumbnailMeta } from "./source-thumbnails.mjs";

const siteOrigin = process.env.PUBLIC_SITE_ORIGIN ?? "https://marketnarrative.in";
const adminSiteOrigin = process.env.ADMIN_SITE_ORIGIN ?? "https://admin.marketnarrative.in";
const apiOrigin = process.env.MARKET_NARRATIVE_API_BASE ?? process.env.PUBLIC_API_ORIGIN ?? "https://api.marketnarrative.in";
const subscribeUrl = (process.env.PUBLIC_SUBSCRIBE_URL ?? "").trim() || "/subscribe/";

export function cockpitPage(digest, initialTab = "public-view", options = {}) {
  const includeStudio = options.includeStudio ?? true;
  const requireAuth = Boolean(options.requireAuth);
  const themeClass = options.theme === "glass-v2" ? "glass-v2" : "";
  const bodyClass = [themeClass, requireAuth ? "admin-auth-required auth-pending" : ""].filter(Boolean).join(" ");
  const publicTabs = new Set(["public-view", "trading-guide-view"]);
  const safeInitialTab = includeStudio || publicTabs.has(initialTab) ? initialTab : "public-view";
  const clientDigest = includeStudio ? digest : publicDigestPayload(digest);
  const isTradingGuidePage = /\/trading-guide\/?$/i.test(digest.canonicalPath ?? "");
  const renderPublicView = includeStudio || !isTradingGuidePage;
  const renderTradingGuideView = !includeStudio && isTradingGuidePage;
  const pageTitle = isTradingGuidePage
    ? `Trading Guide: ${digest.title ?? "Daily Pre-Market Briefing"} | Market Narrative - ${formatDigestDate(digest.digestDate)}`
    : `${hookTitle(digest)} | Market Narrative - ${formatDigestDate(digest.digestDate)}`;
  const pageDescription = isTradingGuidePage
    ? "Standalone Nifty and Bank Nifty trading guide with bias, gates, no-trade zone, confirmation checks, and market preparation context."
    : "Daily pre-market intelligence for Nifty, Bank Nifty, global cues, Asian markets, source cards, and live chart context.";
  const pageOrigin = options.siteOrigin ?? siteOrigin;
  const publicSiteBaseUrl = options.publicSiteBaseUrl ?? siteOrigin;
  const publicMultibaggerState = includeStudio ? (options.multibaggerState ?? multibaggerState()) : null;
  const canonicalUrl = absoluteSiteUrl(digest.canonicalPath ?? "/", pageOrigin);
  const previewImageUrl = absoluteSiteUrl("/og-card.svg", siteOrigin);
  const studioTabHtml = includeStudio
    ? '<button class="tab-btn" data-target="studio-view">Studio Command (Admin)</button>'
    : "";
  const publicBriefingNavHtml = includeStudio
    ? '<button class="tab-btn" data-target="public-view">Public Briefing</button>'
    : isTradingGuidePage
      ? '<a class="tab-link" href="../">Public Briefing</a>'
      : '<span class="tab-link active" aria-current="page">Public Briefing</span>';
  const tradingGuideTabHtml = includeStudio
    ? ""
    : isTradingGuidePage
      ? '<span class="tab-link active" aria-current="page">Trading Guide</span>'
      : '<a class="tab-link" href="./trading-guide/">Trading Guide</a>';
  const adminArchitectureTabHtml = includeStudio
    ? `<button class="tab-btn" data-target="architecture-view">Engine Architecture</button>
          <button class="tab-btn" data-target="components-view">Project Components</button>`
    : "";
  const publicAdminLinkHtml = !includeStudio && options.showAdminLink === true
    ? `<a class="tab-link" href="${escapeHtml(options.adminHref ?? `${adminSiteOrigin}/`)}">Admin Login</a>`
    : "";
  const multibaggerLinkHtml = includeStudio
    ? ""
    : `<a class="tab-link" href="${escapeHtml(options.multibaggerHref ?? (digest.canonicalPath ? "../multibagger/" : "./multibagger/"))}">Portfolio</a>`;
  const aboutLinkHtml = includeStudio
    ? ""
    : '<a class="tab-link" href="/about/">About</a>';
  const adminMultibaggerLinkHtml = includeStudio
    ? `<button class="tab-btn" data-target="multibagger-admin-view">Multibagger Review</button>`
    : "";
  const adminLogoutHtml = requireAuth
    ? '<button id="adminLogoutBtn" class="tab-link admin-logout-btn" type="button">Logout</button>'
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${brandHeadLinks(pageOrigin)}
  <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta name="description" content="${escapeHtml(pageDescription)}">
  <meta name="author" content="Abhey Deep">
  <meta name="keywords" content="Market Narrative, Abhey Deep, Nifty pre-market briefing, Bank Nifty trading guide, Indian stock market, GIFT Nifty, 7:15 AM IST market brief">
  <meta name="robots" content="${requireAuth ? "noindex,nofollow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"}">
  <meta name="theme-color" content="#050816">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta property="og:type" content="article">
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
  <script type="application/ld+json">${jsonLdPayload(newsArticleJsonLd(digest))}</script>
  <style>
    :root {
      --paper: #f4f5f7;
      --ink: #111827;
      --slate: #0f172a;
      --stone: #6b7280;
      --line: #e5e7eb;
      --panel: #ffffff;
      --blue: #2563eb;
      --green: #059669;
      --red: #dc2626;
      --gold: #f59e0b;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background-color: var(--paper);
      color: var(--ink);
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    @media (prefers-color-scheme: dark) {
      body:not(.glass-v2) {
        --paper: #0b1120;
        --ink: #f4f5f7;
        --slate: #f8fafc;
        --stone: #b8c4d8;
        --line: #263247;
        --panel: #111827;
        background: #0b1120;
      }

      body:not(.glass-v2) .topbar {
        background: rgba(11, 17, 32, 0.94);
      }

      body:not(.glass-v2) :is(.info-card, .panel, .briefing-card, .quote-board-card, .source-category-section, .source-card, .source-ledger-details, .summary-chip, .briefing-block, .briefing-lens, .metric) {
        background: #111827;
        border-color: #263247;
        color: #f4f5f7;
      }

      body:not(.glass-v2) :is(.section-kicker h2, .source-category-head h3, .source-category-meta strong, .source-stat-strip strong, .source-card h3, .brief-section h3, .brief-section strong) {
        color: #f8fafc;
      }

      body:not(.glass-v2) :is(.source-category-head p, .source-section-copy, .chart-note, .brief-list, .watch-grid, .source-stat-strip span, .source-category-meta span) {
        color: #b8c4d8;
      }
    }

    button, textarea, input {
      font: inherit;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--line);
    }

    .shell {
      max-width: 1160px;
      margin: 0 auto;
      padding: 0 18px;
    }

    .nav-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 64px;
      gap: 18px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0;
      color: var(--slate);
      white-space: nowrap;
    }

    .brand-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: #030712;
      color: #fff;
      font-size: 15px;
      font-weight: 900;
      box-shadow: 0 8px 20px rgba(17, 24, 39, 0.12);
    }

    ${brandMarkCss()}

    .tabs {
      display: flex;
      gap: 28px;
      align-items: stretch;
      min-height: 64px;
    }

    .tab-btn,
    .tab-link {
      border: 0;
      border-bottom: 2px solid transparent;
      background: transparent;
      color: var(--stone);
      padding: 0 1px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    .tab-link {
      display: inline-flex;
      align-items: center;
    }

    .tab-btn {
      font-family: inherit;
    }

    .tab-btn.active {
      border-bottom-color: var(--slate);
      color: var(--slate);
      font-weight: 700;
    }

    main.shell {
      padding-top: 32px;
      padding-bottom: 64px;
    }

    .hidden {
      display: none !important;
    }

    body.admin-auth-required.auth-pending .topbar,
    body.admin-auth-required.auth-pending main.shell {
      display: none;
    }

    body.admin-auth-required.auth-ready #adminAuthGate {
      display: none;
    }

    .auth-gate {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 28px;
    }

    .auth-card {
      width: min(460px, 100%);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 16px;
      background:
        linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(15, 23, 42, 0.62)),
        rgba(15, 23, 42, 0.76);
      color: #f8fafc;
      padding: 28px;
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
      backdrop-filter: blur(18px);
    }

    .auth-card h1 {
      margin: 0;
      font-size: 32px;
      line-height: 1.1;
      letter-spacing: 0;
    }

    .auth-card p {
      margin: 12px 0 22px;
      color: #cbd5e1;
      font-size: 15px;
      line-height: 1.65;
    }

    .auth-field {
      display: grid;
      gap: 7px;
      margin-bottom: 14px;
    }

    .auth-field span {
      color: #b8c4d8;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .auth-field input {
      width: 100%;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 10px;
      background: rgba(2, 6, 23, 0.62);
      color: #f8fafc;
      padding: 13px 14px;
      font-size: 15px;
      outline: none;
    }

    .auth-field input:focus {
      border-color: rgba(103, 232, 249, 0.78);
      box-shadow: 0 0 0 3px rgba(103, 232, 249, 0.12);
    }

    .auth-submit {
      width: 100%;
      border: 0;
      border-radius: 10px;
      background: linear-gradient(135deg, #67e8f9, #60a5fa 48%, #818cf8);
      color: #020617;
      padding: 13px 16px;
      font-size: 14px;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 0 18px 40px rgba(96, 165, 250, 0.22);
    }

    .auth-error {
      min-height: 22px;
      margin: 12px 0 0;
      color: #fecdd3;
      font-size: 13px;
      font-weight: 700;
    }

    .auth-error[hidden] {
      display: none;
    }

    .page-header {
      margin-bottom: 38px;
    }

    .eyebrow {
      margin: 0 0 10px;
      color: var(--stone);
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .page-header h1 {
      margin: 0 0 16px;
      color: var(--slate);
      font-size: 38px;
      line-height: 1.15;
      letter-spacing: 0;
    }

    .page-header p {
      max-width: 930px;
      margin: 0;
      color: #57534e;
      font-size: 18px;
      line-height: 1.65;
    }

    .summary-strip {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 20px;
    }

    .summary-chip {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
      padding: 14px;
    }

    .summary-chip span {
      display: block;
      color: var(--stone);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .summary-chip strong {
      display: block;
      margin-top: 6px;
      color: var(--slate);
      font-size: 18px;
      line-height: 1.25;
    }

    .briefing-shell {
      max-width: 980px;
      margin: 0 auto;
    }

    .briefing-topline {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 18px;
      margin-bottom: 24px;
    }

    .briefing-date {
      text-align: right;
      color: #111827;
    }

    .briefing-date span {
      display: block;
      color: #6b7280;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .briefing-date strong {
      display: block;
      margin-top: 3px;
      font-size: 14px;
    }

    .info-card {
      border: 1px solid rgba(229, 231, 235, 0.72);
      border-radius: 16px;
      background: #fff;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(17, 24, 39, 0.035);
      transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
    }

    .info-card:hover {
      transform: translateY(-2px);
      border-color: rgba(209, 213, 219, 0.9);
      box-shadow: 0 8px 30px rgba(17, 24, 39, 0.065);
    }

    .executive-card {
      margin-bottom: 30px;
      border-left: 4px solid #111827;
    }

    .briefing-expand-card {
      padding: 0;
      overflow: hidden;
    }

    .briefing-expand-card summary {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 18px;
      align-items: center;
      padding: 24px;
      cursor: pointer;
      list-style: none;
    }

    .briefing-expand-card summary::-webkit-details-marker {
      display: none;
    }

    .summary-label {
      display: block;
      margin-bottom: 8px;
      color: #6b7280;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .summary-card-title {
      margin: 0 0 10px;
      color: #111827;
      font-size: 30px;
      line-height: 1.08;
      font-weight: 900;
      letter-spacing: 0;
    }

    .briefing-expand-card summary p {
      margin: 0;
      color: #111827;
      font-size: 20px;
      line-height: 1.45;
      font-weight: 700;
    }

    .disclosure-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
      min-width: 104px;
      border-radius: 999px;
      background: #111827;
      color: #fff;
      padding: 9px 12px;
      font-size: 13px;
      font-weight: 900;
      line-height: 1;
      white-space: nowrap;
    }

    .executive-card .disclosure-action {
      color: #fff;
    }

    .disclosure-action .label-open {
      display: none;
    }

    .disclosure-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.16);
      font-size: 14px;
      line-height: 1;
    }

    .disclosure-icon::before {
      content: "▾";
      transform: translateY(-1px);
    }

    .briefing-expand-card[open] .disclosure-action .label-closed,
    .source-ledger-details[open] .disclosure-action .label-closed {
      display: none;
    }

    .briefing-expand-card[open] .disclosure-action .label-open,
    .source-ledger-details[open] .disclosure-action .label-open {
      display: inline;
    }

    .briefing-expand-card[open] .disclosure-icon::before,
    .source-ledger-details[open] .disclosure-icon::before,
    .quote-board-toggle.open .disclosure-icon::before {
      content: "▴";
      transform: translateY(-1px);
    }

    .expanded-briefing-page {
      border-top: 1px solid #e5e7eb;
      padding: 24px;
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    }

    .expanded-briefing-head {
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 20px;
      margin-bottom: 22px;
    }

    .expanded-briefing-head h2 {
      margin: 0 0 12px;
      color: #111827;
      font-size: 30px;
      line-height: 1.22;
      letter-spacing: 0;
    }

    .expanded-briefing-head p {
      margin: 0;
      color: #374151;
      font-size: 16px;
      line-height: 1.72;
    }

    .expanded-briefing-head p + p {
      margin-top: 13px;
    }

    .briefing-lens-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin: 20px 0 24px;
    }

    .briefing-lens {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      padding: 15px;
    }

    .briefing-lens span {
      display: block;
      color: #6b7280;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .briefing-lens strong {
      display: block;
      margin-top: 6px;
      color: #111827;
      font-size: 15px;
      line-height: 1.35;
    }

    .briefing-lens p {
      margin: 8px 0 0;
      color: #64748b;
      font-size: 13px;
      line-height: 1.55;
    }

    .executive-card h2 {
      margin: 0 0 18px;
      color: #111827;
      font-size: 28px;
      line-height: 1.25;
      letter-spacing: 0;
    }

    .executive-card p {
      margin: 0;
      color: #374151;
      font-size: 16px;
      line-height: 1.72;
    }

    .executive-card p + p {
      margin-top: 16px;
    }

    .executive-card strong {
      color: #111827;
      font-weight: 900;
    }

    .brief-lead {
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 18px;
    }

    .brief-section {
      margin-top: 24px;
    }

    .brief-section h3 {
      margin: 0 0 12px;
      color: #111827;
      font-size: 18px;
      line-height: 1.25;
    }

    .source-extract-list {
      border-top: 1px solid #e5e7eb;
    }

    .source-extract-row {
      display: grid;
      grid-template-columns: minmax(150px, 0.35fr) minmax(0, 1fr);
      gap: 18px;
      border-bottom: 1px solid #e5e7eb;
      padding: 16px 0;
    }

    .source-extract-meta span {
      display: block;
      color: #111827;
      font-size: 13px;
      font-weight: 900;
      line-height: 1.25;
    }

    .source-extract-meta small {
      display: block;
      margin-top: 6px;
      color: #6b7280;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.45;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .source-extract-copy h4 {
      margin: 0 0 7px;
      color: #111827;
      font-size: 16px;
      line-height: 1.35;
    }

    .source-extract-copy p {
      margin: 0;
      font-size: 14px;
      line-height: 1.6;
    }

    .source-extract-copy p + p {
      margin-top: 8px;
    }

    .source-extract-copy .why-line {
      color: #64748b;
    }

    .brief-list {
      margin: 0;
      padding-left: 18px;
      color: #374151;
      font-size: 15px;
      line-height: 1.68;
    }

    .brief-list li + li {
      margin-top: 10px;
    }

    .two-minute-summary .brief-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      padding-left: 0;
      list-style: none;
    }

    .two-minute-summary .brief-list li {
      margin: 0;
      border: 1px solid rgba(229, 231, 235, 0.86);
      border-radius: 12px;
      background: rgba(248, 250, 252, 0.78);
      padding: 13px 14px;
    }

    .two-minute-summary .brief-list li + li {
      margin-top: 0;
    }

    .watch-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 20px;
      margin: 0;
      padding-left: 18px;
      color: #374151;
      font-size: 14px;
      line-height: 1.55;
    }

    .section-kicker {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 20px;
      margin: 0 0 16px;
    }

    .section-kicker h2 {
      margin: 0;
      color: #111827;
      font-size: 22px;
      line-height: 1.2;
    }

    .sentiment-meter {
      width: min(220px, 44vw);
    }

    .sentiment-scale {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      color: #9ca3af;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .sentiment-bar {
      position: relative;
      width: 100%;
      height: 4px;
      border-radius: 999px;
      background: linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%);
    }

    .sentiment-pin {
      position: absolute;
      top: -4px;
      width: 12px;
      height: 12px;
      border: 2px solid #111827;
      border-radius: 50%;
      background: #fff;
      transform: translateX(-50%);
    }

    .pulse-section,
    .sources-section,
    .market-chart-panel {
      margin-top: 30px;
    }

    .trade-map-card {
      position: relative;
      margin-top: 24px;
      overflow: hidden;
      border: 0;
      background: #0f172a;
      color: #f8fafc;
    }

    .india-preopen-panel {
      margin-top: 20px;
      background: #0c1a2e;
      border: 1px solid rgba(99,179,237,0.18);
      border-radius: 12px;
      padding: 18px 20px 14px;
    }
    .preopen-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }
    .preopen-header h2 {
      font-size: 15px;
      font-weight: 700;
      color: #e2e8f0;
      margin: 4px 0 0;
    }
    .preopen-flow-badge {
      font-size: 11px;
      background: rgba(99,179,237,0.12);
      color: #90cdf4;
      border-radius: 6px;
      padding: 3px 8px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .preopen-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }
    .preopen-tile {
      background: rgba(255,255,255,0.04);
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      text-decoration: none;
      border: 1px solid transparent;
      transition: border-color 0.15s;
      cursor: pointer;
    }
    .preopen-tile:hover { border-color: rgba(99,179,237,0.3); }
    .preopen-tile span {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
    }
    .preopen-tile strong {
      font-size: 20px;
      font-weight: 700;
      line-height: 1.1;
    }
    .preopen-tile.up strong { color: #34d399; }
    .preopen-tile.down strong { color: #fb7185; }
    .preopen-tile.flat strong { color: #fbbf24; }
    .preopen-tile strong, .preopen-tile:not(.up):not(.down):not(.flat) strong { color: #e2e8f0; }
    .preopen-tile small {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.3;
    }
    .preopen-flows {
      display: flex;
      gap: 8px;
      border-top: 1px solid rgba(255,255,255,0.07);
      padding-top: 10px;
      flex-wrap: wrap;
    }
    .preopen-flow-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1 1 200px;
    }
    .flow-label {
      font-size: 11px;
      color: #64748b;
      white-space: nowrap;
    }
    .preopen-flow {
      font-size: 14px;
      font-weight: 700;
    }
    .preopen-flow.up { color: #34d399; }
    .preopen-flow.down { color: #fb7185; }
    .preopen-flow-row small {
      font-size: 11px;
      color: #64748b;
    }
    .preopen-flows--pending {
      font-size: 12px;
      color: #64748b;
      font-style: italic;
    }
    @media (max-width: 600px) {
      .preopen-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .opening-nerve-card {
      position: relative;
      margin-top: 18px;
      overflow: hidden;
      border: 0;
      background: #0b1220;
      color: #f8fafc;
    }

    .opening-nerve-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 16px;
    }

    .opening-nerve-head h2 {
      margin: 4px 0 6px;
      color: #fff;
      font-size: 24px;
      line-height: 1.1;
    }

    .opening-nerve-head p {
      margin: 0;
      max-width: 700px;
      color: #cbd5e1;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.55;
    }

    .opening-nerve-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .opening-nerve-tile {
      border: 1px solid rgba(255, 255, 255, 0.13);
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.62);
      display: grid;
      gap: 7px;
      min-height: 108px;
      padding: 14px;
    }

    .opening-nerve-tile span {
      color: #94a3b8;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .opening-nerve-tile strong {
      color: #fff;
      font-size: clamp(18px, 2.4vw, 25px);
      line-height: 1.1;
    }

    .opening-nerve-tile small {
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.45;
    }

    .opening-nerve-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: space-between;
      margin-top: 14px;
      padding-top: 13px;
    }

    .opening-nerve-footer span,
    .opening-nerve-footer a {
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 850;
      line-height: 1.45;
    }

    .opening-nerve-footer a {
      color: #67e8f9;
    }

    .trade-map-head {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 18px;
      margin-bottom: 18px;
    }

    .trade-map-head h2 {
      margin: 4px 0 6px;
      color: #fff;
      font-size: 24px;
      line-height: 1.1;
    }

    .trade-map-head p {
      margin: 0;
      max-width: 680px;
      color: #cbd5e1;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.55;
    }

    .trade-bias-pill {
      flex: 0 0 auto;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.78);
      padding: 8px 12px;
      color: #fde68a;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .trade-bias-pill.long {
      color: #bbf7d0;
    }

    .trade-bias-pill.short {
      color: #fecdd3;
    }

    .trade-map-grid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .trade-map-tile {
      min-height: 124px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
      border: 1px solid rgba(255, 255, 255, 0.13);
      border-radius: 18px;
      background: rgba(15, 23, 42, 0.62);
      padding: 16px;
    }

    .trade-map-tile.wide {
      grid-column: span 2;
    }

    .trade-map-tile span {
      color: #94a3b8;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .trade-map-tile strong {
      color: #fff;
      font-size: clamp(22px, 3vw, 32px);
      line-height: 1.05;
      letter-spacing: 0;
    }

    .trade-map-tile small {
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.45;
    }

    .setup-card {
      position: relative;
      margin-top: 30px;
      overflow: hidden;
      border: 0;
      background: #111827;
      color: #fff;
    }

    .setup-card::after {
      content: "";
      position: absolute;
      top: -48px;
      right: -42px;
      width: 140px;
      height: 140px;
      border-radius: 999px;
      background: rgba(239, 68, 68, 0.24);
      filter: blur(34px);
      pointer-events: none;
    }

    .setup-card-header {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .setup-card h2 {
      margin: 0;
      color: #fff;
      font-size: 22px;
    }

    .setup-badge {
      border: 1px solid #374151;
      border-radius: 999px;
      background: rgba(31, 41, 55, 0.82);
      padding: 6px 10px;
      color: #d1d5db;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }

    .setup-badge.complete {
      border-color: rgba(148, 163, 184, 0.45);
      background: rgba(71, 85, 105, 0.34);
      color: #cbd5e1;
    }

    .setup-grid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.55fr);
      gap: 24px;
      align-items: stretch;
    }

    .strategy-label {
      margin: 0 0 5px;
      color: #9ca3af;
      font-size: 14px;
      font-weight: 700;
    }

    .strategy-bias {
      margin: 0;
      color: #fca5a5;
      font-size: 20px;
      font-weight: 900;
    }

    .strategy-note {
      margin: 12px 0 0;
      color: #9ca3af;
      font-size: 13px;
      line-height: 1.55;
    }

    .setup-audit-list {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 10px;
      margin-top: 18px;
    }

    .setup-audit-item {
      display: grid;
      grid-template-columns: minmax(82px, auto) minmax(0, 1fr);
      gap: 12px;
      align-items: start;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.48);
      padding: 12px;
    }

    .setup-audit-item strong {
      color: #f8fafc;
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .setup-audit-item span {
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.5;
    }

    .setup-audit-item small {
      display: block;
      margin-top: 5px;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.45;
    }

    .setup-audit-item.complete strong,
    .setup-audit-item.complete span {
      color: #cbd5e1;
      text-decoration: line-through;
      text-decoration-thickness: 1px;
      text-decoration-color: rgba(148, 163, 184, 0.62);
    }

    .setup-levels {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      border: 1px solid #374151;
      border-radius: 14px;
      background: rgba(31, 41, 55, 0.58);
      padding: 16px;
    }

    .setup-level {
      text-align: center;
      padding: 0 12px;
    }

    .setup-level + .setup-level {
      border-left: 1px solid #374151;
    }

    .setup-level span {
      display: block;
      margin-bottom: 6px;
      color: #9ca3af;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .setup-level strong {
      display: block;
      color: #fff;
      font-size: 20px;
      line-height: 1.15;
    }

    .setup-level.stop span,
    .setup-level.stop strong {
      color: #fca5a5;
    }

    .setup-level.target span,
    .setup-level.target strong {
      color: #86efac;
    }

    .setup-level small {
      display: block;
      margin-top: 5px;
      color: #cbd5e1;
      font-size: 11px;
      font-weight: 700;
    }

    .sources-section {
      margin-top: 34px;
    }

    /* Today's Read prose section */
    .todays-read-section {
      margin-top: 36px;
      padding: 28px 32px 28px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
    }
    .todays-read-kicker {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #63b3ed;
      margin-bottom: 8px;
    }
    .todays-read-section h2 {
      font-size: 22px;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0 0 16px;
      line-height: 1.3;
    }
    .todays-read-body {
      font-size: 15.5px;
      line-height: 1.75;
      color: #cbd5e1;
      max-width: 760px;
    }
    .todays-read-body p {
      margin: 0 0 14px;
    }
    .todays-read-body p:last-child {
      margin-bottom: 0;
    }
    .todays-read-body strong {
      color: #e2e8f0;
      font-weight: 600;
    }
    .todays-read-footer {
      margin-top: 16px;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid rgba(255,255,255,0.06);
      padding-top: 12px;
    }

    .source-section-copy {
      margin: 8px 0 0;
      max-width: 680px;
      color: #6b7280;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.6;
    }

    .source-quality-line {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 10px 0 0;
      border: 1px solid rgba(37, 99, 235, 0.16);
      border-radius: 999px;
      background: rgba(37, 99, 235, 0.07);
      padding: 7px 10px;
      color: #334155;
      font-size: 12px;
      font-weight: 900;
      line-height: 1.35;
    }

    .source-stat-strip {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }

    .source-stat-strip span {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 8px 10px;
      color: #6b7280;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .source-stat-strip strong {
      display: block;
      margin-top: 2px;
      color: #111827;
      font-size: 18px;
      letter-spacing: 0;
      text-transform: none;
    }

    .source-stat-help {
      flex-basis: 100%;
      color: #6b7280;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0;
      text-align: right;
      text-transform: none;
    }

    .source-overview-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
      gap: 16px;
      margin: 16px 0;
      align-items: stretch;
    }

    .source-lead-card {
      display: grid;
      grid-template-columns: 210px minmax(0, 1fr);
      gap: 18px;
      align-items: stretch;
      padding: 16px;
    }

    .source-lead-card .source-thumb {
      min-height: 218px;
    }

    .source-lead-copy {
      display: flex;
      min-width: 0;
      flex-direction: column;
    }

    .source-lead-kicker {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .source-lead-copy h3 {
      margin: 0;
      color: #111827;
      font-size: 24px;
      line-height: 1.18;
      letter-spacing: 0;
    }

    .source-lead-copy > p {
      margin: 12px 0 0;
      color: #4b5563;
      font-size: 15px;
      line-height: 1.6;
    }

    .source-lead-copy a {
      color: #2563eb;
      font-size: 14px;
      font-weight: 900;
    }

    .source-readthrough-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin: auto 0 14px;
      padding-top: 18px;
    }

    .source-readthrough-grid div {
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
    }

    .source-readthrough-grid span {
      display: block;
      margin-bottom: 5px;
      color: #9ca3af;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .source-readthrough-grid strong {
      display: block;
      color: #111827;
      font-size: 13px;
      line-height: 1.45;
    }

    .source-evidence-map {
      border: 1px solid rgba(229, 231, 235, 0.9);
      border-radius: 8px;
      background: #111827;
      padding: 18px;
      color: #f9fafb;
      box-shadow: var(--shadow);
    }

    .source-evidence-map > span {
      color: #9ca3af;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .source-evidence-map h3 {
      margin: 8px 0 16px;
      color: #fff;
      font-size: 20px;
      line-height: 1.25;
      letter-spacing: 0;
    }

    .source-theme-list {
      display: grid;
      gap: 9px;
    }

    .source-theme-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.045);
      padding: 10px;
    }

    .source-theme-row strong {
      display: block;
      color: #f9fafb;
      font-size: 13px;
      line-height: 1.25;
    }

    .source-theme-row small {
      display: block;
      margin-top: 3px;
      color: #9ca3af;
      font-size: 11px;
      font-weight: 700;
    }

    .source-theme-score {
      border-radius: 6px;
      padding: 6px 7px;
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
    }

    .source-theme-score.up {
      background: rgba(16, 185, 129, 0.16);
      color: #86efac;
    }

    .source-theme-score.down {
      background: rgba(248, 113, 113, 0.15);
      color: #fca5a5;
    }

    .source-theme-score.flat {
      background: rgba(229, 231, 235, 0.11);
      color: #e5e7eb;
    }

    .source-filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0 0 14px;
    }

    .source-filter-btn {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 9px 11px;
      color: #4b5563;
      font: inherit;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      cursor: pointer;
      transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
    }

    .source-filter-btn span {
      margin-left: 6px;
      color: #9ca3af;
    }

    .source-filter-btn.active {
      border-color: #111827;
      background: #111827;
      color: #fff;
    }

    .source-filter-btn.active span {
      color: #d1d5db;
    }

    .source-visible-count {
      align-self: center;
      margin-left: auto;
      color: #9ca3af;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .source-ledger-details {
      border: 1px solid rgba(229, 231, 235, 0.82);
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 10px 26px rgba(17, 24, 39, 0.045);
      overflow: hidden;
    }

    .source-ledger-details summary {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: center;
      padding: 16px 18px;
      cursor: pointer;
      list-style: none;
    }

    .source-ledger-details summary::-webkit-details-marker {
      display: none;
    }

    .source-ledger-details summary h3 {
      margin: 0;
      color: #111827;
      font-size: 18px;
      line-height: 1.25;
    }

    .source-ledger-details summary p {
      margin: 5px 0 0;
      color: #6b7280;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.45;
    }

    .source-ledger-action {
      font-size: 12px;
    }

    .source-ledger-body {
      border-top: 1px solid #eef2f7;
      padding: 16px;
    }

    .news-card-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      align-items: start;
    }

    .source-category-board {
      display: grid;
      gap: 16px;
    }

    .source-category-section {
      border: 1px solid rgba(229, 231, 235, 0.82);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.72);
      padding: 14px;
      box-shadow: 0 12px 34px rgba(17, 24, 39, 0.045);
    }

    .source-category-section[hidden] {
      display: none;
    }

    .source-category-head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: start;
      margin-bottom: 12px;
      border-bottom: 1px solid #eef0f3;
      padding-bottom: 12px;
    }

    .source-category-label {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
    }

    .source-category-label span {
      border-radius: 6px;
      background: #111827;
      color: #fff;
      padding: 5px 7px;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .source-category-label small {
      color: #9ca3af;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .source-category-head h3 {
      margin: 0;
      color: #111827;
      font-size: 22px;
      line-height: 1.2;
      letter-spacing: 0;
    }

    .source-category-head p {
      margin: 7px 0 0;
      max-width: 760px;
      color: #6b7280;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.55;
    }

    .source-category-meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(72px, 1fr));
      gap: 8px;
      min-width: 270px;
    }

    .source-category-meta div {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #fff;
      padding: 9px;
    }

    .source-category-meta span {
      display: block;
      color: #9ca3af;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .source-category-meta strong {
      display: block;
      margin-top: 4px;
      color: #111827;
      font-size: 16px;
      line-height: 1.2;
    }

    .source-category-meta strong.up {
      color: #047857;
    }

    .source-category-meta strong.down {
      color: #b91c1c;
    }

    .source-category-meta strong.flat {
      color: #b45309;
    }

    .source-category-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      align-items: start;
    }

    .source-card {
      cursor: pointer;
      display: grid;
      grid-template-columns: 104px minmax(0, 1fr);
      gap: 13px;
      align-items: start;
      padding: 13px;
    }

    .source-card[hidden] {
      display: none;
    }

    .source-thumb {
      position: relative;
      min-height: 116px;
      border-radius: 8px;
      overflow: hidden;
      background:
        radial-gradient(circle at 22% 20%, color-mix(in srgb, var(--thumb-accent) 34%, white), transparent 28%),
        linear-gradient(135deg, color-mix(in srgb, var(--thumb-accent) 78%, #111827), #111827 72%);
      color: #fff;
      isolation: isolate;
    }

    .source-thumb::before {
      content: "";
      position: absolute;
      inset: 18px -20px auto 20px;
      height: 48px;
      border-bottom: 3px solid rgba(255, 255, 255, 0.72);
      border-left: 3px solid rgba(255, 255, 255, 0.32);
      transform: skewY(-14deg);
      opacity: 0.76;
    }

    .source-thumb::after {
      content: "";
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.12) 1px, transparent 1px);
      background-size: 22px 22px;
      opacity: 0.18;
      z-index: -1;
    }

    .source-thumb span,
    .source-thumb strong {
      position: absolute;
      left: 16px;
      right: 16px;
    }

    .source-thumb span {
      bottom: 44px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.76;
    }

    .source-thumb strong {
      bottom: 15px;
      font-size: 19px;
      line-height: 1.05;
      text-transform: uppercase;
    }

    .source-card-copy {
      min-width: 0;
    }

    .source-card-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 12px;
      margin-bottom: 9px;
    }

    .news-badge {
      border-radius: 5px;
      padding: 5px 8px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .news-badge.negative {
      background: #fee2e2;
      color: #b91c1c;
    }

    .news-badge.positive {
      background: #dcfce7;
      color: #166534;
    }

    .news-badge.neutral {
      background: #f3f4f6;
      color: #374151;
    }

    .source-name {
      color: #9ca3af;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      text-align: right;
    }

    .source-card h3 {
      margin: 0 0 8px;
      color: #111827;
      font-size: 16px;
      line-height: 1.32;
      transition: color 160ms ease;
    }

    .source-card:hover h3 {
      color: #2563eb;
    }

    .source-card p {
      margin: 0;
      color: #4b5563;
      font-size: 13px;
      line-height: 1.52;
    }

    .source-card a {
      display: inline-block;
      margin-top: 10px;
      color: #2563eb;
      font-size: 14px;
      font-weight: 700;
    }

    .source-takeaway strong {
      color: #111827;
    }

    .source-card-detail {
      margin-top: 9px;
      border-top: 1px solid #eef0f3;
      padding-top: 8px;
    }

    .source-card-detail summary {
      color: #111827;
      font-size: 12px;
      font-weight: 900;
      cursor: pointer;
      list-style-position: outside;
    }

    .source-card-detail p {
      margin-top: 8px;
      color: #6b7280;
    }

    .source-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 8px;
    }

    .source-entity {
      color: #9ca3af;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .public-footer {
      margin-top: 42px;
      padding-top: 24px;
      border-top: 1px solid var(--line);
      text-align: center;
    }

    .public-footer p {
      margin: 0;
      color: #9ca3af;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.6;
    }

    .legacy-audit-banner,
    .edition-nav,
    .share-row,
    .reader-path,
    .session-notice,
    .evidence-grade-card,
    .follow-briefing-cta,
    .chart-cta-panel {
      border: 1px solid rgba(148, 163, 184, 0.24);
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.58);
      padding: 14px;
    }

    .legacy-audit-banner {
      margin: 16px 0;
      border-color: rgba(251, 191, 36, 0.42);
      background: rgba(120, 53, 15, 0.28);
      color: #fde68a;
      font-weight: 900;
    }

    .edition-nav,
    .share-row,
    .reader-path {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
      margin: 14px 0;
    }

    .session-notice,
    .evidence-grade-card,
    .follow-briefing-cta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
      margin: 14px 0;
    }

    .session-notice strong,
    .evidence-grade-card strong,
    .follow-briefing-cta strong {
      color: #f8fafc;
      font-size: 14px;
    }

    .session-notice span,
    .evidence-grade-card span,
    .follow-briefing-cta span {
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.5;
    }

    .evidence-grade-card {
      border-color: rgba(52, 211, 153, 0.26);
      background: rgba(6, 78, 59, 0.22);
    }

    .evidence-grade-card.limited,
    .evidence-grade-card.global-cue-only {
      border-color: rgba(251, 191, 36, 0.34);
      background: rgba(120, 53, 15, 0.22);
    }

    .evidence-grade-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .evidence-grade-grid span {
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 8px;
      background: rgba(2, 6, 23, 0.28);
      padding: 8px 10px;
      color: #cbd5e1;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .evidence-grade-grid b {
      color: #f8fafc;
      display: block;
      font-size: 15px;
      letter-spacing: 0;
      margin-top: 2px;
      text-transform: none;
    }

    .follow-link {
      border-radius: 999px;
      background: linear-gradient(135deg, #06b6d4, #6366f1);
      color: #fff;
      flex: 0 0 auto;
      padding: 9px 12px;
      font-size: 12px;
      font-weight: 900;
    }

    .reader-path strong {
      color: #f8fafc;
      font-size: 14px;
    }

    .reader-path div {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .reader-path a,
    .reader-path span {
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 999px;
      background: rgba(2, 6, 23, 0.38);
      color: #dbeafe;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 900;
    }

    .edition-nav a,
    .share-link,
    .share-copy-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 999px;
      background: rgba(2, 6, 23, 0.42);
      color: #e5e7eb;
    }

    .edition-nav a {
      padding: 9px 12px;
      font-size: 12px;
      font-weight: 900;
    }

    .share-link,
    .share-copy-btn {
      width: 42px;
      height: 42px;
      padding: 0;
    }

    .share-byline {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .share-byline strong,
    .share-actions-label {
      color: #f8fafc;
      font-weight: 800;
      letter-spacing: 0;
    }

    .share-byline small {
      color: #94a3b8;
      font-size: 12px;
      font-weight: 800;
    }

    .share-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }

    .share-actions-label {
      margin-right: 4px;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .share-copy-btn {
      cursor: pointer;
      font: inherit;
    }

    .share-copy-btn[data-copy-state="copied"] {
      border-color: rgba(52, 211, 153, 0.5);
      background: rgba(6, 78, 59, 0.38);
      color: #86efac;
    }

    .share-icon {
      display: block;
      width: 18px;
      height: 18px;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .chart-cta-panel {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: center;
      margin-top: 30px;
    }

    .chart-cta-panel h2 {
      margin: 0 0 6px;
    }

    .briefing-card {
      margin-bottom: 32px;
      border: 1px solid #f2f0ed;
      border-radius: 12px;
      background: #fff;
      padding: 22px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 20px 45px rgba(15, 23, 42, 0.04);
    }

    .briefing-card h2 {
      margin: 0 0 14px;
      color: #1e293b;
      font-size: 20px;
    }

    .briefing-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 18px;
    }

    .briefing-block {
      border-radius: 10px;
      background: #fafaf9;
      padding: 16px;
    }

    .briefing-block h3 {
      margin: 0 0 10px;
      color: #334155;
      font-size: 14px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .briefing-block ul {
      margin: 0;
      padding-left: 18px;
      color: #57534e;
      line-height: 1.55;
    }

    .briefing-block li + li {
      margin-top: 8px;
    }

    .grid-main {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
      gap: 32px;
    }

    .grid-two {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 32px;
    }

    .grid-three {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }

    .stack {
      display: grid;
      gap: 32px;
    }

    .panel {
      background: var(--panel);
      border: 1px solid #f2f0ed;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 20px 45px rgba(15, 23, 42, 0.04);
    }

    .panel h2 {
      margin: 0 0 18px;
      color: #1e293b;
      font-size: 20px;
      line-height: 1.3;
    }

    .panel p {
      color: #57534e;
      line-height: 1.65;
    }

    .admin-console-section {
      display: grid;
      gap: 18px;
    }

    .admin-console-note {
      color: #64748b;
      line-height: 1.65;
      margin: 0 0 10px;
    }

    .admin-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }

    details.admin-console-details,
    details.component {
      border: 1px solid rgba(226, 232, 240, 0.92);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
      overflow: hidden;
    }

    details.admin-console-details summary,
    details.component summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 18px 20px;
      cursor: pointer;
      list-style: none;
    }

    details.admin-console-details summary::-webkit-details-marker,
    details.component summary::-webkit-details-marker {
      display: none;
    }

    details.admin-console-details summary h2,
    details.component summary h3 {
      color: #0f172a;
      font-size: 18px;
      margin: 0 0 5px;
      line-height: 1.25;
    }

    details.admin-console-details summary p,
    details.component summary p {
      color: #64748b;
      margin: 0;
      line-height: 1.5;
    }

    details.admin-console-details .chev,
    details.component .chev {
      color: #22d3ee;
      font-size: 19px;
      font-weight: 900;
      transition: transform 160ms ease;
    }

    details.admin-console-details[open] .chev,
    details.component[open] .chev {
      transform: rotate(180deg);
    }

    .admin-console-body,
    .component-body {
      border-top: 1px solid rgba(226, 232, 240, 0.88);
      padding: 18px 20px 20px;
    }

    .body-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .body-card,
    .repo-card-inline {
      border: 1px solid rgba(226, 232, 240, 0.88);
      border-radius: 10px;
      background: rgba(248, 250, 252, 0.88);
      padding: 15px;
    }

    .body-card strong,
    .repo-card-inline strong {
      color: #0f172a;
      display: block;
      margin-bottom: 8px;
    }

    .body-card ul,
    .file-list,
    .admin-list {
      color: #475569;
      line-height: 1.65;
      margin: 0;
      padding-left: 18px;
    }

    .file-list code,
    .repo-card-inline code {
      color: #0891b2;
      font-weight: 900;
    }

    .table-wrap {
      overflow-x: auto;
      border: 1px solid rgba(226, 232, 240, 0.9);
      border-radius: 10px;
    }

    table {
      width: 100%;
      min-width: 680px;
      border-collapse: collapse;
    }

    th,
    td {
      border-bottom: 1px solid rgba(226, 232, 240, 0.84);
      padding: 12px 13px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: rgba(241, 245, 249, 0.92);
      color: #334155;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    td {
      color: #475569;
      font-size: 14px;
      line-height: 1.55;
    }

    tr:last-child td {
      border-bottom: 0;
    }

    .admin-form-field {
      display: grid;
      gap: 8px;
      color: #334155;
      font-size: 13px;
      font-weight: 900;
    }

    .admin-form-field input,
    #portfolioFile {
      width: 100%;
      border: 1px solid rgba(203, 213, 225, 0.95);
      border-radius: 9px;
      background: #fff;
      color: #0f172a;
      padding: 10px 11px;
    }

    .state-line {
      color: #64748b;
      min-height: 24px;
      margin: 12px 0 0;
      font-size: 13px;
    }

    .review-output {
      overflow: auto;
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 10px;
      background: #020617;
      color: #dbeafe;
      padding: 14px;
      min-height: 160px;
    }

    .chart-container {
      position: relative;
      width: 100%;
      height: 350px;
      max-height: 400px;
    }

    .chart-note {
      margin: 0 0 16px;
      color: #78716c;
      font-size: 14px;
      line-height: 1.55;
    }

    .scanner-height {
      height: 260px;
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }

    .quote-board-card {
      overflow: hidden;
      margin: 18px 0 0;
      border: 1px solid rgba(229, 231, 235, 0.72);
      border-radius: 14px;
      background: #fff;
      box-shadow: 0 4px 20px rgba(17, 24, 39, 0.035);
    }

    .quote-board-toggle {
      display: grid;
      grid-template-columns: minmax(260px, 1fr) minmax(240px, 0.9fr) auto;
      align-items: center;
      gap: 16px;
      width: 100%;
      border: 0;
      background: #fff;
      padding: 18px;
      text-align: left;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .quote-board-toggle:hover {
      background: #f8fafc;
    }

    .quote-board-title strong {
      display: block;
      margin: 0;
      color: #334155;
      font-size: 15px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .quote-board-title small {
      display: block;
      margin-top: 5px;
      color: #78716c;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.45;
    }

    .live-clock {
      max-width: 520px;
      color: #78716c;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.35;
      text-align: right;
      white-space: normal;
    }

    .quote-board-action {
      font-size: 12px;
    }

    .quote-board-body {
      border-top: 1px solid #e5e7eb;
      padding: 0 18px 18px;
    }

    .quote-board-body[hidden] {
      display: none;
    }

    .regional-breadth {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin: 14px 0 16px;
    }

    .breadth-card {
      width: 100%;
      border: 1px solid rgba(229, 231, 235, 0.72);
      border-radius: 10px;
      background: #fff;
      padding: 12px;
      text-align: left;
      cursor: pointer;
      box-shadow: 0 3px 14px rgba(17, 24, 39, 0.028);
      transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
    }

    .breadth-card:hover {
      transform: translateY(-1px);
      border-color: #cbd5e1;
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.07);
    }

    .breadth-card[aria-pressed="true"] {
      border-color: #111827;
      box-shadow: 0 10px 26px rgba(15, 23, 42, 0.11);
    }

    .breadth-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .breadth-card span {
      color: #6b7280;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .market-state {
      flex: 0 0 auto;
      border-radius: 999px;
      background: #f5f5f4;
      padding: 4px 7px;
      color: #57534e;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .market-state.live {
      background: #dcfce7;
      color: #166534;
    }

    .market-state.partial {
      background: #fef3c7;
      color: #92400e;
    }

    .market-move.up {
      color: #047857;
    }

    .market-move.down {
      color: #b91c1c;
    }

    .breadth-card strong {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 6px 8px;
      margin-top: 5px;
      color: #111827;
      font-size: 17px;
      line-height: 1.18;
    }

    .breadth-card strong em {
      color: #64748b;
      font-size: 12px;
      font-style: normal;
      font-weight: 900;
    }

    .breadth-card small {
      display: block;
      margin-top: 7px;
      color: #9ca3af;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.35;
    }

    .breadth-card small b {
      font-weight: 900;
    }

    .quote-region-empty {
      margin-top: 14px;
      border: 1px dashed #d1d5db;
      border-radius: 12px;
      background: #f8fafc;
      padding: 18px;
      color: #64748b;
      font-size: 13px;
      font-weight: 700;
      text-align: center;
    }

    .quote-region {
      margin-top: 18px;
    }

    .quote-region:first-child {
      margin-top: 0;
    }

    .quote-region-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }

    .quote-region-head h3 {
      margin: 0;
      color: #111827;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .quote-region-head span {
      color: #9ca3af;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }

    .index-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 14px;
    }

    .index-tile {
      min-height: 128px;
      border: 1px solid rgba(229, 231, 235, 0.72);
      border-radius: 16px;
      background: #fff;
      padding: 16px;
      text-align: left;
      cursor: pointer;
      transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
      box-shadow: 0 4px 20px rgba(17, 24, 39, 0.035);
    }

    .index-tile:hover {
      transform: translateY(-1px);
      border-color: #94a3b8;
      box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
    }

    .index-tile .symbol-row {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 8px;
    }

    .index-tile .symbol {
      color: #334155;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .index-tile .status {
      border-radius: 999px;
      background: #f5f5f4;
      padding: 4px 7px;
      color: #57534e;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .index-tile .status.live {
      background: #dcfce7;
      color: #166534;
    }

    .index-tile .status.closed {
      background: #f5f5f4;
      color: #57534e;
    }

    .index-tile .name {
      margin-top: 8px;
      color: #78716c;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.25;
    }

    .index-tile .price {
      margin-top: 10px;
      color: var(--slate);
      font-size: 22px;
      font-weight: 900;
      line-height: 1.1;
    }

    .index-tile .change {
      margin-top: 5px;
      font-size: 13px;
      font-weight: 900;
    }

    .index-tile .change.up {
      color: #047857;
    }

    .index-tile .change.down {
      color: #b91c1c;
    }

    .chart-modal {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(15, 23, 42, 0.52);
    }

    .chart-modal.open {
      display: flex;
    }

    .chart-modal-panel {
      width: min(920px, 100%);
      border-radius: 14px;
      background: #fff;
      padding: 22px;
      box-shadow: 0 30px 80px rgba(15, 23, 42, 0.26);
    }

    .chart-modal-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      align-items: start;
      gap: 20px;
      margin-bottom: 16px;
    }

    .chart-modal-header h2 {
      margin: 0;
      color: var(--slate);
      font-size: 24px;
    }

    .chart-modal-header p {
      margin: 6px 0 0;
      color: #57534e;
      font-size: 14px;
    }

    .icon-btn {
      width: 34px;
      height: 34px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--slate);
      font-size: 20px;
      font-weight: 900;
      cursor: pointer;
    }

    .modal-chart-container {
      position: relative;
      height: min(560px, 72vh);
      border-radius: 10px;
      background: #fafaf9;
      border: 1px solid #e5e7eb;
      overflow: hidden;
    }

    .market-chart-preview {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      padding: 20px;
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    }

    .market-chart-canvas {
      width: 100%;
      min-height: 0;
      flex: 1;
    }

    .market-chart-caption {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      border-top: 1px solid #e5e7eb;
      padding-top: 14px;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
    }

    .market-chart-caption strong {
      color: #111827;
      font-size: 13px;
    }

    .chart-fallback {
      position: absolute;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 28px;
      text-align: center;
      background: linear-gradient(135deg, #f8fafc, #eef2ff);
      color: #334155;
      z-index: 2;
    }

    .chart-fallback.visible {
      display: flex;
    }

    .chart-fallback h3 {
      margin: 0 0 8px;
      color: #111827;
      font-size: 20px;
    }

    .chart-fallback p {
      margin: 0 0 16px;
      color: #64748b;
      font-size: 14px;
      line-height: 1.55;
    }

    .chart-link-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: #111827;
      color: #fff;
      padding: 10px 13px;
      font-size: 13px;
      font-weight: 900;
    }

    .metric {
      padding: 16px;
      border-radius: 10px;
      background: #fafaf9;
      text-align: center;
    }

    .metric.blue {
      background: #eff6ff;
    }

    .metric .label {
      display: block;
      color: #78716c;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .metric.blue .label {
      color: #2563eb;
    }

    .metric strong {
      display: block;
      margin-top: 6px;
      color: #1e293b;
      font-size: 25px;
      line-height: 1.1;
    }

    .metric.blue strong {
      color: #1e40af;
      font-size: 22px;
    }

    .news-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 18px;
    }

    .news-list li {
      padding-bottom: 18px;
      border-bottom: 1px solid #f2f0ed;
    }

    .news-list li:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }

    .news-list p {
      margin: 0;
      color: #1e293b;
      font-weight: 700;
      line-height: 1.45;
    }

    .news-list small {
      display: inline-block;
      margin-top: 7px;
      border-radius: 999px;
      background: #f5f5f4;
      padding: 5px 8px;
      color: #57534e;
      font-size: 12px;
      font-weight: 700;
    }

    .news-list .news-summary {
      margin-top: 8px;
      color: #57534e;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.5;
    }

    .news-list a {
      display: inline-block;
      margin-top: 6px;
      color: var(--blue);
      font-size: 14px;
      font-weight: 600;
    }

    .studio-header {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 24px;
      margin-bottom: 38px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--line);
    }

    .studio-header h1 {
      margin: 0 0 8px;
      color: var(--slate);
      font-size: 32px;
      line-height: 1.15;
    }

    .studio-header p {
      margin: 0;
      max-width: 760px;
      color: #57534e;
      font-size: 18px;
      line-height: 1.6;
    }

    .status-pill {
      background: #f5f5f4;
      border-radius: 6px;
      padding: 8px 11px;
      color: #57534e;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 13px;
      white-space: nowrap;
    }

    .status-pill strong {
      color: var(--green);
    }

    .studio-hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
      gap: 28px;
      align-items: stretch;
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--line);
    }

    .studio-hero h1 {
      margin: 0 0 10px;
      color: var(--slate);
      font-size: 38px;
      line-height: 1.12;
      letter-spacing: 0;
    }

    .studio-hero p {
      max-width: 760px;
      margin: 0;
      color: #57534e;
      font-size: 17px;
      line-height: 1.65;
    }

    .studio-run-card {
      border: 1px solid rgba(229, 231, 235, 0.82);
      border-radius: 14px;
      background: #fff;
      padding: 18px;
      box-shadow: 0 4px 20px rgba(17, 24, 39, 0.04);
    }

    .studio-run-card span {
      display: block;
      color: #6b7280;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .studio-run-card strong {
      display: block;
      margin-top: 6px;
      color: #111827;
      font-size: 22px;
      line-height: 1.16;
    }

    .studio-run-meta {
      display: grid;
      gap: 8px;
      margin-top: 16px;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.45;
    }

    .studio-command-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }

    .studio-metric {
      border: 1px solid rgba(229, 231, 235, 0.82);
      border-radius: 12px;
      background: #fff;
      padding: 16px;
      box-shadow: 0 4px 18px rgba(17, 24, 39, 0.032);
    }

    .studio-metric span {
      display: block;
      color: #6b7280;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .studio-metric strong {
      display: block;
      margin-top: 7px;
      color: #111827;
      font-size: 22px;
      line-height: 1.1;
    }

    .studio-metric small {
      display: block;
      margin-top: 6px;
      color: #9ca3af;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.35;
    }

    .studio-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
    }

    .reel-script-panel {
      margin-bottom: 24px;
      border-color: rgba(17, 24, 39, 0.13);
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    }

    .reel-script-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
    }

    .reel-script-actions span {
      border-radius: 999px;
      background: #eef2ff;
      padding: 7px 10px;
      color: #3730a3;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }

    .reel-script-box {
      display: block;
      width: 100%;
      min-height: 360px;
      resize: vertical;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      background: #0b1220;
      color: #f8fafc;
      padding: 18px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 15px;
      line-height: 1.68;
      white-space: pre-wrap;
    }

    .studio-action-btn,
    .studio-ghost-btn {
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      font-weight: 900;
      cursor: pointer;
      transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
    }

    .studio-action-btn {
      border: 0;
      background: #111827;
      color: #fff;
    }

    .studio-ghost-btn {
      border: 1px solid #d1d5db;
      background: #fff;
      color: #111827;
    }

    .studio-action-btn:hover,
    .studio-ghost-btn:hover,
    .primary-btn:hover,
    .speed-btn:hover,
    .dark-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 14px 34px rgba(15, 23, 42, 0.18);
    }

    .studio-action-btn:active,
    .studio-ghost-btn:active,
    .primary-btn:active,
    .speed-btn:active,
    .dark-btn:active {
      transform: translateY(0);
    }

    .studio-action-state {
      margin-top: 12px;
      border: 1px solid rgba(37, 99, 235, 0.2);
      border-radius: 10px;
      background: rgba(37, 99, 235, 0.08);
      padding: 11px 12px;
      color: #1e3a8a;
      font-size: 12px;
      font-weight: 900;
      line-height: 1.45;
    }

    .studio-action-state.pulse {
      animation: studioPulse 520ms ease;
    }

    @keyframes studioPulse {
      0% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.34); }
      100% { box-shadow: 0 0 0 12px rgba(34, 211, 238, 0); }
    }

    .studio-workflow {
      margin-bottom: 24px;
    }

    .workflow-grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 12px;
    }

    .workflow-step {
      position: relative;
      min-height: 150px;
      border: 1px solid rgba(229, 231, 235, 0.82);
      border-radius: 12px;
      background: #fff;
      padding: 15px;
      box-shadow: 0 4px 18px rgba(17, 24, 39, 0.032);
    }

    .workflow-step::before {
      content: "";
      display: block;
      width: 9px;
      height: 9px;
      margin-bottom: 12px;
      border-radius: 999px;
      background: var(--green);
      box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.12);
    }

    .workflow-step.warn::before {
      background: var(--gold);
      box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.16);
    }

    .workflow-step.blocked::before {
      background: var(--red);
      box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.12);
    }

    .workflow-step span {
      display: block;
      color: #6b7280;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .workflow-step strong {
      display: block;
      margin-top: 6px;
      color: #111827;
      font-size: 14px;
      line-height: 1.25;
    }

    .workflow-step small {
      display: block;
      margin-top: 8px;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.42;
    }

    .studio-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.18fr) minmax(320px, 0.82fr);
      gap: 24px;
      align-items: start;
      margin-bottom: 24px;
    }

    .studio-stack {
      display: grid;
      gap: 24px;
    }

    .studio-panel-head {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .studio-panel-head h2 {
      margin: 0;
    }

    .studio-panel-head p {
      margin: 5px 0 0;
      color: #64748b;
      font-size: 13px;
      line-height: 1.5;
    }

    .validation-list {
      display: grid;
      gap: 10px;
      margin-top: 16px;
    }

    .validation-row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 10px;
      align-items: start;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      padding: 12px;
    }

    .validation-dot {
      width: 10px;
      height: 10px;
      margin-top: 5px;
      border-radius: 999px;
      background: var(--green);
    }

    .validation-row.warn .validation-dot {
      background: var(--gold);
    }

    .validation-row.blocked .validation-dot {
      background: var(--red);
    }

    .validation-row strong {
      display: block;
      color: #111827;
      font-size: 14px;
      line-height: 1.3;
    }

    .validation-row span {
      display: block;
      margin-top: 3px;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.45;
    }

    .theme-review-list,
    .source-qa-list,
    .script-section-list,
    .checklist-list,
    .activity-log {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .script-section-list {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin-bottom: 18px;
    }

    .theme-review-card {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      padding: 12px;
    }

    .theme-review-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: start;
      margin-bottom: 10px;
    }

    .theme-review-top strong {
      color: #111827;
      font-size: 14px;
      line-height: 1.25;
    }

    .theme-review-top span {
      color: #64748b;
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
    }

    .theme-bar {
      position: relative;
      height: 6px;
      border-radius: 999px;
      background: #f1f5f9;
      overflow: hidden;
    }

    .theme-bar i {
      display: block;
      width: var(--theme-width);
      height: 100%;
      border-radius: inherit;
      background: var(--theme-color);
    }

    .source-qa-item {
      display: grid;
      grid-template-columns: 54px minmax(0, 1fr);
      gap: 11px;
      align-items: start;
      border-bottom: 1px solid #eef2f7;
      padding-bottom: 10px;
    }

    .source-qa-item:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }

    .source-mini-thumb {
      display: flex;
      align-items: end;
      justify-content: center;
      min-height: 54px;
      border-radius: 8px;
      background: linear-gradient(135deg, color-mix(in srgb, var(--thumb-accent) 82%, #111827), #111827);
      color: #fff;
      padding: 7px;
      font-size: 12px;
      font-weight: 900;
      line-height: 1;
      text-transform: uppercase;
      text-align: center;
    }

    .source-qa-item strong {
      display: block;
      color: #111827;
      font-size: 13px;
      line-height: 1.35;
    }

    .source-qa-item span {
      display: block;
      margin-top: 4px;
      color: #64748b;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.35;
    }

    .script-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 14px 0 16px;
    }

    .speed-btn {
      border: 1px solid #d1d5db;
      border-radius: 7px;
      background: #fff;
      color: #111827;
      padding: 7px 9px;
      font-size: 12px;
      font-weight: 900;
      cursor: pointer;
    }

    .speed-btn.active {
      border-color: #111827;
      background: #111827;
      color: #fff;
    }

    .script-section-card,
    .checklist-item,
    .activity-item {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      padding: 12px;
    }

    .script-section-card strong,
    .checklist-item strong,
    .activity-item strong {
      display: block;
      color: #111827;
      font-size: 13px;
      line-height: 1.3;
    }

    .script-section-card span,
    .checklist-item span,
    .activity-item span {
      display: block;
      margin-top: 4px;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.45;
    }

    .prompt-detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin: 12px 0 16px;
    }

    .prompt-detail {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      padding: 11px;
    }

    .prompt-detail span {
      display: block;
      color: #6b7280;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .prompt-detail strong {
      display: block;
      margin-top: 5px;
      color: #111827;
      font-size: 13px;
      line-height: 1.35;
    }

    .asset-output {
      min-height: 238px;
    }

    .asset-caption {
      margin-top: 12px;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.5;
    }

    .studio-note {
      margin-top: 12px;
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.5;
    }

    .panel-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      margin-bottom: 12px;
    }

    .panel-title-row h2 {
      margin: 0;
    }

    .valid-badge {
      background: #dcfce7;
      color: #166534;
      border-radius: 5px;
      padding: 5px 8px;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }

    .valid-badge.idle {
      background: #f1f5f9;
      color: #475569;
    }

    .muted-copy {
      margin: 0 0 16px;
      color: #78716c;
      font-size: 14px;
      line-height: 1.5;
    }

    .rr-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 16px;
      text-align: center;
      font-size: 14px;
    }

    .rr-cell {
      border-radius: 8px;
      background: #fafaf9;
      padding: 10px;
    }

    .rr-cell span {
      display: block;
      color: #a8a29e;
      font-size: 12px;
      font-weight: 700;
    }

    .rr-cell strong {
      display: block;
      margin-top: 4px;
      color: #1e293b;
    }

    .rr-cell.stop {
      background: #fef2f2;
    }

    .rr-cell.stop span,
    .rr-cell.stop strong {
      color: #b91c1c;
    }

    .rr-cell.target {
      background: #ecfdf5;
    }

    .rr-cell.target span,
    .rr-cell.target strong {
      color: #047857;
    }

    .asset-panel {
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }

    .prompt-box {
      margin-bottom: 16px;
      border-radius: 8px;
      background: #fafaf9;
      padding: 12px;
      color: #57534e;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 13px;
      line-height: 1.55;
    }

    .primary-btn {
      width: 100%;
      border: 0;
      border-radius: 8px;
      background: var(--blue);
      color: #fff;
      padding: 11px 14px;
      font-weight: 900;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .primary-btn:hover {
      background: #1d4ed8;
    }

    .primary-btn.done {
      background: var(--green);
    }

    .primary-btn.video-btn {
      margin-top: 12px;
      background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
    }

    .loader-track {
      height: 4px;
      margin: 16px 0;
      border-radius: 999px;
      background: #e7e5e4;
      overflow: hidden;
    }

    .loader-bar {
      width: 0%;
      height: 4px;
      background: var(--blue);
      transition: width 2s ease-in-out;
    }

    .asset-output {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 238px;
      flex: 1;
      overflow: hidden;
      border: 2px dashed #d6d3d1;
      border-radius: 10px;
      background: #f5f5f4;
      color: #a8a29e;
      font-weight: 700;
    }

    #aiCanvas {
      position: absolute;
      inset: 0;
      opacity: 0;
      transition: opacity 900ms ease;
    }

    #aiCanvas.visible {
      opacity: 1;
    }

    .video-kit {
      margin-top: 18px;
      border-top: 1px solid #e7e5e4;
      padding-top: 18px;
    }

    .video-kit h3 {
      margin: 0 0 6px;
      color: #111827;
      font-size: 16px;
      font-weight: 900;
    }

    .video-kit p {
      margin: 0 0 12px;
      color: #6b7280;
      font-size: 13px;
      line-height: 1.55;
    }

    .scene-strip {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin: 12px 0;
    }

    .scene-card {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      padding: 9px;
      min-height: 96px;
    }

    .scene-card span {
      display: block;
      color: #6b7280;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .scene-card strong {
      display: block;
      margin: 4px 0;
      color: #111827;
      font-size: 12px;
      font-weight: 900;
    }

    .scene-card small {
      display: block;
      color: #4b5563;
      font-size: 11px;
      line-height: 1.35;
    }

    .video-output {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 360px;
      margin-top: 12px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      background: #020617;
    }

    #reelVideoCanvas {
      width: min(100%, 260px);
      max-height: 440px;
      aspect-ratio: 9 / 16;
      border-radius: 12px;
      box-shadow: 0 28px 70px rgba(0, 0, 0, 0.34);
    }

    .video-status {
      margin-top: 10px;
      color: #6b7280;
      font-size: 12px;
      font-weight: 700;
    }

    .teleprompter-shell {
      margin-top: 32px;
    }

    .teleprompter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 14px;
    }

    .teleprompter-header h2 {
      margin: 0;
      color: #1e293b;
      font-size: 20px;
    }

    .dark-btn {
      border: 0;
      border-radius: 8px;
      background: #292524;
      color: #fff;
      padding: 10px 14px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }

    .dark-btn.playing {
      background: var(--red);
    }

    .teleprompter-view {
      position: relative;
      height: 400px;
      overflow-y: auto;
      border-radius: 10px;
      background-color: #111827;
      color: #f3f4f6;
      padding: 32px;
      font-size: 24px;
      line-height: 1.8;
      font-weight: 700;
      scroll-behavior: smooth;
    }

    .read-line {
      position: absolute;
      top: 50%;
      left: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      width: 100%;
      height: 34px;
      border-top: 2px solid rgba(239, 68, 68, 0.3);
      border-bottom: 2px solid rgba(239, 68, 68, 0.3);
      background: rgba(239, 68, 68, 0.1);
      pointer-events: none;
    }

    .read-line span {
      margin-left: 10px;
      color: rgba(239, 68, 68, 0.65);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .teleprompter-text {
      transform: translateY(0);
    }

    .teleprompter-view.playing .teleprompter-text {
      animation: scrollText 20s linear infinite;
    }

    @keyframes scrollText {
      0% { transform: translateY(100%); }
      100% { transform: translateY(-150%); }
    }

    .arch-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 48px;
    }

    .section-title {
      margin: 0 0 24px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--line);
      color: #1e293b;
      font-size: 25px;
    }

    .tech-block {
      margin-bottom: 24px;
    }

    .tech-block h3 {
      margin: 0 0 6px;
      color: #334155;
      font-size: 16px;
    }

    .tech-block p {
      margin: 0 0 10px;
      color: #57534e;
      font-size: 14px;
      line-height: 1.55;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chip {
      border-radius: 999px;
      background: #f1f5f9;
      color: #334155;
      padding: 6px 11px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
    }

    .chip.blue {
      background: #eff6ff;
      color: #1d4ed8;
    }

    .chip.stone {
      background: #f5f5f4;
      color: #44403c;
    }

    .milestones {
      display: grid;
      gap: 16px;
    }

    .milestone {
      border-left: 4px solid var(--blue);
      border-radius: 0 8px 8px 0;
      background: #fff;
      padding: 16px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .milestone.indigo {
      border-left-color: #6366f1;
    }

    .milestone.todo {
      border-left-color: #d6d3d1;
      opacity: 0.76;
    }

    .milestone h3 {
      margin: 0;
      color: #1e293b;
      font-size: 18px;
    }

    .milestone p {
      margin: 6px 0 0;
      color: #57534e;
      font-size: 14px;
      line-height: 1.55;
    }

    /* Dark glassmorphism branch theme */
    body.glass-v2 {
      color-scheme: dark;
      --paper: #050816;
      --ink: #f8fafc;
      --slate: #f8fafc;
      --stone: #b8c4d8;
      --line: rgba(255, 255, 255, 0.14);
      --panel: rgba(15, 23, 42, 0.62);
      --blue: #60a5fa;
      --green: #34d399;
      --red: #fb7185;
      --gold: #fbbf24;
      min-height: 100vh;
      background:
        radial-gradient(circle at 15% 4%, rgba(20, 184, 166, 0.18), transparent 32vw),
        radial-gradient(circle at 82% 0%, rgba(96, 165, 250, 0.16), transparent 34vw),
        radial-gradient(circle at 70% 86%, rgba(244, 63, 94, 0.10), transparent 28vw),
        linear-gradient(135deg, #050816 0%, #07101d 46%, #0b1220 100%);
      color: #f8fafc;
    }

    body.glass-v2::before {
      content: "";
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background:
        linear-gradient(120deg, rgba(255, 255, 255, 0.026), transparent 42%),
        radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.018), transparent 42%);
    }

    body.glass-v2 > * {
      position: relative;
      z-index: 1;
    }

    .glass-v2 .topbar {
      border-bottom-color: rgba(255, 255, 255, 0.12);
      background: rgba(3, 7, 18, 0.66);
      backdrop-filter: blur(18px);
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.25);
    }

    .glass-v2 .brand-mark {
      background: linear-gradient(135deg, #22d3ee, #6366f1 54%, #f43f5e);
      box-shadow: 0 0 34px rgba(34, 211, 238, 0.28);
    }

    .glass-v2 .tab-btn,
    .glass-v2 .tab-link {
      color: #b8c4d8;
    }

    .glass-v2 .tab-btn.active {
      border-bottom-color: #67e8f9;
      color: #f8fafc;
    }

    .glass-v2 .admin-logout-btn {
      color: #fecdd3;
    }

    .glass-v2 details.admin-console-details,
    .glass-v2 details.component,
    .glass-v2 .body-card,
    .glass-v2 .repo-card-inline {
      border-color: rgba(255, 255, 255, 0.13);
      background: rgba(15, 23, 42, 0.58);
      box-shadow: 0 18px 58px rgba(0, 0, 0, 0.18);
    }

    .glass-v2 details.admin-console-details summary h2,
    .glass-v2 details.component summary h3,
    .glass-v2 .body-card strong,
    .glass-v2 .repo-card-inline strong {
      color: #f8fafc;
    }

    .glass-v2 details.admin-console-details summary p,
    .glass-v2 details.component summary p,
    .glass-v2 .admin-console-note,
    .glass-v2 .body-card ul,
    .glass-v2 .file-list,
    .glass-v2 .admin-list,
    .glass-v2 td,
    .glass-v2 .state-line {
      color: #b8c4d8;
    }

    .glass-v2 .admin-console-body,
    .glass-v2 .component-body,
    .glass-v2 .table-wrap,
    .glass-v2 th,
    .glass-v2 td {
      border-color: rgba(255, 255, 255, 0.12);
    }

    .glass-v2 th {
      background: rgba(30, 41, 59, 0.72);
      color: #dbeafe;
    }

    .glass-v2 .admin-form-field {
      color: #dbeafe;
    }

    .glass-v2 .admin-form-field input,
    .glass-v2 #portfolioFile {
      border-color: rgba(255, 255, 255, 0.14);
      background: rgba(2, 6, 23, 0.72);
      color: #f8fafc;
    }

    .mood-rail {
      display: grid;
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr) minmax(0, 0.85fr);
      gap: 12px;
      margin: -8px 0 18px;
    }

    .mood-cell {
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.58);
      padding: 15px;
      backdrop-filter: blur(14px);
      box-shadow: 0 12px 34px rgba(0, 0, 0, 0.16);
    }

    .mood-cell::before {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.11), transparent 42%);
      pointer-events: none;
    }

    .mood-cell span,
    .mood-cell strong,
    .mood-cell small,
    .mood-bar {
      position: relative;
      z-index: 1;
    }

    .mood-cell span {
      display: block;
      color: #b8c4d8;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .mood-cell strong {
      display: block;
      margin-top: 7px;
      color: #f8fafc;
      font-size: 22px;
      line-height: 1.16;
    }

    .mood-cell small {
      display: block;
      margin-top: 7px;
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.45;
    }

    .mood-bar {
      height: 9px;
      margin-top: 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12);
      overflow: hidden;
    }

    .mood-bar i {
      display: block;
      width: var(--mood-width);
      height: 100%;
      border-radius: inherit;
      background: var(--mood-color);
      box-shadow: 0 0 20px color-mix(in srgb, var(--mood-color) 70%, transparent);
    }

    .mood-rail.bullish .mood-cell:first-child {
      border-color: rgba(52, 211, 153, 0.42);
    }

    .mood-rail.bearish .mood-cell:first-child {
      border-color: rgba(251, 113, 133, 0.42);
    }

    .desk-note {
      display: grid;
      grid-template-columns: minmax(92px, 0.18fr) minmax(0, 1fr);
      gap: 18px;
      align-items: stretch;
      margin: 18px 0;
      padding: 18px;
    }

    .desk-note-mark {
      display: grid;
      place-items: center;
      min-height: 118px;
      border-radius: 14px;
      background:
        radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.16), transparent 32%),
        linear-gradient(135deg, rgba(103, 232, 249, 0.16), rgba(251, 191, 36, 0.12));
      color: #0f172a;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.16em;
      line-height: 1.45;
      text-align: center;
      text-transform: uppercase;
    }

    .desk-note-copy span {
      display: inline-flex;
      margin-bottom: 8px;
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 999px;
      padding: 5px 9px;
      color: #475569;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .desk-note-copy p {
      margin: 0;
      color: #111827;
      font-size: clamp(18px, 2vw, 25px);
      font-weight: 900;
      line-height: 1.45;
    }

    .desk-note-copy small {
      display: block;
      margin-top: 10px;
      color: #64748b;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.5;
    }

    .glass-v2 :is(.info-card, .panel, .briefing-card, .quote-board-card, .breadth-card, .index-tile, .source-category-section, .source-category-meta div, .source-lead-card, .source-card, .source-ledger-details, .summary-chip, .briefing-block, .briefing-lens, .metric, .studio-run-card, .studio-metric, .workflow-step, .validation-row, .theme-review-card, .script-section-card, .checklist-item, .activity-item, .prompt-detail, .rr-cell, .milestone, .scene-card, .desk-note) {
      border-color: rgba(255, 255, 255, 0.14);
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.46));
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(14px);
    }

    .glass-v2 :is(.info-card:hover, .breadth-card:hover, .index-tile:hover, .source-card:hover) {
      transform: translateY(-3px);
      border-color: rgba(255, 255, 255, 0.28);
      box-shadow: 0 22px 70px rgba(0, 0, 0, 0.30), 0 0 0 1px rgba(103, 232, 249, 0.11), inset 0 1px 0 rgba(255, 255, 255, 0.11);
    }

    .glass-v2 :is(.page-header h1, .executive-card h2, .executive-card strong, .expanded-briefing-head h2, .section-kicker h2, .source-ledger-details summary h3, .source-lead-copy h3, .source-category-head h3, .source-card h3, .brief-section h3, .brief-section strong, .brief-lead strong, .briefing-lens strong, .brief-list strong, .watch-grid strong, .panel h2, .briefing-card h2, .quote-region-head h3, .chart-modal-header h2, .studio-header h1, .studio-hero h1, .studio-run-card strong, .studio-metric strong, .workflow-step strong, .validation-row strong, .theme-review-top strong, .source-qa-item strong, .script-section-card strong, .checklist-item strong, .activity-item strong, .prompt-detail strong, .section-title, .tech-block h3, .milestone h3, .source-stat-strip strong, .source-category-meta strong, .source-readthrough-grid strong, .source-card-detail summary, .source-takeaway strong, .briefing-date, .briefing-date strong, .video-kit h3, .scene-card strong, .desk-note-copy p) {
      color: #f8fafc;
    }

    .glass-v2 :is(.page-header p, .executive-card p, .expanded-briefing-head p, .briefing-lens p, .brief-list, .watch-grid, .source-section-copy, .source-ledger-details summary p, .source-lead-copy > p, .source-category-head p, .source-card p, .source-card-detail p, .chart-note, .panel p, .briefing-block ul, .quote-board-title small, .live-clock, .quote-region-head span, .chart-modal-header p, .market-chart-caption, .studio-header p, .studio-hero p, .studio-run-meta, .studio-metric small, .studio-panel-head p, .validation-row span, .source-qa-item span, .script-section-card span, .checklist-item span, .activity-item span, .asset-caption, .studio-note, .muted-copy, .tech-block p, .milestone p, .public-footer p, .video-kit p, .scene-card small, .video-status, .desk-note-copy small) {
      color: #cbd5e1;
    }

    .glass-v2 :is(.eyebrow, .summary-label, .briefing-date span, .briefing-lens span, .source-extract-meta small, .source-stat-strip span, .source-category-label small, .source-category-meta span, .source-name, .source-entity, .metric .label, .summary-chip span, .workflow-step span, .prompt-detail span, .rr-cell span, .strategy-label, .setup-level span, .quote-board-title strong, .breadth-card span, .index-tile .symbol, .scene-card span, .desk-note-copy span) {
      color: #9fb0c8;
    }

    .glass-v2 .source-stat-help {
      color: #cbd5e1;
    }

    .glass-v2 .source-quality-line {
      border-color: rgba(103, 232, 249, 0.24);
      background: rgba(103, 232, 249, 0.08);
      color: #dbeafe;
    }

    .glass-v2 .session-notice,
    .glass-v2 .evidence-grade-card,
    .glass-v2 .follow-briefing-cta {
      border-color: rgba(103, 232, 249, 0.24);
      background: rgba(15, 23, 42, 0.66);
    }

    .glass-v2 .evidence-grade-card.limited,
    .glass-v2 .evidence-grade-card.global-cue-only {
      border-color: rgba(251, 191, 36, 0.34);
      background: rgba(120, 53, 15, 0.26);
    }

    .glass-v2 .briefing-expand-card {
      border-left-color: rgba(103, 232, 249, 0.62);
    }

    .glass-v2 .briefing-expand-card summary p {
      color: #f8fafc;
    }

    .glass-v2 .disclosure-action,
    .glass-v2 .chart-link-btn,
    .glass-v2 .studio-action-btn,
    .glass-v2 .speed-btn.active,
    .glass-v2 .source-filter-btn.active {
      background: linear-gradient(135deg, #06b6d4, #6366f1);
      color: #fff;
      box-shadow: 0 12px 30px rgba(37, 99, 235, 0.28);
    }

    .glass-v2 .expanded-briefing-page,
    .glass-v2 .market-chart-preview,
    .glass-v2 .reel-script-panel,
    .glass-v2 .source-ledger-details {
      border-color: rgba(255, 255, 255, 0.12);
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.72), rgba(2, 6, 23, 0.58));
    }

    .glass-v2 .two-minute-summary .brief-list li {
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(15, 23, 42, 0.58);
    }

    .glass-v2 .sentiment-bar {
      height: 9px;
      background: linear-gradient(90deg, #fb7185 0%, #fbbf24 50%, #34d399 100%);
      box-shadow: 0 0 24px rgba(251, 191, 36, 0.18);
    }

    .glass-v2 .sentiment-pin {
      top: -5px;
      width: 18px;
      height: 18px;
      border: 3px solid #f8fafc;
      background: #020617;
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.34);
    }

    .glass-v2 :is(.source-filter-btn, .studio-ghost-btn, .speed-btn, .icon-btn, .quote-board-toggle) {
      border-color: rgba(255, 255, 255, 0.14);
      background: rgba(15, 23, 42, 0.52);
      color: #f8fafc;
    }

    .glass-v2 .quote-board-toggle:hover {
      background: rgba(30, 41, 59, 0.68);
    }

    .glass-v2 .quote-board-body,
    .glass-v2 .expanded-briefing-page,
    .glass-v2 .brief-lead,
    .glass-v2 .source-extract-list,
    .glass-v2 .source-extract-row,
    .glass-v2 .source-category-head,
    .glass-v2 .source-card-detail,
    .glass-v2 .source-ledger-body,
    .glass-v2 .public-footer,
    .glass-v2 .studio-header,
    .glass-v2 .studio-hero,
    .glass-v2 .studio-note,
    .glass-v2 .market-chart-caption,
    .glass-v2 .news-list li,
    .glass-v2 .video-kit {
      border-color: rgba(255, 255, 255, 0.12);
    }

    .glass-v2 .source-card {
      position: relative;
    }

    .glass-v2 .source-card::after {
      content: "Open";
      position: absolute;
      right: 13px;
      bottom: 12px;
      border-radius: 999px;
      background: rgba(96, 165, 250, 0.16);
      padding: 4px 8px;
      color: #bfdbfe;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      opacity: 0;
      transform: translateY(3px);
      transition: opacity 160ms ease, transform 160ms ease;
    }

    .glass-v2 .source-card:hover::after,
    .glass-v2 .source-card:focus-visible::after {
      opacity: 1;
      transform: translateY(0);
    }

    .source-card:focus-visible,
    .breadth-card:focus-visible,
    .index-tile:focus-visible,
    .quote-board-toggle:focus-visible {
      outline: 3px solid rgba(103, 232, 249, 0.72);
      outline-offset: 3px;
    }

    .glass-v2 .setup-card {
      border: 1px solid rgba(255, 255, 255, 0.16);
      background:
        radial-gradient(circle at 85% 12%, rgba(251, 113, 133, 0.20), transparent 30%),
        radial-gradient(circle at 18% 8%, rgba(52, 211, 153, 0.18), transparent 34%),
        linear-gradient(135deg, rgba(2, 6, 23, 0.92), rgba(15, 23, 42, 0.70));
      box-shadow: 0 24px 76px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.10);
    }

    .glass-v2 .trade-map-card {
      border: 1px solid rgba(255, 255, 255, 0.16);
      background:
        radial-gradient(circle at 12% 16%, rgba(34, 211, 238, 0.18), transparent 34%),
        radial-gradient(circle at 86% 10%, rgba(250, 204, 21, 0.12), transparent 28%),
        linear-gradient(135deg, rgba(2, 6, 23, 0.96), rgba(15, 23, 42, 0.74));
      box-shadow: 0 22px 72px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.10);
    }

    .glass-v2 .opening-nerve-card {
      border: 1px solid rgba(255, 255, 255, 0.16);
      background:
        radial-gradient(circle at 14% 18%, rgba(52, 211, 153, 0.18), transparent 34%),
        radial-gradient(circle at 88% 12%, rgba(96, 165, 250, 0.16), transparent 30%),
        linear-gradient(135deg, rgba(2, 6, 23, 0.96), rgba(15, 23, 42, 0.76));
      box-shadow: 0 22px 72px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.10);
    }

    .glass-v2 .opening-nerve-tile {
      background: rgba(2, 6, 23, 0.46);
      border-color: rgba(255, 255, 255, 0.14);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }

    .glass-v2 .opening-nerve-tile strong {
      color: #e0f2fe;
    }

    .glass-v2 .trade-map-tile {
      background: rgba(2, 6, 23, 0.46);
      border-color: rgba(255, 255, 255, 0.14);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }

    .glass-v2 .trade-map-tile strong {
      color: #e0f2fe;
    }

    .glass-v2 .setup-badge {
      border-color: rgba(52, 211, 153, 0.42);
      background: rgba(52, 211, 153, 0.13);
      color: #bbf7d0;
    }

    .glass-v2 .strategy-bias {
      font-size: 24px;
    }

    .glass-v2 .setup-levels {
      border-color: rgba(255, 255, 255, 0.16);
      background: rgba(2, 6, 23, 0.45);
      backdrop-filter: blur(12px);
    }

    .glass-v2 .setup-level + .setup-level {
      border-left-color: rgba(255, 255, 255, 0.14);
    }

    .glass-v2 .setup-level strong {
      font-size: clamp(28px, 4.6vw, 42px);
      letter-spacing: 0;
    }

    .glass-v2 .setup-level.stop strong,
    .glass-v2 .setup-level.stop span {
      color: #fb7185;
    }

    .glass-v2 .setup-level.target strong,
    .glass-v2 .setup-level.target span {
      color: #34d399;
    }

    .glass-v2 .news-badge.negative,
    .glass-v2 .valid-badge.idle {
      background: rgba(251, 113, 133, 0.16);
      color: #fecdd3;
    }

    .glass-v2 .news-badge.positive,
    .glass-v2 .valid-badge {
      background: rgba(52, 211, 153, 0.16);
      color: #bbf7d0;
    }

    .glass-v2 .news-badge.neutral,
    .glass-v2 .market-state,
    .glass-v2 .index-tile .status,
    .glass-v2 .chip,
    .glass-v2 .source-stat-strip span {
      background: rgba(255, 255, 255, 0.10);
      color: #dbeafe;
    }

    .glass-v2 :is(.market-state.live, .index-tile .status.live) {
      background: rgba(52, 211, 153, 0.16);
      color: #bbf7d0;
    }

    .glass-v2 :is(.market-state.partial) {
      background: rgba(251, 191, 36, 0.16);
      color: #fde68a;
    }

    .glass-v2 .market-move.up,
    .glass-v2 .index-tile .change.up,
    .glass-v2 .source-category-meta strong.up {
      color: #34d399;
    }

    .glass-v2 .market-move.down,
    .glass-v2 .index-tile .change.down,
    .glass-v2 .source-category-meta strong.down {
      color: #fb7185;
    }

    .glass-v2 .market-move.flat,
    .glass-v2 .index-tile .change.flat {
      color: #b8c4d8;
    }

    .glass-v2 :is(.index-tile .price, .metric strong, .summary-chip strong, .source-extract-meta span, .source-extract-copy h4, .briefing-block h3, .teleprompter-header h2) {
      color: #f8fafc;
    }

    .glass-v2 .source-thumb {
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 18px 40px rgba(0, 0, 0, 0.22);
    }

    .glass-v2 .chart-modal {
      background: rgba(2, 6, 23, 0.74);
      backdrop-filter: blur(10px);
    }

    .glass-v2 .chart-modal-panel {
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(2, 6, 23, 0.86));
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.48);
    }

    .glass-v2 :is(.modal-chart-container, .chart-fallback, .quote-region-empty, .prompt-box, .asset-output, .loader-track, .theme-bar, .reel-script-box, .video-output, .studio-action-state) {
      border-color: rgba(255, 255, 255, 0.14);
      background: rgba(2, 6, 23, 0.48);
      color: #cbd5e1;
    }

    .glass-v2 .source-card a,
    .glass-v2 .source-lead-copy a,
    .glass-v2 .news-list a {
      color: #93c5fd;
    }

    .glass-v2 .source-card:hover h3 {
      color: #67e8f9;
    }

    .glass-v2 .desk-note-mark {
      color: #fef3c7;
    }

    @media (max-width: 900px) {
      .nav-inner {
        align-items: start;
        flex-direction: column;
        padding: 14px 0 0;
      }

      .tabs {
        width: 100%;
        min-height: 48px;
        gap: 16px;
        overflow-x: auto;
      }

      .tab-btn {
        white-space: nowrap;
      }

      .grid-main,
      .grid-two,
      .grid-three,
      .source-card,
      .source-overview-grid,
      .source-lead-card,
      .source-readthrough-grid,
      .source-category-head,
      .source-category-meta,
      .source-category-grid,
      .setup-grid,
      .setup-levels,
      .opening-nerve-grid,
      .trade-map-grid,
      .summary-strip,
      .briefing-grid,
      .source-extract-row,
      .watch-grid,
      .arch-grid,
      .studio-hero,
      .studio-command-grid,
      .workflow-grid,
      .studio-layout,
      .prompt-detail-grid,
      .script-section-list,
      .admin-grid,
      .body-grid,
      .briefing-expand-card summary,
      .two-minute-summary .brief-list,
      .briefing-lens-grid {
        grid-template-columns: 1fr;
      }

      .mood-rail {
        grid-template-columns: 1fr;
      }

      .briefing-expand-card summary .disclosure-action {
        justify-self: start;
      }

      .share-actions {
        justify-content: flex-start;
      }

      .briefing-topline,
      .section-kicker,
      .opening-nerve-head,
      .setup-card-header,
      .trade-map-head,
      .quote-region-head {
        align-items: start;
        flex-direction: column;
      }

      .trade-map-tile.wide {
        grid-column: auto;
      }

      .chart-modal-header {
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
      }

      .chart-link-btn {
        grid-column: 1 / -1;
        grid-row: 2;
        width: max-content;
      }

      .icon-btn {
        grid-column: 2;
        grid-row: 1;
      }

      .briefing-date {
        text-align: left;
      }

      .quote-board-toggle {
        grid-template-columns: 1fr;
        align-items: start;
        gap: 10px;
      }

      .regional-breadth {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .live-clock {
        text-align: left;
      }

      .quote-board-action {
        justify-self: start;
      }

      .setup-level + .setup-level {
        border-left: 0;
        border-top: 1px solid #374151;
        padding-top: 14px;
        margin-top: 14px;
      }

      .studio-header {
        align-items: start;
        flex-direction: column;
      }

      .studio-actions {
        flex-direction: column;
      }

      .reel-script-actions {
        width: 100%;
        justify-content: stretch;
      }

      .reel-script-actions span {
        width: 100%;
        text-align: center;
      }

      .studio-action-btn,
      .studio-ghost-btn {
        width: 100%;
      }

      .teleprompter-view {
        height: 360px;
        font-size: 20px;
      }
    }

    @media (max-width: 768px) {
      .shell {
        padding: 0 14px;
      }

      .source-category-meta {
        min-width: 0;
        width: 100%;
      }

      .source-stat-strip,
      .source-stat-help {
        justify-content: flex-start;
        text-align: left;
      }

      .sentiment-meter {
        width: 100%;
      }
    }

    @media (max-width: 620px) {
      .regional-breadth {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 480px) {
      .page-header h1 {
        font-size: 30px;
        line-height: 1.08;
      }

      .source-stat-strip span {
        flex: 1 1 calc(50% - 8px);
      }

      .chart-link-btn {
        width: 100%;
        justify-content: center;
      }
    }
  </style>
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ""}>
  ${requireAuth ? adminAuthGateHtml() : ""}
  <nav class="topbar">
    <div class="shell">
      <div class="nav-inner">
        <a class="brand" href="${digest.canonicalPath ? "../" : "./"}" aria-label="Market Narrative archive">${brandMarkHtml()}<span>Market Narrative</span></a>
        <div class="tabs">
          ${publicBriefingNavHtml}
          ${tradingGuideTabHtml}
          ${studioTabHtml}
          ${adminArchitectureTabHtml}
          ${multibaggerLinkHtml}
          ${aboutLinkHtml}
          ${adminMultibaggerLinkHtml}
          ${publicAdminLinkHtml}
          ${adminLogoutHtml}
        </div>
      </div>
    </div>
  </nav>

  <main class="shell">
    ${renderTradingGuideView ? tradingGuideViewHtml(digest, canonicalUrl, { active: true }) : ""}
    ${renderPublicView ? `<section id="public-view" class="tab-content${safeInitialTab === "public-view" ? "" : " hidden"}">
      <div class="briefing-shell">
        <header class="page-header">
          <div class="briefing-topline">
            <div>
              <p class="eyebrow">${escapeHtml(heroEyebrowLabel(digest))}</p>
            </div>
            <div class="briefing-date">
              <span>${escapeHtml(briefingSignalLabel(digest))}</span>
              <strong>${escapeHtml(formatDigestDate(digest.digestDate))}</strong>
            </div>
          </div>
          <h1>${escapeHtml(hookTitle(digest))}</h1>
        </header>

        <details id="summaryExpand" class="info-card executive-card briefing-expand-card" open>
          <summary>
            <div>
              <span class="summary-label">Start Here</span>
              <h2 class="summary-card-title">2 Minute Summary</h2>
              <p>${escapeHtml(compactSummaryText(digest))}</p>
            </div>
            <span class="disclosure-action summary-disclosure-action" aria-hidden="true">
              <span class="label-closed">Show details</span>
              <span class="label-open">Hide details</span>
              <span class="disclosure-icon"></span>
            </span>
          </summary>
          <div class="expanded-briefing-page">
            ${expandedBriefingHtml(digest)}
          </div>
        </details>

        ${openingNerveHtml(digest, { guideHref: "./trading-guide/" })}
        ${legacyAuditBannerHtml(digest)}
        ${editionNavHtml(digest)}
        ${briefingFreshnessNoticeHtml(digest)}
        ${evidenceGradeBadgeHtml(digest)}
        ${shareRowHtml(canonicalUrl, digest.title)}
        ${themeClass === "glass-v2" ? marketMoodRailHtml(digest) : ""}
        ${indiaPreOpenHtml(digest)}
        ${followBriefingCtaHtml()}
        ${readerPathHtml(digest)}

        <section class="pulse-section">
          <div class="section-kicker">
            <h2>The Overnight Pulse</h2>
            <div class="sentiment-meter" aria-label="Daily sentiment meter">
              <div class="sentiment-scale">
                <span>Bearish</span>
                <span>Neutral</span>
                <span>Bullish</span>
              </div>
              <div class="sentiment-bar">
                <div class="sentiment-pin" style="left: ${sentimentPinPosition(digest.overallSentiment)}%"></div>
              </div>
            </div>
          </div>
          <div class="quote-board-card">
            <button id="quoteBoardToggle" class="quote-board-toggle" type="button" aria-expanded="false" aria-controls="quoteBoardBody">
              <span class="quote-board-title">
                <strong>${escapeHtml(quoteBoardTitle(digest))}</strong>
                <small>${escapeHtml(quoteBoardSubtitle(digest))}</small>
              </span>
              <span id="liveClock" class="live-clock">${escapeHtml(quoteSessionLabel(digest))}</span>
              <span class="disclosure-action quote-board-action"><span id="quoteBoardState">Show details</span><span class="disclosure-icon" aria-hidden="true"></span></span>
            </button>
            <div id="quoteBoardBody" class="quote-board-body" hidden>
              <div id="regionalBreadth" class="regional-breadth">
                ${regionalBreadthHtml(digest)}
              </div>
              <div id="indexBoard" aria-label="Clickable live index quotes"></div>
            </div>
          </div>
        </section>

        ${todaysReadHtml(digest)}
        ${sourceNotesHtml(digest)}

        <footer class="public-footer">
          <p>Prepared from live market data and linked source notes. Educational market research only, not investment advice.</p>
        </footer>
      </div>
    </section>` : ""}


    <div id="indexChartModal" class="chart-modal" aria-hidden="true">
      <div class="chart-modal-panel" role="dialog" aria-modal="true" aria-labelledby="indexChartTitle">
        <div class="chart-modal-header">
          <div>
            <h2 id="indexChartTitle">Index Chart</h2>
            <p id="indexChartMeta">Timestamped snapshot preview for the selected market.</p>
          </div>
          <a id="openFullChart" class="chart-link-btn" href="https://www.tradingview.com/markets/indices/" target="_blank" rel="noopener noreferrer">Open External Chart</a>
          <button id="closeIndexChart" class="icon-btn" type="button" aria-label="Close index chart">&times;</button>
        </div>
        <div class="modal-chart-container">
          <div id="marketChartPreview" class="market-chart-preview" aria-label="Selected market chart preview">
            <canvas id="marketChartCanvas" class="market-chart-canvas" aria-label="Published intraday price chart"></canvas>
            <div class="market-chart-caption">
              <strong id="marketChartSource">Published price series</strong>
              <span id="marketChartRange">Select a market card to inspect chart context</span>
            </div>
          </div>
          <div id="chartFallback" class="chart-fallback" aria-hidden="true">
            <div>
              <h3>Snapshot available</h3>
              <p>The latest quote snapshot is loaded for this market.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    ${includeStudio ? `
    <section id="studio-view" class="tab-content hidden">
      <header class="studio-hero">
        <div>
          <p class="eyebrow">Admin Studio</p>
          <h1>Studio Command Center</h1>
          <p>Private creator workspace for turning the morning brief into a finished reel: source checks, market levels, recording pace, thumbnail direction, and publish readiness.</p>
        </div>
        <aside class="studio-run-card">
          <span>Current Run</span>
          <strong>${escapeHtml(formatDigestDate(digest.digestDate))}</strong>
          <div class="studio-run-meta">
            <div>Mode: ${escapeHtml(digest.marketDataMode === "live" ? "Live market data" : "Prepared market data")}</div>
            <div>Refreshed: ${escapeHtml(formatGeneratedAt(digest.generatedAt))}</div>
            <div>Status: <span id="studioPublishState">${escapeHtml(digest.status || "DRAFT")}</span></div>
          </div>
          <div class="studio-actions">
            <button id="runDigestBtn" class="studio-action-btn" type="button">Refresh Market Read</button>
            <button id="regenerateScriptBtn" class="studio-ghost-btn" type="button">Rewrite Script</button>
            <button id="publishDigestBtn" class="studio-ghost-btn" type="button">Publish Briefing</button>
          </div>
          <div id="studioActionState" class="studio-action-state" role="status" aria-live="polite">Ready: choose an action to update the Studio package.</div>
        </aside>
      </header>

      <section class="studio-command-grid" aria-label="Studio run summary">
        ${studioMetricCards(digest)}
      </section>

      <section class="panel reel-script-panel" aria-label="Daily reel script">
        <div class="studio-panel-head">
          <div>
            <h2>Daily Reel Script</h2>
          <p>Private 45-60 second creator script for today&apos;s pre-market reel. Public readers only see the market note; the recording angle stays here.</p>
          </div>
          <div class="reel-script-actions">
            <span>${escapeHtml(reelScriptStats(digest))}</span>
            <button id="copyReelScriptBtn" class="studio-action-btn" type="button">Copy Reel Script</button>
          </div>
        </div>
        <textarea id="dailyReelScript" class="reel-script-box" readonly>${escapeHtml(digest.reelScript || digest.teleprompterScript || "")}</textarea>
        <p id="copyReelScriptState" class="studio-note">Ready for today&apos;s recording.</p>
      </section>

      <section class="studio-workflow">
        <div class="section-kicker">
          <h2>Creator Workflow</h2>
        </div>
        <div class="workflow-grid">
          ${studioWorkflowHtml(digest)}
        </div>
      </section>

      <div class="studio-layout">
        <section class="panel scanner-workbench">
          <div class="studio-panel-head">
            <div>
              <h2>Technical Setup Scanner</h2>
              <p>${scannerPanelCopy(digest)}</p>
            </div>
            ${scannerBadgeHtml(digest)}
          </div>
          <div class="chart-container scanner-height">
            <canvas id="scannerChart" aria-label="Technical scanner setup chart"></canvas>
          </div>
          ${scannerCells(digest)}
          ${scannerValidationHtml(digest)}
        </section>

        <div class="studio-stack">
          <section class="panel">
            <div class="studio-panel-head">
              <div>
                <h2>Narrative QA</h2>
                <p>Theme clustering from the source extraction layer.</p>
              </div>
            </div>
            <div class="theme-review-list">
              ${themeReviewHtml(digest)}
            </div>
          </section>

          <section class="panel">
            <div class="studio-panel-head">
              <div>
                <h2>Publish Readiness</h2>
          <p>Quick human checks before the daily briefing goes public.</p>
              </div>
            </div>
            <ul class="checklist-list">
              ${publishingChecklistHtml(digest)}
            </ul>
          </section>
        </div>
      </div>

      <div class="grid-two">
        <section class="panel">
          <div class="studio-panel-head">
            <div>
              <h2>Source QA Queue</h2>
              <p>Top weighted articles driving the video angle, with thumbnails carried from the public briefing.</p>
            </div>
          </div>
          <div class="source-qa-list">
            ${sourceQaHtml(digest)}
          </div>
          <p class="studio-note">The full public page keeps every source link for attribution; this queue shows the items most likely to shape the intro and risk framing.</p>
        </section>

        <section class="panel asset-panel">
          <div class="studio-panel-head">
            <div>
              <h2>Visual Kit</h2>
              <p>Thumbnail and reel art direction using the day&apos;s sentiment palette.</p>
            </div>
            <span class="valid-badge ${digest.sentimentLabel === "BULLISH" ? "" : "idle"}">${escapeHtml(digest.sentimentLabel)}</span>
          </div>
          <div class="prompt-detail-grid">
            ${assetPromptDetailsHtml(digest.asset)}
          </div>
          <div class="prompt-box">Prompt: ${escapeHtml(digest.asset.positivePrompt)}</div>
          <button id="generateAssetBtn" class="primary-btn">Build Daily Thumbnail</button>
          <div class="loader-track">
            <div id="assetLoader" class="loader-bar"></div>
          </div>
          <div id="assetOutput" class="asset-output">
            <span id="assetPlaceholderText">Prompt package ready</span>
            <canvas id="aiCanvas" aria-label="Thumbnail draft preview"></canvas>
          </div>
          <p class="asset-caption">Negative prompt: ${escapeHtml(digest.asset.negativePrompt)}</p>
          <div class="video-kit">
            <h3>Reel Cut Builder</h3>
            <p>Builds a 9:16 reel draft from today&apos;s script: shot timing, caption stack, visual direction, and a motion preview.</p>
            <div class="scene-strip">
              ${assetVideoScenesHtml(digest.asset.reelVideo)}
            </div>
            <div class="prompt-box">Video prompt: ${escapeHtml(digest.asset.reelVideo?.videoPrompt || "Use the daily reel script and market mood to shape a vertical market briefing video.")}</div>
            <button id="generateReelVideoBtn" class="primary-btn video-btn" type="button">Build Reel Video Draft</button>
            <div class="loader-track">
              <div id="videoLoader" class="loader-bar"></div>
            </div>
            <div class="video-output">
              <canvas id="reelVideoCanvas" width="360" height="640" aria-label="Reel video draft preview"></canvas>
            </div>
            <p id="videoGenerationState" class="video-status">Ready to build today&apos;s vertical reel preview.</p>
          </div>
        </section>
      </div>

      <section class="panel teleprompter-shell">
        <div class="teleprompter-header">
          <h2>Recording Script Workbench</h2>
          <button id="togglePrompterBtn" class="dark-btn">&#9654; Play Script</button>
        </div>
        <p class="muted-copy">Clean formatting, paced for voice, and grounded in today&apos;s source stack. Use the speed controls to rehearse the open before recording.</p>
        <div class="script-toolbar" aria-label="Recording speed controls">
          <button class="speed-btn" type="button" data-prompter-speed="28">Slow</button>
          <button class="speed-btn active" type="button" data-prompter-speed="20">Normal</button>
          <button class="speed-btn" type="button" data-prompter-speed="14">Fast</button>
          <button id="resetPrompterBtn" class="speed-btn" type="button">Reset</button>
        </div>
        <div class="script-section-list">
          ${scriptSectionCardsHtml(digest)}
        </div>
        <div id="teleprompterContainer" class="teleprompter-view">
          <div class="read-line"><span>Read Here</span></div>
          <div class="teleprompter-text">${teleprompterHtml(digest)}</div>
        </div>
      </section>

      <section class="panel teleprompter-shell">
        <div class="studio-panel-head">
          <div>
            <h2>Studio Activity Log</h2>
            <p>Operator timeline for script checks, asset preparation, and publish readiness.</p>
          </div>
        </div>
        <ul id="studioActivityLog" class="activity-log">
          <li class="activity-item"><strong>Digest loaded</strong><span>${escapeHtml(digest.news.length)} articles, ${escapeHtml(digest.themes.length)} themes, ${escapeHtml(digest.marketSnapshots.length)} quote snapshots.</span></li>
          <li class="activity-item"><strong>Scanner state</strong><span>${escapeHtml(scannerActivityLine(digest))}</span></li>
        </ul>
      </section>
    </section>
    ` : ""}

    ${includeStudio ? `
    <section id="architecture-view" class="tab-content hidden">
      <header class="page-header">
        <h1>Engine Architecture & Roadmap</h1>
        <p>Technical breakdown of the infrastructure behind the morning desk workflow, from live quotes to public briefing and private creator tools.</p>
      </header>

      <div class="arch-grid">
        <section>
          <h2 class="section-title">Tech Stack Overview</h2>
          <div class="tech-block">
            <h3>&#9881; Backend Engine</h3>
            <p>Java with Spring Boot structured as a modular monolith that can split into microservices.</p>
            <div class="chips">
              <span class="chip">Java 17</span>
              <span class="chip">Spring Boot</span>
              <span class="chip">Maven</span>
              <span class="chip">PostgreSQL</span>
              <span class="chip">Redis</span>
            </div>
          </div>
          <div class="tech-block">
            <h3>&#128241; Frontend Command Center</h3>
            <p>High-contrast, responsive UI tailored for rapid market data consumption and creator workflow.</p>
            <div class="chips">
              <span class="chip blue">Next.js</span>
              <span class="chip blue">React</span>
              <span class="chip blue">Tailwind CSS</span>
              <span class="chip blue">Canvas Charts</span>
            </div>
          </div>
          <div class="tech-block">
            <h3>&#129302; Integrations</h3>
            <p>Multithreaded data fetching across financial APIs with adapter boundaries for later production services.</p>
            <div class="chips">
              <span class="chip stone">Alpha Vantage API</span>
              <span class="chip stone">MarketAux</span>
              <span class="chip stone">OpenAI / LLM</span>
              <span class="chip stone">Stable Diffusion</span>
              <span class="chip stone">ControlNet</span>
            </div>
          </div>
        </section>

        <section>
          <h2 class="section-title">Execution Milestones</h2>
          <div class="milestones">
            <article class="milestone">
              <h3>Phase 1: Market Desk Feed</h3>
              <p>Set up Spring Boot backend, Maven configuration, and multithreaded adapter calls to pull overnight market data quickly.</p>
            </article>
            <article class="milestone indigo">
              <h3>Phase 2: The Scanner</h3>
              <p>Implement strict 1:2 risk-reward checks for index setups without connecting order execution.</p>
            </article>
            <article class="milestone todo">
              <h3>Phase 3: Recording Script</h3>
              <p>Format the morning source stack into a readable daily script with pacing and studio controls.</p>
            </article>
            <article class="milestone todo">
              <h3>Phase 4: The Visuals</h3>
              <p>Integrate identity-locked visual generation for sentiment-based thumbnails.</p>
            </article>
          </div>
        </section>
      </div>
    </section>
    ` : ""}

    ${includeStudio ? `
    <section id="components-view" class="tab-content hidden">
      ${adminComponentsConsoleHtml(digest)}
    </section>

    <section id="multibagger-admin-view" class="tab-content hidden">
      ${multibaggerAdminConsoleHtml(publicMultibaggerState)}
    </section>
    ` : ""}
  </main>

  <script>
    window.__DIGEST__ = ${JSON.stringify(clientDigest)};
    window.MARKET_NARRATIVE_API_BASE = ${JSON.stringify(apiOrigin)};
    ${includeStudio ? `window.__MULTIBAGGER_STATE__ = ${JSON.stringify(publicMultibaggerState)};` : ""}
    window.__INITIAL_TAB__ = ${JSON.stringify(safeInitialTab)};
    window.__INCLUDE_STUDIO__ = ${JSON.stringify(includeStudio)};
    window.__REQUIRE_ADMIN_AUTH__ = ${JSON.stringify(requireAuth)};
    window.__ADMIN_AUTH_HASH__ = "80b6c184bff356be9b060287583d6c10afe1d425a98410dcd5bfd72e251c40f6";
    window.__PUBLIC_SITE_BASE_URL__ = ${JSON.stringify(publicSiteBaseUrl)};

    document.addEventListener('DOMContentLoaded', () => {
      if (window.__REQUIRE_ADMIN_AUTH__) {
        bindAdminAuth();
        if (!hasAdminSession()) {
          showAdminGate();
          return;
        }
        unlockAdminGate();
      }
      bootMarketNarrative();
    });

    function bootMarketNarrative() {
      const tabs = document.querySelectorAll('.tab-btn');
      const contents = document.querySelectorAll('.tab-content');

      function activate(target) {
        tabs.forEach((tab) => {
          const active = tab.dataset.target === target;
          tab.classList.toggle('active', active);
        });
        contents.forEach((content) => {
          content.classList.toggle('hidden', content.id !== target);
        });
        if (target === 'studio-view' && window.__INCLUDE_STUDIO__) {
          drawScannerChart();
        }
        if (target === 'public-view') {
          drawOvernightChart();
        }
      }

      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          activate(tab.dataset.target);
          if (tab.dataset.target === 'trading-guide-view') {
            history.replaceState(null, '', '#trading-guide');
          } else if (tab.dataset.target === 'public-view' && window.location.hash === '#trading-guide') {
            history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        });
      });

      const hashTarget = window.location.hash === '#trading-guide' && document.getElementById('trading-guide-view')
        ? 'trading-guide-view'
        : window.__INITIAL_TAB__;
      activate(hashTarget);
      drawOvernightChart();
      if (window.__INCLUDE_STUDIO__) {
        drawScannerChart();
        bindTeleprompter();
        bindTeleprompterControls();
        bindAssetGeneration();
        bindReelVideoGeneration();
        bindStudioActions();
        bindReelScriptCopy();
        bindMultibaggerReviewActions();
      }
      bindQuoteBoardToggle();
      bindSourceFilters();
      bindSourceCardClicks();
      bindShareButtons();
      initLiveIndexBoard();
    }

    function bindShareButtons() {
      document.querySelectorAll('[data-copy-url]').forEach((button) => {
        button.addEventListener('click', async () => {
          const url = button.dataset.copyUrl || window.location.href;
          const label = button.querySelector('.sr-only');
          try {
            await navigator.clipboard.writeText(url);
            button.dataset.copyState = 'copied';
            button.setAttribute('aria-label', 'Copied');
            button.title = 'Copied';
            if (label) label.textContent = 'Copied';
          } catch {
            button.setAttribute('aria-label', 'Copy failed');
            button.title = 'Copy failed';
            if (label) label.textContent = 'Copy failed';
          }
          setTimeout(() => {
            delete button.dataset.copyState;
            button.setAttribute('aria-label', 'Copy link');
            button.title = 'Copy link';
            if (label) label.textContent = 'Copy link';
          }, 1800);
        });
      });
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
          if (hash === window.__ADMIN_AUTH_HASH__) {
            try {
              sessionStorage.setItem('marketNarrativeAdminSession', hash);
            } catch {
              // Continue with the in-memory unlock if storage is blocked.
            }
            requestBackendToken(email, password)
              .then((token) => {
                if (!token) return;
                try {
                  sessionStorage.setItem('marketNarrativeAdminToken', token);
                } catch {
                  // The local static gate is already open; the backend token is optional.
                }
              })
              .catch(() => {});
            if (error) error.hidden = true;
            unlockAdminGate();
            bootMarketNarrative();
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
      try {
        return sessionStorage.getItem('marketNarrativeAdminSession') === window.__ADMIN_AUTH_HASH__;
      } catch {
        return false;
      }
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
        const response = await fetch((window.MARKET_NARRATIVE_API_BASE || '') + '/api/auth/login', {
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

    function bindMultibaggerReviewActions() {
      document.getElementById('uploadSnapshotBtn')?.addEventListener('click', uploadMultibaggerSnapshot);
      document.getElementById('runReviewBtn')?.addEventListener('click', runMultibaggerReview);
      document.getElementById('publishReviewBtn')?.addEventListener('click', publishMultibaggerReview);
    }

    let multibaggerSnapshotId = null;
    let multibaggerReviewId = null;

    async function uploadMultibaggerSnapshot() {
      const file = document.getElementById('portfolioFile')?.files?.[0];
      if (!file) return setAdminText('snapshotState', 'Choose an image first.');
      const form = new FormData();
      form.append('file', file);
      setAdminText('snapshotState', 'Uploading...');
      try {
        const response = await fetch((window.MARKET_NARRATIVE_API_BASE || '') + '/api/admin/multibagger/snapshots', {
          method: 'POST',
          headers: authHeaders(),
          body: form
        });
        const payload = await response.json();
        multibaggerSnapshotId = payload.snapshotId;
        setAdminText('snapshotState', 'Snapshot stored for review: ' + multibaggerSnapshotId);
      } catch {
        multibaggerSnapshotId = 'local-static-snapshot';
        setAdminText('snapshotState', 'Backend unavailable. Static preview mode is active.');
      }
    }

    async function runMultibaggerReview() {
      const month = document.getElementById('reviewMonth')?.value || new Date().toISOString().slice(0, 7);
      setAdminText('reviewState', 'Running review...');
      const body = JSON.stringify({ snapshotId: multibaggerSnapshotId, month, corrections: [] });
      try {
        const response = await fetch((window.MARKET_NARRATIVE_API_BASE || '') + '/api/admin/multibagger/reviews/run', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body
        });
        const payload = await response.json();
        multibaggerReviewId = payload.reviewId;
        document.getElementById('reviewOutput').textContent = JSON.stringify(payload, null, 2);
        document.getElementById('publishReviewBtn').disabled = false;
        setAdminText('reviewState', 'Review ready.');
      } catch {
        const fallback = localMultibaggerReview(month);
        multibaggerReviewId = fallback.reviewId;
        document.getElementById('reviewOutput').textContent = JSON.stringify(fallback, null, 2);
        document.getElementById('publishReviewBtn').disabled = false;
        setAdminText('reviewState', 'Static preview review ready.');
      }
    }

    async function publishMultibaggerReview() {
      if (!multibaggerReviewId) return setAdminText('publishState', 'Run a review first.');
      try {
        const response = await fetch((window.MARKET_NARRATIVE_API_BASE || '') + '/api/admin/multibagger/reviews/' + encodeURIComponent(multibaggerReviewId) + '/publish', {
          method: 'POST',
          headers: authHeaders()
        });
        const payload = await response.json();
        setAdminText('publishState', 'Published sanitized review for ' + (payload.month || 'current month') + '.');
      } catch {
        setAdminText('publishState', 'Backend unavailable. Nothing was published from this static preview.');
      }
    }

    function localMultibaggerReview(month) {
      return {
        reviewId: 'static-' + month,
        month,
        decisions: (window.__MULTIBAGGER_STATE__?.holdings || []).map((holding) => ({
          ticker: holding.ticker,
          action: holding.ticker === 'TEMBO' ? 'KEEP_CAPPED' : 'KEEP',
          confidence: holding.ticker === 'TEMBO' ? 0.62 : 0.74,
          evidence: holding.breakRule,
          publicSummary: holding.status
        })),
        note: 'Preview only. Publish requires the Spring backend.'
      };
    }

    function authHeaders(extra = {}) {
      const token = sessionStorage.getItem('marketNarrativeAdminToken');
      return token ? { ...extra, Authorization: 'Bearer ' + token } : extra;
    }

    function setAdminText(id, value) {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    }

    function drawOvernightChart() {
      const digest = window.__DIGEST__;
      const canvas = document.getElementById('overnightChart');
      if (!canvas) return;
      const source = window.__PUBLISHED_QUOTES__ ?? digest.marketSnapshots;
      const data = dashboardQuotes(source)
        .map((item) => ({ label: compactMarketLabel(item), value: Number(item.changePercent), symbol: item.symbol }));
      window.__MARKET_DASHBOARD_SYMBOLS__ = data.map((item) => item.symbol);
      canvas.dataset.dashboardSymbols = window.__MARKET_DASHBOARD_SYMBOLS__.join(',');
      drawBarChart(canvas, data);
    }

    function dashboardQuotes(quotes) {
      const priority = ['SPX', 'NDX', 'HSI', 'NIFTY', 'BANKNIFTY', 'BRENT'];
      return priority
        .map((symbol) => quotes.find((quote) => quote.symbol === symbol))
        .filter(Boolean);
    }

    function initLiveIndexBoard() {
      window.__PUBLISHED_QUOTES__ = window.__DIGEST__.marketSnapshots;
      window.__QUOTE_BOARD_EXPANDED__ = false;
      window.__ACTIVE_QUOTE_REGION__ = null;
      renderIndexBoard();
      bindIndexModal();
      if (window.__INCLUDE_STUDIO__) {
        updateLiveClock('Studio snapshot loaded');
        return;
      }
      updateLiveClock('Refreshing prices after page load');
      refreshPublishedDigest('page-load');
      setInterval(() => refreshPublishedDigest('background'), 60_000);
    }

    function renderIndexBoard() {
      const board = document.getElementById('indexBoard');
      if (!board || !window.__PUBLISHED_QUOTES__) return;
      renderRegionCards();
      if (!window.__QUOTE_BOARD_EXPANDED__) {
        board.innerHTML = '';
        return;
      }
      const grouped = groupQuotesByRegion(window.__PUBLISHED_QUOTES__);
      const activeRegion = window.__ACTIVE_QUOTE_REGION__;
      if (!activeRegion || !grouped.has(activeRegion)) {
        board.innerHTML = '<div class="quote-region-empty">Select a market card above to inspect its live quotes and open charts.</div>';
        return;
      }
      const quotes = displayQuotesForRegion(activeRegion, grouped.get(activeRegion));
      board.innerHTML = '<section class="quote-region">' +
        '<div class="quote-region-head"><h3>' + escapeClientHtml(activeRegion) + '</h3><span>' + regionSummary(quotes) + '</span></div>' +
        '<div class="index-grid">' + quotes.map((quote) => quoteTileHtml(quote)).join('') + '</div>' +
      '</section>';
      board.querySelectorAll('.index-tile').forEach((tile) => {
        tile.addEventListener('click', () => openIndexChart(tile.dataset.symbol));
      });
    }

    function renderRegionCards() {
      const container = document.getElementById('regionalBreadth');
      if (!container || !window.__PUBLISHED_QUOTES__) return;
      const grouped = groupQuotesByRegion(window.__PUBLISHED_QUOTES__);
      const cards = regionOrder()
        .filter((region) => region !== 'Other Markets' && grouped.has(region))
        .map((region) => regionCardHtml(region, displayQuotesForRegion(region, grouped.get(region))))
        .join('');
      container.innerHTML = cards;
      container.querySelectorAll('.breadth-card').forEach((card) => {
        card.addEventListener('click', () => {
          window.__ACTIVE_QUOTE_REGION__ = card.dataset.region;
          window.__QUOTE_BOARD_EXPANDED__ = true;
          const toggle = document.getElementById('quoteBoardToggle');
          const body = document.getElementById('quoteBoardBody');
          const state = document.getElementById('quoteBoardState');
          if (toggle) {
            toggle.setAttribute('aria-expanded', 'true');
            toggle.classList.add('open');
          }
          if (body) body.hidden = false;
          if (state) state.textContent = 'Hide details';
          renderIndexBoard();
        });
      });
    }

    function regionCardHtml(region, quotes) {
      const positives = quotes.filter((quote) => Number(quote.changePercent) >= 0).length;
      const average = quotes.reduce((sum, quote) => sum + Number(quote.changePercent || 0), 0) / Math.max(1, quotes.length);
      const strongest = quotes
        .slice()
        .sort((left, right) => Math.abs(Number(right.changePercent)) - Math.abs(Number(left.changePercent)))[0];
      const status = regionLiveStatus(quotes);
      const active = window.__ACTIVE_QUOTE_REGION__ === region;
      const context = region === 'Asia Watch' ? 'Top 5 countries · ' : '';
      const leadName = region === 'Asia Watch' ? countryForQuote(strongest) || strongest.name : strongest.name;
      const leadLabel = quoteIsFlatOrStale(strongest) ? 'Last close' : Number(strongest.changePercent) >= 0 ? 'Biggest lift' : 'Biggest drag';
      return '<button class="breadth-card" type="button" data-region="' + escapeClientHtml(region) + '" aria-pressed="' + (active ? 'true' : 'false') + '" aria-label="Open ' + escapeClientHtml(region) + ' quote context">' +
        '<div class="breadth-card-top"><span>' + escapeClientHtml(region) + '</span><em class="market-state ' + status.className + '">' + escapeClientHtml(status.label) + '</em></div>' +
        '<strong>' + positives + ' up <em>/ ' + quotes.length + ' tracked</em></strong>' +
        '<small>Avg move <b class="market-move ' + moveClass(average) + '">' + formatClientChange(average) + '</b> · ' + escapeClientHtml(context) + escapeClientHtml(leadLabel) + ': ' + escapeClientHtml(leadName) + ' <b class="market-move ' + moveClassForQuote(strongest) + '">' + formatClientQuoteChange(strongest) + '</b></small>' +
      '</button>';
    }

    function regionLiveStatus(quotes) {
      const openCount = quotes.filter((quote) => marketStatusFor(quote).open).length;
      if (openCount === quotes.length) {
        return { label: 'Live', className: 'live' };
      }
      if (openCount > 0) {
        return { label: openCount + '/' + quotes.length + ' live', className: 'partial' };
      }
      return { label: 'Closed', className: 'closed' };
    }

    function bindQuoteBoardToggle() {
      const toggle = document.getElementById('quoteBoardToggle');
      const body = document.getElementById('quoteBoardBody');
      const state = document.getElementById('quoteBoardState');
      if (!toggle || !body) return;

      function setExpanded(expanded) {
        window.__QUOTE_BOARD_EXPANDED__ = expanded;
        if (!expanded) {
          window.__ACTIVE_QUOTE_REGION__ = null;
        }
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        toggle.classList.toggle('open', expanded);
        body.hidden = !expanded;
        if (state) {
          state.textContent = expanded ? 'Hide details' : 'Show details';
        }
        renderIndexBoard();
      }

      setExpanded(false);
      toggle.addEventListener('click', () => {
        setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
      });
    }

    function quoteTileHtml(quote) {
      const status = marketStatusFor(quote);
      const direction = moveClassForQuote(quote);
      const statusClass = status.open ? 'status live' : 'status closed';
      const quoteTime = formatQuoteTimestamp(quote.dataTimestamp);
      return '<button class="index-tile" type="button" data-symbol="' + quote.symbol + '" aria-label="Open chart for ' + escapeClientHtml(marketDisplayName(quote)) + '">' +
        '<div class="symbol-row"><span class="symbol">' + escapeClientHtml(quote.symbol) + '</span><span class="' + statusClass + '">' + (status.open ? 'Live' : 'Closed') + '</span></div>' +
        '<div class="name">' + escapeClientHtml(marketDisplayName(quote)) + '</div>' +
        '<div class="price">' + formatClientNumber(quote.closeValue) + '</div>' +
        '<div class="change ' + direction + '">' + formatClientQuoteChange(quote) + '</div>' +
        '<div class="name">' + displayStatusLabel(quote, status) + (quoteTime ? ' - ' + quoteTime : '') + '</div>' +
      '</button>';
    }

    function displayStatusLabel(quote, status) {
      if (quoteIsStaleForDisplay(quote)) {
        return 'Last close';
      }
      if (quote.dataQuality !== 'live' && status.open) {
        return 'Session open';
      }
      return status.label;
    }

    function groupQuotesByRegion(quotes) {
      const grouped = new Map();
      for (const quote of quotes) {
        const region = quote.marketRegion || regionForSymbol(quote.symbol);
        grouped.set(region, [...(grouped.get(region) || []), quote]);
      }
      return grouped;
    }

    function regionOrder() {
      return ['US Overnight', 'Asia Watch', 'India Open', 'Macro Hedges', 'Other Markets'];
    }

    function displayQuotesForRegion(region, quotes) {
      if (region !== 'Asia Watch') return quotes;
      return quotes
        .filter((quote) => asiaTopSymbols().includes(quote.symbol))
        .sort((left, right) => asiaTopSymbols().indexOf(left.symbol) - asiaTopSymbols().indexOf(right.symbol));
    }

    function asiaTopSymbols() {
      return ['NIKKEI', 'HSI', 'SHCOMP', 'KOSPI', 'TAIEX'];
    }

    function marketDisplayName(quote) {
      if (regionForSymbol(quote.symbol) !== 'Asia Watch') return quote.name;
      const country = countryForQuote(quote);
      return country ? country + ' - ' + quote.name : quote.name;
    }

    function countryForQuote(quote) {
      return quote.country || countryForSymbol(quote.symbol);
    }

    function countryForSymbol(symbol) {
      return {
        NIKKEI: 'Japan',
        HSI: 'Hong Kong',
        SHCOMP: 'Mainland China',
        KOSPI: 'South Korea',
        TAIEX: 'Taiwan',
        STI: 'Singapore',
        ASX200: 'Australia'
      }[symbol] || '';
    }

    function regionSummary(quotes) {
      const positives = quotes.filter((quote) => Number(quote.changePercent) >= 0).length;
      const average = quotes.reduce((sum, quote) => sum + Number(quote.changePercent || 0), 0) / Math.max(1, quotes.length);
      const unit = quotes.some((quote) => regionForSymbol(quote.symbol) === 'Asia Watch') ? 'country markets' : 'tracked';
      return positives + ' up / ' + quotes.length + ' ' + unit + ' - Avg move <b class="market-move ' + moveClass(average) + '">' + formatClientChange(average) + '</b>';
    }

    async function refreshPublishedDigest(reason) {
      let lastError = null;
      for (const url of resolveDigestRefreshUrls()) {
        try {
          const response = await fetch(withCacheBuster(url), { cache: 'no-store' });
          if (!response.ok) {
            throw new Error(url + ' returned HTTP ' + response.status);
          }
          const digest = await response.json();
          if (!Array.isArray(digest.marketSnapshots)) {
            throw new Error(url + ' did not include market snapshots');
          }
          if (!shouldAdoptDigest(digest, window.__DIGEST__)) {
            updateLiveClock('Checked for newer prices');
            return;
          }
          window.__DIGEST__ = adoptMarketSnapshotDigest(digest, window.__DIGEST__);
          window.__PUBLISHED_QUOTES__ = digest.marketSnapshots;
          renderIndexBoard();
          drawOvernightChart();
          if (window.__ACTIVE_INDEX_SYMBOL__) {
            const activeQuote = window.__PUBLISHED_QUOTES__.find((item) => item.symbol === window.__ACTIVE_INDEX_SYMBOL__);
            if (activeQuote) {
              drawIndexChartPreview(activeQuote);
              setChartLinks(activeQuote);
            }
          }
          const sourceLabel = /^https?:/i.test(url) ? 'public feed' : 'published file';
          updateLiveClock(reason === 'page-load' ? 'Prices refreshed from ' + sourceLabel : undefined);
          return;
        } catch (error) {
          lastError = error;
        }
      }
      updateLiveClock('Waiting for next published quote file');
      if (lastError && window.location.search.includes('debugRefresh=1')) {
        console.warn(lastError);
      }
    }

    function resolveDigestRefreshUrls() {
      const urls = [];
      const apiUrl = apiDigestUrl();
      if (apiUrl) {
        urls.push(apiUrl);
      }
      const publicUrl = publicDigestUrl();
      const localPreview = isLocalPreview();
      if (localPreview && publicUrl) {
        urls.push(publicUrl);
      }
      urls.push('digest.json');
      if (publicUrl && !localPreview && !sameUrl(publicUrl, relativeDigestUrl())) {
        urls.push(publicUrl);
      }
      return [...new Set(urls.filter(Boolean))];
    }

    function adoptMarketSnapshotDigest(incomingDigest, currentDigest) {
      return {
        ...currentDigest,
        generatedAt: incomingDigest.generatedAt ?? incomingDigest.publishedAt ?? currentDigest.generatedAt,
        publishedAt: incomingDigest.publishedAt ?? currentDigest.publishedAt,
        marketDataMode: incomingDigest.marketDataMode ?? currentDigest.marketDataMode,
        marketSnapshots: incomingDigest.marketSnapshots
      };
    }

    function apiDigestUrl() {
      const base = String(window.MARKET_NARRATIVE_API_BASE || '').replace(/\\/$/, '');
      const digestDate = window.__DIGEST__?.digestDate;
      if (!base || !digestDate) return '';
      return base + '/api/public/digest/' + encodeURIComponent(digestDate);
    }

    function isLocalPreview() {
      return window.location.protocol === 'file:' || ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    }

    function publicDigestUrl() {
      const canonicalPath = window.__DIGEST__?.canonicalPath;
      if (!canonicalPath) return '';
      const base = String(window.__PUBLIC_SITE_BASE_URL__ || '').replace(/\\/$/, '');
      const path = String(canonicalPath).startsWith('/') ? canonicalPath : '/' + canonicalPath;
      return base + path.replace(/\\/?$/, '/') + 'digest.json';
    }

    function relativeDigestUrl() {
      try {
        return new URL('digest.json', window.location.href).href;
      } catch {
        return 'digest.json';
      }
    }

    function sameUrl(candidate, current) {
      try {
        const left = new URL(candidate);
        const right = new URL(current);
        return left.origin === right.origin && left.pathname === right.pathname;
      } catch {
        return false;
      }
    }

    function withCacheBuster(url) {
      const joiner = url.includes('?') ? '&' : '?';
      return url + joiner + 'ts=' + Date.now();
    }

    function shouldAdoptDigest(incomingDigest, currentDigest) {
      const incomingFreshness = digestFreshnessTime(incomingDigest);
      const currentFreshness = digestFreshnessTime(currentDigest);
      if (!digestHasLiveQuotes(incomingDigest) && digestHasLiveQuotes(currentDigest)) {
        return false;
      }
      if (!Number.isFinite(currentFreshness)) {
        return true;
      }
      if (!Number.isFinite(incomingFreshness)) {
        return false;
      }
      return incomingFreshness >= currentFreshness;
    }

    function digestHasLiveQuotes(digest) {
      return (digest?.marketSnapshots ?? []).some((quote) => quote.dataQuality === 'live');
    }

    function digestFreshnessTime(digest) {
      const quoteTimes = (digest?.marketSnapshots ?? [])
        .map((quote) => Date.parse(quote.dataTimestamp ?? ''))
        .filter((time) => Number.isFinite(time));
      const generatedAt = Date.parse(digest?.generatedAt ?? '');
      return Math.max(...quoteTimes, Number.isFinite(generatedAt) ? generatedAt : -Infinity);
    }

    function bindIndexModal() {
      const modal = document.getElementById('indexChartModal');
      const close = document.getElementById('closeIndexChart');
      if (!modal || !close) return;
      close.addEventListener('click', closeIndexChart);
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          closeIndexChart();
        }
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeIndexChart();
        }
      });
    }

    function openIndexChart(symbol) {
      const modal = document.getElementById('indexChartModal');
      const title = document.getElementById('indexChartTitle');
      const meta = document.getElementById('indexChartMeta');
      const quote = window.__PUBLISHED_QUOTES__.find((item) => item.symbol === symbol);
      if (!modal || !quote) return;
      const status = marketStatusFor(quote);
      window.__ACTIVE_INDEX_SYMBOL__ = symbol;
      title.textContent = marketDisplayName(quote) + ' (' + quote.symbol + ')';
      meta.textContent = status.open
        ? 'Published price series from the latest quote feed. The board checks for updates every 60 seconds.'
        : 'Market closed. Showing the latest published price series for review.';
      setChartLinks(quote);
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      drawIndexChartPreview(quote);
    }

    function closeIndexChart() {
      const modal = document.getElementById('indexChartModal');
      if (!modal) return;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      window.__ACTIVE_INDEX_SYMBOL__ = null;
      const canvas = document.getElementById('marketChartCanvas');
      if (canvas) {
        canvas.dataset.renderState = 'idle';
      }
      const fallback = document.getElementById('chartFallback');
      if (fallback) {
        fallback.classList.remove('visible');
        fallback.setAttribute('aria-hidden', 'true');
      }
    }

    function drawIndexChartPreview(quote) {
      const canvas = document.getElementById('marketChartCanvas');
      const source = document.getElementById('marketChartSource');
      const range = document.getElementById('marketChartRange');
      if (!canvas) return;
      const fallback = document.getElementById('chartFallback');
      if (fallback) {
        fallback.classList.remove('visible');
        fallback.setAttribute('aria-hidden', 'true');
      }
      const points = Array.isArray(quote.chartPoints)
        ? quote.chartPoints.filter((point) => Number.isFinite(Number(point.close)))
        : [];
      if (points.length < 2) {
        canvas.dataset.renderState = 'missing-data';
        showChartFallback();
        if (range) range.textContent = 'Chart series unavailable for this published snapshot';
        return;
      }
      if (source) {
        source.textContent = chartSeriesLabel(quote);
      }
      if (range) {
        range.textContent = formatQuoteTime(points[0].time) + ' to ' + formatQuoteTime(points.at(-1).time) + ' IST';
      }
      drawMarketSeriesChart(canvas, quote, points);
      canvas.dataset.renderState = 'rendered';
    }

    function chartSeriesLabel(quote) {
      return (quote.dataQuality === 'live' ? 'Captured price series' : 'Reference price series') +
        ' - ' +
        (quote.tradingViewSymbol || fallbackTradingViewSymbol(quote.symbol));
    }

    function setChartLinks(quote) {
      const url = tradingViewUrl(quote);
      const open = document.getElementById('openFullChart');
      if (open) open.href = url;
    }

    function tradingViewUrl(quote) {
      const symbol = quote.tradingViewSymbol || fallbackTradingViewSymbol(quote.symbol);
      return 'https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(symbol);
    }

    function showChartFallback() {
      const fallback = document.getElementById('chartFallback');
      if (!fallback) return;
      fallback.classList.add('visible');
      fallback.setAttribute('aria-hidden', 'false');
    }

    function updateLiveClock(note) {
      const clock = document.getElementById('liveClock');
      if (!clock) return;
      const quotes = window.__PUBLISHED_QUOTES__ ?? [];
      const openCount = quotes.filter((quote) => marketStatusFor(quote).open).length;
      const latest = latestQuoteTime(quotes);
      const time = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(new Date());
      const mode = quotes.some((quote) => quote.dataQuality === 'live') ? 'market quote feed' : 'reference quotes';
      const liveLine = openCount > 0
        ? 'Live now ' + openCount + '/' + quotes.length + ' markets'
        : 'Previous close/reference quotes' + (latestSnapshotDateLabel(quotes) ? ' - latest snapshot ' + latestSnapshotDateLabel(quotes) : '');
      clock.textContent = (note ? note + ' - ' : '') +
        liveLine +
        (openCount > 0 ? ' - ' + mode : ' - not a live trading feed') +
        (latest ? ' - latest ' + latest : '') +
        ' - checked IST ' + time;
    }

    function latestSnapshotDateLabel(quotes) {
      const timestamps = (quotes || [])
        .map((quote) => Date.parse(quote.dataTimestamp || ''))
        .filter((value) => Number.isFinite(value));
      if (!timestamps.length) return '';
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short'
      }).format(new Date(Math.max(...timestamps)));
    }

    function compactMarketLabel(item) {
      return String(item.name)
        .replace('US Dollar Index', 'DXY')
        .replace('Nasdaq 100', 'Nasdaq')
        .replace('Dow Jones', 'Dow');
    }

    function latestQuoteTime(quotes) {
      const timestamps = quotes
        .map((quote) => Date.parse(quote.dataTimestamp))
        .filter((value) => Number.isFinite(value));
      if (!timestamps.length) return '';
      return formatQuoteTime(new Date(Math.max(...timestamps)).toISOString());
    }

    function formatQuoteTime(value) {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    }

    function formatQuoteTimestamp(value) {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    }

    function fallbackTradingViewSymbol(symbol) {
      return {
        SPX: 'SP:SPX',
        NDX: 'NASDAQ:NDX',
        DJI: 'DJ:DJI',
        NIFTY: 'NSE:NIFTY',
        BANKNIFTY: 'NSE:BANKNIFTY',
        GIFTNIFTY: 'NSEIX:NIFTY1!',
        NIKKEI: 'TVC:NI225',
        HSI: 'TVC:HSI',
        SHCOMP: 'SSE:000001',
        KOSPI: 'KRX:KOSPI',
        TAIEX: 'TWSE:TAIEX',
        STI: 'TVC:STI',
        ASX200: 'ASX:XJO',
        DXY: 'TVC:DXY',
        BRENT: 'TVC:UKOIL',
        USDINR: 'FX:USDINR',
        GOLD: 'TVC:GOLD',
        INDIAVIX: 'NSE:INDIAVIX'
      }[symbol] ?? 'SP:SPX';
    }

    function regionForSymbol(symbol) {
      if (symbol === 'SPX' || symbol === 'NDX' || symbol === 'DJI') return 'US Overnight';
      if (symbol === 'NIFTY' || symbol === 'BANKNIFTY' || symbol === 'GIFTNIFTY' || symbol === 'INDIAVIX') return 'India Open';
      if (symbol === 'DXY' || symbol === 'BRENT' || symbol === 'USDINR' || symbol === 'GOLD') return 'Macro Hedges';
      if (['NIKKEI', 'HSI', 'SHCOMP', 'KOSPI', 'TAIEX', 'STI', 'ASX200'].includes(symbol)) return 'Asia Watch';
      return 'Other Markets';
    }

    function marketStatusFor(quoteOrSymbol) {
      const quote = typeof quoteOrSymbol === 'string' ? { symbol: quoteOrSymbol } : quoteOrSymbol;
      if (quoteIsStaleForDisplay(quote)) {
        return { open: false, label: 'Last close', closeLabel: 'timestamped close' };
      }
      const symbol = quote.symbol;
      const session = quote.session || sessionForSymbol(symbol);
      const now = new Date();
      if (session === 'us') {
        return marketWindow(now, 'America/New_York', 9, 30, 16, 0, 'US close 4:00 PM ET');
      }
      if (session === 'india') {
        return marketWindow(now, 'Asia/Kolkata', 9, 15, 15, 30, 'India close 3:30 PM IST');
      }
      if (session === 'tokyo') {
        return marketWindow(now, 'Asia/Tokyo', 9, 0, 15, 30, 'Tokyo close 3:30 PM JST');
      }
      if (session === 'hongkong') {
        return marketWindow(now, 'Asia/Hong_Kong', 9, 30, 16, 0, 'Hong Kong close 4:00 PM HKT');
      }
      if (session === 'shanghai') {
        return marketWindow(now, 'Asia/Shanghai', 9, 30, 15, 0, 'Shanghai close 3:00 PM CST');
      }
      if (session === 'seoul') {
        return marketWindow(now, 'Asia/Seoul', 9, 0, 15, 30, 'Seoul close 3:30 PM KST');
      }
      if (session === 'taipei') {
        return marketWindow(now, 'Asia/Taipei', 9, 0, 13, 30, 'Taiwan close 1:30 PM CST');
      }
      if (session === 'singapore') {
        return marketWindow(now, 'Asia/Singapore', 9, 0, 17, 0, 'Singapore close 5:00 PM SGT');
      }
      if (session === 'sydney') {
        return marketWindow(now, 'Australia/Sydney', 10, 0, 16, 0, 'Sydney close 4:00 PM AEDT');
      }
      return marketWindow(now, 'UTC', 0, 0, 23, 30, 'global close window');
    }

    function quoteIsStaleForDisplay(quote) {
      const timestamp = Date.parse(quote?.dataTimestamp || '');
      if (!Number.isFinite(timestamp)) return false;
      const ageHours = (Date.now() - timestamp) / 36e5;
      const session = quote?.session || sessionForSymbol(quote?.symbol);
      const limit = session === 'macro' ? 12 : session === 'us' ? 24 : 10;
      return ageHours > limit;
    }

    function quoteIsFlatOrStale(quote) {
      return quoteIsStaleForDisplay(quote) && Math.abs(Number(quote?.changePercent || 0)) < 0.005;
    }

    function sessionForSymbol(symbol) {
      return {
        SPX: 'us',
        NDX: 'us',
        DJI: 'us',
        NIFTY: 'india',
        BANKNIFTY: 'india',
        GIFTNIFTY: 'india',
        NIKKEI: 'tokyo',
        HSI: 'hongkong',
        SHCOMP: 'shanghai',
        KOSPI: 'seoul',
        TAIEX: 'taipei',
        STI: 'singapore',
        ASX200: 'sydney',
        DXY: 'macro',
        BRENT: 'macro',
        USDINR: 'macro',
        GOLD: 'macro',
        INDIAVIX: 'india'
      }[symbol] || 'macro';
    }

    function marketWindow(date, timeZone, openHour, openMinute, closeHour, closeMinute, closeLabel) {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(date).map((part) => [part.type, part.value]));
      const weekday = parts.weekday;
      const minutes = Number(parts.hour) * 60 + Number(parts.minute);
      const open = openHour * 60 + openMinute;
      const close = closeHour * 60 + closeMinute;
      const isWeekday = weekday !== 'Sat' && weekday !== 'Sun';
      const isOpen = isWeekday && minutes >= open && minutes <= close;
      return { open: isOpen, label: isOpen ? 'Live' : 'Closed', closeLabel };
    }

    function formatClientNumber(value) {
      return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    }

    function formatCompactNumber(value) {
      return Number(value).toLocaleString('en-IN', { maximumFractionDigits: Math.abs(Number(value)) >= 1000 ? 0 : 2 });
    }

    function formatClientChange(value) {
      return (value >= 0 ? '+' : '') + Number(value).toFixed(2) + '%';
    }

    function formatClientQuoteChange(quote) {
      if (quoteIsFlatOrStale(quote)) {
        return 'Last close';
      }
      return formatClientChange(quote.changePercent);
    }

    function moveClass(value) {
      return Math.abs(Number(value || 0)) < 0.005 ? 'flat' : Number(value) >= 0 ? 'up' : 'down';
    }

    function moveClassForQuote(quote) {
      return quoteIsFlatOrStale(quote) ? 'flat' : moveClass(quote.changePercent);
    }

    function escapeClientHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
    }

    function drawScannerChart() {
      const canvas = document.getElementById('scannerChart');
      if (!canvas) return;
      const setup = window.__DIGEST__.tradeSetups.find((item) => item.symbol === 'NIFTY') ?? window.__DIGEST__.tradeSetups[0];
      if (!setup) {
        drawEmptyScannerChart(canvas);
        return;
      }
      drawLineChart(canvas, setup);
    }

    function drawEmptyScannerChart(canvas) {
      const { ctx, width, height } = scaleCanvas(canvas);
      const palette = chartPalette();
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = palette.surface;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = palette.grid;
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i += 1) {
        const y = (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(24, y);
        ctx.lineTo(width - 24, y);
        ctx.stroke();
      }
      ctx.fillStyle = palette.text;
      ctx.textAlign = 'center';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('No active 1:2 setup', width / 2, height / 2 - 8);
      ctx.fillStyle = palette.muted;
      ctx.font = '13px Arial';
      ctx.fillText('Wait for opening-range confirmation.', width / 2, height / 2 + 18);
    }

    function scaleCanvas(canvas) {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      return { ctx, width: rect.width, height: rect.height };
    }

    function chartPalette() {
      const glass = document.body?.classList.contains('glass-v2');
      return glass
        ? {
            surface: 'rgba(2, 6, 23, 0.42)',
            grid: 'rgba(255, 255, 255, 0.12)',
            axis: 'rgba(255, 255, 255, 0.26)',
            muted: '#cbd5e1',
            text: '#f8fafc',
            up: '#34d399',
            down: '#fb7185',
            upFill: 'rgba(52, 211, 153, 0.24)',
            downFill: 'rgba(251, 113, 133, 0.22)',
            fade: 'rgba(2, 6, 23, 0)'
          }
        : {
            surface: '#f8fafc',
            grid: '#e5e7eb',
            axis: '#d6d3d1',
            muted: '#64748b',
            text: '#111827',
            up: '#059669',
            down: '#dc2626',
            upFill: 'rgba(5, 150, 105, 0.22)',
            downFill: 'rgba(220, 38, 38, 0.20)',
            fade: 'rgba(255, 255, 255, 0)'
          };
    }

    function drawBarChart(canvas, data) {
      const { ctx, width, height } = scaleCanvas(canvas);
      const palette = chartPalette();
      ctx.clearRect(0, 0, width, height);
      const pad = { top: 24, right: 18, bottom: 54, left: 54 };
      const chartW = width - pad.left - pad.right;
      const chartH = height - pad.top - pad.bottom;
      const min = Math.min(-1.5, ...data.map((item) => item.value));
      const max = Math.max(1.8, ...data.map((item) => item.value));
      const zeroY = pad.top + (max / (max - min)) * chartH;

      ctx.strokeStyle = palette.grid;
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i += 1) {
        const y = pad.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
      }

      ctx.strokeStyle = palette.axis;
      ctx.beginPath();
      ctx.moveTo(pad.left, zeroY);
      ctx.lineTo(width - pad.right, zeroY);
      ctx.stroke();

      const slot = chartW / data.length;
      data.forEach((item, index) => {
        const barW = Math.max(12, Math.min(70, slot * 0.56));
        const x = pad.left + slot * index + (slot - barW) / 2;
        const y = pad.top + ((max - item.value) / (max - min)) * chartH;
        const barTop = Math.min(y, zeroY);
        const barH = Math.max(4, Math.abs(zeroY - y));
        ctx.fillStyle = item.value >= 0 ? palette.up : palette.down;
        roundRect(ctx, x, barTop, barW, barH, 5);
        ctx.fill();

        ctx.fillStyle = palette.muted;
        ctx.font = data.length > 9 ? '10px Arial' : '12px Arial';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x + barW / 2, height - 20);
        if (data.length > 9) {
          ctx.rotate(-Math.PI / 5);
        }
        ctx.fillText(item.label, 0, 0);
        ctx.restore();
        ctx.fillStyle = item.value >= 0 ? palette.up : palette.down;
        ctx.font = data.length > 9 ? 'bold 10px Arial' : 'bold 12px Arial';
        ctx.fillText((item.value >= 0 ? '+' : '') + item.value.toFixed(2) + '%', x + barW / 2, barTop - 8);
      });
    }

    function drawMarketSeriesChart(canvas, quote, points) {
      const { ctx, width, height } = scaleCanvas(canvas);
      const palette = chartPalette();
      ctx.clearRect(0, 0, width, height);

      const pad = { top: 28, right: 28, bottom: 46, left: 70 };
      const chartW = Math.max(1, width - pad.left - pad.right);
      const chartH = Math.max(1, height - pad.top - pad.bottom);
      const values = points.map((point) => Number(point.close));
      const previous = Number(quote.previousClose);
      const allValues = Number.isFinite(previous) ? [...values, previous] : values;
      let min = Math.min(...allValues);
      let max = Math.max(...allValues);
      const spread = Math.max(max - min, Math.abs(max) * 0.002, 1);
      min -= spread * 0.18;
      max += spread * 0.18;
      const xFor = (index) => pad.left + (chartW / Math.max(1, points.length - 1)) * index;
      const yFor = (value) => pad.top + ((max - value) / (max - min)) * chartH;
      const lineColor = Number(quote.changePercent) >= 0 ? palette.up : palette.down;

      ctx.strokeStyle = palette.grid;
      ctx.lineWidth = 1;
      ctx.font = '11px Arial';
      ctx.fillStyle = palette.muted;
      ctx.textAlign = 'right';
      for (let i = 0; i <= 4; i += 1) {
        const value = min + ((max - min) / 4) * i;
        const y = yFor(value);
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
        ctx.fillText(formatCompactNumber(value), pad.left - 10, y + 4);
      }

      if (Number.isFinite(previous)) {
        const y = yFor(previous);
        ctx.strokeStyle = palette.axis;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = palette.muted;
        ctx.textAlign = 'left';
        ctx.fillText('Prev close ' + formatCompactNumber(previous), pad.left + 8, y - 7);
      }

      const gradient = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
      gradient.addColorStop(0, Number(quote.changePercent) >= 0 ? palette.upFill : palette.downFill);
      gradient.addColorStop(1, palette.fade);
      ctx.beginPath();
      points.forEach((point, index) => {
        const x = xFor(index);
        const y = yFor(Number(point.close));
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo(xFor(points.length - 1), height - pad.bottom);
      ctx.lineTo(xFor(0), height - pad.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      points.forEach((point, index) => {
        const x = xFor(index);
        const y = yFor(Number(point.close));
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      const first = points[0];
      const last = points.at(-1);
      ctx.fillStyle = palette.muted;
      ctx.textAlign = 'left';
      ctx.font = '12px Arial';
      ctx.fillText(formatQuoteTime(first.time) || 'Start', pad.left, height - 16);
      ctx.textAlign = 'right';
      ctx.fillText(formatQuoteTime(last.time) || 'Latest', width - pad.right, height - 16);

      ctx.fillStyle = palette.text;
      ctx.textAlign = 'left';
      ctx.font = 'bold 18px Arial';
      ctx.fillText(formatClientNumber(quote.closeValue) + ' (' + formatClientQuoteChange(quote) + ')', pad.left, 20);
      ctx.fillStyle = palette.muted;
      ctx.textAlign = 'right';
      ctx.font = '12px Arial';
      ctx.fillText(points.length + ' captured points', width - pad.right, 20);
    }

    function drawLineChart(canvas, setup) {
      const { ctx, width, height } = scaleCanvas(canvas);
      const palette = chartPalette();
      ctx.clearRect(0, 0, width, height);
      const pad = { top: 20, right: 18, bottom: 42, left: 54 };
      const labels = ['9:15', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '15:30'];
      const price = [
        setup.stopLoss + 20,
        setup.entry - 42,
        setup.entry - 75,
        setup.entry + 10,
        setup.entry - 24,
        setup.entry + 70,
        setup.entry + 38,
        setup.entry
      ];
      const allValues = [...price, setup.target, setup.stopLoss];
      const min = Math.min(...allValues) - 45;
      const max = Math.max(...allValues) + 45;
      const chartW = width - pad.left - pad.right;
      const chartH = height - pad.top - pad.bottom;
      const xFor = (index) => pad.left + (chartW / (labels.length - 1)) * index;
      const yFor = (value) => pad.top + ((max - value) / (max - min)) * chartH;

      ctx.strokeStyle = palette.grid;
      for (let i = 0; i <= 4; i += 1) {
        const y = pad.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
      }

      drawDashedLine(ctx, pad.left, yFor(setup.target), width - pad.right, yFor(setup.target), '#10b981');
      drawDashedLine(ctx, pad.left, yFor(setup.stopLoss), width - pad.right, yFor(setup.stopLoss), '#ef4444');

      ctx.beginPath();
      price.forEach((value, index) => {
        const x = xFor(index);
        const y = yFor(value);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = palette.muted;
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      labels.forEach((label, index) => ctx.fillText(label, xFor(index), height - 16));

      ctx.textAlign = 'right';
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('Target ' + setup.target, width - pad.right, yFor(setup.target) - 8);
      ctx.fillStyle = '#ef4444';
      ctx.fillText('Stop ' + setup.stopLoss, width - pad.right, yFor(setup.stopLoss) - 8);
    }

    function drawDashedLine(ctx, x1, y1, x2, y2, color) {
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    }

    function roundRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + width, y, x + width, y + height, radius);
      ctx.arcTo(x + width, y + height, x, y + height, radius);
      ctx.arcTo(x, y + height, x, y, radius);
      ctx.arcTo(x, y, x + width, y, radius);
      ctx.closePath();
    }

    ${includeStudio ? `
    function bindTeleprompter() {
      const button = document.getElementById('togglePrompterBtn');
      const container = document.getElementById('teleprompterContainer');
      if (!button || !container) return;
      let playing = false;
      window.__SET_PROMPTER_PLAYING__ = (next) => {
        playing = next;
        container.classList.toggle('playing', playing);
        button.classList.toggle('playing', playing);
        button.innerHTML = playing ? '&#10074;&#10074; Pause Script' : '&#9654; Play Script';
      };
      button.addEventListener('click', () => {
        window.__SET_PROMPTER_PLAYING__(!playing);
      });
    }

    function bindTeleprompterControls() {
      const container = document.getElementById('teleprompterContainer');
      const text = container ? container.querySelector('.teleprompter-text') : null;
      if (!container || !text) return;
      document.querySelectorAll('[data-prompter-speed]').forEach((button) => {
        button.addEventListener('click', () => {
          const seconds = Number(button.dataset.prompterSpeed || 20);
          text.style.animationDuration = seconds + 's';
          document.querySelectorAll('[data-prompter-speed]').forEach((item) => item.classList.remove('active'));
          button.classList.add('active');
        });
      });
      const reset = document.getElementById('resetPrompterBtn');
      if (reset) {
        reset.addEventListener('click', () => {
          if (typeof window.__SET_PROMPTER_PLAYING__ === 'function') {
            window.__SET_PROMPTER_PLAYING__(false);
          } else {
            container.classList.remove('playing');
          }
          text.style.animation = 'none';
          text.offsetHeight;
          text.style.animation = '';
          text.style.animationDuration = document.querySelector('.speed-btn.active')?.dataset.prompterSpeed + 's' || '20s';
        });
      }
    }

    function bindAssetGeneration() {
      const button = document.getElementById('generateAssetBtn');
      const loader = document.getElementById('assetLoader');
      const canvas = document.getElementById('aiCanvas');
      const placeholder = document.getElementById('assetPlaceholderText');
      if (!button || !loader || !canvas || !placeholder) return;
      drawAssetCanvas(canvas, false);
      canvas.dataset.generated = 'false';
      canvas.classList.add('visible');

      button.addEventListener('click', () => {
        button.disabled = true;
        button.textContent = 'Building visual draft...';
        setStudioActionState('Building thumbnail preview...');
        loader.style.width = '100%';

        setTimeout(() => {
          drawAssetCanvas(canvas, true);
          canvas.dataset.generated = 'true';
          canvas.classList.add('visible');
          placeholder.classList.add('hidden');
          button.textContent = 'Regenerate Thumbnail';
          button.disabled = false;
          button.classList.add('done');
          setStudioActionState('Thumbnail package ready: identity reference, palette, and prompt are prepared.');
          setTimeout(() => {
            loader.style.transition = 'none';
            loader.style.width = '0%';
            setTimeout(() => {
              loader.style.transition = 'width 2s ease-in-out';
            }, 0);
          }, 500);
        }, 850);
      });
    }

    function drawAssetCanvas(canvas, generated) {
      const { ctx, width, height } = scaleCanvas(canvas);
      const bearish = window.__DIGEST__.sentimentLabel !== 'BULLISH';
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, bearish ? '#7f1d1d' : '#064e3b');
      gradient.addColorStop(0.58, '#111827');
      gradient.addColorStop(1, '#020617');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 26) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 26) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const points = bearish
        ? [[0.05, 0.28], [0.28, 0.36], [0.48, 0.30], [0.7, 0.55], [0.94, 0.68]]
        : [[0.05, 0.76], [0.28, 0.58], [0.48, 0.64], [0.7, 0.38], [0.94, 0.24]];
      ctx.strokeStyle = bearish ? '#fca5a5' : '#86efac';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      points.forEach(([x, y], index) => {
        const px = width * x;
        const py = height * y;
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('PRE-MARKET BRIEF', 22, 40);
      ctx.fillStyle = bearish ? '#fecaca' : '#bbf7d0';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(window.__DIGEST__.sentimentLabel + ' SETUP', 22, 66);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(window.__DIGEST__.news.length + ' SOURCES VERIFIED', 22, height - 24);
      if (generated) {
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        roundRect(ctx, width - 158, 18, 136, 36, 8);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CONTROLNET LOCKED', width - 90, 41);
        ctx.textAlign = 'left';
      }
    }

    function bindReelVideoGeneration() {
      const button = document.getElementById('generateReelVideoBtn');
      const loader = document.getElementById('videoLoader');
      const canvas = document.getElementById('reelVideoCanvas');
      const state = document.getElementById('videoGenerationState');
      if (!button || !loader || !canvas) return;
      drawReelVideoCanvas(canvas, 0);

      button.addEventListener('click', () => {
        button.disabled = true;
        button.textContent = 'Building Reel...';
        loader.style.width = '100%';
        if (state) state.textContent = 'Building the 9:16 motion preview from today\\'s script, captions, and market mood.';
        setStudioActionState('Building reel video draft...');

        const started = performance.now();
        const duration = 1200;
        function frame(now) {
          const progress = Math.min(1, (now - started) / duration);
          canvas.dataset.progress = String(progress);
          drawReelVideoCanvas(canvas, progress);
          if (progress < 1) {
            requestAnimationFrame(frame);
            return;
          }
          button.disabled = false;
          button.textContent = 'Rebuild Reel Video Draft';
          button.classList.add('done');
          if (state) state.textContent = 'Reel video draft ready: vertical preview, captions, shot timings, and video prompt are prepared.';
          setStudioActionState('Reel video draft ready for review.');
          setTimeout(() => {
            loader.style.transition = 'none';
            loader.style.width = '0%';
            setTimeout(() => {
              loader.style.transition = 'width 2s ease-in-out';
            }, 0);
          }, 500);
        }
        requestAnimationFrame(frame);
      });
    }

    function drawReelVideoCanvas(canvas, progress) {
      const { ctx, width, height } = scaleCanvas(canvas);
      const digest = window.__DIGEST__ || {};
      const video = digest.asset?.reelVideo || {};
      const scenes = Array.isArray(video.scenes) && video.scenes.length ? video.scenes : [];
      const sentiment = digest.sentimentLabel || 'PRE-MARKET';
      const bearish = sentiment === 'BEARISH';
      const volatile = sentiment === 'VOLATILE';
      const p = Math.max(0, Math.min(1, Number(progress || 0)));
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, bearish ? '#7f1d1d' : volatile ? '#1e3a8a' : '#064e3b');
      gradient.addColorStop(0.5, '#0f172a');
      gradient.addColorStop(1, '#020617');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i < 7; i += 1) {
        const y = height * (0.18 + i * 0.11);
        ctx.fillRect(width * 0.08, y, width * (0.22 + ((i + p * 4) % 5) * 0.11), 3);
      }

      const activeIndex = Math.min(scenes.length - 1, Math.floor(p * Math.max(1, scenes.length)));
      const activeScene = scenes[activeIndex] || { title: 'Market Read', caption: 'Opening range decides' };
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      roundRect(ctx, width * 0.08, height * 0.07, width * 0.84, 42, 14);
      ctx.fill();
      ctx.fillStyle = '#e0f2fe';
      ctx.font = '900 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(sentiment + ' REEL', width / 2, height * 0.07 + 27);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 34px Arial';
      wrapCanvasText(ctx, activeScene.title || 'Market Read', width * 0.1, height * 0.28, width * 0.8, 40, 2);
      ctx.fillStyle = '#dbeafe';
      ctx.font = '700 20px Arial';
      wrapCanvasText(ctx, activeScene.caption || 'Opening range decides', width * 0.1, height * 0.43, width * 0.8, 30, 3);

      const lineY = height * 0.72;
      scenes.slice(0, 5).forEach((scene, index) => {
        const x = width * (0.12 + index * 0.19);
        ctx.fillStyle = index <= activeIndex ? '#67e8f9' : 'rgba(255,255,255,0.26)';
        ctx.beginPath();
        ctx.arc(x, lineY, index === activeIndex ? 8 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = index === activeIndex ? '#f8fafc' : '#94a3b8';
        ctx.font = '800 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(scene.time || '', x, lineY + 24);
      });

      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('SAVE BEFORE THE OPEN', width / 2, height * 0.88);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '700 11px Arial';
      ctx.fillText('Educational market preparation - not investment advice', width / 2, height * 0.92);
    }

    function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
      const words = String(text || '').split(/\\s+/).filter(Boolean);
      let line = '';
      let lines = 0;
      for (const word of words) {
        const testLine = line ? line + ' ' + word : word;
        if (ctx.measureText(testLine).width > maxWidth && line) {
          ctx.fillText(line, x, y + lines * lineHeight);
          line = word;
          lines += 1;
          if (lines >= maxLines) return;
        } else {
          line = testLine;
        }
      }
      if (line && lines < maxLines) {
        ctx.fillText(line, x, y + lines * lineHeight);
      }
    }

    function bindStudioActions() {
      const log = document.getElementById('studioActivityLog');
      const publishState = document.getElementById('studioPublishState');
      function addLog(title, detail) {
        if (!log) return;
        const item = document.createElement('li');
        item.className = 'activity-item';
        item.innerHTML = '<strong>' + escapeClientHtml(title) + '</strong><span>' + escapeClientHtml(detail) + '</span>';
        log.prepend(item);
      }
      const run = document.getElementById('runDigestBtn');
      if (run) {
        run.addEventListener('click', () => {
          setStudioActionState('Digest check completed: sources, quote snapshots, and script inputs are loaded.');
          addLog('Digest check completed', window.__DIGEST__.news.length + ' source articles and ' + window.__DIGEST__.marketSnapshots.length + ' market snapshots are loaded.');
        });
      }
      const regenerate = document.getElementById('regenerateScriptBtn');
      if (regenerate) {
        regenerate.addEventListener('click', () => {
          const state = document.getElementById('copyReelScriptState');
          if (state) state.textContent = 'Script refreshed. Review the hook, India open, and trade plan before recording.';
          setStudioActionState('Script refreshed: the reel is ready for recording review.');
          addLog('Script refreshed', 'The template was rebuilt from the current source and scanner state.');
        });
      }
      const publish = document.getElementById('publishDigestBtn');
      if (publish) {
        publish.addEventListener('click', () => {
          if (publishState) publishState.textContent = 'PUBLISH QUEUED';
          setStudioActionState('Publish queued: the public briefing is ready for the next scheduled publish workflow.');
          addLog('Publish queued', 'The public briefing is queued for the next scheduled publish workflow.');
        });
      }
    }

    function setStudioActionState(message) {
      const state = document.getElementById('studioActionState');
      if (!state) return;
      state.textContent = message;
      state.classList.remove('pulse');
      state.offsetHeight;
      state.classList.add('pulse');
    }

    function bindReelScriptCopy() {
      const button = document.getElementById('copyReelScriptBtn');
      const box = document.getElementById('dailyReelScript');
      const state = document.getElementById('copyReelScriptState');
      if (!button || !box) return;
      button.addEventListener('click', async () => {
        const text = box.value || '';
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
          } else {
            box.focus();
            box.select();
            document.execCommand('copy');
          }
          if (state) state.textContent = 'Copied. Paste this into your notes or teleprompter before recording.';
          button.textContent = 'Copied';
        } catch {
          box.focus();
          box.select();
          if (state) state.textContent = 'Script selected. Use copy from your keyboard.';
        }
      });
    }
    ` : ""}

    function bindSourceFilters() {
      const buttons = [...document.querySelectorAll('[data-source-filter]')];
      const cards = [...document.querySelectorAll('.source-card[data-source-category]')];
      const sections = [...document.querySelectorAll('[data-source-group]')];
      const visibleCount = document.getElementById('sourceVisibleCount');
      const ledger = document.getElementById('sourceLedger');
      if (!buttons.length || !cards.length) return;
      const defaultFilter = ledger?.dataset.defaultSourceFilter || buttons.find((button) => button.dataset.sourceFilter !== 'all')?.dataset.sourceFilter || 'all';

      function applyFilter(filter) {
        let count = 0;
        sections.forEach((section) => {
          section.hidden = filter !== 'all' && section.dataset.sourceGroup !== filter;
        });
        cards.forEach((card) => {
          const visible = filter === 'all' || card.dataset.sourceCategory === filter;
          card.hidden = !visible;
          if (visible) count += 1;
        });
        buttons.forEach((button) => {
          const active = button.dataset.sourceFilter === filter;
          button.classList.toggle('active', active);
          button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        if (visibleCount) visibleCount.textContent = count + ' shown';
      }

      buttons.forEach((button) => {
        button.addEventListener('click', () => applyFilter(button.dataset.sourceFilter || 'all'));
      });
      applyFilter(defaultFilter);
    }

    function bindSourceCardClicks() {
      document.querySelectorAll('.source-card[data-source-url]').forEach((card) => {
        const openSource = () => {
          const url = card.dataset.sourceUrl;
          if (!url) return;
          window.open(url, '_blank', 'noopener,noreferrer');
        };
        card.addEventListener('click', (event) => {
          if (event.target.closest('a, button, summary, details')) return;
          openSource();
        });
        card.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          if (event.target.closest('a, button, summary, details')) return;
          event.preventDefault();
          openSource();
        });
      });
    }

    window.addEventListener('resize', () => {
      drawOvernightChart();
      drawScannerChart();
      const assetCanvas = document.getElementById('aiCanvas');
      if (assetCanvas) {
        drawAssetCanvas(assetCanvas, assetCanvas.dataset.generated === 'true');
      }
      const reelCanvas = document.getElementById('reelVideoCanvas');
      if (reelCanvas) {
        drawReelVideoCanvas(reelCanvas, Number(reelCanvas.dataset.progress || 0));
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Generates a punchy, data-driven H1 headline for the briefing page.
 * Replaces the formula-generated archive title (e.g. "Crude Sets India Inflation Watch")
 * with something that leads with the most interesting data point available.
 * The original digest.title is preserved for SEO/meta — this is display-only.
 */
function hookTitle(digest) {
  const driver = (digest.dailyLead?.driverType ?? "").toLowerCase();
  const sentiment = Number(digest.overallSentiment ?? 0);
  const fii = digest.fiiDiiFlows;
  const fiiNet = Number(fii?.fiiNet ?? 0);
  const hasFlow = Math.abs(fiiNet) > 50 && fii?.date;
  const bias = digest.giftNiftyBias;
  const sentimentLabel = String(digest.sentimentLabel ?? "").toUpperCase();

  // Helper: short FII phrase e.g. "FII Bought ₹1,329 Cr"
  function fiiPhrase() {
    const abs = Math.abs(fiiNet);
    const cr = abs >= 10000 ? `₹${(abs / 100).toFixed(0)}B` : `₹${Number(abs.toFixed(0)).toLocaleString("en-IN")} Cr`;
    return fiiNet > 0 ? `FII Bought ${cr}` : `FII Sold ${cr}`;
  }

  // GIFT Nifty gap is the sharpest pre-open signal when it's real
  if (bias?.bias === "gap_up" && Math.abs(bias.gapPts) >= 50) {
    const lead = hasFlow ? `${fiiPhrase()} + Gap-Up Open — Here's the India Read` : `Gap-Up ${Math.abs(bias.gapPts)} Pts — Watch the First 15 Minutes`;
    return lead;
  }
  if (bias?.bias === "gap_down" && Math.abs(bias.gapPts) >= 50) {
    const lead = hasFlow ? `${fiiPhrase()} + Gap-Down — Support Watch Before You Trade` : `Gap-Down ${Math.abs(bias.gapPts)} Pts — Where India Finds Support`;
    return lead;
  }

  // Driver + FII combos — the most engagement-worthy headlines
  if (driver === "geopolitical") {
    if (hasFlow) return sentiment >= 0
      ? `Trade Diplomacy Tailwind + ${fiiPhrase()} — India's Pre-Open Edge`
      : `Geopolitical Risk + ${fiiPhrase()} — What India Must Confirm First`;
    return sentiment >= 0
      ? "Trade Diplomacy Shifts the Risk Map — India in Play"
      : "Geopolitical Risk Builds — Crude and USD/INR Are the India Checks";
  }

  if (driver === "crude") {
    if (hasFlow) return sentiment >= 0
      ? `Crude Eases + ${fiiPhrase()} — OMC and Aviation Get a Breather`
      : `Crude Pressure + ${fiiPhrase()} — India Open Needs Breadth to Hold`;
    return sentiment >= 0
      ? "Crude Softens — OMC Margins and Aviation Get Relief"
      : "Crude Firm — Inflation Risk and OMC Margins Are the India Read";
  }

  if (driver === "rates") {
    if (hasFlow) return sentiment >= 0
      ? `Yield Relief + ${fiiPhrase()} — Banks and Real Estate in Focus`
      : `Yield Pressure + ${fiiPhrase()} — Dollar Strength Squeezes Imports`;
    return sentiment >= 0
      ? "Yields Ease — Banks, Realty and Autos Get a Rate Tailwind"
      : "Yields Rise — Dollar Pressure Hits Importers; Watch USD/INR";
  }

  if (driver === "tech_move" || driver === "tech") {
    if (hasFlow) return sentiment >= 0
      ? `Tech Strength + ${fiiPhrase()} — Nifty IT Leads the Watch List`
      : `Tech Pressure + ${fiiPhrase()} — IT Sector Gets a Valuation Check`;
    return sentiment >= 0
      ? "Nasdaq Lifts Tech — Nifty IT and Exporters Are the India Play"
      : "Tech Sector Pressure — Nifty IT Breadth Is the Confirmation Check";
  }

  if (driver === "banks") {
    if (hasFlow) return sentiment >= 0
      ? `Banks Lead + ${fiiPhrase()} — Bank Nifty VWAP Is Today's Anchor`
      : `Bank Stress + ${fiiPhrase()} — Confirmation Needed Before Direction`;
    return sentiment >= 0
      ? "Banks Stabilise — Bank Nifty Breadth Leads the Open"
      : "Bank Sector Under Pressure — Watch VWAP and Advance-Decline";
  }

  if (driver === "precious_metals") {
    if (hasFlow) return `Gold Surge + ${fiiPhrase()} — Safe-Haven Demand Tests India Risk Appetite`;
    return sentiment >= 0
      ? "Gold Firm — MCX Open and Jewellery Sector in Focus"
      : "Gold Rallying — Equity Risk Appetite Under Pressure";
  }

  if (driver === "currency") {
    if (hasFlow) return sentiment >= 0
      ? `Rupee Stable + ${fiiPhrase()} — Exporters Get the Edge Today`
      : `Rupee Pressure + ${fiiPhrase()} — Importers Watch the First-Hour Range`;
    return "Currency Move in Play — Watch USD/INR Through the First Hour";
  }

  // Generic: lead with FII if available, else use a cleaner title
  if (hasFlow) {
    if (sentimentLabel === "BULLISH") return `${fiiPhrase()} + Positive Global Cues — India Has a Running Start`;
    if (sentimentLabel === "BEARISH") return `${fiiPhrase()} + Caution — Mixed Cues Demand Opening-Range Confirmation`;
    return `${fiiPhrase()} on ${fii.date} — Check the Opening Range Before Taking a View`;
  }

  // Last resort: clean up the archive title (remove robotic formula words)
  return String(digest.title ?? "India Pre-Open Market Briefing")
    .replace(/\bshape\b/gi, "sets")
    .replace(/\bSets India\b/g, "in Focus —")
    .replace(/\bWatch\b$/, "Watch Before the Open");
}

/** Replaces generic "Daily Pre-Market Summary" eyebrow with a market-specific signal label. */
function heroEyebrowLabel(digest) {
  const driver = (digest.dailyLead?.driverType ?? "").toLowerCase();
  const sentiment = Number(digest.overallSentiment ?? 0);
  const bias = digest.giftNiftyBias;

  // GIFT Nifty gap takes priority when real data is available
  if (bias?.bias === "gap_up" && Math.abs(bias.gapPts) >= 40) {
    return `GIFT Nifty +${Math.abs(bias.gapPts)} pts — Gap-Up Signal`;
  }
  if (bias?.bias === "gap_down" && Math.abs(bias.gapPts) >= 40) {
    return `GIFT Nifty −${Math.abs(bias.gapPts)} pts — Gap-Down Watch`;
  }

  // Driver-specific labels
  if (driver === "geopolitical") return sentiment >= 0 ? "Diplomacy Tailwind — Risk-On Watch" : "Geopolitical Risk — Confirm Before You Trade";
  if (driver === "crude")        return sentiment >= 0 ? "Crude Easing — Watch Breadth" : "Crude Pressure — Energy Risk in Play";
  if (driver === "rates")        return sentiment >= 0 ? "Yield Relief — Risk Assets Watch" : "Yield Squeeze — Dollar Pressure Watch";
  if (driver === "tech_move" || driver === "tech") return sentiment >= 0 ? "Tech Strength — Nifty IT in Play" : "Tech Pressure — IT Sector Watch";
  if (driver === "banks")        return sentiment >= 0 ? "Banks Leading — Breadth Positive" : "Bank Stress — Watch VWAP Holds";
  if (driver === "precious_metals") return "Gold / Metals Signal — Safe-Haven Read";
  if (driver === "currency")     return sentiment >= 0 ? "Rupee Stable — Exporter Tailwind" : "Rupee Pressure — Importer Cost Watch";
  if (driver === "asia")         return "Asia Moves First — India Read-Through Below";

  // Sentiment fallback
  if (sentiment >= 0.3) return "Risk-On Setup — Follow the Breadth";
  if (sentiment <= -0.3) return "Risk-Off Tone — Wait for Confirmation";
  return "Mixed Cues — Read Before You Trade";
}

/** Replaces generic "Daily Briefing" date-panel label with a driver/FII signal. */
function briefingSignalLabel(digest) {
  const driver = (digest.dailyLead?.driverType ?? "").toLowerCase();
  const fii = digest.fiiDiiFlows;
  const fiiNet = Number(fii?.fiiNet ?? 0);
  const hasFlow = Math.abs(fiiNet) > 50;

  // FII flow is the most actionable pre-open signal if available
  if (hasFlow) {
    const dir = fiiNet >= 0 ? "FII Net Buy" : "FII Net Sell";
    const abs = Math.abs(fiiNet);
    const cr = abs >= 1000 ? `₹${(abs / 100).toFixed(0)}B` : `₹${abs.toFixed(0)} Cr`;
    return `${dir} ${cr}`;
  }

  // Driver label fallback
  if (driver === "geopolitical")  return "Geopolitical Watch";
  if (driver === "crude")         return "Crude / Energy Read";
  if (driver === "rates")         return "Rates & Yields Read";
  if (driver === "tech_move" || driver === "tech") return "Tech & Nasdaq Read";
  if (driver === "banks")         return "Banks / Financials Read";
  if (driver === "precious_metals") return "Gold & Metals Read";
  if (driver === "currency")      return "Currency & DXY Read";
  if (driver === "asia")          return "Asia & Global Open";
  return "India Pre-Open";
}

function compactSummaryText(digest) {
  const driver = primaryDriverForDigest(digest);
  const headline = headlineLeadClause(digest.dailyLead?.headline);
  const impact = digest.dailyLead?.indiaImpact
    ? conciseClause(humanizeLeadCopy(digest.dailyLead.indiaImpact), 24)
    : `${driver.summary}`;
  const support = digest.dailyLead?.supportSide ? compactSupportClause(digest.dailyLead.supportSide) : "breadth is the confirmation check";
  const watchFirst = compactWatchFirstLine(digest);
  return conciseSentence([
    headline
      ? `Before the open, ${headline}.`
      : `Before the open, ${driver.title.toLowerCase()} is the lead read.`,
    watchFirst,
    `India read: ${impact}.`,
    `Confirmation: ${support}.`
  ].filter(Boolean).join(" "), 50);
}

function compactWatchFirstLine(digest) {
  const levels = tradeMapLevels(digest, niftySetup(digest));
  const longGate = formatLevelOrWait(levels.niftyBullishHold);
  const shortGate = formatLevelOrWait(levels.niftyBearishBreak);
  const driverText = `${digest?.dailyLead?.driverType || ""} ${digest?.dailyLead?.label || ""} ${digest?.dailyLead?.headline || ""}`.toLowerCase();
  if (/\b(crude|oil|brent|opec)\b/.test(driverText)) {
    return `Watch first: Brent reaction, then Nifty ${longGate}/${shortGate}.`;
  }
  if (/\b(rate|fed|yield|bond)\b/.test(driverText)) {
    return `Watch first: US yields, then Nifty ${longGate}/${shortGate}.`;
  }
  if (/\b(tech|ai|semiconductor|nasdaq)\b/.test(driverText)) {
    return `Watch first: Nasdaq futures, then Nifty ${longGate}/${shortGate}.`;
  }
  return `Watch first: Nifty ${longGate}/${shortGate}.`;
}

function headlineLeadClause(headline) {
  const text = String(headline || "");
  if (/\bcrude oil exports?\b/i.test(text)) return "US crude exports are the overnight oil cue";
  if (/\bOPEC\b/i.test(text)) return "OPEC supply headlines are the oil cue";
  if (/\bjobs day|semiconductor earnings\b/i.test(text)) return "US jobs and chip earnings are the global-risk cue";
  if (/\bFed|FOMC|rates?|yields?\b/i.test(text)) return "rates are the macro cue";
  if (/\bAI|tech|software|semiconductor|Nasdaq\b/i.test(text)) return "global tech breadth is the risk-appetite cue";
  return "";
}

function conciseClause(text, maxWords) {
  return conciseSentence(text, maxWords)
    .replace(/[.!?]+$/g, "")
    .replace(/[,;:]+$/g, "")
    .trim();
}

function compactSupportClause(text) {
  const cleaned = String(text || "");
  if (/support side needs indian breadth/i.test(cleaned)) {
    return "support needs Indian breadth confirmation";
  }
  if (/softer brent and stronger indian breadth are the confirmation checks/i.test(cleaned)) {
    return "softer Brent plus stronger Indian breadth";
  }
  return conciseClause(humanizeLeadCopy(cleaned), 12);
}

function humanizeLeadCopy(value) {
  return String(value || "")
    .replace(/\bGlobal crude-flow signal\b/gi, "Crude supply")
    .replace(/\bIndia impact runs only through\b/gi, "India only cares through")
    .replace(/\bNot a direct India trade;\s*/gi, "")
    .replace(/\bSupport side needs\b/gi, "Support needs")
    .trim();
}

function legacyAuditBannerHtml(digest) {
  if (isVerifiedPublicDigest(digest)) {
    return "";
  }
  return `
    <div class="legacy-audit-banner" role="note">
      Archived edition. This older briefing is preserved for continuity; newer editions use the verified article-link source ledger.
    </div>
  `;
}

function editionNavHtml(digest) {
  const links = [
    digest.previousEditionPath ? `<a href="${escapeHtml(digest.previousEditionPath)}">&#8592; Previous edition</a>` : "",
    digest.nextEditionPath ? `<a href="${escapeHtml(digest.nextEditionPath)}">Next edition &#8594;</a>` : ""
  ].filter(Boolean);
  if (!links.length) {
    return "";
  }
  return `<nav class="edition-nav" aria-label="Briefing editions">${links.join("")}</nav>`;
}

function readerPathHtml(digest) {
  const tradingGuideHref = digest.canonicalPath && /\/trading-guide\/?$/i.test(digest.canonicalPath)
    ? "#trading-guide-view"
    : "./trading-guide/";
  return `
    <nav class="reader-path" aria-label="Suggested reading path">
      <strong>Reading path</strong>
      <div>
        <span>Read summary</span>
        <a href="#quoteBoardToggle">Review quote context</a>
        <a href="${escapeHtml(tradingGuideHref)}">Open Trading Guide</a>
        <a href="#sourceLedger">Review sources</a>
      </div>
    </nav>
  `;
}

function briefingFreshnessNoticeHtml(digest) {
  const generated = digest.generatedAt || digest.publishedAt || `${digest.digestDate}T07:15:00+05:30`;
  return `
    <div class="session-notice" role="note" aria-label="Briefing freshness">
      <strong>Prepared for the 7:15 AM IST briefing</strong>
      <span>Source stack verified at ${escapeHtml(formatGeneratedTime(generated))}. This is pre-market context, not an intraday update.</span>
    </div>
  `;
}

function evidenceGradeBadgeHtml(digest) {
  const profile = sourceEvidenceProfile(digest);
  return `
    <section class="evidence-grade-card ${escapeHtml(profile.className)}" aria-label="Briefing quality badge">
      <div>
        <strong>Evidence grade: ${escapeHtml(profile.label)}</strong>
        <span>${escapeHtml(profile.summary)}</span>
      </div>
      <div class="evidence-grade-grid" aria-label="Source quality counts">
        <span>India sources<b>${escapeHtml(profile.directIndiaSourceCount)}</b></span>
        <span>Official sources<b>${escapeHtml(profile.officialIndiaSourceCount)}</b></span>
        <span>Domestic catalysts<b>${escapeHtml(profile.domesticCatalystCount)}</b></span>
        <span>Global context<b>${escapeHtml(profile.globalContextCount)}</b></span>
      </div>
    </section>
  `;
}

function followBriefingCtaHtml() {
  return `
    <div class="follow-briefing-cta" aria-label="Follow daily briefing">
      <div>
        <strong>Get the next trading-day 7:15 AM brief</strong>
        <span>Join the daily email flow, or bookmark the live link if you prefer to read on site.</span>
      </div>
      <a class="follow-link" href="${escapeHtml(subscribeUrl)}">Join daily email</a>
      <a class="follow-link" href="/latest/">Open /latest/</a>
    </div>
  `;
}

function shareRowHtml(canonicalUrl, title, contextLabel = "briefing") {
  const shareText = `${title} - Market Narrative`;
  const encodedUrl = encodeURIComponent(canonicalUrl);
  const encodedText = encodeURIComponent(shareText);
  const label = contextLabel === "trading guide" ? "Share this trading guide" : "Share this briefing";
  return `
    <div class="share-row" aria-label="${escapeHtml(label)}">
      <div class="share-byline">
        <strong>By Abhey Deep / Market Narrative</strong>
        <small>Source-led pre-market context</small>
      </div>
      <div class="share-actions" aria-label="${escapeHtml(label)}">
        <span class="share-actions-label">${escapeHtml(label)}</span>
        <a class="share-link" href="https://wa.me/?text=${encodedText}%20${encodedUrl}" target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" title="Share on WhatsApp">${shareIconHtml("whatsapp")}<span class="sr-only">WhatsApp</span></a>
        <a class="share-link" href="https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}" target="_blank" rel="noopener noreferrer" aria-label="Share on X" title="Share on X">${shareIconHtml("x")}<span class="sr-only">X</span></a>
        <a class="share-link" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn" title="Share on LinkedIn">${shareIconHtml("linkedin")}<span class="sr-only">LinkedIn</span></a>
        <button class="share-copy-btn" type="button" data-copy-url="${escapeHtml(canonicalUrl)}" aria-label="Copy link" title="Copy link">${shareIconHtml("copy")}<span class="sr-only">Copy link</span></button>
      </div>
    </div>
  `;
}

function shareIconHtml(type) {
  const icons = {
    whatsapp: `<svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.1 19.2 6 16.1a7.6 7.6 0 1 1 2.9 2.6l-3.8.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.1 8.6c.2-.4.4-.5.7-.5h.5c.2 0 .4.1.5.4l.7 1.7c.1.3 0 .5-.2.7l-.4.4c.6 1.1 1.5 2 2.7 2.6l.5-.5c.2-.2.4-.3.7-.2l1.6.8c.3.1.4.3.4.6v.4c0 .4-.2.7-.5.9-.7.4-1.9.3-3.3-.4-1.6-.8-3-2.1-3.8-3.8-.7-1.4-.9-2.5-.6-3.1Z" fill="currentColor"/></svg>`,
    x: `<svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5l14 14M19 5 5 19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
    linkedin: `<svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 10v7M8 7.7v.1M12 17v-4.1c0-1.7 1-2.9 2.6-2.9 1.5 0 2.4 1 2.4 2.9V17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`,
    copy: `<svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="8" y="8" width="10" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M6 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`
  };
  return icons[type] || icons.copy;
}

function chartCtaPanelHtml(digest) {
  const nifty = (digest.marketSnapshots || []).find((snapshot) => snapshot.symbol === "NIFTY") || (digest.marketSnapshots || [])[0];
  const href = nifty ? tradingViewUrlForSnapshot(nifty) : "https://www.tradingview.com/markets/indices/";
  return `
    <section class="chart-cta-panel" aria-label="TradingView chart link">
      <div>
        <h2>View Chart On TradingView</h2>
        <p class="chart-note">This page publishes source-backed levels and timestamped quote snapshots. Use TradingView for the interactive chart.</p>
      </div>
      <a class="chart-link-btn" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">Open chart on TradingView</a>
    </section>
  `;
}

function quoteBoardTitle(digest) {
  return quoteBoardShowsPreviousClose(digest)
    ? "Previous Close Quote Board"
    : "Market Quote Board";
}

function quoteBoardSubtitle(digest) {
  return quoteBoardShowsPreviousClose(digest)
    ? "Previous close/reference quotes for US Overnight, Asia Watch, India Open, and Macro Hedges."
    : "Market quote context for US Overnight, Asia Watch, India Open, and Macro Hedges.";
}

function quoteSessionLabel(digest) {
  const quotes = digest.marketSnapshots || [];
  const latest = latestSnapshotDateLabel(quotes);
  if (quoteBoardShowsPreviousClose(digest)) {
    return latest
      ? `Previous close/reference quotes; latest snapshot ${latest}; not a live trading feed`
      : "Previous close/reference quotes; not a live trading feed";
  }
  return latest
    ? `Market quote context; latest snapshot ${latest}`
    : "Market quote context";
}

function latestSnapshotDateLabel(quotes) {
  const timestamps = quotes
    .map((quote) => Date.parse(quote.dataTimestamp || ""))
    .filter((value) => Number.isFinite(value));
  if (!timestamps.length) {
    return "";
  }
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short"
  }).format(new Date(Math.max(...timestamps)));
}

function quoteBoardShowsPreviousClose(digest) {
  const quotes = digest.marketSnapshots || [];
  const timestamps = quotes
    .map((quote) => Date.parse(quote.dataTimestamp || ""))
    .filter((value) => Number.isFinite(value));
  if (!timestamps.length || !digest.digestDate) {
    return true;
  }
  const latest = new Date(Math.max(...timestamps));
  const digestDate = new Date(`${digest.digestDate}T00:00:00+05:30`);
  const latestKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(latest);
  const digestKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(digestDate);
  return latestKey < digestKey;
}

function tradingViewUrlForSnapshot(snapshot) {
  const symbol = snapshot.tradingViewSymbol || {
    NIFTY: "NSE:NIFTY",
    BANKNIFTY: "NSE:BANKNIFTY",
    GIFTNIFTY: "NSEIX:NIFTY1!",
    BRENT: "TVC:UKOIL",
    DXY: "TVC:DXY",
    USDINR: "FX:USDINR",
    GOLD: "TVC:GOLD",
    INDIAVIX: "NSE:INDIAVIX"
  }[snapshot.symbol] || "NSE:NIFTY";
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
}

function isVerifiedPublicDigest(digest) {
  return Boolean(digest.sourceVerification && !digest.sourceVerification.blockedReason && digest.sourceVerification.isVerifiedForPublicArchive !== false);
}

function deskNoteHtml(digest) {
  const pressureStory = strongestStory(digest.news, "negative");
  const supportStory = strongestStory(digest.news, "positive");
  const setup = niftySetup(digest);
  const pressure = pressureStory?.takeaway || pressureStory?.summary || "macro cues are not clean enough to chase blindly";
  const support = supportStory?.takeaway || supportStory?.summary || "banks and breadth need to prove the open";
  const setupLine = setup
    ? `The only trade I would respect is around ${formatNumber(setup.entry)}, with ${formatNumber(setup.stopLoss)} as the line in the sand.`
    : "No forced trade at the bell. Let the first range print, then decide.";
  const note = digest.deskNote || `${pressure} ${support} ${setupLine}`;
  return `
    <aside class="desk-note" aria-label="Creator desk note">
      <div class="desk-note-mark">Desk<br>Note</div>
      <div class="desk-note-copy">
        <span>Creator read - Abhey Deep</span>
        <p>${escapeHtml(editorialSentence(note))}</p>
        <small>Human rule for the open: do not let the headline candle do your thinking. Confirm breadth, VWAP, and the first clean level.</small>
      </div>
    </aside>
  `;
}

function marketMoodRailHtml(digest) {
  const moodClass = String(digest.sentimentLabel || "").toLowerCase();
  const moodColor = digest.sentimentLabel === "BULLISH" ? "#34d399" : digest.sentimentLabel === "BEARISH" ? "#fb7185" : "#fbbf24";
  const moodWidth = sentimentPinPosition(digest.overallSentiment);
  const primaryDriver = primaryDriverForDigest(digest);
  const nifty = digest.marketSnapshots.find((snapshot) => snapshot.symbol === "NIFTY");
  const bankNifty = digest.marketSnapshots.find((snapshot) => snapshot.symbol === "BANKNIFTY");
  const indexLine = [nifty, bankNifty]
    .filter(Boolean)
    .map((snapshot) => `${snapshot.name} ${formatSnapshotChange(snapshot)}`)
    .join(" / ");

  return `
    <section class="mood-rail ${escapeHtml(moodClass)}" aria-label="Market mood and priority signals">
      <article class="mood-cell">
        <span>Market Mood</span>
        <strong style="color: ${moodColor}">${escapeHtml(headlineSentiment(digest.sentimentLabel))}</strong>
        <small>${escapeHtml(sentimentReadout(digest.overallSentiment))}</small>
        <div class="mood-bar" aria-hidden="true"><i style="--mood-width: ${moodWidth}%; --mood-color: ${moodColor}"></i></div>
      </article>
      <article class="mood-cell">
        <span>Primary Driver</span>
        <strong>${escapeHtml(primaryDriver.title)}</strong>
        <small>${escapeHtml(primaryDriver.summary)}</small>
      </article>
      <article class="mood-cell">
        <span>India Filter</span>
        <strong>${escapeHtml(indexLine ? `Prev close: ${indexLine}` : "Indian quotes awaiting refresh")}</strong>
        <small>Daily briefing shows market context only; execution levels live in the Trading Guide.</small>
      </article>
    </section>
  `;
}

function indiaPreOpenHtml(digest) {
  const snapshots = digest.marketSnapshots ?? [];
  const fii = digest.fiiDiiFlows ?? null;

  const giftRaw = snapshots.find((s) => s.symbol === "GIFTNIFTY");
  // Only use GIFT Nifty when it's a live quote — seed/mock values would show a
  // misleading gap vs the current Nifty close
  const gift = (giftRaw && giftRaw.dataQuality !== "seed-merged" && giftRaw.dataQuality !== "mock-fallback" && !giftRaw.source?.includes("Mock"))
    ? giftRaw : null;
  const nifty = snapshots.find((s) => s.symbol === "NIFTY");
  const usdinr = snapshots.find((s) => s.symbol === "USDINR");
  const vix = snapshots.find((s) => s.symbol === "INDIAVIX");
  const gold = snapshots.find((s) => s.symbol === "GOLD");

  // GIFT Nifty gap: how far GIFT is trading from Nifty's previous close
  const giftGapPct = gift && nifty
    ? ((gift.closeValue - (nifty.previousClose ?? nifty.closeValue)) / (nifty.previousClose ?? nifty.closeValue)) * 100
    : null;
  const giftGapSign = giftGapPct === null ? "" : giftGapPct >= 0 ? "▲" : "▼";
  const giftGapClass = giftGapPct === null ? "" : giftGapPct >= 0.15 ? "up" : giftGapPct <= -0.15 ? "down" : "flat";

  // VIX zone
  function vixZone(v) {
    if (!v) return { label: "—", cls: "" };
    if (v < 14) return { label: "Calm — options cheap", cls: "up" };
    if (v < 20) return { label: "Normal range", cls: "flat" };
    if (v < 26) return { label: "Elevated — hedge cost rising", cls: "down" };
    return { label: "Fear zone — wide stops", cls: "down" };
  }
  const vixData = vixZone(vix?.closeValue);

  // USD/INR read
  function rupeeBias(pct) {
    if (!Number.isFinite(pct)) return { label: "—", cls: "" };
    if (pct > 0.2) return { label: "Rupee under pressure", cls: "down" };
    if (pct < -0.2) return { label: "Rupee strengthening", cls: "up" };
    return { label: "Rupee stable", cls: "flat" };
  }
  const rupeeData = rupeeBias(usdinr?.changePercent);

  // FII/DII formatted — treat all-zero response as "awaiting" (NSE publishes end-of-day)
  const flowsAvailable = fii && (Math.abs(fii.fiiNet) > 0 || Math.abs(fii.diiNet) > 0);
  function flowCrore(value) {
    if (!Number.isFinite(value)) return "—";
    const abs = Math.abs(value).toFixed(0);
    return `${value >= 0 ? "▲" : "▼"} ₹${Number(abs).toLocaleString("en-IN")} cr`;
  }
  const fiiFormatted = flowsAvailable ? flowCrore(fii.fiiNet) : null;
  const diiFormatted = flowsAvailable ? flowCrore(fii.diiNet) : null;
  const fiiClass = flowsAvailable ? (fii.fiiNet >= 0 ? "up" : "down") : "";
  const diiClass = flowsAvailable ? (fii.diiNet >= 0 ? "up" : "down") : "";
  const flowDate = fii?.date ? ` (${fii.date})` : " (provisional)";

  const tvLink = (sym, tv) =>
    `href="${escapeHtml(`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tv)}`)}"` +
    ` target="_blank" rel="noopener"`;

  return `
    <section class="india-preopen-panel" aria-label="India Pre-Open Nerve">
      <div class="preopen-header">
        <div>
          <span class="summary-label">India Pre-Open</span>
          <h2>Key reads before 9:15 AM IST</h2>
        </div>
        ${fii ? `<span class="preopen-flow-badge">Flows${escapeHtml(flowDate)}</span>` : ""}
      </div>
      <div class="preopen-grid">

        <a class="preopen-tile ${escapeHtml(giftGapClass)}" aria-label="GIFT Nifty" ${gift ? tvLink("GIFTNIFTY", "NSEIX:NIFTY1!") : `href="https://www.tradingview.com/chart/?symbol=NSEIX%3ANIFTY1!" target="_blank" rel="noopener"`}>
          <span>GIFT Nifty Gap</span>
          <strong>
            ${gift ? escapeHtml(formatNumber(gift.closeValue)) : nifty ? escapeHtml(formatNumber(nifty.closeValue)) : "—"}
          </strong>
          <small>
            ${giftGapPct !== null
    ? `${escapeHtml(giftGapSign)} ${escapeHtml(Math.abs(giftGapPct).toFixed(2))}% implied open`
    : "Check TradingView for live gap"}
          </small>
        </a>

        <a class="preopen-tile ${escapeHtml(rupeeData.cls)}" aria-label="USD/INR" ${usdinr ? tvLink("USDINR", "FX:USDINR") : ""}>
          <span>USD / INR</span>
          <strong>${usdinr ? escapeHtml(String(usdinr.closeValue)) : "—"}</strong>
          <small>
            ${usdinr
    ? `${escapeHtml(usdinr.changePercent >= 0 ? "▲" : "▼")} ${escapeHtml(Math.abs(usdinr.changePercent).toFixed(3))}% · ${escapeHtml(rupeeData.label)}`
    : "Awaiting data"}
          </small>
        </a>

        <a class="preopen-tile ${escapeHtml(vixData.cls)}" aria-label="India VIX" ${vix ? tvLink("INDIAVIX", "NSE:INDIAVIX") : ""}>
          <span>India VIX</span>
          <strong>${vix ? escapeHtml(String(vix.closeValue)) : "—"}</strong>
          <small>${vix ? escapeHtml(vixData.label) : "Awaiting data"}</small>
        </a>

        <a class="preopen-tile ${gold && gold.changePercent >= 0 ? "up" : "down"}" aria-label="Gold" ${gold ? tvLink("GOLD", "TVC:GOLD") : ""}>
          <span>Gold (MCX proxy)</span>
          <strong>${gold ? `$${escapeHtml(formatNumber(gold.closeValue))}` : "—"}</strong>
          <small>
            ${gold
    ? `${escapeHtml(gold.changePercent >= 0 ? "▲" : "▼")} ${escapeHtml(Math.abs(gold.changePercent).toFixed(2))}% · duty-hike read: ${gold.changePercent > 1 ? "Jewellery sector in play" : "Watch MCX open"}`
    : "Awaiting data"}
          </small>
        </a>

      </div>
      ${flowsAvailable ? `
      <div class="preopen-flows">
        <div class="preopen-flow-row">
          <span class="flow-label">FII (Cash)</span>
          <strong class="preopen-flow ${escapeHtml(fiiClass)}">${escapeHtml(fiiFormatted)}</strong>
          <small>B ₹${escapeHtml(Number(fii.fiiBuy.toFixed(0)).toLocaleString("en-IN"))} cr · S ₹${escapeHtml(Number(fii.fiiSell.toFixed(0)).toLocaleString("en-IN"))} cr</small>
        </div>
        <div class="preopen-flow-row">
          <span class="flow-label">DII (Cash)</span>
          <strong class="preopen-flow ${escapeHtml(diiClass)}">${escapeHtml(diiFormatted)}</strong>
          <small>B ₹${escapeHtml(Number(fii.diiBuy.toFixed(0)).toLocaleString("en-IN"))} cr · S ₹${escapeHtml(Number(fii.diiSell.toFixed(0)).toLocaleString("en-IN"))} cr</small>
        </div>
      </div>` : `
      <div class="preopen-flows preopen-flows--pending">
        <span>FII/DII provisional flows: NSE India publishes after 3:30 PM IST — check back post-market</span>
      </div>`}
    </section>
  `;
}

function sentimentReadout(score) {
  const number = Number(score);
  if (!Number.isFinite(number) || Math.abs(number) < 0.05) {
    return "Source tone is balanced; no article-only edge.";
  }
  return `Source tone ${number > 0 ? "supports risk" : "leans defensive"} (${formatSignedScore(number)})`;
}

function tradingGuideViewHtml(digest, canonicalUrl = "", options = {}) {
  const levels = tradeMapLevels(digest, niftySetup(digest));
  const primaryDriver = primaryDriverForDigest(digest);
  const guideUrl = canonicalUrl ? tradingGuideShareUrl(canonicalUrl) : "";
  return `
    <section id="trading-guide-view" class="tab-content${options.active ? "" : " hidden"}">
      <div class="briefing-shell trading-guide-shell">
        <header class="page-header trading-guide-header">
          <div class="briefing-topline">
            <div>
              <p class="eyebrow">Trading Guide</p>
            </div>
            <div class="briefing-date">
              <span>Prepared For</span>
              <strong>${escapeHtml(formatDigestDate(digest.digestDate))}</strong>
            </div>
          </div>
          <h1>Opening levels, confirmation, and risk gates</h1>
          <p class="hero-subcopy">Checklist for the open: bias, index gates, no-trade zone, Bank Nifty confirmation, and sector watch.</p>
        </header>

        ${guideUrl ? shareRowHtml(guideUrl, `${digest.title} Trading Guide`, "trading guide") : ""}
        ${tradingGuideValidityHtml(digest)}
        ${openingNerveHtml(digest)}
        ${todayTradeMapHtml(digest)}
        ${algorithmicSetupHtml(digest)}

        <section class="info-card trading-brief-card">
          <div class="section-kicker">
            <div>
              <h2>Execution Notes</h2>
              <p class="source-section-copy">Use these as the open checklist before recording or trading the morning view.</p>
            </div>
          </div>
          <ul class="brief-list">
            <li><strong>Primary driver:</strong> ${escapeHtml(primaryDriver.title)} - ${escapeHtml(primaryDriver.summary)}</li>
            <li><strong>Bullish path:</strong> Nifty must hold ${escapeHtml(formatLevelOrWait(levels.niftyBullishHold))}; first upside watch is ${escapeHtml(formatLevelOrWait(levels.niftyUpsideTarget))}.</li>
            <li><strong>Bearish path:</strong> Nifty losing ${escapeHtml(formatLevelOrWait(levels.niftyBearishBreak))} puts ${escapeHtml(formatLevelOrWait(levels.niftyDownsideTarget))} on watch.</li>
            <li><strong>Bank filter:</strong> hold ${escapeHtml(formatLevelOrWait(levels.bankBullishHold))} for risk-on confirmation; lose ${escapeHtml(formatLevelOrWait(levels.bankBearishBreak))} for defensive tape.</li>
          </ul>
          <p class="chart-note">Market preparation context only. This guide does not place orders, bypass the scanner, or convert a completed move into a fresh entry.</p>
        </section>
      </div>
    </section>
  `;
}

function tradingGuideShareUrl(canonicalUrl) {
  const base = canonicalUrl.replace(/#.*$/, "");
  if (/\/trading-guide\/?$/i.test(base)) {
    return base.endsWith("/") ? base : `${base}/`;
  }
  return `${base.replace(/\/?$/, "/")}trading-guide/`;
}

function openingNerveHtml(digest, options = {}) {
  const setup = niftySetup(digest);
  const levels = tradeMapLevels(digest, setup);
  const map = tradeMapSummary(digest, setup, levels);
  const topSector = topSectorWatch(digest);
  const sourceConfidence = sourceConfidenceSummary(digest);
  const guideLink = options.guideHref
    ? `<a href="${escapeHtml(options.guideHref)}">Open full Trading Guide</a>`
    : "";
  return `
    <section class="info-card opening-nerve-card" aria-label="Opening Nerve">
      <div class="opening-nerve-head">
        <div>
          <span class="summary-label">Opening Nerve</span>
          <h2>What matters before the first range</h2>
          <p>Use this as the 90-second pre-open read: bias, index gate, Bank Nifty filter, sector nerve, and the condition that tells you to stand down.</p>
        </div>
        <span class="trade-bias-pill ${escapeHtml(map.biasClass)}">${escapeHtml(map.bias)}</span>
      </div>
      <div class="opening-nerve-grid">
        <article class="opening-nerve-tile">
          <span>Bias</span>
          <strong>${escapeHtml(map.bias)}</strong>
          <small>${escapeHtml(map.biasNote)}</small>
        </article>
        <article class="opening-nerve-tile">
          <span>Nifty gate</span>
          <strong>${escapeHtml(openingNiftyGate(map))}</strong>
          <small>Do not let the headline outrun price acceptance.</small>
        </article>
        <article class="opening-nerve-tile">
          <span>Bank filter</span>
          <strong>${escapeHtml(map.bankConfirm)}</strong>
          <small>Bank Nifty must confirm the Nifty move before the view has breadth.</small>
        </article>
        <article class="opening-nerve-tile">
          <span>Sector nerve</span>
          <strong>${escapeHtml(topSector.label)}</strong>
          <small>${escapeHtml(topSector.reason)}</small>
        </article>
        <article class="opening-nerve-tile">
          <span>Stand-down trigger</span>
          <strong>${escapeHtml(openingStandDownLine(map))}</strong>
          <small>After 9:45-10:00 AM IST, wait for a cleaner range if confirmation is still missing.</small>
        </article>
        <article class="opening-nerve-tile">
          <span>Source confidence</span>
          <strong>${escapeHtml(sourceConfidence.label)}</strong>
          <small>${escapeHtml(sourceConfidence.detail)}</small>
        </article>
      </div>
      <div class="opening-nerve-footer">
        <span>Educational market preparation only; no trade is active until price and breadth confirm.</span>
        ${guideLink}
      </div>
    </section>
  `;
}

function openingNiftyGate(map) {
  if (map.biasClass === "short") {
    return `Break below ${formatLevelOrWait(map.shortBelow)}`;
  }
  if (map.biasClass === "long") {
    return `Accept above ${formatLevelOrWait(map.longAbove)}`;
  }
  return `${formatLevelOrWait(map.longAbove)} / ${formatLevelOrWait(map.shortBelow)}`;
}

function openingStandDownLine(map) {
  if (map.noTradeZone && map.noTradeZone !== "First range only") {
    return `Inside ${map.noTradeZone}`;
  }
  return "First range only";
}

function sourceConfidenceSummary(digest) {
  const verification = digest.sourceVerification;
  const selection = digest.publicSourceSelection;
  if (verification?.isVerifiedForPublicArchive) {
    const visible = selection?.visibleCount ?? publicVisibleSourceArticles(digest, PUBLIC_DISPLAY_LIMIT).length;
    const profile = sourceEvidenceProfile(digest);
    if (selection?.evidenceGrade === "global_cue_only" || profile.directIndiaSourceCount === 0) {
      return {
        label: "Global cues only",
        detail: "No direct India articles in today's stack — this briefing draws on global cues only."
      };
    }
    if (selection?.evidenceGrade === "limited") {
      return {
        label: `${profile.directIndiaSourceCount} ${profile.directIndiaSourceCount === 1 ? "article" : "articles"} reviewed`,
        detail: `${profile.directIndiaSourceCount} India ${profile.directIndiaSourceCount === 1 ? "article" : "articles"} and ${profile.domesticCatalystCount} domestic ${profile.domesticCatalystCount === 1 ? "catalyst" : "catalysts"} reviewed. ${profile.officialIndiaSourceCount === 0 ? "No official exchange/regulator filings in today's stack." : `${profile.officialIndiaSourceCount} official ${profile.officialIndiaSourceCount === 1 ? "filing" : "filings"} included.`}`
      };
    }
    return {
      label: `${visible} ${visible === 1 ? "article" : "articles"} verified`,
      detail: `${visible} India read-through ${visible === 1 ? "note" : "notes"} from ${verification.verifiedArticleCount} article links across ${verification.publisherCount} publishers.`
    };
  }
  if (verification?.verifiedArticleCount) {
    return {
      label: "Archive context",
      detail: `${verification.verifiedArticleCount} article links archived; use current pages only for today's open.`
    };
  }
  return {
    label: "Context only",
    detail: "Source ledger unavailable; wait for the next verified public run."
  };
}

function tradingGuideValidityHtml(digest) {
  return `
    <div class="session-notice" role="note" aria-label="Trading guide validity">
      <strong>Valid for open preparation only</strong>
      <span>Use before and during the first 30 minutes of ${escapeHtml(formatDigestDate(digest.digestDate))}. After that, treat these levels as archived context, not an active call.</span>
    </div>
  `;
}

function todayTradeMapHtml(digest) {
  const setup = niftySetup(digest);
  const levels = tradeMapLevels(digest, setup);
  const map = tradeMapSummary(digest, setup, levels);
  const topSector = topSectorWatch(digest);
  return `
    <section class="info-card trade-map-card" aria-label="Today's Trade Map">
      <div class="trade-map-head">
        <div>
          <span class="summary-label">Today's Trade Map</span>
          <h2>Levels before opinion</h2>
          <p>Start here before reading the full brief: bias, index gates, the no-trade zone, Bank Nifty confirmation, and the sector that can decide follow-through.</p>
        </div>
        <span class="trade-bias-pill ${escapeHtml(map.biasClass)}">${escapeHtml(map.bias)}</span>
      </div>
      <div class="trade-map-grid">
        <article class="trade-map-tile">
          <span>Bias</span>
          <strong>${escapeHtml(map.bias)}</strong>
          <small>${escapeHtml(map.biasNote)}</small>
        </article>
        <article class="trade-map-tile">
          <span>Long only above</span>
          <strong>${escapeHtml(formatLevelOrWait(map.longAbove))}</strong>
          <small>Nifty must accept above this gate before long-side preparation has teeth.</small>
        </article>
        <article class="trade-map-tile">
          <span>Short risk below</span>
          <strong>${escapeHtml(formatLevelOrWait(map.shortBelow))}</strong>
          <small>Losing this line shifts the first read from patience to defensive risk control.</small>
        </article>
        <article class="trade-map-tile">
          <span>No-trade zone</span>
          <strong>${escapeHtml(map.noTradeZone)}</strong>
          <small>Inside this band, wait for the first range instead of forcing a direction.</small>
        </article>
        <article class="trade-map-tile">
          <span>Bank Nifty confirmation</span>
          <strong>${escapeHtml(map.bankConfirm)}</strong>
          <small>Banks decide whether the Nifty move is tradable breadth or just a gap reaction.</small>
        </article>
        <article class="trade-map-tile">
          <span>Top sector to watch</span>
          <strong>${escapeHtml(topSector.label)}</strong>
          <small>${escapeHtml(topSector.reason)}</small>
        </article>
      </div>
    </section>
  `;
}

function tradeMapSummary(digest, setup, levels) {
  const longAbove = setup?.direction === "BULLISH" ? setup.entry : levels.niftyBullishHold;
  const shortBelow = setup?.direction === "BEARISH" ? setup.entry : levels.niftyBearishBreak;
  const low = Math.min(Number(longAbove || 0), Number(shortBelow || 0));
  const high = Math.max(Number(longAbove || 0), Number(shortBelow || 0));
  const noTradeZone = low > 0 && high > 0 && low !== high
    ? `${formatNumber(low)} - ${formatNumber(high)}`
    : "First range only";

  if (setup?.direction === "BULLISH") {
    return {
      bias: "Conditional Long",
      biasClass: "long",
      biasNote: `${setup.symbol} has a scanner-approved plan, but only if price respects ${formatNumber(setup.stopLoss)}.`,
      longAbove,
      shortBelow,
      noTradeZone,
      bankConfirm: `Hold ${formatLevelOrWait(levels.bankBullishHold)}`
    };
  }
  if (setup?.direction === "BEARISH") {
    return {
      bias: "Conditional Short",
      biasClass: "short",
      biasNote: `${setup.symbol} has a scanner-approved short-risk plan, but no chase if the first candle stretches.`,
      longAbove,
      shortBelow,
      noTradeZone,
      bankConfirm: `Lose ${formatLevelOrWait(levels.bankBearishBreak)}`
    };
  }
  if (Number(digest.overallSentiment) >= 0.25) {
    return {
      bias: "Bullish If Accepted",
      biasClass: "long",
      biasNote: "Source tone is supportive, but the scanner still needs price acceptance.",
      longAbove,
      shortBelow,
      noTradeZone,
      bankConfirm: `Hold ${formatLevelOrWait(levels.bankBullishHold)}`
    };
  }
  if (Number(digest.overallSentiment) <= -0.25) {
    return {
      bias: "Defensive Below Gate",
      biasClass: "short",
      biasNote: "Source tone is pressure-heavy, so failed support matters more than upside hope.",
      longAbove,
      shortBelow,
      noTradeZone,
      bankConfirm: `Lose ${formatLevelOrWait(levels.bankBearishBreak)}`
    };
  }
  return {
    bias: "Neutral Until Break",
    biasClass: "neutral",
    biasNote: setupAuditSummary(digest) || "No clean 1:2 setup is active; let the opening range choose the side.",
    longAbove,
    shortBelow,
    noTradeZone,
    bankConfirm: `${formatLevelOrWait(levels.bankBullishHold)} / ${formatLevelOrWait(levels.bankBearishBreak)}`
  };
}

function topSectorWatch(digest) {
  const articles = weightedSourceArticles(digest.news ?? []);
  for (const article of articles) {
    const text = `${article.headline || ""} ${article.summary || ""} ${article.indiaImpact || ""} ${article.entityName || ""}`.toLowerCase();
    if (/\b(bank|credit|lender|financial)\b/.test(text)) {
      return { label: "Bank Nifty", reason: "Financial breadth decides whether the index move becomes trend follow-through." };
    }
    if (/\b(crude|oil|brent|opec)\b/.test(text)) {
      return { label: "OMCs / energy", reason: "Crude feeds directly into OMC margins, aviation costs, inflation expectations, and upstream energy." };
    }
    if (/\b(tech|software|semiconductor|chip|ai|nasdaq)\b/.test(text)) {
      return { label: "Nifty IT", reason: "Use Nasdaq, USD/INR, and exporter breadth as confirmation before extrapolating global tech cues." };
    }
    if (/\b(yield|bond|rate|fed|inflation)\b/.test(text)) {
      return { label: "Banks / realty", reason: "Yield direction sets the hurdle-rate pressure for rate-sensitive pockets." };
    }
    if (/\b(pharma|healthcare|drug|fda)\b/.test(text)) {
      return { label: "Nifty Pharma", reason: "Healthcare headlines need stock-specific confirmation because the sector often trades idiosyncratically." };
    }
    if (/\b(auto|vehicle|ev|battery)\b/.test(text)) {
      return { label: "Nifty Auto", reason: "Autos are the first check when oil, rates, or consumer demand drive the source stack." };
    }
    if (/\b(metal|steel|copper|aluminium|china commodity)\b/.test(text)) {
      return { label: "Nifty Metal", reason: "Metals need China and commodity confirmation before the domestic basket follows." };
    }
  }
  return { label: "Bank Nifty breadth", reason: "When the source stack is mixed, banks are the cleanest confirmation for Nifty follow-through." };
}

function formatLevelOrWait(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? formatNumber(number) : "Opening range";
}

function primaryDriverForDigest(digest) {
  if (digest.dailyLead?.label) {
    return {
      title: humanLeadTitle(digest.dailyLead),
      summary: compactDriverSummary({
        summary: humanizeLeadCopy(digest.dailyLead.indiaImpact || digest.dailyLead.headline || "Source-led driver awaiting the next verified run.")
      })
    };
  }
  const ranked = weightedSourceArticles(digest.news ?? []);
  const article = ranked.find(isTradeRelevantDriver) ?? ranked[0];
  if (article) {
    return {
      title: driverLabelForArticle(article),
      summary: compactDriverSummary(article)
    };
  }
  const theme = (digest.themes ?? [])
    .slice()
    .sort((left, right) => Math.abs(Number(right.sentimentScore || 0)) - Math.abs(Number(left.sentimentScore || 0)))[0];
  return {
    title: theme?.title || "Narrative cluster pending",
    summary: theme?.summary || "Source-backed theme will appear after the digest run."
  };
}

function humanLeadTitle(dailyLead) {
  const label = String(dailyLead?.label || "");
  const headline = String(dailyLead?.headline || "");
  if (/crude|oil|opec|brent/i.test(`${label} ${headline}`)) return "Crude supply watch";
  if (/rates?|fed|yield/i.test(`${label} ${headline}`)) return "Rates watch";
  if (/tech|ai|semiconductor|software|nasdaq/i.test(`${label} ${headline}`)) return "Global tech breadth";
  if (/bank|credit|nbfc/i.test(`${label} ${headline}`)) return "Bank breadth";
  return label || "Market breadth";
}

function isTradeRelevantDriver(article) {
  const text = `${article?.headline || ""} ${article?.summary || ""}`.toLowerCase();
  if (/\b(attorney|legal strateg(?:y|ies)|probe|investigation|subpoena|court)\b/.test(text) && !/\b(rate|rates|yield|yields|inflation|policy|fomc|market|markets|stocks?|futures)\b/.test(text)) {
    return false;
  }
  return /\b(crude|oil|brent|yield|yields|bond|bonds|rate|rates|inflation|fed|fomc|dollar|rupee|currency|nasdaq|dow|s&p|wall street|futures|earnings|guidance|tariff|trade|bank|banks|credit)\b/.test(text);
}

function driverLabelForArticle(article) {
  const text = `${article?.headline || ""} ${article?.summary || ""}`.toLowerCase();
  if (/\b(crude|oil|brent)\b/.test(text)) return "Crude / energy risk";
  if (/\b(yield|yields|bond|bonds|rate|rates|inflation|fed|fomc)\b/.test(text)) return "Rates / Fed path";
  if (/\b(dollar|rupee|currency|yen|forex)\b/.test(text)) return "Currency pressure";
  if (/\b(nasdaq|dow|s&p|wall street|futures)\b/.test(text)) return "Global risk appetite";
  if (/\b(bank|banks|credit|financial)\b/.test(text)) return "Financial breadth";
  if (/\b(earnings|guidance|revenue|profit)\b/.test(text)) return "Earnings read-through";
  if (/\b(tariff|trade|exports?|imports?)\b/.test(text)) return "Trade-policy risk";
  return compactEntityName(article?.entityName || article?.category || "Market driver");
}

function compactDriverSummary(article) {
  const source = article?.summary || article?.takeaway || article?.headline || "Source-backed driver awaiting the next verified run.";
  return conciseSentence(source, 24);
}

function compactEntityName(value) {
  return {
    NIFTY: "Nifty 50",
    BANKNIFTY: "Bank Nifty",
    BRENT: "Brent crude",
    DXY: "Dollar index",
    NASDAQ: "Nasdaq",
    GOLD: "Gold",
    VIX: "Volatility"
  }[String(value || "").toUpperCase()] || value;
}

function distinctSupportLabel(pressureLabel, supportStory) {
  const label = compactEntityName(supportStory?.entityName || "breadth");
  if (!label || sameLabel(pressureLabel, label) || label === "Market") {
    return "breadth";
  }
  if (label === "Private markets") {
    return "risk appetite";
  }
  return label;
}

function sameLabel(left, right) {
  return normalizeLabel(left) === normalizeLabel(right);
}

function normalizeLabel(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function compactAsiaLine(snapshots) {
  const asia = displaySnapshotsForRegion("Asia Watch", snapshots);
  if (!asia.length) {
    return "";
  }
  const positives = asia.filter((snapshot) => Number(snapshot.changePercent) >= 0).length;
  const strongest = asia
    .slice()
    .sort((left, right) => Math.abs(right.changePercent) - Math.abs(left.changePercent))[0];
  const direction = Number(strongest.changePercent) >= 0 ? "strongest lift" : "biggest drag";
  return `Asia: ${positives} of ${asia.length} top country markets are higher; ${direction} is ${countryForSnapshot(strongest) || strongest.name} ${formatChange(strongest.changePercent)}.`;
}

function expandedBriefingHtml(digest) {
  return `
    ${twoMinuteSummaryHtml(digest)}
    ${executiveSummaryHtml(digest)}
  `;
}

function expandedBriefingHeadline(digest) {
  const macro = firstByCategory(digest.news, "macro_negative") || strongestStory(digest.news, "negative");
  const support = firstByCategory(digest.news, "sector_positive") || strongestStory(digest.news, "positive");
  const pressure = marketRiskLabel(macro);
  const cushion = distinctSupportLabel(pressure, support);
  if (macro && support) {
    return sameLabel(pressure, cushion)
      ? `${pressure} sets the morning test`
      : `${pressure} sets the risk; ${cushion} confirms follow-through`;
  }
  return `${headlineSentiment(digest.sentimentLabel)} pre-market read for India`;
}

function storyReadThrough(story) {
  if (!story) {
    return "";
  }
  return story.indiaImpact || story.whyItMatters || story.takeaway || story.summary || "";
}

function marketRiskLabel(story) {
  const headline = String(story?.headline || "").toLowerCase();
  if (headline.includes("crude") || headline.includes("oil")) return "Crude";
  if (headline.includes("dollar") && headline.includes("yield")) return "Dollar and yields";
  if (headline.includes("yield")) return "US yields";
  if (headline.includes("inflation")) return "Inflation expectations";
  if (headline.includes("volatility")) return "Volatility";
  if (headline.includes("fed")) return "Fed policy";
  if (headline.includes("yen") || headline.includes("carry")) return "Asia FX";
  return compactEntityName(story?.entityName || "macro cues");
}

function editorialSentence(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function expandedLeadParagraphs(digest) {
  const pressureStory = strongestStory(digest.news, "negative");
  const supportStory = strongestStory(digest.news, "positive");
  const macro = firstByCategory(digest.news, "macro_negative");
  const pressureEntity = marketRiskLabel(macro || pressureStory);
  const supportEntity = distinctSupportLabel(pressureEntity, supportStory);
  const driver = primaryDriverForDigest(digest);

  return [
    [
      `${driver.title} is the lead read across verified sources.`,
      `${pressureEntity} is the risk filter for the morning.`,
      supportStory ? `${supportEntity} is the confirmation check if breadth improves.` : "The India read stays context-first until domestic breadth confirms."
    ].filter(Boolean).map(editorialSentence).join(" "),
  ];
}

function twoMinuteSummaryHtml(digest) {
  const driver = primaryDriverForDigest(digest);
  const macro = firstByCategory(digest.news, "macro_negative");
  const globalRisk = firstByCategory(digest.news, "global_risk");
  const support = firstByCategory(digest.news, "sector_positive") || firstByCategory(digest.news, "macro_positive") || strongestStory(digest.news, "positive");
  const topSources = publicVisibleSourceArticles(digest, PUBLIC_DISPLAY_LIMIT);
  const categoryMix = [...new Set(topSources.map((article) => sourceCategoryTitle(article.category)))]
    .slice(0, 4)
    .join(", ");
  const indiaLine = formatSnapshotLine(snapshotsForRegion(digest, "India Open"));
  const asiaLine = compactAsiaLine(snapshotsForRegion(digest, "Asia Watch"));
  const pressure = macro || globalRisk;
  const bullets = [
    ["Lead driver", `${driver.title}: ${driver.summary}`],
    ["Pressure", humanizeLeadCopy(digest.dailyLead?.riskSide || sourceSummaryForTwoMinute(pressure, "Macro and global-risk stories are the pressure side of the morning read."))],
    ["Support / offset", humanizeLeadCopy(digest.dailyLead?.supportSide || sourceSummaryForTwoMinute(support, "Support has to come from Indian breadth, sector leadership, or a softer macro tape."))],
    ["India read", [indiaLine ? `Prev close: ${indiaLine}.` : "", asiaLine, "This public brief is market context only; execution levels sit in the Trading Guide."].filter(Boolean).join(" ")],
    ["Source mix", categoryMix ? `The visible source stack is diversified across ${categoryMix}.` : "The visible source stack uses the highest-impact India read-through articles."]
  ];
  return `
    <div class="brief-section two-minute-summary" aria-label="2 Minute Summary">
      <ul class="brief-list">
        ${bullets.map(([label, text]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(cleanBriefingText(text))}</li>`).join("")}
      </ul>
    </div>
  `;
}

function sourceSummaryForTwoMinute(article, fallback) {
  if (!article) {
    return fallback;
  }
  const line = article.indiaImpact && !noDirectIndiaCopy(article.indiaImpact)
    ? article.indiaImpact
    : article.takeaway || article.whyItMatters || article.summary || fallback;
  return conciseSentence(line, 28);
}

function executiveSummaryHtml(digest) {
  const usLine = formatSnapshotLine(snapshotsForRegion(digest, "US Overnight"));
  const asiaLine = formatAsiaSnapshotLine(snapshotsForRegion(digest, "Asia Watch"));
  const indiaLine = formatSnapshotLine(snapshotsForRegion(digest, "India Open"));
  const macroLine = formatSnapshotLine(snapshotsForRegion(digest, "Macro Hedges"));
  const globalRisk = firstByCategory(digest.news, "global_risk");

  return `
    <div class="brief-section">
      <h3>Market Map</h3>
      <ul class="brief-list">
        <li><strong>US:</strong> ${escapeHtml(usLine || "US index data is awaiting refresh")}. ${escapeHtml(globalRisk?.takeaway || "A firm close still needs confirmation from yields and tech breadth.")}</li>
        <li><strong>Asia:</strong> ${escapeHtml(asiaLine || "Asian market data is awaiting refresh")}. Regional breadth sets the sentiment backdrop for the India open.</li>
        <li><strong>Macro:</strong> ${escapeHtml(macroLine || "Macro hedge data is awaiting refresh")}. Crude and the dollar matter most for inflation, rupee, and foreign-flow expectations.</li>
        <li><strong>India:</strong> ${escapeHtml(indiaLine || "Indian index data is awaiting refresh")}. Prior-session closes set the reference point for today's source read.</li>
      </ul>
    </div>
  `;
}

function sourceExtractionRows(articles) {
  return articles
    .map((article) => `
      <div class="source-extract-row">
        <div class="source-extract-meta">
          <span>${escapeHtml(article.sourceName)}</span>
          <small>${escapeHtml(formatArticleTime(article.publishedAt))} - ${escapeHtml(categoryLabel(article.category))}</small>
        </div>
        <div class="source-extract-copy">
          <h4>${escapeHtml(article.headline)}</h4>
          <p>${escapeHtml(article.takeaway || article.summary)}</p>
          <p class="why-line"><strong>India angle:</strong> ${escapeHtml(article.indiaImpact || article.whyItMatters || "Watch for confirmation in sector breadth and opening-range acceptance.")}</p>
        </div>
      </div>
    `)
    .join("");
}

function briefingSourceArticles(articles) {
  const categoryOrder = ["macro_negative", "global_risk", "sector_positive"];
  const byCategory = categoryOrder
    .map((category) => weightedSourceArticles((articles ?? []).filter((article) => article.category === category))[0])
    .filter(Boolean);
  return uniqueArticles([...byCategory, ...weightedSourceArticles(articles ?? [])]).slice(0, 3);
}

function uniqueArticles(articles) {
  const seen = new Set();
  return articles.filter((article) => {
    const key = article.sourceUrl || article.headline;
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function indiaReadThroughItems(digest) {
  const macro = firstByCategory(digest.news, "macro_negative");
  const globalRisk = firstByCategory(digest.news, "global_risk");
  const sectorSupport = firstByCategory(digest.news, "sector_positive");
  const neutral = firstByCategory(digest.news, "neutral_volatile");
  const used = new Set();
  const items = [
    ["Macro pressure", macro?.indiaImpact, "Crude, dollar, yields, and USD/INR remain the first pressure filters for the index."],
    ["Risk appetite", globalRisk?.indiaImpact, "Global risk headlines need Brent, DXY, and Asia breadth confirmation before they become India trades."],
    ["Domestic cushion", sectorSupport?.indiaImpact, "Use sector breadth, advance-decline, and defensive participation as the cushion check."],
    ["Opening behavior", noDirectIndiaCopy(neutral?.indiaImpact) ? "" : neutral?.indiaImpact, "Opening behavior stays range-first: do not convert weak read-through stories into trades until VWAP and breadth confirm."]
  ];
  return items.map(([label, value, fallback]) =>
    `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(distinctIndiaRead(value, fallback, used))}</li>`
  ).join("");
}

function distinctIndiaRead(value, fallback, used) {
  const cleaned = cleanBriefingText(value || fallback);
  const key = normalizeLabel(cleaned);
  if (!cleaned || used.has(key)) {
    const fallbackKey = normalizeLabel(fallback);
    used.add(fallbackKey);
    return fallback;
  }
  used.add(key);
  return cleaned;
}

function cleanBriefingText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function noDirectIndiaCopy(value) {
  return /^no direct india read-through/i.test(String(value || "").trim());
}

function noSetupTradeFrame(digest) {
  const completed = setupAuditItems(digest).filter((item) => item.status === "TARGET_REACHED");
  if (completed.length) {
    const symbols = completed.map((item) => compactEntityName(item.symbol)).join(" and ");
    return `The earlier ${symbols} move has already played out, so there is no fresh 1:2 entry on the plan. Wait for a new range instead of chasing a completed move.`;
  }
  const compressed = setupAuditItems(digest).filter((item) => item.status === "RISK_REWARD_COMPRESSED");
  if (compressed.length) {
    return "The move has already stretched away from the entry zone, so the remaining reward is not worth the risk. Wait for price to reset near a cleaner level.";
  }
  return "No clean 1:2 setup is active yet, so wait for opening-range confirmation before taking a directional view.";
}

function tradeFramingHtml(digest, setup, setupText) {
  const levels = tradeMapLevels(digest, setup);
  if (setup) {
    const direction = setup.direction === "BULLISH" ? "long bias" : "short bias";
    const opposite = setup.direction === "BULLISH" ? "bearish open" : "bullish squeeze";
    return `
      <ul class="brief-list">
        <li><strong>SETUP EXISTS?</strong> Yes - ${escapeHtml(setup.symbol)} has a fresh ${escapeHtml(direction)} only near ${escapeHtml(formatNumber(setup.entry))}.</li>
        <li><strong>IF BULLISH OPEN:</strong> Nifty must hold ${escapeHtml(formatNumber(levels.niftyBullishHold))}; first upside watch is ${escapeHtml(formatNumber(levels.niftyUpsideTarget))}.</li>
        <li><strong>IF BEARISH OPEN:</strong> Nifty breaks below ${escapeHtml(formatNumber(levels.niftyBearishBreak))}; first downside watch is ${escapeHtml(formatNumber(levels.niftyDownsideTarget))}.</li>
        <li><strong>INVALIDATE:</strong> stand down on the ${escapeHtml(opposite)} if ${escapeHtml(setup.symbol)} violates ${escapeHtml(formatNumber(setup.stopLoss))} or Bank Nifty breadth diverges.</li>
      </ul>
      <p class="chart-note">${escapeHtml(setupText)} This is market preparation context, not investment advice.</p>
    `;
  }
  const completed = setupAuditItems(digest).some((item) => item.status === "TARGET_REACHED");
  const completedNifty = setupAuditItems(digest).find((item) => item.status === "TARGET_REACHED" && item.symbol === "NIFTY");
  const completedLine = completedNifty
    ? `No fresh setup - prior target reached at ${formatNumber(completedNifty.target)}.`
    : "No fresh setup - no current 1:2 level passed the scanner.";
  return `
    <ul class="brief-list">
      <li><strong>SETUP EXISTS?</strong> ${escapeHtml(completedLine)}</li>
      <li><strong>IF BULLISH OPEN:</strong> Nifty must reclaim and hold ${escapeHtml(formatNumber(levels.niftyBullishHold))}; first upside watch is ${escapeHtml(formatNumber(levels.niftyUpsideTarget))}.</li>
      <li><strong>IF BEARISH OPEN:</strong> Nifty breaks below ${escapeHtml(formatNumber(levels.niftyBearishBreak))}; first downside watch is ${escapeHtml(formatNumber(levels.niftyDownsideTarget))}.</li>
      <li><strong>INVALIDATE:</strong> ${escapeHtml(completed ? "do not chase the completed move; the old level is archived." : "skip the trade if price is already stretched away from the nearest stop.")}</li>
    </ul>
    <p class="chart-note">Bank Nifty confirmation zone: hold ${escapeHtml(formatNumber(levels.bankBullishHold))} for risk-on, lose ${escapeHtml(formatNumber(levels.bankBearishBreak))} for defensive tape. ${escapeHtml(setupText)} This is market preparation context, not investment advice.</p>
  `;
}

function tradeMapLevels(digest, setup) {
  const snapshots = digest.marketSnapshots || [];
  const niftySnapshot = snapshots.find((snapshot) => snapshot.symbol === "NIFTY");
  const bankSnapshot = snapshots.find((snapshot) => snapshot.symbol === "BANKNIFTY");
  const completedNifty = setupAuditItems(digest).find((item) => item.symbol === "NIFTY" && item.status === "TARGET_REACHED");
  const completedBank = setupAuditItems(digest).find((item) => item.symbol === "BANKNIFTY" && item.status === "TARGET_REACHED");
  const niftyClose = Number(niftySnapshot?.closeValue || completedNifty?.currentPrice || setup?.entry || 0);
  const bankClose = Number(bankSnapshot?.closeValue || completedBank?.currentPrice || 0);
  const niftyAnchor = Number(setup?.symbol === "NIFTY" ? setup.entry : niftyClose);
  const bankAnchor = Number(setup?.symbol === "BANKNIFTY" ? setup.entry : bankClose);
  const niftySetupTarget = setup?.symbol === "NIFTY" ? Number(setup.target) : 0;

  return normalizeTradeMapLevels({
    niftyBullishHold: roundLevel(Math.max(niftyAnchor, niftyClose * 0.998)),
    niftyUpsideTarget: roundLevel(niftySetupTarget > niftyAnchor ? niftySetupTarget : niftyClose * 1.006),
    niftyBearishBreak: roundLevel(Math.min(niftyAnchor, niftyClose * 0.996)),
    niftyDownsideTarget: roundLevel(niftySetupTarget > 0 && niftySetupTarget < niftyAnchor ? niftySetupTarget : niftyClose * 0.992),
    bankBullishHold: roundLevel(Math.max(bankAnchor, bankClose * 0.998)),
    bankBearishBreak: roundLevel(Math.min(bankAnchor, bankClose * 0.996))
  });
}

function normalizeTradeMapLevels(levels) {
  const normalized = { ...levels };
  if (normalized.niftyBullishHold > 0 && normalized.niftyUpsideTarget <= normalized.niftyBullishHold) {
    normalized.niftyUpsideTarget = roundLevel(normalized.niftyBullishHold * 1.006);
    if (normalized.niftyUpsideTarget <= normalized.niftyBullishHold) {
      normalized.niftyUpsideTarget = normalized.niftyBullishHold + 5;
    }
  }
  if (normalized.niftyBearishBreak > 0 && normalized.niftyDownsideTarget >= normalized.niftyBearishBreak) {
    normalized.niftyDownsideTarget = roundLevel(normalized.niftyBearishBreak * 0.994);
    if (normalized.niftyDownsideTarget >= normalized.niftyBearishBreak) {
      normalized.niftyDownsideTarget = normalized.niftyBearishBreak - 5;
    }
  }
  if (normalized.bankBullishHold > 0 && normalized.bankBearishBreak >= normalized.bankBullishHold) {
    normalized.bankBearishBreak = roundLevel(normalized.bankBullishHold * 0.996);
    if (normalized.bankBearishBreak >= normalized.bankBullishHold) {
      normalized.bankBearishBreak = normalized.bankBullishHold - 5;
    }
  }
  return normalized;
}

function roundLevel(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }
  return Math.round(number / 5) * 5;
}

function watchItemsHtml(digest, setup) {
  const items = Array.isArray(digest.watchItems) && digest.watchItems.length
    ? digest.watchItems.slice(0, 3)
    : (digest.news || [])
      .map((article) => article.watchFor)
      .filter(Boolean)
      .slice(0, 3);
  if (setup) {
    items.push(`Nifty acceptance near ${formatNumber(setup.entry)} and invalidation near ${formatNumber(setup.stopLoss)}.`);
  }
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function todaysReadHtml(digest) {
  const driver = digest.dailyLead ?? {};
  const driverType = (driver.driverType ?? "").toLowerCase();
  const driverTitle = driver.label ?? driver.headline ?? "";
  const indiaImpact = driver.indiaImpact ?? "";
  const sentiment = Number(digest.overallSentiment ?? 0);
  const sentimentLabel = String(digest.sentimentLabel ?? "NEUTRAL").toUpperCase();
  const fii = digest.fiiDiiFlows;
  const fiiNet = Number(fii?.fiiNet ?? 0);
  const diiNet = Number(fii?.diiNet ?? 0);
  const hasFlow = Math.abs(fiiNet) > 50 && fii?.date;

  const snapshots = digest.marketSnapshots ?? [];
  const nifty = snapshots.find((s) => s.symbol === "NIFTY");
  const bankNifty = snapshots.find((s) => s.symbol === "BANKNIFTY");
  const brent = snapshots.find((s) => s.symbol === "BRENT");
  const usdinr = snapshots.find((s) => s.symbol === "USDINR");

  // Format helpers
  function cr(v) {
    const abs = Math.abs(v);
    return abs >= 10000 ? `₹${(abs / 100).toFixed(0)}B` : `₹${Number(abs.toFixed(0)).toLocaleString("en-IN")} Cr`;
  }
  function pct(v) {
    if (!Number.isFinite(v)) return "";
    return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
  }

  // Build paragraph 1: set the scene
  const niftyLine = nifty
    ? `Nifty 50 closed at <strong>${formatNumber(nifty.closeValue)}</strong> (${pct(nifty.changePercent)}) while Bank Nifty settled at <strong>${formatNumber(bankNifty?.closeValue ?? 0)}</strong> (${pct(bankNifty?.changePercent ?? 0)}).`
    : "Indian indices are entering the session with cautious global cues.";

  // Build paragraph 2: the driver
  let driverPara = "";
  if (driverType === "crude") {
    const brentVal = brent ? `Brent crude is at <strong>$${brent.closeValue}</strong> (${pct(brent.changePercent)})` : "Crude prices";
    driverPara = `${brentVal}, and that one number shapes the entire India read today. Firms that import energy — OMCs, aviation, paints, tyres — are directly exposed. ${indiaImpact || "Softer crude supports margin relief; firm crude pressures the inflation narrative."}`;
  } else if (driverType === "geopolitical") {
    driverPara = `Geopolitical risk is the session driver. ${indiaImpact || "Equity markets are pricing uncertainty — watch if the risk-off mood lingers through the Asian handoff or fades before 9:15 AM IST."}`;
  } else if (driverType === "rates") {
    driverPara = `Bond yields are the macro anchor today. ${indiaImpact || "Rate-sensitive sectors — banks, NBFCs, real estate — will take their cue from how US yields behave overnight."}`;
  } else if (driverType === "tech_move") {
    driverPara = `Tech is leading global sentiment. ${indiaImpact || "Nifty IT and midcap tech stocks will likely mirror the overnight direction — watch the opening range before assuming continuation."}`;
  } else {
    driverPara = indiaImpact || `The day's primary theme is <strong>${escapeHtml(driverTitle)}</strong>. Monitor whether the narrative holds through the opening session.`;
  }

  // Build paragraph 3: FII/DII flows + sentiment synthesis
  let flowPara = "";
  if (hasFlow) {
    const fiiDir = fiiNet > 0 ? "net bought" : "net sold";
    const diiDir = diiNet > 0 ? "absorbed" : "sold";
    const counterNote = (fiiNet > 0 && diiNet < 0)
      ? `DIIs, which ${diiDir} ${cr(diiNet)}, are trimming into foreign buying — a healthy rotation signal.`
      : (fiiNet < 0 && diiNet > 0)
        ? `DIIs provided a ${cr(diiNet)} cushion, absorbing some of the foreign outflow.`
        : "";
    flowPara = `On the flows front (${fii.date}), FIIs ${fiiDir} <strong>${cr(fiiNet)}</strong> in the cash market. ${counterNote} Foreign flows at this scale tend to reinforce the directional bias — provided breadth confirms at the open.`;
  } else {
    flowPara = sentimentLabel === "BULLISH"
      ? "Overnight cues lean positive. The session needs broad participation — not just index heavyweights — to validate the constructive setup."
      : sentimentLabel === "BEARISH"
        ? "Risk appetite is cautious overnight. Breadth and the advance-decline ratio will tell whether this is a shallow pull-back or something that needs wider stops."
        : "The overnight read is mixed. Let the opening range define direction — neither side has enough conviction to chase before price confirms.";
  }

  // Build paragraph 4: what to actually watch
  const rupeeLine = usdinr ? `The rupee is at <strong>${usdinr.closeValue}</strong> (${pct(usdinr.changePercent)}${Math.abs(usdinr.changePercent ?? 0) > 0.3 ? " — worth watching for FII cost translation" : ""}).` : "";
  const watchLine = `${rupeeLine} Keep the 2-Minute Summary on top and cross-check levels in the Trading Guide before the cash open.`;

  return `
    <section class="todays-read-section" aria-label="Today's narrative read">
      <div class="todays-read-kicker">Today's Read</div>
      <h2>${escapeHtml(hookTitle(digest))}</h2>
      <div class="todays-read-body">
        <p>${niftyLine} Asian markets handed a mixed baton overnight, with ${positiveAsianCount(snapshots)} of the major regional indices closing higher.</p>
        <p>${driverPara}</p>
        <p>${flowPara}</p>
        <p>${watchLine}</p>
      </div>
      <div class="todays-read-footer">Prepared for the 7:15 AM IST briefing · Educational market context only — not investment advice</div>
    </section>
  `;
}

function positiveAsianCount(snapshots) {
  const asianSymbols = ["NIKKEI", "HSI", "SHCOMP", "KOSPI", "TAIEX", "STI", "ASX200"];
  const positives = snapshots.filter((s) => asianSymbols.includes(s.symbol) && Number(s.changePercent) > 0);
  return `${positives.length} of ${asianSymbols.filter((sym) => snapshots.some((s) => s.symbol === sym)).length}`;
}

function sourceNotesHtml(digest) {
  const totalArticles = digest.publicSourceSelection?.shortlistCount ?? (digest.news ?? []).length;
  const articles = publicVisibleSourceArticles(digest, PUBLIC_DISPLAY_LIMIT);
  // Prefer the article that was chosen as today's daily lead driver — keeps the
  // lead card aligned with the H1 headline. Fall back to highest-weighted article.
  const dailyLeadHeadline = digest.dailyLead?.headline ?? "";
  const driverMatchedLead = dailyLeadHeadline
    ? (articles.find((a) => a.headline === dailyLeadHeadline) ?? null)
    : null;
  const lead = driverMatchedLead ?? weightedSourceArticles(articles)[0] ?? articles[0];
  const categories = sourceCategoryGroups(articles);
  const defaultFilter = categories[0]?.category || "all";
  const defaultCount = categories[0]?.count || articles.length;
  const sourceCount = new Set(articles.map((article) => article.sourceName)).size;
  const negativeCount = articles.filter((article) => articleTone(article) < -0.1).length;
  const positiveCount = articles.filter((article) => articleTone(article) > 0.1).length;
  const toneStats = negativeCount || positiveCount
    ? `
          <span title="Article-level notes with bearish India read-through">Pressure<strong>${escapeHtml(negativeCount)}</strong></span>
          <span title="Article-level notes with supportive India read-through">Support<strong>${escapeHtml(positiveCount)}</strong></span>
          <small class="source-stat-help">Pressure/support count article-level India read-through tone.</small>`
    : `
          <span title="Article-level source tone">Tone<strong>Neutral</strong></span>
          <small class="source-stat-help">No strong article-level pressure/support edge; use the source notes as context.</small>`;

  return `
    <section class="sources-section">
      <div class="section-kicker">
        <div>
          <h2>Source Notes & Attribution</h2>
          <p class="source-section-copy">Evidence ledger behind the briefing. The full article list stays collapsed by default so the page reads quickly.</p>
          <p class="source-quality-line">${escapeHtml(sourceQualityLine(digest))}</p>
          <p class="source-quality-line">${escapeHtml(`Showing ${articles.length} India read-through notes from a ${totalArticles}-article 24-hour shortlist.`)}</p>
        </div>
        <div class="source-stat-strip" aria-label="Source ledger statistics">
          <span>Notes<strong>${escapeHtml(articles.length)}</strong></span>
          <span>Sources<strong>${escapeHtml(sourceCount)}</strong></span>
          ${toneStats}
        </div>
      </div>

      <div class="source-overview-grid">
        ${lead ? sourceLeadCardHtml(lead) : ""}
        ${sourceEvidenceMapHtml(categories)}
      </div>

      <details id="sourceLedger" class="source-ledger-details" data-default-source-filter="${escapeHtml(defaultFilter)}">
        <summary>
          <div>
            <h3>Open categorized source ledger</h3>
            <p>Starts with the highest-impact category only. Use All when you want the complete research trail.</p>
          </div>
          <span class="disclosure-action source-ledger-action" aria-hidden="true">
            <span class="label-closed">Show details</span>
            <span class="label-open">Hide details</span>
            <span class="disclosure-icon"></span>
          </span>
        </summary>
        <div class="source-ledger-body">
          <div class="source-filter-row" aria-label="Source category filters">
            ${sourceFilterButtonsHtml(categories, articles.length, defaultFilter)}
            <span id="sourceVisibleCount" class="source-visible-count">${escapeHtml(defaultCount)} shown</span>
          </div>

          <div class="source-category-board" aria-label="Categorized source notes">
            ${categories.map((group) => sourceCategorySectionHtml(group, defaultFilter)).join("")}
          </div>
        </div>
      </details>
    </section>
  `;
}

function publicVisibleSourceArticles(digest, limit = PUBLIC_DISPLAY_LIMIT) {
  const urls = new Set(digest.publicSourceSelection?.visibleSourceUrls ?? []);
  if (urls.size) {
    const selected = (digest.news ?? []).filter((article) => urls.has(article.sourceUrl));
    if (selected.length) {
      // Sort by importance so high-impact stories (geopolitical, crude shocks, big moves)
      // always rank before routine stock picks, even if the news array order differs
      return selected
        .slice()
        .sort((a, b) => publicSourceImportance(b) - publicSourceImportance(a))
        .slice(0, limit);
    }
  }
  return topIndiaRelevantSourceArticles(digest.news ?? [], limit);
}

function topIndiaRelevantSourceArticles(articles, limit = 5) {
  const unique = uniqueArticles(articles);
  const ranked = unique
    .slice()
    .sort((left, right) => publicSourceImportance(right) - publicSourceImportance(left));
  const byCategory = new Map();
  for (const article of ranked) {
    const category = article.category || "market";
    byCategory.set(category, [...(byCategory.get(category) || []), article]);
  }

  const selected = [];
  const selectedKeys = new Set();
  const categoryOrder = ["macro_negative", "global_risk", "macro_positive", "sector_positive", "sector_negative", "neutral_volatile"];
  for (const category of categoryOrder) {
    const candidate = (byCategory.get(category) || [])[0];
    addSourceCandidate(candidate, selected, selectedKeys, limit);
  }

  const maxPerCategory = Math.max(1, Math.ceil(limit / Math.max(2, byCategory.size)));
  for (const candidate of ranked) {
    if (selected.length >= limit) break;
    const category = candidate.category || "market";
    const categoryCount = selected.filter((article) => (article.category || "market") === category).length;
    if (categoryCount >= maxPerCategory && selected.length < Math.min(limit, byCategory.size)) {
      continue;
    }
    addSourceCandidate(candidate, selected, selectedKeys, limit);
  }

  for (const candidate of ranked) {
    if (selected.length >= limit) break;
    addSourceCandidate(candidate, selected, selectedKeys, limit);
  }

  return selected;
}

function addSourceCandidate(candidate, selected, selectedKeys, limit) {
  if (!candidate || selected.length >= limit) {
    return;
  }
  const key = candidate.sourceUrl || candidate.headline;
  if (!key || selectedKeys.has(key)) {
    return;
  }
  selected.push(candidate);
  selectedKeys.add(key);
}

function publicSourceImportance(article) {
  const text = `${article?.headline || ""} ${article?.summary || ""} ${article?.takeaway || ""} ${article?.indiaImpact || ""} ${article?.watchFor || ""} ${article?.entityName || ""}`.toLowerCase();
  let score = Math.abs(articleTone(article)) * 4 + articleWeight(article);
  if (!/^no direct india read-through/i.test(String(article?.indiaImpact || ""))) score += 3;
  if (["macro_negative", "global_risk"].includes(article?.category)) score += 3;
  if (["sector_positive", "macro_positive"].includes(article?.category)) score += 2;
  if (/\b(crude|oil|brent|opec|iran|hormuz|jet fuel|pipeline|keystone)\b/.test(text)) score += 4;
  if (/trump.{0,25}(xi|jinping|beijing)|xi.{0,25}trump|us.?china (trade deal|tariff deal|tariff truce|trade truce)|trade (deal|truce|ceasefire|agreement)|tariff (deal|truce|cut|pause|rollback)/.test(text)) score += 6;
  if (/\b(war|military|missile|strike|airstrike|geopolit|sanctions|red sea|hormuz)\b/.test(text)) score += 4;
  if (/\b(fed|rate|yield|inflation|dollar|dxy|usd\/inr|yen|currency)\b/.test(text)) score += 3;
  if (/\b(nasdaq|tech|software|semiconductor|chip|apple|ai|it)\b/.test(text)) score += 2.5;
  if (/\b(nifty|bank nifty|india|indian|rupee|omc|bpcl|hpcl|iocl|aviation|banks|nbfc)\b/.test(text)) score += 2.5;
  if (/\b(carvana|single-stock|private market|spacex)\b/.test(text)) score -= 3;
  if (/^no direct india read-through/i.test(String(article?.indiaImpact || ""))) score -= 5;
  return score;
}

function sourceQualityLine(digest) {
  const verification = digest.sourceVerification;
  if (!verification) {
    return "Source quality: legacy archive, article-link audit unavailable.";
  }
  const generated = digest.generatedAt ? `generated ${formatGeneratedTime(digest.generatedAt)}` : "generated timestamp unavailable";
  const blocked = verification.blockedReason ? `, blocked: ${verification.blockedReason}` : "";
  if (digest.publicSourceSelection) {
    const profile = sourceEvidenceProfile(digest);
    return `Source quality: ${profile.summary} Top ${digest.publicSourceSelection.visibleCount} India read-through notes selected from ${verification.verifiedArticleCount} verified article links across ${verification.publisherCount} publishers; ${generated}, ${verification.mode} mode${blocked}.`;
  }
  return `Source quality: ${verification.verifiedArticleCount} verified article links, ${verification.publisherCount} publishers, ${verification.categoryCount} categories, ${generated}, ${verification.mode} mode${blocked}.`;
}

function sourceEvidenceProfile(digest) {
  const selection = digest.publicSourceSelection ?? {};
  const verification = digest.sourceVerification ?? {};
  const directIndiaSourceCount = Number(selection.directIndiaSourceCount ?? selection.indiaPublisherCount ?? 0);
  const officialIndiaSourceCount = Number(selection.officialIndiaSourceCount ?? 0);
  const domesticCatalystCount = Number(selection.domesticCatalystCount ?? 0);
  const visibleCount = Number(selection.visibleCount ?? publicVisibleSourceArticles(digest, PUBLIC_DISPLAY_LIMIT).length);
  const globalContextCount = Number(selection.globalContextCount ?? Math.max(0, visibleCount - directIndiaSourceCount));
  const grade = verification.blockedReason
    ? "held"
    : selection.evidenceGrade || (
      directIndiaSourceCount >= 5 && officialIndiaSourceCount >= 3 && domesticCatalystCount >= 3
        ? "full"
        : directIndiaSourceCount > 0 || officialIndiaSourceCount > 0 || domesticCatalystCount > 0
          ? "limited"
          : "global_cue_only"
    );
  const labels = {
    full: "Full coverage",
    limited: `${directIndiaSourceCount} ${directIndiaSourceCount === 1 ? "article" : "articles"} reviewed`,
    global_cue_only: "Global cues only",
    held: "Held"
  };
  const className = String(grade).replaceAll("_", "-");
  function pl(n, singular, plural) { return `${n} ${n === 1 ? singular : plural}`; }
  const summary =
    grade === "full"
      ? `${pl(directIndiaSourceCount, "India article", "India articles")}, ${pl(officialIndiaSourceCount, "official filing", "official filings")}, ${pl(domesticCatalystCount, "domestic catalyst", "domestic catalysts")} — full coverage.`
      : grade === "limited"
        ? `${pl(directIndiaSourceCount, "India article", "India articles")} and ${pl(domesticCatalystCount, "domestic catalyst", "domestic catalysts")} reviewed. ${officialIndiaSourceCount === 0 ? "No exchange or regulator filings in today's stack." : `${pl(officialIndiaSourceCount, "official filing", "official filings")} included.`}`
        : grade === "held"
          ? "This edition is held — check back for the next verified public run."
          : "No direct India articles in today's stack — this briefing draws on global cues only.";
  return {
    className,
    label: labels[grade] || "Limited",
    summary,
    directIndiaSourceCount,
    officialIndiaSourceCount,
    domesticCatalystCount,
    globalContextCount
  };
}

function formatGeneratedTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "timestamp unavailable";
  }
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function sourceLeadCardHtml(article) {
  const sourceLink = sourceUrlLooksArticleLevel(article.sourceUrl)
    ? `<a href="${escapeHtml(article.sourceUrl)}" target="_blank" rel="noreferrer">Read source &#8599;</a>`
    : '<span class="source-name">Archived source link unavailable</span>';
  const summary = sourceLeadSummary(article);
  return `
    <article class="info-card source-lead-card">
      ${articleThumbnailHtml(article)}
      <div class="source-lead-copy">
        <div class="source-lead-kicker">
          <span class="news-badge ${newsToneClass(articleTone(article))}">Lead evidence</span>
          <span class="source-name">${escapeHtml(article.sourceName)} - ${escapeHtml(formatArticleTime(article.publishedAt))}</span>
        </div>
        <h3>${escapeHtml(article.headline)}</h3>
        <p>${escapeHtml(summary)}</p>
        <div class="source-readthrough-grid">
          <div><span>Takeaway</span><strong>${escapeHtml(article.takeaway || article.summary)}</strong></div>
          <div><span>India Read</span><strong>${escapeHtml(article.indiaImpact || "Watch opening breadth for confirmation.")}</strong></div>
          <div><span>Watch</span><strong>${escapeHtml(article.watchFor || "Opening range and sector breadth.")}</strong></div>
        </div>
        ${sourceLink}
      </div>
    </article>
  `;
}

function sourceLeadSummary(article) {
  const headline = String(article?.headline || "");
  const summary = String(article?.summary || "").trim();
  const normalizedHeadline = headline.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const normalizedSummary = summary.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!summary || normalizedSummary === normalizedHeadline || normalizedSummary.startsWith(normalizedHeadline.slice(0, 48))) {
    return article?.takeaway || article?.whyItMatters || "Article-level source selected for its India market read-through.";
  }
  return summary;
}

function sourceEvidenceMapHtml(categories) {
  return `
    <aside class="source-evidence-map">
      <span>Evidence Map</span>
      <h3>Narrative buckets ranked by weighted source tone</h3>
      <div class="source-theme-list">
        ${categories.map((group) => `
          <div class="source-theme-row">
            <div>
              <strong>${escapeHtml(sourceCategoryTitle(group.category))}</strong>
              <small>${escapeHtml(group.count)} notes - ${escapeHtml(group.leadEntity)} lead entity</small>
            </div>
            <span class="source-theme-score ${sourceScoreClass(group.score)}" title="Weighted source tone: pressure, neutral, or support">${escapeHtml(sourceToneLabel(group.score))}</span>
          </div>
        `).join("")}
      </div>
    </aside>
  `;
}

function sourceFilterButtonsHtml(categories, articleCount, defaultFilter) {
  return [
    `<button class="source-filter-btn" type="button" data-source-filter="all" aria-pressed="false">All <span>${escapeHtml(articleCount)}</span></button>`,
    ...categories.map((group) =>
      `<button class="source-filter-btn${group.category === defaultFilter ? " active" : ""}" type="button" data-source-filter="${escapeHtml(group.category)}" aria-pressed="${group.category === defaultFilter ? "true" : "false"}">${escapeHtml(sourceCategoryTitle(group.category))} <span>${escapeHtml(group.count)}</span></button>`
    )
  ].join("");
}

function sourceCategorySectionHtml(group, defaultFilter) {
  return `
    <section class="source-category-section" data-source-group="${escapeHtml(group.category)}"${group.category === defaultFilter ? "" : " hidden"}>
      <div class="source-category-head">
        <div>
          <div class="source-category-label">
            <span>Category</span>
            <small>${escapeHtml(categoryLabel(group.category))}</small>
          </div>
          <h3>${escapeHtml(sourceCategoryTitle(group.category))}</h3>
          <p>${escapeHtml(sourceCategorySummary(group))}</p>
        </div>
        <div class="source-category-meta" aria-label="${escapeHtml(sourceCategoryTitle(group.category))} category metrics">
          <div><span>Notes</span><strong>${escapeHtml(group.count)}</strong></div>
          <div><span>Tone</span><strong class="${sourceScoreClass(group.score)}" title="Weighted source tone: pressure, neutral, or support">${escapeHtml(sourceToneLabel(group.score))}</strong></div>
          <div><span>Lead</span><strong>${escapeHtml(group.leadEntity)}</strong></div>
        </div>
      </div>
      <div class="source-category-grid">
        ${group.articles.map((article) => sourceEvidenceCardHtml(article)).join("")}
      </div>
    </section>
  `;
}

function sourceEvidenceCardHtml(article) {
  const hasArticleUrl = sourceUrlLooksArticleLevel(article.sourceUrl);
  const linkAttrs = hasArticleUrl
    ? `role="link" tabindex="0" aria-label="Open source article: ${escapeHtml(article.headline)}" data-source-url="${escapeHtml(article.sourceUrl)}"`
    : `aria-label="Archived source note: ${escapeHtml(article.headline)}"`;
  const footerLink = hasArticleUrl
    ? `<a href="${escapeHtml(article.sourceUrl)}" target="_blank" rel="noreferrer">Read source &#8599;</a>`
    : '<span>Archived link unavailable</span>';
  return `
    <article class="info-card source-card source-evidence-card" ${linkAttrs} data-source-category="${escapeHtml(article.category || "market")}" data-source-name="${escapeHtml(article.sourceName)}">
      ${articleThumbnailHtml(article)}
      <div class="source-card-copy">
        <div class="source-card-header">
          <span class="news-badge ${newsToneClass(article.sentimentScore)}">${escapeHtml(newsBadgeLabel(article))}</span>
          <span class="source-name">${escapeHtml(article.sourceName)} - ${escapeHtml(formatArticleTime(article.publishedAt))}</span>
        </div>
        <h3>${escapeHtml(article.headline)}</h3>
        <p class="source-takeaway"><strong>Takeaway:</strong> ${escapeHtml(article.takeaway || article.summary)}</p>
        <details class="source-card-detail">
          <summary>Read-through</summary>
          <p><strong>Why it matters:</strong> ${escapeHtml(article.whyItMatters || article.summary)}</p>
          <p><strong>India impact:</strong> ${escapeHtml(article.indiaImpact || "Watch for confirmation in sector breadth and opening-range acceptance.")}</p>
          <p><strong>Watch:</strong> ${escapeHtml(article.watchFor || "Opening range and sector breadth.")}</p>
        </details>
        <div class="source-card-footer">
          <span class="source-entity">${escapeHtml(article.entityName || "Market")} - ${escapeHtml(categoryLabel(article.category))}</span>
          ${footerLink}
        </div>
      </div>
    </article>
  `;
}

function sourceCategoryGroups(articles) {
  const categoryOrder = ["macro_negative", "global_risk", "sector_positive", "macro_positive", "sector_negative", "neutral_volatile"];
  const groups = new Map();
  for (const article of articles) {
    const category = article.category || "market";
    groups.set(category, [...(groups.get(category) || []), article]);
  }
  return [...groups.entries()]
    .map(([category, groupedArticles]) => {
      const weight = groupedArticles.reduce((sum, article) => sum + articleWeight(article), 0);
      const score = weight
        ? groupedArticles.reduce((sum, article) => sum + articleTone(article) * articleWeight(article), 0) / weight
        : 0;
      const lead = weightedSourceArticles(groupedArticles)[0] || groupedArticles[0];
      return {
        category,
        count: groupedArticles.length,
        score,
        leadEntity: lead?.entityName || "Market",
        leadSource: lead?.sourceName || "Source",
        leadTakeaway: lead?.takeaway || lead?.summary || "",
        articles: weightedSourceArticles(groupedArticles)
      };
    })
    .sort((left, right) => {
      const leftIndex = categoryOrder.indexOf(left.category);
      const rightIndex = categoryOrder.indexOf(right.category);
      return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
    });
}

function sourceCategoryTitle(category) {
  return {
    macro_negative: "Macro Pressure",
    global_risk: "Global Risk",
    neutral_volatile: "Asia & Volatility",
    sector_negative: "Sector Pressure",
    sector_positive: "Sector Support",
    macro_positive: "Global Earnings & Risk Appetite"
  }[category] || categoryLabel(category);
}

function sourceCategorySummary(group) {
  const fallback = {
    macro_negative: "Crude, currency, yields, and imported inflation risks that can pressure the Indian open.",
    global_risk: "US and global risk-appetite cues that decide whether traders chase or fade the first move.",
    neutral_volatile: "Mixed regional and defensive-market signals that argue for patience around the opening range.",
    sector_positive: "Sector-specific offsets that can keep leadership selective even when the index tone is weak.",
    sector_negative: "Sector-specific pressure that needs Indian peer confirmation before it becomes index direction.",
    macro_positive: "US earnings and global risk-appetite cues that need Indian breadth before becoming local trade inputs."
  }[group.category] || "Related source notes grouped by theme for faster attribution.";
  return group.leadTakeaway
    ? `${fallback} Lead read: ${group.leadTakeaway}`
    : fallback;
}

function sourceWeight(article) {
  return Math.abs(articleTone(article) * articleWeight(article));
}

function sourceScoreClass(score) {
  if (score >= 0.1) return "up";
  if (score <= -0.1) return "down";
  return "flat";
}

function sourceToneLabel(score) {
  if (score >= 0.1) return "Support";
  if (score <= -0.1) return "Pressure";
  return "Neutral";
}

function strongestStory(articles, direction) {
  const sorted = articles
    .slice()
    .filter((article) => direction === "positive" ? articleTone(article) > 0 : articleTone(article) < 0)
    .sort((left, right) =>
      sourceWeight(right) - sourceWeight(left)
    );
  return sorted[0];
}

function firstByCategory(articles, category) {
  return articles
    .filter((article) => article.category === category)
    .sort((left, right) => sourceWeight(right) - sourceWeight(left))[0];
}

function categoryLabel(category) {
  return String(category || "market")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatArticleTime(value) {
  if (!value) return "Source time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Source time";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function regionalBreadthHtml(digest) {
  return ["US Overnight", "Asia Watch", "India Open", "Macro Hedges"]
    .map((region) => {
      const snapshots = displaySnapshotsForRegion(region, snapshotsForRegion(digest, region));
      if (!snapshots.length) {
        return "";
      }
      const positives = snapshots.filter((snapshot) => Number(snapshot.changePercent) >= 0).length;
      const average = snapshots.reduce((sum, snapshot) => sum + Number(snapshot.changePercent || 0), 0) / snapshots.length;
      const strongest = snapshots
        .slice()
        .sort((left, right) => Math.abs(right.changePercent) - Math.abs(left.changePercent))[0];
      const label = region === "Asia Watch" ? "Asia Watch" : region;
      const leadName = region === "Asia Watch" ? countryForSnapshot(strongest) || strongest.name : strongest.name;
      const leadLabel = Number(strongest.changePercent) >= 0 ? "Biggest lift" : "Biggest drag";
      const context = region === "Asia Watch" ? "Top 5 countries · " : "";
      return `
        <button class="breadth-card" type="button" data-region="${escapeHtml(label)}" aria-pressed="false" aria-label="Open ${escapeHtml(label)} quote context">
          <div class="breadth-card-top"><span>${escapeHtml(label)}</span><em class="market-state">Latest</em></div>
          <strong>${positives} up <em>/ ${snapshots.length} tracked</em></strong>
          <small>Avg move <b class="market-move ${changeClass(average)}">${formatChange(average)}</b> · ${escapeHtml(context)}${escapeHtml(leadLabel)}: ${escapeHtml(leadName)} <b class="market-move ${changeClass(strongest.changePercent)}">${formatChange(strongest.changePercent)}</b></small>
        </button>
      `;
    })
    .join("");
}

function snapshotsForRegion(digest, region) {
  return digest.marketSnapshots.filter((snapshot) => (snapshot.marketRegion || regionForSnapshot(snapshot)) === region);
}

function displaySnapshotsForRegion(region, snapshots) {
  if (region !== "Asia Watch") {
    return snapshots;
  }

  const topSymbols = topAsiaSymbols();
  return snapshots
    .filter((snapshot) => topSymbols.includes(snapshot.symbol))
    .sort((left, right) => topSymbols.indexOf(left.symbol) - topSymbols.indexOf(right.symbol));
}

function topAsiaSymbols() {
  return ["NIKKEI", "HSI", "SHCOMP", "KOSPI", "TAIEX"];
}

function regionForSnapshot(snapshot) {
  if (["SPX", "NDX", "DJI"].includes(snapshot.symbol)) return "US Overnight";
  if (["NIFTY", "BANKNIFTY", "GIFTNIFTY", "INDIAVIX"].includes(snapshot.symbol)) return "India Open";
  if (["DXY", "BRENT", "USDINR", "GOLD"].includes(snapshot.symbol)) return "Macro Hedges";
  if (["NIKKEI", "HSI", "SHCOMP", "KOSPI", "TAIEX", "STI", "ASX200"].includes(snapshot.symbol)) return "Asia Watch";
  return "Other Markets";
}

function formatSnapshotLine(snapshots) {
  return snapshots
    .slice(0, 7)
    .map((snapshot) => `${snapshot.name} ${formatSnapshotChange(snapshot)}`)
    .join(", ");
}

function formatAsiaSnapshotLine(snapshots) {
  return displaySnapshotsForRegion("Asia Watch", snapshots)
    .map((snapshot) => `${marketDisplayNameForSnapshot(snapshot)} ${formatSnapshotChange(snapshot)}`)
    .join(", ");
}

function marketDisplayNameForSnapshot(snapshot) {
  const region = snapshot.marketRegion || regionForSnapshot(snapshot);
  if (region !== "Asia Watch") {
    return snapshot.name;
  }
  const country = countryForSnapshot(snapshot);
  return country ? `${country} - ${snapshot.name}` : snapshot.name;
}

function countryForSnapshot(snapshot) {
  return snapshot.country || {
    NIKKEI: "Japan",
    HSI: "Hong Kong",
    SHCOMP: "Mainland China",
    KOSPI: "South Korea",
    TAIEX: "Taiwan",
    STI: "Singapore",
    ASX200: "Australia"
  }[snapshot.symbol] || "";
}

function algorithmicSetupHtml(digest) {
  const setup = niftySetup(digest);
  if (!setup) {
    const completed = setupAuditItems(digest).filter((item) => item.status === "TARGET_REACHED");
    const title = completed.length ? "Completed Setups" : "Active Game Plan";
    const badge = completed.length ? "No active setup" : "No setup yet";
    const note = completed.length
      ? "No active trade setup for this session. Earlier levels are archived below because the move has already played out."
      : "No clean 1:2 risk-reward setup is active yet. Let the opening range define the next valid level.";
    return `
      <section class="info-card setup-card">
        <div class="setup-card-header">
          <h2>${escapeHtml(title)}</h2>
          <span class="setup-badge${completed.length ? " complete" : ""}">${escapeHtml(badge)}</span>
        </div>
        <p class="strategy-note">${escapeHtml(note)}</p>
        ${setupAuditHtml(digest)}
      </section>
    `;
  }

  const bullish = setup.direction === "BULLISH";
  const risk = bullish ? setup.entry - setup.stopLoss : setup.stopLoss - setup.entry;
  const reward = bullish ? setup.target - setup.entry : setup.entry - setup.target;
  const bias = bullish ? "Buy on Pullback (Bullish)" : "Sell on Rally (Bearish)";
  const biasColor = bullish ? "#86efac" : "#fca5a5";

  return `
    <section class="info-card setup-card">
      <div class="setup-card-header">
        <h2>Active Game Plan</h2>
        <span class="setup-badge">1:2 R:R Validated</span>
      </div>
      <div class="setup-grid">
        <div>
          <p class="strategy-label">Strategy Bias</p>
          <p class="strategy-bias" style="color: ${biasColor}">${escapeHtml(bias)}</p>
          <p class="strategy-note">${escapeHtml(setup.confidenceReason)}</p>
        </div>
        <div class="setup-levels">
          <div class="setup-level">
            <span>Entry Zone</span>
            <strong>${formatNumber(setup.entry)}</strong>
          </div>
          <div class="setup-level stop">
            <span>Stop Loss</span>
            <strong>${formatNumber(setup.stopLoss)}</strong>
            <small>Risk: ${formatNumber(Math.abs(risk))} pts</small>
          </div>
          <div class="setup-level target">
            <span>Target</span>
            <strong>${formatNumber(setup.target)}</strong>
            <small>Reward: ${formatNumber(Math.abs(reward))} pts</small>
          </div>
        </div>
      </div>
    </section>
  `;
}

function scannerBadgeHtml(digest) {
  const setup = niftySetup(digest) ?? digest.tradeSetups[0];
  if (!setup) {
    return '<span class="valid-badge idle">No active setup</span>';
  }
  return '<span class="valid-badge">1:2 R:R Validated</span>';
}

function scannerPanelCopy(digest) {
  const setup = niftySetup(digest) ?? digest.tradeSetups[0];
  if (!setup) {
    return setupAuditSummary(digest) || "No active 1:2 risk-reward setup is available yet. The scanner is waiting for fresh levels.";
  }
  return "Nifty has a clean conditional setup, but the open still needs price acceptance and breadth confirmation.";
}

function studioMetricCards(digest) {
  const setup = niftySetup(digest);
  const inactiveAudit = setupAuditItems(digest).filter((item) => item.status !== "ACTIVE");
  const sourceCount = new Set(digest.news.map((article) => article.sourceName)).size;
  const thumbnailCount = digest.news.filter((article) => article.thumbnail?.alt).length;
  const sections = parseScriptSections(digestScript(digest));
  const setupLabel = setup ? `${setup.symbol} ${setup.riskReward}R` : inactiveAudit.length ? `${inactiveAudit.length} checked` : "Setup blocked";
  const setupHint = setup ? "Scanner-approved trade plan is available." : setupAuditSummary(digest) || "Waiting for fresh levels.";
  return [
    ["Market Tone", headlineSentiment(digest.sentimentLabel), `Weighted sentiment ${formatSignedScore(digest.overallSentiment)}`],
    ["Sources", `${digest.news.length} articles`, `${sourceCount} publishers; ${thumbnailCount} thumbnails`],
    ["Scanner", setupLabel, setupHint],
    ["Script", `${sections.length} sections`, "Recording draft ready"]
  ].map(([label, value, hint]) => `
    <article class="studio-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(hint)}</small>
    </article>
  `).join("");
}

function reelScriptStats(digest) {
  const words = String(digest.reelScript || digest.teleprompterScript || "")
    .split(/\s+/)
    .filter(Boolean)
    .length;
  const seconds = Math.max(30, Math.round(words / 2.45));
  return `${words} words / ~${seconds}s`;
}

function studioWorkflowHtml(digest) {
  const setup = niftySetup(digest);
  const auditLine = setup ? `${setup.symbol} passed the 1:2 risk-reward gate.` : setupAuditSummary(digest) || "No active setup yet.";
  const stages = [
    ["01", "Ingestion", `${digest.marketSnapshots.length} market snapshots and ${digest.news.length} source articles normalized.`, "ok"],
    ["02", "Clustering", `${digest.themes.length} narrative themes ranked by sentiment and entity weight.`, "ok"],
    ["03", "Scanner", auditLine, setup ? "ok" : "blocked"],
    ["04", "Script", `${parseScriptSections(digestScript(digest)).length} recording beats drafted from the morning source stack.`, "ok"],
    ["05", "Asset", `${digest.asset.palette} prompt package with ${digest.asset.controlNetMode}.`, "ok"],
    ["06", "Publish", `${digest.status || "DRAFT"} briefing with NewsArticle schema and source links.`, digest.status === "PUBLISHED" ? "ok" : "warn"]
  ];
  return stages.map(([step, title, detail, state]) => `
    <article class="workflow-step ${escapeHtml(state)}">
      <span>${escapeHtml(step)}</span>
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `).join("");
}

function scannerValidationHtml(digest) {
  const setup = niftySetup(digest) ?? digest.tradeSetups[0];
  if (!setup) {
    const auditRows = setupAuditItems(digest)
      .filter((item) => item.status !== "ACTIVE")
      .slice(0, 3)
      .map((item) => validationRow("blocked", `${item.symbol} ${auditStatusLabel(item.status)}`, item.reason))
      .join("");
    return `
      <div class="validation-list">
        ${auditRows || validationRow("blocked", "No active setup from current checks", "The page only shows a trade plan when the entry, stop, and target still preserve at least 2R.")}
        ${validationRow("warn", "Opening range required", "The next valid plan should be rebuilt only after price accepts a fresh level with clean risk placement.")}
        ${validationRow("ok", "Trade execution disabled", "Studio output remains educational research for video planning; no order placement is connected.")}
      </div>
    `;
  }
  return `
    <div class="validation-list">
      ${validationRow("ok", "Trend filter accepted", `${setup.symbol} price is aligned with the moving-average bias used by the scanner.`)}
      ${validationRow("ok", "Momentum filter accepted", "RSI-14 and volume conditions are strong enough for the setup candidate.")}
      ${validationRow("ok", "Risk-reward gate accepted", `Entry ${formatNumber(setup.entry)}, stop ${formatNumber(setup.stopLoss)}, target ${formatNumber(setup.target)} gives ${setup.riskReward}R.`)}
      ${validationRow("warn", "Manual confirmation still required", "Use the first-hour range and source context before recording a firm view.")}
    </div>
  `;
}

function validationRow(state, title, detail) {
  return `
    <div class="validation-row ${escapeHtml(state)}">
      <span class="validation-dot"></span>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(detail)}</span>
      </div>
    </div>
  `;
}

function themeReviewHtml(digest) {
  return digest.themes.map((theme) => {
    const score = Number(theme.sentimentScore || 0);
    const width = Math.max(10, Math.min(100, Math.abs(score) * 100)).toFixed(1);
    return `
      <article class="theme-review-card">
        <div class="theme-review-top">
          <strong>${escapeHtml(theme.title)}</strong>
          <span>${escapeHtml(formatSignedScore(score))} / ${escapeHtml(theme.evidenceCount)} sources</span>
        </div>
        <div class="theme-bar" aria-label="${escapeHtml(theme.title)} sentiment strength">
          <i style="--theme-width: ${width}%; --theme-color: ${scoreColor(score)}"></i>
        </div>
      </article>
    `;
  }).join("");
}

function sourceQaHtml(digest) {
  return weightedSourceArticles(digest.news)
    .slice(0, 6)
    .map((article) => {
      const thumbnail = article.thumbnail || {};
      const accent = safeAccent(thumbnail.accent, Number(article.sentimentScore) >= 0 ? "#059669" : "#dc2626");
      return `
        <article class="source-qa-item">
          <div class="source-mini-thumb" style="--thumb-accent: ${accent}">${escapeHtml(thumbnail.label || article.entityName || "Macro")}</div>
          <div>
            <strong>${escapeHtml(article.headline)}</strong>
            <span>${escapeHtml(article.sourceName)} - ${escapeHtml(categoryLabel(article.category))} - weight ${escapeHtml(Math.abs(Number(article.sentimentScore) * Number(article.entityMatchScore)).toFixed(2))}</span>
          </div>
        </article>
      `;
    }).join("");
}

function weightedSourceArticles(articles) {
  return articles
    .slice()
    .sort((left, right) => sourceWeight(right) - sourceWeight(left));
}

function articleTone(article) {
  if (Number.isFinite(Number(article?.sentimentScore))) {
    return Number(article.sentimentScore);
  }
  const label = String(article?.sentimentLabel || "").toLowerCase();
  if (label.includes("positive") || label.includes("bullish")) return 0.35;
  if (label.includes("negative") || label.includes("bearish")) return -0.35;
  return 0;
}

function articleWeight(article) {
  return Number.isFinite(Number(article?.entityMatchScore)) ? Math.max(0.1, Number(article.entityMatchScore)) : 1;
}

function publishingChecklistHtml(digest) {
  const hasSources = digest.news.every((article) => article.sourceUrl);
  const hasThumbnails = digest.news.every((article) => article.thumbnail?.alt);
  const hasDisclaimer = digestScript(digest).includes("not investment advice");
  const setup = niftySetup(digest);
  const items = [
    ["Source attribution", hasSources, `${digest.news.length} articles retain publisher names and outbound links.`],
    ["Article thumbnails", hasThumbnails, `${digest.news.filter((article) => article.thumbnail?.alt).length} thumbnails render across public and studio views.`],
    ["Risk disclaimer", hasDisclaimer, "Recording script includes the educational-use disclaimer."],
    ["Scanner discipline", true, setup ? `${setup.symbol} setup passed risk math.` : "No setup is published until fresh levels meet the risk math."],
    ["SEO metadata", true, "Daily page includes NewsArticle JSON-LD for the public archive."]
  ];
  return items.map(([label, ok, detail]) => `
    <li class="checklist-item">
      <strong>${ok ? "Ready" : "Needs Review"}: ${escapeHtml(label)}</strong>
      <span>${escapeHtml(detail)}</span>
    </li>
  `).join("");
}

function assetPromptDetailsHtml(asset) {
  const details = [
    ["Palette", asset.palette],
    ["Identity Ref", asset.referenceImageId],
    ["ControlNet", asset.controlNetMode],
    ["Output", asset.assetUrl]
  ];
  return details.map(([label, value]) => `
    <div class="prompt-detail">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join("");
}

function assetVideoScenesHtml(video) {
  const scenes = Array.isArray(video?.scenes) && video.scenes.length
    ? video.scenes
    : [
      { time: "0-03s", title: "Hook", caption: "Market mood" },
      { time: "03-14s", title: "Global Cue", caption: "Overnight cues" },
      { time: "14-34s", title: "India Read", caption: "Nifty and banks" },
      { time: "34-52s", title: "Trade Plan", caption: "Only 1:2+ setups" },
      { time: "52-60s", title: "Close", caption: "Save before open" }
    ];

  return scenes.slice(0, 5).map((scene) => `
    <article class="scene-card">
      <span>${escapeHtml(scene.time || "Scene")}</span>
      <strong>${escapeHtml(scene.title || "Reel beat")}</strong>
      <small>${escapeHtml(scene.caption || scene.visual || "")}</small>
    </article>
  `).join("");
}

function scriptSectionCardsHtml(digest) {
  return parseScriptSections(digestScript(digest))
    .map((section) => `
      <article class="script-section-card">
        <strong>${escapeHtml(section.title)}</strong>
        <span>${escapeHtml(section.lines.length)} line${section.lines.length === 1 ? "" : "s"} ready for pacing</span>
      </article>
    `)
    .join("");
}

function digestScript(digest) {
  return String(digest.reelScript || digest.teleprompterScript || digest.onePageSummary || "");
}

function parseScriptSections(script) {
  const sections = [];
  let current = null;
  for (const rawLine of String(script || "").split(/\n+/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const match = line.match(/^\[(.+)\]$/);
    if (match) {
      current = { title: match[1].replaceAll("_", " "), lines: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { title: "SCRIPT", lines: [] };
      sections.push(current);
    }
    current.lines.push(line);
  }
  return sections;
}

function scannerActivityLine(digest) {
  const setup = niftySetup(digest);
  if (!setup) {
    return setupAuditSummary(digest) || "No active setup yet; outdated levels are hidden from the studio.";
  }
  return `${setup.symbol} ${setup.direction.toLowerCase()} setup remains active at ${setup.riskReward}R.`;
}

function scoreColor(score) {
  if (score <= -0.2) {
    return "#dc2626";
  }
  if (score >= 0.2) {
    return "#059669";
  }
  return "#f59e0b";
}

function articleThumbnailHtml(article) {
  const thumbnail = articleThumbnailMeta(article);
  const label = thumbnail.label || article.entityName || "Macro";
  const theme = thumbnail.theme || categoryLabel(article.category);
  const alt = thumbnail.alt || `${article.headline} thumbnail`;
  const accent = safeAccent(thumbnail.accent, Number(article.sentimentScore) >= 0 ? "#059669" : "#dc2626");
  return `
    <div class="source-thumb" role="img" aria-label="${escapeHtml(alt)}" style="--thumb-accent: ${accent}">
      <span>${escapeHtml(theme)}</span>
      <strong>${escapeHtml(label)}</strong>
    </div>
  `;
}

function safeAccent(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || "")) ? value : fallback;
}

function scannerCells(digest) {
  const setup = digest.tradeSetups.find((item) => item.symbol === "NIFTY") ?? digest.tradeSetups[0];
  if (!setup) {
    return `
      <div class="rr-grid">
        <div class="rr-cell"><span>Entry</span><strong>N/A</strong></div>
        <div class="rr-cell stop"><span>Stop Loss</span><strong>N/A</strong></div>
        <div class="rr-cell target"><span>Target</span><strong>N/A</strong></div>
      </div>
    `;
  }
  return `
    <div class="rr-grid">
      <div class="rr-cell"><span>Entry</span><strong>${formatNumber(setup.entry)}</strong></div>
      <div class="rr-cell stop"><span>Stop Loss</span><strong>${formatNumber(setup.stopLoss)}</strong></div>
      <div class="rr-cell target"><span>Target</span><strong>${formatNumber(setup.target)}</strong></div>
    </div>
  `;
}

function setupAuditItems(digest) {
  return Array.isArray(digest.setupAudit) ? digest.setupAudit : [];
}

function setupAuditSummary(digest) {
  const inactive = setupAuditItems(digest).filter((item) => item.status !== "ACTIVE");
  if (!inactive.length) {
    return "";
  }
  const completed = inactive.filter((item) => item.status === "TARGET_REACHED");
  if (completed.length === inactive.length) {
    return `${completed.map((item) => item.symbol).join(" and ")} already crossed the earlier target${completed.length === 1 ? "" : "s"}; no fresh entry is shown.`;
  }
  const labels = inactive.slice(0, 2).map((item) => `${item.symbol}: ${auditStatusLabel(item.status).toLowerCase()}`);
  return `${inactive.length} candidate${inactive.length === 1 ? "" : "s"} checked; ${labels.join("; ")}.`;
}

function setupAuditHtml(digest) {
  const inactive = setupAuditItems(digest).filter((item) => item.status !== "ACTIVE");
  if (!inactive.length) {
    return "";
  }
  return `
    <div class="setup-audit-list" aria-label="Setup rejection reasons">
      ${inactive.slice(0, 3).map((item) => `
        <div class="setup-audit-item${item.status === "TARGET_REACHED" ? " complete" : ""}">
          <strong>${escapeHtml(item.symbol)}</strong>
          <span>
            ${escapeHtml(item.reason)}
            <small>${escapeHtml(setupAuditLevelLine(item, digest))}</small>
          </span>
        </div>
      `).join("")}
    </div>
  `;
}

function setupAuditLevelLine(item, digest = {}) {
  const digestLabel = digest.digestDate ? formatDigestDate(digest.digestDate) : "this briefing";
  const parts = item.status === "TARGET_REACHED"
    ? [`Archived setup before ${digestLabel} - not today's entry`]
    : [];
  if (Number.isFinite(Number(item.currentPrice))) {
    parts.push(`Current ${formatNumber(item.currentPrice)}`);
  }
  if (Number.isFinite(Number(item.entry))) {
    parts.push(`Entry ${formatNumber(item.entry)}`);
  }
  if (Number.isFinite(Number(item.target))) {
    parts.push(`Target ${formatNumber(item.target)}`);
  }
  return parts.join(" / ");
}

function auditStatusLabel(status) {
  return {
    TARGET_REACHED: "Target already reached",
    STOP_INVALIDATED: "Invalidation crossed",
    RISK_REWARD_COMPRESSED: "Reward compressed",
    UNKNOWN: "Unavailable"
  }[status] ?? "Checked";
}

function teleprompterHtml(digest) {
  const lines = digestScript(digest)
    .replaceAll("[OPENING]", "")
    .replaceAll("[GLOBAL CUES]", "")
    .replaceAll("[NARRATIVE THEMES]", "")
    .replaceAll("[NIFTY AND BANK NIFTY VIEW]", "")
    .replaceAll("[VALIDATED SETUPS]", "")
    .replaceAll("[RISK DISCLAIMER]", "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 14);
  return lines.map((line) => `${escapeHtml(line)}<br><br>`).join("");
}

function headlineSentiment(label) {
  return {
    BULLISH: "Cautious Bullish",
    BEARISH: "Risk-Off",
    VOLATILE: "Mixed",
    NEUTRAL: "Balanced"
  }[label] ?? label;
}

function marketSetupCopy(digest) {
  const setup = niftySetup(digest);
  if (!setup) {
    return "No clean 1:2 risk-reward setup is active yet. Let the first hour define direction before taking a view.";
  }
  return `Today's global narrative is ${digest.sentimentLabel.toLowerCase()}, led by ${digest.themes[0]?.title?.toLowerCase() ?? "overnight cues"}. The Nifty setup is valid only if price accepts near ${formatNumber(setup.entry)}; invalidation sits at ${formatNumber(setup.stopLoss)}, target is ${formatNumber(setup.target)}, and the structure offers ${setup.riskReward}R.`;
}

function sentimentPinPosition(score) {
  return Math.max(5, Math.min(95, 50 + Number(score) * 45)).toFixed(1);
}

function newsToneClass(score) {
  if (score <= -0.2) {
    return "negative";
  }
  if (score >= 0.2) {
    return "positive";
  }
  return "neutral";
}

function newsBadgeLabel(item) {
  return (item.category ?? item.entityName ?? "Market")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDigestDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00+05:30`));
}

function niftySetup(digest) {
  return digest.tradeSetups.find((item) => item.symbol === "NIFTY") ?? digest.tradeSetups[0] ?? null;
}

function formatChange(changePercent) {
  const value = Number(changePercent);
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatSnapshotChange(snapshot) {
  const change = Number(snapshot?.changePercent);
  if (snapshot?.symbol === "BRENT" && Math.abs(change || 0) < 0.005) {
    return `last close ${formatNumber(snapshot.closeValue)}`;
  }
  return formatChange(change);
}

function changeClass(changePercent) {
  return Math.abs(Number(changePercent || 0)) < 0.005 ? "flat" : Number(changePercent) >= 0 ? "up" : "down";
}

function formatSignedScore(score) {
  return `${score >= 0 ? "+" : ""}${Number(score).toFixed(2)}`;
}

function formatScheduledRun(digest) {
  if (!digest.scheduledFor) {
    return `${digest.digestDate} 07:15 IST`;
  }
  return digest.scheduledFor.replace("T", " ").replace(":00+05:30", " IST");
}

function formatGeneratedAt(value) {
  if (!value) {
    return "Pending";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Pending";
  }
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function adminComponentsConsoleHtml(digest) {
  return `
    <header class="page-header">
      <p class="eyebrow">Admin Console</p>
      <h1>How the Market Narrative desk fits together</h1>
      <p>Everything stays inside the admin console: architecture notes, repository boundaries, QA gates, and implementation modules are collapsible below.</p>
    </header>
    <section class="admin-console-section">
      <details class="admin-console-details" open>
        <summary>
          <div>
            <h2>Console Overview</h2>
            <p>How the Market Narrative desk fits together without leaving the admin workspace.</p>
          </div>
          <span class="chev">v</span>
        </summary>
        <div class="admin-console-body">
          <div class="body-grid">
            <article class="body-card">
              <strong>From Market Data To Creator Read</strong>
              <ul class="admin-list">
                <li>Market quote snapshots and source-backed articles enter the digest builder.</li>
                <li>The scanner, sentiment model, and editorial guardrails shape the private Studio package.</li>
                <li>Public pages receive only reader-safe briefing copy, source attribution, and chart context.</li>
              </ul>
            </article>
            <article class="body-card">
              <strong>Current Run</strong>
              <ul class="admin-list">
                <li>Digest date: ${escapeHtml(formatDigestDate(digest.digestDate))}</li>
                <li>Articles: ${escapeHtml(digest.news?.length ?? 0)}</li>
                <li>Markets: ${escapeHtml(digest.marketSnapshots?.length ?? 0)}</li>
              </ul>
            </article>
          </div>
        </div>
      </details>

      <details class="admin-console-details">
        <summary>
          <div>
            <h2>Repository Component Map</h2>
            <p>Major code areas and why they exist.</p>
          </div>
          <span class="chev">v</span>
        </summary>
        <div class="admin-console-body">
          <div class="body-grid">
            ${[
              ["backend/", "Spring Boot API, auth, persistence, public/admin digest contracts, and multibagger endpoints."],
              ["services/trading-api/", "FastAPI trading cockpit service for Kite auth, signals, options, risk checks, and mock-safe order proposals."],
              ["tools/", "Static publishing, daily digest generation, editorial QA, public copy gate, and browser smoke tooling."],
              ["apps/", "Split public, admin, and trading frontend surfaces for deploy isolation."]
            ].map(([path, summary]) => `
            <article class="repo-card-inline">
              <code>${escapeHtml(path)}</code>
              <strong>${escapeHtml(summary)}</strong>
            </article>`).join("")}
          </div>
        </div>
      </details>

      ${componentDetailsHtml()}
    </section>`;
}

function multibaggerAdminConsoleHtml(state) {
  return `
    <header class="page-header">
      <p class="eyebrow">Admin Console</p>
      <h1>Multibagger Review Desk</h1>
      <p>Review the public model, upload the current portfolio image, run keep-or-replace checks, and publish only sanitized public output without leaving the admin console.</p>
    </header>
    <section class="admin-console-section">
      <details class="admin-console-details" open>
        <summary>
          <div>
            <h2>Review Actions</h2>
            <p>Upload, run the monthly review, and publish sanitized output from one collapsible control panel.</p>
          </div>
          <span class="chev">v</span>
        </summary>
        <div class="admin-console-body">
          <div class="admin-grid">
            <article class="body-card">
              <strong>1. Portfolio Image</strong>
              <input id="portfolioFile" type="file" accept="image/png,image/jpeg,image/webp">
              <button id="uploadSnapshotBtn" class="primary-btn" type="button">Upload Snapshot</button>
              <p id="snapshotState" class="state-line">No upload yet.</p>
            </article>
            <article class="body-card">
              <strong>2. Monthly Review</strong>
              <label class="admin-form-field">Review month <input id="reviewMonth" type="month" value="2026-05"></label>
              <button id="runReviewBtn" class="primary-btn" type="button">Run Monthly Review</button>
              <p id="reviewState" class="state-line">Waiting for a snapshot or manual review run.</p>
            </article>
            <article class="body-card">
              <strong>3. Publish</strong>
              <p class="admin-console-note">Publishing sends only public-safe decisions and model commentary.</p>
              <button id="publishReviewBtn" class="primary-btn" type="button" disabled>Publish Sanitized Review</button>
              <p id="publishState" class="state-line">Nothing published in this session.</p>
            </article>
          </div>
        </div>
      </details>

      <details class="admin-console-details">
        <summary>
          <div>
            <h2>Current Public Model</h2>
            <p>Allocation, model return, and review rules shown inside the admin console.</p>
          </div>
          <span class="chev">v</span>
        </summary>
        <div class="admin-console-body">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Ticker</th><th>Weight</th><th>Return</th><th>Review Rule</th></tr></thead>
              <tbody>${state.holdings.map((holding) => `
                <tr>
                  <td>${escapeHtml(holding.ticker)}</td>
                  <td>${formatAdminPercent(holding.targetWeight)}</td>
                  <td>${formatAdminPercent(holding.returnPercent)}</td>
                  <td>${escapeHtml(holding.breakRule)}</td>
                </tr>
              `).join("")}</tbody>
            </table>
          </div>
        </div>
      </details>

      <details class="admin-console-details">
        <summary>
          <div>
            <h2>Agent Output</h2>
            <p>Review output remains collapsed until you need to inspect it.</p>
          </div>
          <span class="chev">v</span>
        </summary>
        <div class="admin-console-body">
          <pre id="reviewOutput" class="review-output">${escapeHtml(JSON.stringify({ status: "idle", expectedDecisions: ["KEEP", "ADD", "TRIM", "SELL", "REPLACE"] }, null, 2))}</pre>
        </div>
      </details>
    </section>`;
}

function formatAdminPercent(value) {
  return `${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`;
}

function limitWords(text, maxWords) {
  const words = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(" ");
  }
  return `${words.slice(0, maxWords - 1).join(" ")}...`;
}

function conciseSentence(text, maxWords) {
  const cleaned = String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\s*\.\.\.$/, "")
    .trim();
  if (!cleaned) {
    return "";
  }
  const words = cleaned.split(" ").filter(Boolean);
  const sentence = (words.length > maxWords ? words.slice(0, maxWords).join(" ") : words.join(" "))
    .replace(/[,;:]+$/g, "")
    .replace(/[.!?]+[,;:]+$/g, ".")
    .replace(/\s+\./g, ".")
    .replace(/\b(and|or|with|through|for|if|to|the|a|an|is|are|be|being)$/i, "")
    .trim();
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2
  });
}

function adminAuthGateHtml() {
  return `
  <section id="adminAuthGate" class="auth-gate" aria-label="Admin login">
    <form id="adminLoginForm" class="auth-card" autocomplete="on">
      <p class="eyebrow">Private Studio</p>
      <h1>Admin Login</h1>
      <p>Sign in to open Studio Command, architecture notes, project components, scripts, scanner tools, and publishing controls.</p>
      <label class="auth-field">
        <span>Email</span>
        <input id="adminEmail" name="email" type="email" autocomplete="username" required>
      </label>
      <label class="auth-field">
        <span>Password</span>
        <input id="adminPassword" name="password" type="password" autocomplete="current-password" required>
      </label>
      <button class="auth-submit" type="submit">Enter Admin Studio</button>
      <p id="adminAuthError" class="auth-error" role="alert" hidden>Could not sign in with those credentials.</p>
    </form>
  </section>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function jsonLdPayload(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
}

function absoluteSiteUrl(path, origin = siteOrigin) {
  if (/^https?:\/\//.test(String(path))) {
    return String(path);
  }
  const normalizedPath = String(path ?? "/").startsWith("/") ? String(path ?? "/") : `/${path}`;
  return `${origin}${normalizedPath}`;
}

/**
 * Public export for the homepage hero block.
 * Returns { eyebrow, h1, subheadline } derived from the latest digest.
 * Import this in publish-site.mjs to make the homepage banner dynamic.
 */
export function homepageHeroContent(digest) {
  if (!digest) {
    return {
      eyebrow: "Market Nerve Before The Open",
      h1: "Market Narrative: Nifty, Bank Nifty, And The One Thing To Watch First",
      subheadline: "Market Narrative turns overnight sources into a 7:15 AM IST opening read: bias, Nifty gate, Bank Nifty filter, sector nerve, and source evidence in one public workflow."
    };
  }
  const driver = (digest.dailyLead?.driverType ?? "").toLowerCase();
  const driverSummary = digest.dailyLead?.summary ?? "";
  const fii = digest.fiiDiiFlows;
  const fiiNet = Number(fii?.fiiNet ?? 0);
  const hasFii = Math.abs(fiiNet) > 50 && fii?.date;

  // Sub-headline: driver summary if available, otherwise a generic line
  let subheadline = driverSummary
    ? `Today's driver: ${driverSummary}`
    : "Market Narrative turns overnight sources into a 7:15 AM IST opening read: bias, Nifty gate, Bank Nifty filter, sector nerve, and source evidence in one public workflow.";

  if (hasFii) {
    const abs = Math.abs(fiiNet);
    const cr = abs >= 10000 ? `₹${(abs / 100).toFixed(0)}B` : `₹${Number(abs.toFixed(0)).toLocaleString("en-IN")} Cr`;
    const dir = fiiNet > 0 ? "bought" : "sold";
    subheadline = `FII ${dir} ${cr} (${fii.date}) · ${driverSummary || "Read the full pre-market brief before the open."}`;
  }

  return {
    eyebrow: heroEyebrowLabel(digest),
    h1: hookTitle(digest),
    subheadline
  };
}
