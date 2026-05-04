const CATEGORY_FALLBACKS = {
  macro_negative: { label: "Rates", theme: "Macro Pressure", accent: "#dc2626" },
  macro_positive: { label: "Earnings", theme: "Risk Appetite", accent: "#059669" },
  sector_positive: { label: "Sector", theme: "Sector Watch", accent: "#2563eb" },
  sector_negative: { label: "Sector", theme: "Sector Pressure", accent: "#b45309" },
  global_risk: { label: "Risk", theme: "Global Risk", accent: "#7c3aed" },
  neutral_volatile: { label: "Range", theme: "Volatility", accent: "#0891b2" }
};

const ARTICLE_RULES = [
  [/bank of england|boe|bailey|central banks?|stagflation/, "BoE Rates", "Central Banks", "#dc2626"],
  [/core inflation|pce|inflation rate|prices? .*march/, "Inflation", "US Macro", "#ef4444"],
  [/japan|yen|currency intervention|fx intervention/, "Yen Watch", "FX Intervention", "#0ea5e9"],
  [/crude exports?|tankers?|gulf coast|oil exports?/, "Crude Exports", "Oil Supply", "#f97316"],
  [/opec|production boost|oil production/, "OPEC", "Oil Supply", "#f97316"],
  [/jet fuel|airlines?|aviation/, "Jet Fuel", "Aviation Cost", "#f59e0b"],
  [/hormuz|strait|iran war|middle east/, "Hormuz", "Oil Shock", "#7c3aed"],
  [/keystone|pipeline|refiner|refinery/, "Pipeline", "Oil Infra", "#ea580c"],
  [/exxon|mobil/, "Exxon", "Oil Majors", "#ea580c"],
  [/jobs day|semiconductor|chips?|chipmakers?/, "Jobs + Chips", "US Calendar", "#059669"],
  [/apple|iphone|mac\b/, "Apple", "Big Tech", "#2563eb"],
  [/palantir/, "Palantir", "Software", "#2563eb"],
  [/\bai\b|artificial intelligence|global tech|nasdaq/, "AI Capex", "Global Tech", "#7c3aed"],
  [/s&p 500 profits?|s&p 500 earnings|earnings madness/, "S&P Profits", "US Earnings", "#059669"],
  [/eli lilly|zepbound|mounjaro/, "Eli Lilly", "Pharma", "#10b981"],
  [/carvana|used car/, "Carvana", "US Autos", "#0891b2"],
  [/ford|auto giants?|luxury auto/, "Autos", "US Autos", "#b45309"],
  [/blue owl|spacex|private credit|saba|boaz weinstein/, "SpaceX", "Private Markets", "#0891b2"]
];

export function articleThumbnailMeta(article) {
  const headline = String(article?.headline || article?.title || "");
  const summary = String(article?.summary || article?.takeaway || "");
  const entityName = String(article?.entityName || "");
  const category = article?.category || "market";
  const text = `${headline} ${summary} ${entityName}`.toLowerCase();
  const fallback = CATEGORY_FALLBACKS[category] || { label: compactLabel(entityName || "Market"), theme: "Verified Source", accent: "#2563eb" };
  const matched = ARTICLE_RULES.find(([pattern]) => pattern.test(text));
  const meta = matched
    ? { label: matched[1], theme: matched[2], accent: matched[3] }
    : {
      label: compactLabel(entityName || fallback.label),
      theme: compactTheme(headline, fallback.theme),
      accent: fallback.accent
    };

  return {
    ...meta,
    alt: headline ? `${headline} source thumbnail` : `${meta.label} source thumbnail`
  };
}

function compactLabel(value) {
  const cleaned = String(value || "Market")
    .replace(/\b(Nifty|Global|Market|Index|Source)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return titleCase(cleaned || "Market").slice(0, 18);
}

function compactTheme(headline, fallback) {
  const words = String(headline || "")
    .replace(/['"“”‘’]/g, "")
    .split(/\s+/)
    .filter((word) => /^[A-Za-z0-9&+-]{3,}$/.test(word))
    .filter((word) => !/^(this|that|with|from|into|after|before|during|stock|stocks|market|markets|says|report|reports)$/i.test(word))
    .slice(0, 2);
  return words.length ? titleCase(words.join(" ")) : fallback;
}

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b[a-z0-9]/g, (letter) => letter.toUpperCase());
}
