// tools/move-page.mjs
// Generates a compact card page for an auto‑move article.
// The page includes SEO meta tags, JSON‑LD NewsArticle, and a glass‑v2 style card.

import { escapeHtml } from "./html-utils.mjs"; // reuse utility for escaping HTML
import { DISCLAIMER_COMPACT } from "./site-constants.mjs";

/**
 * Helper to generate JSON‑LD for a NewsArticle.
 */
function newsArticleJsonLd({ date, slug, article, symbol, change }) {
  const origin = process.env.PUBLIC_SITE_ORIGIN ?? "https://marketnarrative.in";
  const url = `${origin}/moves/${date}/${slug}/`;
  const movement = change > 0 ? "rose" : "fell";
  const publishedAt = stableArticleTimestamp(date, article?.publishedAt || article?.timestamp || article?.generatedAt);
  const modifiedAt = stableArticleTimestamp(date, article?.modifiedAt || article?.updatedAt || publishedAt);
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.headline?.slice(0, 110) || `Why ${symbol} ${movement} today`,
    "description": article.summary ?? "",
    "image": {
      "@type": "ImageObject",
      "url": article.ogImageUrl || article.thumbnail?.url || `${origin}/og-card.svg`,
      "width": 1200,
      "height": 675
    },
    "datePublished": publishedAt,
    "dateModified": modifiedAt,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": url
    },
    "author": { "@type": "Organization", "name": "Market Narrative", "url": origin },
    "publisher": {
      "@type": "Organization",
      "name": "Market Narrative",
      "logo": {
        "@type": "ImageObject",
        "url": `${origin}/favicon.svg`
      }
    },
    "about": { "@type": "Thing", "name": symbol },
    "articleSection": symbol,
    "keywords": `why did ${symbol.toLowerCase()} ${movement} today, ${symbol.toLowerCase()} move reason, stock market today india, nifty fall reason today`
  };
}

function safeJsonScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * Generates the full HTML page for a move article.
 * @param {object} params
 * @param {string} params.date   YYYY‑MM‑DD string
 * @param {string} params.slug   URL‑friendly slug
 * @param {object} params.article  { headline, summary, thumbnail? }
 * @param {string} params.symbol   Stock ticker (e.g., NIFTY)
 * @param {number} params.change   Percent change (positive or negative)
 */
export function movePage({ date, slug, article, symbol, change }) {
  const movement = change > 0 ? "rose" : "fell";
  const pageTitle = `Why ${symbol} ${movement} ${Math.abs(change).toFixed(1)}% today - ${date} | Market Narrative`;
  const description = compactMetaDescription(`${symbol} ${movement} ${Math.abs(change).toFixed(1)}% on ${date}. ${article.summary ?? ""}`);
  const jsonLd = safeJsonScript(newsArticleJsonLd({ date, slug, article, symbol, change }));
  const thumbnailUrl = article.ogImageUrl || article.thumbnail?.url || "";
  const origin = process.env.PUBLIC_SITE_ORIGIN ?? "https://marketnarrative.in";
  const canonicalUrl = `${origin}/moves/${date}/${slug}/`;
  const fallbackImage = `${origin}/og-card.svg`;
  const socialImage = thumbnailUrl || fallbackImage;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="en_IN">
  <meta property="og:site_name" content="Market Narrative">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:image" content="${escapeHtml(socialImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="675">
  <meta property="og:image:type" content="${socialImage.endsWith(".jpg") ? "image/jpeg" : "image/svg+xml"}">
  <meta property="og:image:alt" content="${escapeHtml(`${pageTitle} - Market Narrative move image`)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(socialImage)}">
  <script type="application/ld+json">${jsonLd}</script>
  <style>
    ${compactCardCss()}
    body { margin:0; font-family: Inter, system-ui, sans-serif; background:#050816; color:#f4f5f7; }
    a { color:inherit; text-decoration:none; }
  </style>
</head>
<body class="has-btb">
  <section class="compact-card">
    <header class="compact-header">
      <h1>Why ${escapeHtml(symbol)} ${escapeHtml(movement)} ${escapeHtml(Math.abs(change).toFixed(1))}% today</h1>
      <p class="compact-subtitle">${escapeHtml(article.headline || `${symbol} market move explained`)}</p>
    </header>
    ${thumbnailUrl ? `<img src="${escapeHtml(thumbnailUrl)}" alt="${escapeHtml(article.headline)}" class="compact-thumb" width="1200" height="220" loading="eager" decoding="async">` : ""}
    <article class="compact-body">
      <p>${escapeHtml(article.summary ?? "")}</p>
    </article>
    <footer class="compact-disclaimer">${DISCLAIMER_COMPACT}</footer>
  </section>
  ${mobileShellScript()}
</body>
</html>`;
}

function stableArticleTimestamp(date, value) {
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString();
  }
  return new Date(`${date}T09:15:00+05:30`).toISOString();
}

/**
 * Minimal CSS for the compact card layout.
 */
function compactCardCss() {
  return `
    .compact-card {
      max-width: 560px;
      margin: 80px auto 40px;
      background: rgba(5,8,22,0.92);
      backdrop-filter: blur(12px);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 12px 28px rgba(0,0,0,0.4);
    }
    .compact-header h1 {
      font-size: 1.8rem;
      margin: 0 0 8px;
    }
    .compact-subtitle {
      font-size: 0.95rem;
      color: #a0aec0;
      margin: 0 0 16px;
    }
    .compact-thumb {
      width: 100%;
      height: 220px;
      object-fit: cover;
      object-position: center;
      border-radius: 12px;
      margin: 0 0 16px;
    }
    .compact-body p {
      line-height: 1.6;
      font-size: 1rem;
    }
    .compact-disclaimer {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid rgba(255,255,255,0.12);
      color: #a0aec0;
      font-size: 0.82rem;
      line-height: 1.45;
    }
    @media (max-width: 760px) {
      .compact-card { margin: 60px 12px; padding: 20px; }
    }
  `;
}

/**
 * Re‑use the existing mobile shell script for service‑worker registration and haptic taps.
 */
import { mobileShellScript } from "./mobile-shell.mjs";

function compactMetaDescription(value) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized.length <= 170 ? normalized : `${normalized.slice(0, 167).replace(/\s+\S*$/, "")}...`;
}
