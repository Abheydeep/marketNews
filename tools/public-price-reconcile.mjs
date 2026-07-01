const GENERATED_PRICE_FIELDS = [
  "title", "archiveSummary", "deskNote", "twoMinuteSummary", "watchItems",
  "onePageSummary", "todaysReadArticle", "themes", "reelScript", "asset", "dailyLead"
];
const INSTRUMENTS = [
  { symbol: "BRENT", pattern: /\b(brent|crude|oil)\b/gi },
  { symbol: "GOLD", pattern: /\b(gold|bullion)\b/gi }
];
const DOLLAR_AMOUNT = /\$(\d[\d,]*(?:\.\d+)?)/g;

export function reconcileGeneratedInstrumentPrices(digest) {
  const output = { ...digest };
  for (const key of GENERATED_PRICE_FIELDS) {
    if (key in output) output[key] = rewriteValue(output[key], digest?.marketSnapshots ?? []);
  }
  return output;
}

export function unsupportedInstrumentPrices(value, snapshots = []) {
  const violations = [];
  for (const text of stringsIn(value)) {
    for (const match of text.matchAll(DOLLAR_AMOUNT)) {
      const snapshot = nearestSnapshot(text, match.index, snapshots);
      if (snapshot && !allowedRounded(snapshot).has(Math.round(numberFrom(match[1])))) violations.push(match[0]);
    }
  }
  return violations;
}

function rewriteValue(value, snapshots) {
  if (typeof value === "string") {
    return value.replace(DOLLAR_AMOUNT, (amount, raw, offset, text) => {
      const snapshot = nearestSnapshot(text, offset, snapshots);
      if (!snapshot || allowedRounded(snapshot).has(Math.round(numberFrom(raw)))) return amount;
      return `$${Math.round(Number(snapshot.closeValue)).toLocaleString("en-US")}`;
    });
  }
  if (Array.isArray(value)) return value.map((item) => rewriteValue(item, snapshots));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteValue(item, snapshots)]));
}

function nearestSnapshot(text, amountIndex, snapshots) {
  let preceding = null;
  let following = null;
  for (const instrument of INSTRUMENTS) {
    const snapshot = snapshots.find((item) => item.symbol === instrument.symbol);
    if (!snapshot || !Number.isFinite(Number(snapshot.closeValue))) continue;
    instrument.pattern.lastIndex = 0;
    for (const match of text.matchAll(instrument.pattern)) {
      const distance = Math.abs(match.index - amountIndex);
      const candidate = { ...snapshot, distance };
      if (match.index <= amountIndex) {
        if (!preceding || distance < preceding.distance) preceding = candidate;
      } else if (!following || distance < following.distance) following = candidate;
    }
  }
  const best = preceding ?? following;
  return best && best.distance <= 180 ? best : null;
}

function allowedRounded(snapshot) {
  const value = Number(snapshot.closeValue);
  return new Set([Math.round(value), Math.floor(value), Math.ceil(value)]);
}

function numberFrom(raw) {
  return Number(String(raw).replaceAll(",", ""));
}

function stringsIn(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(stringsIn);
}
