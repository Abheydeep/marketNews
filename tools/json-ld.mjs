/**
 * Consolidated JSON-LD schemas and rendering helpers.
 * Respects ESM and the 200-line budget constraint.
 */

import { publicSiteOrigin, socialCardUrl } from "./public-page-registry.mjs";

const SITE_ORIGIN = publicSiteOrigin();

export function jsonLdPayload(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
}

export function jsonLdScript(value) {
  return `<script type="application/ld+json">${jsonLdPayload(value)}</script>`;
}

export function newsArticleJsonLd(digest, options = {}) {
  const canonicalPath = String(digest.canonicalPath || `/${digest.digestDate}/`);
  const canonicalUrl = `${SITE_ORIGIN}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;
  const description = digest.archiveSummary || digest.deskNote || "Daily Market Narrative pre-market briefing for Nifty, Bank Nifty, global cues, and India read-through.";
  const headline = options.h1Override || digest.title;
  const image = digest.ogImageUrl || socialCardUrl("briefing", SITE_ORIGIN);
  
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline,
    alternativeHeadline: digest.title,
    description,
    image: [image],
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl
    },
    datePublished: digest.publishedAt ?? `${digest.digestDate}T07:15:00+05:30`,
    dateModified: digest.generatedAt ?? digest.publishedAt ?? `${digest.digestDate}T07:15:00+05:30`,
    author: {
      "@type": "Person",
      name: "Abhey Deep",
      url: `${SITE_ORIGIN}/about/`
    },
    publisher: {
      "@type": "Organization",
      name: "Market Narrative",
      url: SITE_ORIGIN,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_ORIGIN}/favicon.svg`
      }
    }
  };
}

export function multibaggerJsonLd(pageTitle, pageDescription, canonicalUrl, modelCount) {
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
      url: SITE_ORIGIN
    },
    author: {
      "@type": "Person",
      name: "Abhey Deep",
      url: `${SITE_ORIGIN}/about/`
    },
    about: ["Indian equities", "multibagger research", "portfolio tracker", `${modelCount} stock model`]
  };
}

export function tradingGuideJsonLd(digest, title, description) {
  const path = String(digest.canonicalPath || `/${digest.digestDate}/trading-guide/`);
  const url = `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    datePublished: digest.publishedAt ?? `${digest.digestDate}T07:15:00+05:30`,
    dateModified: digest.generatedAt ?? digest.publishedAt ?? `${digest.digestDate}T07:15:00+05:30`,
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    about: ["Nifty 50", "Bank Nifty", "conditional market preparation"],
    publisher: { "@type": "Organization", name: "Market Narrative", url: SITE_ORIGIN }
  };
}
