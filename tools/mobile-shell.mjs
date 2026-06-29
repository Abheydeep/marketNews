/**
 * Shared mobile shell — bottom tab bar + related CSS.
 *
 * Imported by all three public-site generators (publish-site, cockpit-page,
 * multibagger-page) so the mobile nav experience stays consistent and any
 * future change is a single edit. The bar is fixed to the bottom of the
 * viewport on small screens and hidden on desktop.
 */
import { brandMarkHtml } from "./brand-assets.mjs";
import { DISCLAIMER_COMPACT } from "./site-constants.mjs";

/**
 * Returns a small inline <script> block that registers /sw.js (if available)
 * and respects a localStorage dark-mode preference. Drop this once per page,
 * after the bar HTML.
 */
export function mobileShellScript() {
  return `<script>
    // Register the service worker (Tier 3 / item 29).
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }
    // Haptic feedback on tab-bar taps (Tier 4 / item 31). iOS Safari ignores;
    // Android Chrome respects navigator.vibrate for short bursts.
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('.btb-item, .hero-action, .subscribe-link, .latest-link');
      if (link && 'vibrate' in navigator) navigator.vibrate(8);
    }, { passive: true });
  </script>`;
}

/**
 * Returns a small CSS block for an optional sticky "Read on" CTA at the
 * bottom of mobile digest pages. Drop into the digest generator's <style>.
 * Default off — pages opt in by emitting a <div class="mobile-cta">.
 */
export function mobileCtaCss() {
  return `
    .mobile-cta {
      display: none;
    }
    @media (max-width: 760px) {
      .mobile-cta {
        display: flex;
        position: fixed;
        left: 12px;
        right: 12px;
        bottom: calc(72px + env(safe-area-inset-bottom, 0px));
        z-index: 55;
        align-items: center;
        justify-content: center;
        min-height: 56px;
        padding: 0 18px;
        border-radius: 14px;
        background: linear-gradient(135deg, #06b6d4, #6366f1);
        color: #fff;
        font-size: 15px;
        font-weight: 800;
        text-decoration: none;
        box-shadow: 0 12px 32px rgba(6, 182, 212, 0.34);
      }
    }
  `;
}

/**
 * Returns CSS for the tier-3 polish: 16px minimum on form inputs (iOS no-zoom),
 * viewport-aware body font scaling, and a [data-theme="light"] override that
 * dark-mode toggles can flip at runtime.
 */
export function proPolishCss() {
  return `
    /* === Pro polish (Tier 3) === */
    :root {
      --touch-min: 44px;
      --mobile-gap: 12px;
      --mobile-shell-pad: 14px;
    }
    .touch-target,
    a,
    button,
    summary,
    input,
    select {
      touch-action: manipulation;
    }
    a,
    button,
    summary,
    [tabindex] {
      -webkit-tap-highlight-color: transparent;
    }
    a,
    button,
    summary {
      min-height: var(--touch-min);
    }
    a,
    button {
      min-width: var(--touch-min);
    }
    summary {
      min-width: 0;
    }
    .mobile-safe-scroll,
    .table-wrap,
    .tabs,
    .nav-actions {
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
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
    /* Mobile-first root: 15px on phones, 16px on small tablets, 17px on
       desktop. Tighter than the OS default so a lot of rem-based sizing
       (cards, panels, hero) doesn't blow up on small viewports. */
    html {
      font-size: clamp(15px, 0.5vw + 14px, 17px);
    }
    input, select, textarea, button {
      font-size: 16px;
    }
    /* Manual dark-mode override (Tier 3 / item 21). The system preference is
       still respected; this only adds a manual toggle on top of it. */
    [data-theme="light"] {
      color-scheme: light;
    }
    /* === End pro polish === */
  `;
}
/**
 * Returns the bottom-tab-bar HTML for a given active key.
 * activeKey: "archive" | "latest" | "fiidii" | "indices" | "portfolio"
 *   Legacy keys ("guide" → "latest", "about"/"subscribe"/"more" → "archive").
 *   Pages like /about/ and /subscribe/ have no dedicated tab; Home highlights.
 */
export function bottomTabBarHtml(activeKey) {
  const items = [
    { key: "archive",   href: "/",                    label: "Home",     icon: homeIcon() },
    { key: "latest",    href: "/latest/",             label: "Briefing", icon: briefingIcon() },
    { key: "fiidii",    href: "/money-flow/fii-dii/", label: "FII DII",  icon: fiiDiiIcon() },
    { key: "indices",   href: "/indices/",            label: "Indices",  icon: indicesIcon() },
    { key: "portfolio", href: "/multibagger/",        label: "Portfolio",icon: portfolioIcon() },
  ];
  const normalizedKey = ["guide"].includes(activeKey) ? "latest"
    : ["about", "subscribe", "more"].includes(activeKey) ? "archive"
    : activeKey;
  const cells = items.map((item) => {
    const isActive = item.key === normalizedKey;
    const stateAttr = isActive ? ' aria-current="page"' : "";
    const cls = isActive ? "btb-item is-active" : "btb-item";
    return `<a class="${cls}" href="${item.href}"${stateAttr}><span class="btb-icon" aria-hidden="true">${item.icon}</span><span class="btb-label">${item.label}</span></a>`;
  }).join("\n        ");
  return `<nav class="bottom-tab-bar" aria-label="Primary mobile navigation">
      <div class="btb-inner">
        ${cells}
      </div>
    </nav>`;
}

/**
 * Returns CSS that tightens the typography scale for small viewports.
 * Drops into the same <style> as the bar; covers 1) oversized h1,
 * 2) oversized body paragraphs (18px → 15px on phones), 3) tag/kicker
 * labels that were 11-12px and now look fine. Pages that already opt
 * into a tighter prose class (e.g. briefing-prose) are left alone.
 */
export function mobileTypographyCss() {
  return `
    /* === Mobile typography (overrides) === */
    @media (max-width: 760px) {
      .shell {
        padding: 0 var(--mobile-shell-pad) !important;
      }
      main.shell {
        padding-top: 4px !important;
      }
      .hero {
        padding-top: 4px !important;
      }
      .glass-v2 .executive-card,
      .glass-v2 .trade-map-card,
      .glass-v2 .opening-nerve-card,
      .glass-v2 .expanded-briefing-page,
      .glass-v2 .reel-script-panel {
        padding: 16px !important;
        border-radius: 14px !important;
      }
      .cockpit-grid,
      .admin-grid,
      .multibagger-shell {
        gap: 16px !important;
      }
      h1 {
        font-size: clamp(24px, 7vw, 32px) !important;
        line-height: 1.15 !important;
      }
      h2 {
        font-size: clamp(18px, 5vw, 22px) !important;
        line-height: 1.25 !important;
      }
      h3 {
        font-size: clamp(15px, 4.5vw, 18px) !important;
      }
      /* Body and panel copy on small screens. */
      p, li, .panel p, .panel li, .briefing-block p {
        font-size: 14px !important;
        line-height: 1.55 !important;
      }
      .source-card p, .source-card li, .section-copy, .watch-grid p {
        font-size: 13px !important;
      }
      .eyebrow, .section-kicker, .panel span, .source-card span, .section-label {
        font-size: 10px !important;
      }
      .hero-action strong, .workflow-step strong, .two-minute-summary strong {
        font-size: 14px !important;
      }
      .hero-action span {
        font-size: 11px !important;
      }
      .summary-card-title {
        font-size: 24px !important;
      }
      .briefing-expand-card summary p {
        font-size: 16px !important;
      }
      .summary-chip,
      .metric-card,
      .index-card,
      .hero-action,
      .workflow-step,
      .source-card,
      details.panel,
      .faq-list details {
        border-radius: 8px !important;
      }
      .share-row,
      .site-footer-links,
      .source-card-footer,
      .source-card-header {
        gap: 8px !important;
      }
    }
    @media (max-width: 480px) {
      h1 {
        font-size: 22px !important;
      }
      .summary-card-title {
        font-size: 20px !important;
      }
    }
    /* === End mobile typography === */

    /* === Top-nav override (hide on mobile, leave brand) === */
    @media (max-width: 760px) {
      /* Shrink the topbar to a single brand row on mobile. The bottom tab
         bar carries the navigation. */
      body:not(.admin-auth-required) .nav-inner {
        min-height: 44px !important;
        padding-top: 6px !important;
        padding-bottom: 6px !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 0 !important;
      }
      /* Hide every link group inside the top nav on mobile. Brand stays. */
      body:not(.admin-auth-required) .nav-actions,
      body:not(.admin-auth-required) .tabs,
      body:not(.admin-auth-required) .site-tabs {
        display: none !important;
      }
      
      /* Admin-specific mobile nav overrides to keep tabs visible */
      body.admin-auth-required .nav-inner {
        align-items: flex-start !important;
        flex-direction: column !important;
        padding: 13px 0 !important;
        gap: 12px !important;
      }
      body.admin-auth-required .tabs {
        width: 100%;
        min-height: 48px;
        gap: 16px;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 4px;
      }
      body.admin-auth-required .tab-link,
      body.admin-auth-required .tab-btn {
        white-space: nowrap;
        padding: 8px 4px;
        min-height: 44px;
      }
    }
    /* === End top-nav override === */
  `;
}

/**
 * Returns the CSS block for the bottom tab bar plus related mobile shell
 * (safe-area-inset-bottom padding, hide-on-desktop). Drop this into each
 * page's <style> so the bar is positioned correctly.
 */
export function bottomTabBarCss() {
  return `
    /* === Bottom tab bar (mobile shell) === */
    .bottom-tab-bar {
      display: none;
    }
    @media (max-width: 760px) {
      .bottom-tab-bar {
        display: block;
        position: fixed !important;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 60 !important;
        background: rgba(5, 8, 22, 0.92);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border-top: 1px solid rgba(255, 255, 255, 0.12);
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }
      .bottom-tab-bar .btb-inner {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        align-items: stretch;
        max-width: 560px;
        margin: 0 auto;
      }
      .btb-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        min-height: 56px;
        padding: 6px 4px 4px;
        color: #b8c4d8;
        font-size: 12px;
        font-weight: 700;
        text-decoration: none;
        letter-spacing: 0.02em;
        transition: color 120ms ease;
      }
      .btb-item.is-active {
        color: #22d3ee;
      }
      .btb-item:active {
        background: rgba(34, 211, 238, 0.08);
      }
      .btb-icon {
        width: 22px;
        height: 22px;
        display: block;
      }
      .btb-icon svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      /* Lift content above the fixed bar on mobile, overriding .shell padding */
      body.has-btb main.shell,
      body.has-btb > .shell:last-of-type {
        padding-bottom: calc(92px + env(safe-area-inset-bottom, 0px)) !important;
      }
    }
    @media (max-width: 760px) {
      main { padding-bottom: calc(92px + env(safe-area-inset-bottom, 0px)) !important; }
    }
    /* === End bottom tab bar === */
  `;
}

/* Inline SVG icons — 24x24 viewBox, currentColor stroke. */
function homeIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>`;
}
function briefingIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h14a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>`;
}
function portfolioIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
}
function fiiDiiIcon() {
  // Trending line with upward arrow head — represents institutional flow direction
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,17 7,12 11,16 16,9 21,13"/><polyline points="16,9 21,9 21,14"/></svg>`;
}
function indicesIcon() {
  // 2x2 grid of small squares — represents a multi-index watch board
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`;
}
function moreIcon() {
  return `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18" cy="12" r="1.8"/></svg>`;
}

/**
 * Redesigned responsive site footer CSS.
 */
export function siteFooterCss() {
  return `
    .site-footer { border-top:1px solid rgba(255,255,255,.08); margin-top:40px; padding:28px 0 48px; }
    .footer-brand { align-items:center; display:flex; flex-wrap:wrap; gap:12px; margin-bottom:24px; }
    .footer-logo { align-items:center; display:flex; font-size:17px; font-weight:850; gap:10px; }
    .footer-tagline { color:#475569; font-size:13px; }
    .footer-cols { display:grid; gap:24px; grid-template-columns:repeat(3,1fr); margin-bottom:24px; }
    .footer-col { display:flex; flex-direction:column; gap:8px; }
    .footer-col-head { color:#64748b; font-size:11px; font-weight:800; letter-spacing:.08em; margin-bottom:4px; text-transform:uppercase; }
    .footer-col a { color:#94a3b8; font-size:14px; transition:color 120ms; display:block; line-height:1.6; }
    .footer-col a:hover { color:#f8fafc; }
    .footer-legal { border-top:1px solid rgba(255,255,255,.06); color:#475569; display:flex; flex-wrap:wrap; font-size:12px; gap:16px; padding-top:16px; }
    .footer-legal a { color:#64748b; }
    .footer-legal a:hover { color:#94a3b8; }
    
    @media (max-width:760px) {
      .footer-brand { flex-direction:column; align-items:flex-start !important; gap:8px; }
      .footer-cols { grid-template-columns:repeat(2,1fr) !important; gap:16px !important; }
      .footer-col { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:16px 18px; box-shadow:inset 0 1px 0 rgba(255,255,255,0.03); }
      .footer-col:last-child { grid-column:span 2; }
      .footer-col-head { border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:6px; margin-bottom:8px; }
      .footer-col a { min-height:44px; display:flex; align-items:center; }
      .footer-legal { flex-direction:column; gap:12px; }
    }
  `;
}

/**
 * Shared website footer links HTML.
 */
export function siteFooterLinksHtml() {
  return `
    <footer class="site-footer" aria-label="Market Narrative site links">
      <div class="footer-brand">
        <span class="footer-logo">${brandMarkHtml()}<span>Market Narrative</span></span>
        <span class="footer-tagline">Daily pre-market briefing for Indian equity traders · 7:15 AM IST</span>
      </div>
      <div class="footer-cols">
        <div class="footer-col">
          <span class="footer-col-head">Briefings</span>
          <a href="/latest/">Latest briefing</a>
          <a href="/">Archive</a>
          <a href="/latest/trading-guide/">Trading Guide</a>
        </div>
        <div class="footer-col">
          <span class="footer-col-head">Data</span>
          <a href="/money-flow/fii-dii/">FII DII data</a>
          <a href="/market-statistics/">Market statistics</a>
          <a href="/indices/">Global indices</a>
          <a href="/moves/">Move explanations</a>
        </div>
        <div class="footer-col">
          <span class="footer-col-head">Site</span>
          <a href="/multibagger/">Portfolio tracker</a>
          <a href="/about/">About</a>
          <a href="/subscribe/">Subscribe</a>
          <a href="/contact/">Contact</a>
        </div>
      </div>
      <div class="footer-legal">
        <a href="/privacy/">Privacy Policy</a>
        <a href="/terms/">Terms of Use</a>
        <span>${DISCLAIMER_COMPACT}</span>
      </div>
    </footer>
  `;
}
