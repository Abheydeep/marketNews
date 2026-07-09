import test from "node:test";
import assert from "node:assert/strict";
import { publicCopyClientScript, sanitizePublicHtml, stripPublicJargon } from "./public-copy-sanitizer.mjs";

test("public copy sanitizer handles punctuation variants", () => {
  assert.equal(stripPublicJargon("Opening-range, first-hour range, advance decline and risk-appetite"), "first hour, first hour, market participation and investor confidence");
});

test("HTML sanitizer leaves code intact and cleans visible text", () => {
  const html = sanitizePublicHtml("<script>const label='VWAP'</script><p>VWAP and breadth</p>");
  assert.match(html, /label='VWAP'/);
  assert.match(html, /session average and market participation/);
});

test("client sanitizer covers dynamically rendered public text", () => {
  const script = publicCopyClientScript();
  assert.match(script, /MutationObserver/);
  assert.match(script, /opening\[- \]range/);
});
