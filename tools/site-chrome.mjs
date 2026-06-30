import { brandMarkHtml } from "./brand-assets.mjs";
import { escapeHtml } from "./html-utils.mjs";
import { NAV_ITEMS, DISCLAIMER_COMPACT } from "./site-constants.mjs";

/**
 * Unified Header HTML.
 * Includes "/* site-header v1 * /" sentinel.
 */
export function siteHeaderHtml(activeHref = "", options = {}) {
  const items = options.navItems || NAV_ITEMS;
  const links = items.map(({ href, label, isCta, dataTarget, isButton, isActive, id }) => {
    const activeClass = (isActive || (activeHref && href === activeHref)) ? " tab-link--active" : "";
    const extraClass = isCta ? " tab-link--cta" : "";
    if (isButton) {
      const idAttr = id ? ` id="${escapeHtml(id)}"` : "";
      return `<button class="tab-link${activeClass}${extraClass} tab-btn" data-target="${escapeHtml(dataTarget)}"${idAttr}>${escapeHtml(label)}</button>`;
    }
    return (isActive || (activeHref && href === activeHref))
      ? `<span class="tab-link tab-link--active${extraClass}" aria-current="page">${escapeHtml(label)}</span>`
      : `<a class="tab-link${extraClass}" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
  }).join("");
  const subscribeCta = (options.hideSubscribe || options.navItems)
    ? ""
    : `<a class="tab-link tab-link--cta" href="/subscribe/">Subscribe</a>`;
  return `<!-- site-header v1 -->
  <nav class="topbar" aria-label="Primary">
    <div class="shell">
      <div class="nav-inner">
        <a class="brand" href="${escapeHtml(options.brandHref || "/")}">${brandMarkHtml()}<span>Market Narrative</span></a>
        <div class="site-tabs" aria-label="Site navigation">${links}${subscribeCta}</div>
      </div>
    </div>
  </nav>`;
}

/**
 * Unified Header CSS.
 */
export function siteHeaderCss() {
  return `
    .topbar { position:sticky; top:0; z-index:20; background:rgba(3,7,18,.72); border-bottom:1px solid var(--line); backdrop-filter:blur(18px); }
    .nav-inner { align-items:center; display:flex; gap:16px; justify-content:space-between; min-height:64px; }
    .brand { align-items:center; display:flex; gap:12px; font-size:20px; font-weight:850; }
    .site-tabs { display:flex; align-items:center; gap:6px; flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; }
    .site-tabs::-webkit-scrollbar { display:none; }
    .tab-link { border:1px solid rgba(255,255,255,.12); border-radius:8px; color:#9fb0c8; font-size:13px; font-weight:800; padding:8px 12px; white-space:nowrap; transition:border-color 120ms,color 120ms,background 120ms; }
    .tab-link:hover { border-color:rgba(124,180,245,.4); color:#f8fafc; }
    .tab-link--active { background:rgba(99,102,241,.18); border-color:rgba(99,102,241,.4); color:#a5b4fc; }
    .tab-link--cta { background:rgba(52,211,153,.13); border-color:rgba(52,211,153,.3); color:#bbf7d0; margin-left:6px; }
    .tab-link--cta:hover { background:rgba(52,211,153,.22); }
  `;
}

/**
 * Unified Footer HTML.
 * Includes "/* site-footer v1 * /" sentinel.
 */
export function siteFooterHtml() {
  return `<!-- site-footer v1 -->
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
        <span>${escapeHtml(DISCLAIMER_COMPACT)}</span>
      </div>
    </footer>
  `;
}

/**
 * Unified Footer CSS.
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
