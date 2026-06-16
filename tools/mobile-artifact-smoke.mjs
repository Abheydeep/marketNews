#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const root = process.argv[2] || "public";
const routes = [
  "/", "/latest/", "/latest/trading-guide/", "/indices/", "/multibagger/",
  "/money-flow/fii-dii/", "/market-statistics/", "/moves/", "/about/",
  "/subscribe/", "/contact/", "/privacy/", "/terms/"
];
const failures = [];

await assertDirectory(root);
for (const route of routes) {
  await checkRoute(route);
}

if (failures.length) {
  process.stderr.write(`FAIL mobile artifact smoke\n${failures.map((item) => `- ${item}`).join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`PASS mobile artifact smoke for ${routes.length} routes in ${root}\n`);

async function assertDirectory(path) {
  try {
    const info = await stat(path);
    if (!info.isDirectory()) failures.push(`${path}: not a directory`);
  } catch (error) {
    failures.push(`${path}: ${error.message}`);
  }
}

async function checkRoute(route) {
  const file = route === "/" ? join(root, "index.html") : join(root, route, "index.html");
  try {
    const html = await readFile(file, "utf8");
    assertMatch(route, html, /viewport-fit=cover/i, "missing mobile viewport");
    assertMatch(route, html, /@media\s*\(max-width:\s*(?:760|768|820|900)px\)|mobile-shell|bottom-tab-bar/i, "missing mobile responsive hooks");
    const widthScanHtml = stripScrollTableWidths(html);
    assertNoMatch(route, widthScanHtml, /(^|[^-])(?:min-width|width):\s*(?:9\d{2}|[1-9]\d{3,})px/i, "contains large fixed width");
    if (!["/privacy/", "/terms/"].includes(route)) {
      assertNoMatch(route, html, /overflow-x:\s*visible/i, "allows visible horizontal overflow");
    }
  } catch (error) {
    failures.push(`${route}: ${error.message}`);
  }
}

function assertMatch(route, html, pattern, message) {
  if (!pattern.test(html)) failures.push(`${route}: ${message}`);
}

function assertNoMatch(route, html, pattern, message) {
  if (pattern.test(html)) failures.push(`${route}: ${message}`);
}

function stripScrollTableWidths(html) {
  if (!/\.table-wrap\s*\{[^}]*overflow-x:\s*auto/is.test(html)) return html;
  return html
    .replace(/table\s*\{[^}]*min-width:\s*(?:9\d{2}|[1-9]\d{3,})px;?[^}]*\}/gis, "")
    .replace(/\.[\w-]*table\s*\{[^}]*min-width:\s*(?:9\d{2}|[1-9]\d{3,})px;?[^}]*\}/gis, "");
}
