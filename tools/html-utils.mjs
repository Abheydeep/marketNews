/**
 * Shared HTML utilities and formatters for Market Narrative.
 * Respects ESM and the 200-line budget constraint.
 */

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&amp;(#\d+;|#x[\da-f]+;|[a-z]+;)/gi, "&$1")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function formatDigestDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00+05:30`));
}

export function formatGeneratedTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "Unavailable";
  }
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export function formatIndexValue(snapshot) {
  const value = Number(snapshot.closeValue);
  const close = Number.isFinite(value)
    ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : "value unavailable";
  const time = snapshot.dataTimestamp ? formatGeneratedTime(snapshot.dataTimestamp) : "";
  return time ? `${close} at ${time} IST` : close;
}

export function formatChange(changePercent) {
  return `${changePercent >= 0 ? "+" : ""}${Number(changePercent).toFixed(2)}%`;
}

export function formatSnapshotChange(snapshot) {
  const changePercent = Number(snapshot?.changePercent || 0);
  if (snapshot?.symbol === "BRENT" && Math.abs(changePercent) < 0.005) {
    const value = Number(snapshot?.closeValue);
    const label = Number.isFinite(value)
      ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 })
      : "shown";
    return `last close ${label}`;
  }
  return formatChange(changePercent);
}

export function formatCrore(value) {
  const sign = Number(value) >= 0 ? "+" : "-";
  const abs = Math.abs(Number(value) || 0);
  return `${sign}Rs ${Number(abs.toFixed(0)).toLocaleString("en-IN")} cr`;
}

export function formatInr(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "Pending quote";
  }
  return `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value))}`;
}

export function formatSignedInr(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "--";
  }
  const number = Number(value);
  const prefix = number > 0 ? "+" : number < 0 ? "-" : "";
  return `${prefix}INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.abs(number))}`;
}

export function formatPrice(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "Awaiting quote";
  }
  return `INR ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))}`;
}

export function formatPercent(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "--";
  }
  return `${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`;
}

export function formatSignedPercent(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "--";
  }
  const number = Number(value);
  const prefix = number > 0 ? "+" : "";
  return `${prefix}${number.toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`;
}
