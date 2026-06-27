// Shared formatting + derivation helpers for the FII/DII page modules.

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** "+₹1,234 Cr" / "−₹987 Cr" for a crore value. */
export function fmtCr(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}₹${Math.abs(Math.round(n)).toLocaleString("en-IN")} Cr`;
}

/** Plain grouped integer, e.g. contract counts. */
export function fmtNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n).toLocaleString("en-IN") : "—";
}

export function signClass(value) {
  const n = Number(value);
  return n > 0 ? "pos" : n < 0 ? "neg" : "flat";
}

/** Net long contracts (long − short) for a futures leg. */
export function fnoNet(row, longKey, shortKey) {
  if (!row) return null;
  return Number(row[longKey] || 0) - Number(row[shortKey] || 0);
}

/** Long share of a futures book as a 0–100 percentage. */
export function longRatio(row, longKey, shortKey) {
  if (!row) return null;
  const long = Number(row[longKey] || 0);
  const short = Number(row[shortKey] || 0);
  const total = long + short;
  return total > 0 ? (long / total) * 100 : null;
}

/** Month label like "Jun 2026" from a "DD-Mon-YYYY" string. */
export function monthLabel(dayLabel) {
  const m = /^\d{1,2}-([A-Za-z]{3})-(\d{4})$/.exec(String(dayLabel || ""));
  return m ? `${m[1]} ${m[2]}` : "";
}

/** Short "DD Mon" axis label from a "DD-Mon-YYYY" string. */
export function shortDay(dayLabel) {
  const m = /^(\d{1,2})-([A-Za-z]{3})-\d{4}$/.exec(String(dayLabel || ""));
  return m ? `${m[1]} ${m[2]}` : String(dayLabel || "");
}
