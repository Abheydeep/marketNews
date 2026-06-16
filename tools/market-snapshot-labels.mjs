export function publicSnapshotSourceLabel(snapshot) {
  const source = String(snapshot?.source || "").trim();
  if (!/mock/i.test(source)) return source || "Yahoo Finance chart API";
  return snapshot?.symbol === "GIFTNIFTY" ? "GIFT City reference" : "Reference snapshot";
}
