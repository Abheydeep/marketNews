import { test } from "node:test";
import assert from "node:assert";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cockpitPage } from "./cockpit-page.mjs";
import { multibaggerPage } from "./multibagger-page.mjs";
import { buildDigest } from "./core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// Files that should be checked for duplicate escapeHtml definitions
const ESCAPE_HTML_FILES = [
  "tools/publish-site.mjs",
  "tools/cockpit-page.mjs",
  "tools/project-components-page.mjs",
  "brand-assets.mjs",
  "fii-dii-format.mjs"
];

// Active allowlist - starting completely empty to prove it fails first on violations
const ESCAPE_HTML_ALLOWLIST = [];

/**
 * Scan a file to see if it defines a local escapeHtml function.
 */
function hasLocalEscapeHtml(content) {
  return /function escapeHtml\s*\(/.test(content);
}

/**
 * Verify sentinels are present in rendered HTML.
 */
export function verifyRenderedSentinels(html) {
  const hasTheme = html.includes("/* site-theme v1 */");
  const hasHeader = html.includes("<!-- site-header v1 -->");
  const hasFooter = html.includes("<!-- site-footer v1 -->");
  return { hasTheme, hasHeader, hasFooter };
}

test("architecture-guard: duplicate escapeHtml definitions (fails first)", async () => {
  let failedCount = 0;
  
  for (const relPath of ESCAPE_HTML_FILES) {
    const filePath = join(rootDir, "tools", relPath.includes("/") ? relPath.split("/")[1] : relPath);
    let content;
    try {
      content = await readFile(filePath, "utf8");
    } catch {
      continue; // Skip if file doesn't exist yet
    }

    if (hasLocalEscapeHtml(content)) {
      if (!ESCAPE_HTML_ALLOWLIST.includes(relPath)) {
        failedCount++;
      }
    }
  }

  assert.strictEqual(
    failedCount,
    0,
    `Found duplicate local escapeHtml definitions in non-allowlisted files. Must use tools/html-utils.mjs.`
  );
});

test("architecture-guard: negative test for escapeHtml detection", () => {
  const violatingContent = "function escapeHtml(value) { return value; }";
  const cleanContent = "import { escapeHtml } from './html-utils.mjs';";
  
  assert.ok(hasLocalEscapeHtml(violatingContent), "Should detect local escapeHtml definition");
  assert.ok(!hasLocalEscapeHtml(cleanContent), "Should not flag imported escapeHtml");
});

test("architecture-guard: negative test for sentinel validation", () => {
  const violatingHtml = "<html><head><style>:root { --paper: #000; }</style></head><body>No sentinels</body></html>";
  const cleanHtml = "<html><head><style>/* site-theme v1 */</style></head><body><!-- site-header v1 --><!-- site-footer v1 --></body></html>";
  
  const badRes = verifyRenderedSentinels(violatingHtml);
  const goodRes = verifyRenderedSentinels(cleanHtml);
  
  assert.ok(!badRes.hasTheme && !badRes.hasHeader && !badRes.hasFooter, "Should flag missing sentinels");
  assert.ok(goodRes.hasTheme && goodRes.hasHeader && goodRes.hasFooter, "Should recognize clean sentinels");
});

test("architecture-guard: verify rendered page sentinels in-memory", async () => {
  const digest = await buildDigest("2026-04-29");
  const cockpitHtml = cockpitPage(
    { ...digest, canonicalPath: "/29apr2026/" },
    "public-view",
    { includeStudio: true }
  );
  const multibaggerHtml = multibaggerPage();

  const cockpitRes = verifyRenderedSentinels(cockpitHtml);
  const multibaggerRes = verifyRenderedSentinels(multibaggerHtml);

  assert.ok(cockpitRes.hasTheme, "Cockpit page missing site-theme sentinel");
  assert.ok(cockpitRes.hasHeader, "Cockpit page missing site-header sentinel");
  assert.ok(cockpitRes.hasFooter, "Cockpit page missing site-footer sentinel");

  assert.ok(multibaggerRes.hasTheme, "Multibagger page missing site-theme sentinel");
  assert.ok(multibaggerRes.hasHeader, "Multibagger page missing site-header sentinel");
  assert.ok(multibaggerRes.hasFooter, "Multibagger page missing site-footer sentinel");
});
