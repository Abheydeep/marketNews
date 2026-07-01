import { test } from "node:test";
import assert from "node:assert";
import { readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cockpitPage } from "./cockpit-page.mjs";
import { multibaggerAdminPage, multibaggerPage } from "./multibagger-page.mjs";
import { buildDigest } from "./core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const CANONICAL_THEME_TOKEN_DEFINITION = /--(?:paper|ink|muted|line|panel|accent|cyan|up|down)\s*:/i;
const PUBLIC_CHROME_SELECTOR_DEFINITION = /^\s*[^\n{}]*\.(?:topbar|site-chrome-shell|nav-inner|site-tabs|tab-link|site-footer|footer-brand|footer-cols|footer-legal)\b[^\n{}]*\{/im;

export const hasLocalThemeTokenDefinition = (content) => CANONICAL_THEME_TOKEN_DEFINITION.test(content);
export function hasLocalPublicChromeDefinition(content) {
  const blocks = [...content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]);
  return PUBLIC_CHROME_SELECTOR_DEFINITION.test(blocks.length ? blocks.join("\n") : content);
}

function publicRendererSource(content, normPath) {
  if (normPath === "tools/multibagger-page.mjs") {
    return content.split("export function multibaggerAdminPage")[0];
  }
  if (normPath === "tools/cockpit-page.mjs") {
    return content.replace(/body\.admin-auth-required[^{}]*\{[^{}]*\}/g, "");
  }
  return content;
}

function isSharedChromeOwner(normPath) {
  return ["tools/site-chrome.mjs", "tools/mobile-shell.mjs", "tools/project-components-page.mjs"].includes(normPath);
}

function isRawFetchExempt(normPath) {
  if (normPath === "tools/http.mjs") return true;
  return ["smoke", "qa", "soak", "regression"].some((part) => normPath.includes(part));
}

function isConsoleAllowed(normPath) {
  if (
    normPath.endsWith(".test.mjs") ||
    normPath.includes("verify") ||
    normPath.includes("smoke") ||
    normPath.includes("qa") ||
    normPath.includes("demo") ||
    normPath.includes("soak") ||
    normPath.includes("regression")
  ) {
    return true;
  }
  return normPath === "tools/logger.mjs" || normPath === "tools/client-logger.mjs";
}

function stripCode(code) {
  let result = "", i = 0, state = "normal", escape = false;
  while (i < code.length) {
    const char = code[i], next = code[i + 1];
    if (state === "normal") {
      if (char === "/" && next === "/") { state = "line-comment"; i += 2; continue; }
      if (char === "/" && next === "*") { state = "block-comment"; i += 2; continue; }
      if (char === "'") { state = "single-quote"; escape = false; }
      else if (char === '"') { state = "double-quote"; escape = false; }
      else if (char === "`") { state = "template"; escape = false; }
      result += char;
    } else if (state === "line-comment") {
      if (char === "\n" || char === "\r") { state = "normal"; result += char; }
    } else if (state === "block-comment") {
      if (char === "*" && next === "/") { state = "normal"; i += 2; continue; }
    } else if (state === "single-quote" || state === "double-quote" || state === "template") {
      if (escape) escape = false;
      else if (char === "\\") escape = true;
      else if (char === (state === "single-quote" ? "'" : state === "double-quote" ? '"' : "`")) state = "normal";
    }
    i++;
  }
  return result;
}

async function getJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const res = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["__fixtures__", "__tests__", "node_modules", ".next"].includes(entry.name)) {
        files.push(...(await getJsFiles(res)));
      }
    } else if (entry.isFile() && (entry.name.endsWith(".mjs") || entry.name.endsWith(".js")) && !entry.name.endsWith(".test.mjs") && entry.name !== "verify.mjs") {
      files.push(res);
    }
  }
  return files;
}

export function verifyRenderedSentinels(html) {
  const hasTheme = html.includes("/* site-theme v1 */");
  const hasHeader = html.includes("<!-- site-header v1 -->");
  const hasFooter = html.includes("<!-- site-footer v1 -->");
  const rootMatches = html.match(/:root\s*\{/gi) || [];
  const hasMultipleRoots = rootMatches.length > 1;

  const headerMarker = '<!-- site-header v1 -->';
  const headerIdx = html.indexOf(headerMarker);
  let hasOwnTopbar = false;
  if (headerIdx !== -1) {
    const afterHeader = html.slice(headerIdx + headerMarker.length);
    const navEndIdx = afterHeader.indexOf('</nav>');
    if (navEndIdx !== -1) {
      const restHtml = html.slice(0, headerIdx) + afterHeader.slice(navEndIdx + 6);
      if (restHtml.includes('class="topbar"')) hasOwnTopbar = true;
    }
  }

  const footerMarker = '<!-- site-footer v1 -->';
  const footerIdx = html.indexOf(footerMarker);
  let hasOwnFooter = false;
  if (footerIdx !== -1) {
    const afterFooter = html.slice(footerIdx + footerMarker.length);
    const footerEndIdx = afterFooter.indexOf('</footer>');
    if (footerEndIdx !== -1) {
      const restHtml = html.slice(0, footerIdx) + afterFooter.slice(footerEndIdx + 9);
      if (restHtml.includes('class="site-footer"')) hasOwnFooter = true;
    }
  }
  return { hasTheme, hasHeader, hasFooter, hasMultipleRoots, hasOwnTopbar, hasOwnFooter };
}

test("architecture-guard: strict code pattern enforcement", async () => {
  const toolsFiles = await getJsFiles(join(rootDir, "tools"));
  const apiFiles = await getJsFiles(join(rootDir, "api"));
  const allFiles = [...toolsFiles, ...apiFiles];

  for (const filePath of allFiles) {
    const normPath = filePath.replace(rootDir + "/", "");
    const content = await readFile(filePath, "utf8");
    const stripped = stripCode(content);

    if (/(?:function|const|let|var)\s+escapeHtml\b/.test(stripped) && normPath !== "tools/html-utils.mjs") {
      throw new Error(`File ${normPath} defines local escapeHtml. Must import from tools/html-utils.mjs.`);
    }
    if (/\bfetch\(\s*(?![`])/.test(stripped) && !isRawFetchExempt(normPath)) {
      throw new Error(`File ${normPath} uses raw fetch. Must use fetchWithRetry or be an operational probe.`);
    }
    if (/\bconsole\.(?:log|error|warn|info|debug)\b/.test(stripped) && !isConsoleAllowed(normPath)) {
      throw new Error(`File ${normPath} uses raw console logging. Must use log from tools/logger.mjs.`);
    }
    if (content.includes("not SEBI-registered investment advice") && normPath !== "tools/site-constants.mjs") {
      throw new Error(`File ${normPath} contains raw SEBI disclaimer. Must use site-constants.mjs.`);
    }
    if (/:root\s*\{/.test(content) && normPath !== "tools/site-theme.mjs") {
      throw new Error(`File ${normPath} contains a :root style block. All variables must be defined in tools/site-theme.mjs.`);
    }
    if (hasLocalThemeTokenDefinition(content) && normPath !== "tools/site-theme.mjs") {
      throw new Error(`File ${normPath} defines a canonical theme token. Use site-theme.mjs or a namespaced component token.`);
    }
    if (hasLocalPublicChromeDefinition(publicRendererSource(content, normPath)) && !isSharedChromeOwner(normPath)) {
      throw new Error(`File ${normPath} defines shared public chrome CSS. Use tools/site-chrome.mjs or tools/mobile-shell.mjs.`);
    }
    if (content.includes("https://marketnarrative.in")) throw new Error(`File ${normPath} hardcodes the apex public host. Use publicSiteOrigin() so public metadata stays on www.`);
  }
});

test("architecture-guard: canonical theme definitions cannot hide under another selector", () => {
  assert.equal(hasLocalThemeTokenDefinition("body { --paper:#000; }"), true);
  assert.equal(hasLocalThemeTokenDefinition("body { color:var(--paper); }"), false);
});

test("architecture-guard: public chrome CSS cannot hide under a scoped selector", () => {
  assert.equal(hasLocalPublicChromeDefinition("body.glass-v2 .topbar { color:red; }"), true);
  assert.equal(hasLocalPublicChromeDefinition(".idx-card { color:var(--ink); }"), false);
});

test("architecture-guard: verify rendered page sentinels in-memory", async () => {
  const digest = await buildDigest("2026-04-29");
  const cockpitHtml = cockpitPage({ ...digest, canonicalPath: "/29apr2026/" }, "public-view", { includeStudio: true });
  const multibaggerHtml = multibaggerPage();
  const multibaggerAdminHtml = multibaggerAdminPage();

  const cockpitRes = verifyRenderedSentinels(cockpitHtml);
  const multibaggerRes = verifyRenderedSentinels(multibaggerHtml);
  const multibaggerAdminRes = verifyRenderedSentinels(multibaggerAdminHtml);

  assert.ok(cockpitRes.hasTheme, "Cockpit page missing site-theme sentinel");
  assert.ok(cockpitRes.hasHeader, "Cockpit page missing site-header sentinel");
  assert.ok(cockpitRes.hasFooter, "Cockpit page missing site-footer sentinel");
  assert.ok(!cockpitRes.hasMultipleRoots, "Cockpit page has multiple :root styles");
  assert.ok(!cockpitRes.hasOwnTopbar, "Cockpit page defines custom topbar nav block");
  assert.ok(!cockpitRes.hasOwnFooter, "Cockpit page defines custom footer block");

  assert.ok(multibaggerRes.hasTheme, "Multibagger page missing site-theme sentinel");
  assert.ok(multibaggerRes.hasHeader, "Multibagger page missing site-header sentinel");
  assert.ok(multibaggerRes.hasFooter, "Multibagger page missing site-footer sentinel");
  assert.ok(!multibaggerRes.hasMultipleRoots, "Multibagger page has multiple :root styles");
  assert.ok(!multibaggerRes.hasOwnTopbar, "Multibagger page defines custom topbar nav block");
  assert.ok(!multibaggerRes.hasOwnFooter, "Multibagger page defines custom footer block");
  assert.ok(multibaggerAdminRes.hasTheme, "Multibagger admin page missing site-theme sentinel");
  assert.ok(!multibaggerAdminRes.hasMultipleRoots, "Multibagger admin page has multiple :root styles");
});
