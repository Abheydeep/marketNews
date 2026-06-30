import { test } from "node:test";
import assert from "node:assert";
import { escapeHtml, formatChange, formatDigestDate, formatCrore } from "./html-utils.mjs";
import { SYMBOL_MAP, DISCLAIMER } from "./site-constants.mjs";

test("html-utils: escapeHtml", () => {
  assert.strictEqual(escapeHtml("<script>alert('x')</script>"), "&lt;script&gt;alert('x')&lt;/script&gt;");
  assert.strictEqual(escapeHtml('Hello "World" & others'), "Hello &quot;World&quot; &amp; others");
});

test("html-utils: formatChange", () => {
  assert.strictEqual(formatChange(0.123), "+0.12%");
  assert.strictEqual(formatChange(-1.5), "-1.50%");
  assert.strictEqual(formatChange(0), "+0.00%");
});

test("html-utils: formatDigestDate", () => {
  assert.strictEqual(formatDigestDate("2026-06-29"), "Mon, 29 Jun, 2026");
});

test("html-utils: formatCrore", () => {
  assert.strictEqual(formatCrore(1234.56), "+Rs 1,235 cr");
  assert.strictEqual(formatCrore(-500), "-Rs 500 cr");
});

test("site-constants: SYMBOL_MAP", () => {
  assert.strictEqual(SYMBOL_MAP.NIFTY, "^NSEI");
  assert.strictEqual(SYMBOL_MAP.BANKNIFTY, "^NSEBANK");
});
