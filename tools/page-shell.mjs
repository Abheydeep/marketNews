import { siteThemeCss } from "./site-theme.mjs";
import { siteHeaderHtml, siteHeaderCss, siteFooterHtml, siteFooterCss } from "./site-chrome.mjs";
import { bottomTabBarHtml, bottomTabBarCss, mobileTypographyCss, mobileShellScript } from "./mobile-shell.mjs";
import { brandHeadLinks, brandMarkCss } from "./brand-assets.mjs";
import { escapeHtml } from "./html-utils.mjs";
import { brandedTitle, publicSiteOrigin, socialCardUrl } from "./public-page-registry.mjs";
import { publicCopyClientScript, sanitizePublicHtml } from "./public-copy-sanitizer.mjs";

/**
 * Construct a standard unified HTML document shell for Market Narrative.
 * Respects ESM and the 200-line budget constraint.
 */
export function pageShell({
  title = "Market Narrative",
  description = "Indian pre-market intelligence and daily briefings.",
  canonicalUrl = `${publicSiteOrigin()}/`,
  ogImage = socialCardUrl("home"),
  ogType = "website",
  styles = "",
  head = "",
  headExtras = "",
  bodyClass = "has-btb",
  activeHref = "",
  mobileActiveKey = "", // e.g. "archive", "latest", "fiidii", "indices", "portfolio"
  mainClass = "site-content-shell",
  main = "",
  afterMain = "",
  scripts = ""
} = {}) {
  const needsBtb = mobileActiveKey !== null;
  const normalizedTitle = title === "Market Narrative" || /\|\s*Market Narrative$/i.test(title)
    ? title
    : brandedTitle(title);
  const safeTitle = escapeHtml(normalizedTitle);
  const safeDescription = escapeHtml(description);
  const safeCanonicalUrl = escapeHtml(canonicalUrl);
  const safeOgImage = escapeHtml(ogImage);
  
  return sanitizePublicHtml(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  <link rel="canonical" href="${safeCanonicalUrl}">
  
  <!-- Open Graph -->
  <meta property="og:site_name" content="Market Narrative">
  <meta property="og:type" content="${escapeHtml(ogType)}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:url" content="${safeCanonicalUrl}">
  <meta property="og:image" content="${safeOgImage}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeOgImage}">
  
  ${brandHeadLinks()}
  
  <style>
    ${siteThemeCss()}
    ${brandMarkCss()}
    ${siteHeaderCss()}
    ${siteFooterCss()}
    ${needsBtb ? bottomTabBarCss() : ""}
    ${needsBtb ? mobileTypographyCss() : ""}
    ${styles}
  </style>
  ${head}
  ${headExtras}
</head>
<body class="${escapeHtml(bodyClass)}">
  <a class="mn-skip" href="#mn-main">Skip to content</a>
  
  ${siteHeaderHtml(activeHref)}
  
  <main id="mn-main"${mainClass ? ` class="${escapeHtml(mainClass)}"` : ""}>
    ${main}
  </main>
  ${afterMain}
  
  ${siteFooterHtml()}
  
  ${needsBtb ? bottomTabBarHtml(mobileActiveKey) : ""}
  ${needsBtb ? mobileShellScript() : ""}
  ${publicCopyClientScript()}
  ${scripts}
</body>
</html>`);
}
