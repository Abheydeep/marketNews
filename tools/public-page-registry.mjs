export const DEFAULT_PUBLIC_SITE_ORIGIN = "https://www.marketnarrative.in";

export function publicSiteOrigin() {
  const origin = (process.env.PUBLIC_SITE_ORIGIN || DEFAULT_PUBLIC_SITE_ORIGIN).replace(/\/+$/, "");
  return /^https:\/\/marketnarrative\.in$/i.test(origin) ? DEFAULT_PUBLIC_SITE_ORIGIN : origin;
}

export function absolutePublicUrl(path = "/", origin = publicSiteOrigin()) {
  const value = String(path || "/");
  if (/^https?:\/\//i.test(value)) return value;
  return `${origin}${value.startsWith("/") ? value : `/${value}`}`;
}

export function brandedTitle(label) {
  const clean = String(label || "").replace(/\s*[|—-]\s*Market Narrative\s*$/i, "").trim();
  return clean ? `${clean} | Market Narrative` : "Market Narrative";
}

export const PUBLIC_PAGES = Object.freeze({
  home: { path: "/", title: "Pre-Market Briefing for Indian Traders", mobileKey: "archive", socialKey: "home" },
  latest: { path: "/latest/", title: "Latest Briefing", mobileKey: "latest", socialKey: "briefing" },
  guide: { path: "/latest/trading-guide/", title: "Latest Trading Guide", mobileKey: "latest", socialKey: "guide" },
  archive: { path: "/archive/", title: "Archive", mobileKey: "", socialKey: "archive" },
  indices: { path: "/indices/", title: "Global Indices Watch", mobileKey: "indices", socialKey: "indices" },
  giftNifty: { path: "/indices/gift-nifty/", title: "GIFT Nifty", mobileKey: "indices", socialKey: "indices" },
  fiiDii: { path: "/money-flow/fii-dii/", title: "FII/DII Money Flow", mobileKey: "fiidii", socialKey: "fii-dii" },
  statistics: { path: "/market-statistics/", title: "Market Statistics", mobileKey: "", socialKey: "statistics" },
  moves: { path: "/moves/", title: "Market Moves", mobileKey: "", socialKey: "moves" },
  portfolio: { path: "/multibagger/", title: "Multibagger Model Tracker", mobileKey: "portfolio", socialKey: "portfolio" },
  about: { path: "/about/", title: "About", mobileKey: "", socialKey: "about" },
  subscribe: { path: "/subscribe/", title: "Subscribe", mobileKey: "", socialKey: "subscribe" },
  contact: { path: "/contact/", title: "Contact", mobileKey: "", socialKey: "about" },
  privacy: { path: "/privacy/", title: "Privacy Policy", mobileKey: "", socialKey: "about" },
  terms: { path: "/terms/", title: "Terms of Use", mobileKey: "", socialKey: "about" }
});

export function socialCardUrl(key = "home", origin = publicSiteOrigin()) {
  return `${origin}/assets/social/${String(key).replace(/[^a-z0-9-]/gi, "-")}.png`;
}
