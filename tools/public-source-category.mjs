const POSITIVE_MARKET_CUE = /\b(?:rally|rallies|gain|gains|climb|climbs|surge|surges|advance|advances|jump|jumps|higher)\b/i;
const ACTIVE_RISK_CUE = /\b(?:war|attack|tension|iran|hormuz|tariff|sanction|conflict|missile|strike)\b/i;

export function normalizePublicSourceCategory(article = {}) {
  if (article.category !== "global_risk") {
    return article;
  }
  const headline = String(article.headline || "");
  if (!POSITIVE_MARKET_CUE.test(headline) || ACTIVE_RISK_CUE.test(headline)) {
    return article;
  }
  return { ...article, category: "macro_positive" };
}
