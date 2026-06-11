// tools/move-page.mjs
// Generates a compact card page for an auto‑move article.
// The page includes SEO meta tags, JSON‑LD NewsArticle, and a glass‑v2 style card.

import { escapeHtml } from "./brand-assets.mjs"; // reuse utility for escaping HTML

/**
 * Helper to generate JSON‑LD for a NewsArticle.
 */
function newsArticleJsonLd({ date, slug, article, symbol, change }) {
  const url = `${process.env.PUBLIC_SITE_ORIGIN ?? "https://marketnarrative.in"}/moves/${date}/${slug}/`;
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.headline,
    "description": article.summary ?? "",
    "datePublished": new Date().toISOString(),
    "url": url,
    "author": { "@type": "Organization", "name": "Market Narrative" },
    "image": article.thumbnail?.url ?? null,
    "articleSection": symbol,
    "keywords": `move,${symbol},${change > 0 ? "up" : "down"}`
  };
}

function safeJsonScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
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
  const pageTitle = `${symbol} ${change > 0 ? "surges" : "drops"} ${Math.abs(change).toFixed(1)}% – Market Move`;
  const description = article.summary?.slice(0, 150) ?? "";
  const jsonLd = safeJsonScript(newsArticleJsonLd({ date, slug, article, symbol, change }));
  const thumbnailUrl = article.thumbnail?.url ?? "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(`https://marketnarrative.in/moves/${date}/${slug}/`)}">
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
      <h1>${escapeHtml(article.headline)}</h1>
      <p class="compact-subtitle">${escapeHtml(symbol)} ${change > 0 ? "↑" : "↓"} ${Math.abs(change).toFixed(1)}%</p>
    </header>
    ${thumbnailUrl ? `<img src="${escapeHtml(thumbnailUrl)}" alt="${escapeHtml(article.headline)}" class="compact-thumb"/>` : ""}
    <article class="compact-body">
      <p>${escapeHtml(article.summary ?? "")}</p>
    </article>
    <footer class="compact-disclaimer">Educational market research only; not SEBI-registered investment advice, a recommendation, or a solicitation.</footer>
  </section>
  ${mobileShellScript()}
</body>
</html>`;
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
      height: auto;
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
