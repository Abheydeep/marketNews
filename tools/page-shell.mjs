import { siteThemeCss } from "./site-theme.mjs";
import { siteHeaderHtml, siteHeaderCss, siteFooterHtml, siteFooterCss } from "./site-chrome.mjs";
import { bottomTabBarHtml, bottomTabBarCss, mobileTypographyCss, mobileShellScript } from "./mobile-shell.mjs";
import { brandHeadLinks, brandMarkCss } from "./brand-assets.mjs";

/**
 * Construct a standard unified HTML document shell for Market Narrative.
 * Respects ESM and the 200-line budget constraint.
 */
export function pageShell({
  title = "Market Narrative",
  description = "Indian pre-market intelligence and daily briefings.",
  canonicalUrl = "https://www.marketnarrative.in/",
  ogImage = "https://www.marketnarrative.in/og-card.png",
  head = "",
  bodyClass = "has-btb",
  activeHref = "",
  mobileActiveKey = "", // e.g. "archive", "latest", "fiidii", "indices", "portfolio"
  main = ""
} = {}) {
  const needsBtb = !!mobileActiveKey;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${description}">
  <meta name="theme-color" content="#050816">
  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- Open Graph -->
  <meta property="og:site_name" content="Market Narrative">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${ogImage}">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImage}">
  
  ${brandHeadLinks()}
  
  <style>
    ${siteThemeCss()}
    ${brandMarkCss()}
    ${siteHeaderCss()}
    ${siteFooterCss()}
    ${needsBtb ? bottomTabBarCss() : ""}
    ${needsBtb ? mobileTypographyCss() : ""}
  </style>
  ${head}
</head>
<body class="${bodyClass}">
  <a class="mn-skip" href="#mn-main">Skip to content</a>
  
  ${siteHeaderHtml(activeHref)}
  
  <main id="mn-main">
    ${main}
  </main>
  
  ${siteFooterHtml()}
  
  ${needsBtb ? bottomTabBarHtml(mobileActiveKey) : ""}
  ${needsBtb ? mobileShellScript() : ""}
</body>
</html>`;
}
