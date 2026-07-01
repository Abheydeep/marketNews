import { pageShell } from "./page-shell.mjs";

export function legacyPublicPageShell(html, options) {
  const head = section(html, "head");
  const body = section(html, "body");
  const mainMatch = body.match(/<main\b([^>]*)>([\s\S]*?)<\/main>/i);
  if (!mainMatch) throw new Error("Legacy public renderer did not provide one main landmark");
  const mainClass = mainMatch[1].match(/\bclass=["']([^"']+)["']/i)?.[1] || "";
  const styles = [...head.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]).join("\n");
  const structuredData = [...head.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi)].map((match) => match[0]).join("\n");
  const supplementalHead = [...head.matchAll(/<(?:meta|link)\b[^>]*(?:robots|author|keywords|preload|preconnect|dns-prefetch|rel=["'](?:next|prev|alternate))[^>]*>/gi)].map((match) => match[0]).join("\n");
  const scripts = [...body.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)]
    .map((match) => match[0])
    .filter((script) => !script.includes("navigator.serviceWorker.register"))
    .join("\n");
  const main = mainMatch[2].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  return pageShell({
    ...options,
    head: structuredData,
    styles,
    headExtras: supplementalHead,
    main,
    mainClass,
    scripts
  });
}

function section(html, tag) {
  return String(html).match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] || "";
}
