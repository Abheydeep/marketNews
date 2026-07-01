import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pageShell } from "./page-shell.mjs";
import { normalizePublicSourceCategory } from "./public-source-category.mjs";

function tagCount(html, tag) {
  return (html.match(new RegExp(`<${tag}\\b`, "gi")) || []).length;
}

function duplicateIds(html) {
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]);
  return ids.filter((id, index) => ids.indexOf(id) !== index);
}

test("public pages: shared shell has complete metadata and unique ids", () => {
  const html = pageShell({ title: "Indices & Markets", main: "<h1>Indices</h1>" });
  assert.equal(tagCount(html, "title"), 1);
  assert.match(html, /<title>Indices &amp; Markets<\/title>/);
  assert.equal(tagCount(html, "main"), 1);
  assert.deepEqual(duplicateIds(html), []);
});

test("public pages: layouts rely on the shell main landmark", async () => {
  for (const path of ["tools/indices-layout.mjs", "tools/gift-nifty-layout.mjs"]) {
    assert.doesNotMatch(await readFile(path, "utf8"), /<main class="idx-layout-shell">/, path);
  }
});

test("public pages: archive consumes the shared shell", async () => {
  const source = await readFile("tools/archive-page.mjs", "utf8");
  assert.match(source, /import \{ pageShell \}/);
  assert.match(source, /mobileActiveKey:\s*"archive"/);
  assert.doesNotMatch(source, /class="top-bar"/);
});

test("public pages: guide refresh never resolves below trading-guide", async () => {
  const source = await readFile("tools/cockpit-page.mjs", "utf8");
  assert.match(source, /guideSuffix = '\/trading-guide\/'/);
  assert.match(source, /briefingPath = path\.endsWith\(guideSuffix\)/);
  assert.doesNotMatch(source, /localPreview && publicUrl/);
});

test("public sources: positive market cues do not collapse into geopolitical risk", () => {
  const corrected = normalizePublicSourceCategory({
    headline: "Global Market Today: Asian stocks climb on tech rally",
    category: "global_risk"
  });
  assert.equal(corrected.category, "macro_positive");
  const preserved = normalizePublicSourceCategory({
    headline: "Asian markets gain as investors await Iran talks",
    category: "global_risk"
  });
  assert.equal(preserved.category, "global_risk");
});

test("public sources: dead and unsupported endpoints are absent", async () => {
  const news = await readFile("tools/news-sources.mjs", "utf8");
  const market = `${await readFile("tools/market-data.mjs", "utf8")}\n${await readFile("tools/http.mjs", "utf8")}`;
  const images = await readFile("tools/generate-article-image.mjs", "utf8");
  assert.doesNotMatch(news, /bqprime\.com\/feeds\/rss-all/);
  assert.doesNotMatch(market, /market-data\/fii-dii-activity/);
  assert.match(market, /reports\/fii-dii/);
  assert.doesNotMatch(images, /qwen-image/);
});
