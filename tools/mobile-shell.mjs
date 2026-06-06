/**
 * Shared mobile shell — bottom tab bar + related CSS.
 *
 * Imported by all three public-site generators (publish-site, cockpit-page,
 * multibagger-page) so the mobile nav experience stays consistent and any
 * future change is a single edit. The bar is fixed to the bottom of the
 * viewport on small screens and hidden on desktop.
 */

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
 * activeKey: "archive" | "latest" | "guide" | "portfolio" | "about" | "subscribe" | "more"
 *   "more" is a fallback for any key not in the bar; the bar's "More" item
 *   highlights instead. Pages like /about/ use "more" or "about".
 */
export function bottomTabBarHtml(activeKey) {
  const items = [
    { key: "archive",   href: "/",             label: "Home",      icon: homeIcon() },
    { key: "latest",    href: "/latest/",      label: "Briefing",  icon: briefingIcon() },
    { key: "portfolio", href: "/multibagger/", label: "Portfolio", icon: portfolioIcon() },
    { key: "subscribe", href: "/subscribe/",   label: "Subscribe", icon: subscribeIcon() },
    { key: "more",      href: "/about/",       label: "More",      icon: moreIcon() },
  ];
  const normalizedKey = ["guide", "about"].includes(activeKey) ? "more" : activeKey;
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
      h1 {
        font-size: clamp(26px, 8vw, 36px) !important;
        line-height: 1.12 !important;
      }
      h2 {
        font-size: clamp(20px, 6vw, 26px) !important;
        line-height: 1.2 !important;
      }
      h3 {
        font-size: clamp(17px, 5vw, 20px) !important;
      }
      /* Body and panel copy on small screens. */
      p, li, .panel p, .panel li, .briefing-block p {
        font-size: 15px !important;
        line-height: 1.6 !important;
      }
      .source-card p, .source-card li, .section-copy, .watch-grid p {
        font-size: 14px !important;
      }
      .eyebrow, .section-kicker, .panel span, .source-card span, .section-label {
        font-size: 11px !important;
      }
      .hero-action strong, .workflow-step strong, .two-minute-summary strong {
        font-size: 15px !important;
      }
      .hero-action span {
        font-size: 12px !important;
      }
    }
    @media (max-width: 480px) {
      h1 {
        font-size: 24px !important;
        line-height: 1.15 !important;
      }
    }
    /* === End mobile typography === */

    /* === Top-nav override (hide on mobile, leave brand) === */
    @media (max-width: 760px) {
      /* Shrink the topbar to a single brand row on mobile. The bottom tab
         bar carries the navigation. */
      .nav-inner {
        min-height: 52px !important;
        padding-top: 8px !important;
        padding-bottom: 8px !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 0 !important;
      }
      /* Hide every link group inside the top nav on mobile. Brand stays. */
      .nav-actions,
      .tabs {
        display: none !important;
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
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 60;
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
      /* Lift content above the fixed bar on mobile. */
      body.has-btb main,
      body.has-btb .shell:last-child {
        padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
      }
    }
    @media (max-width: 760px) {
      main { padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important; }
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
function subscribeIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l8 6 8-6"/><rect x="3" y="5" width="18" height="14" rx="2"/></svg>`;
}
function moreIcon() {
  return `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18" cy="12" r="1.8"/></svg>`;
}
