#!/usr/bin/env node
const origin = (process.env.LOCAL_PROD_ORIGIN || `http://127.0.0.1:${process.env.PORT || 4173}`).replace(/\/+$/, "");
const pages = [
  "/", "/latest/", "/latest/trading-guide/", "/indices/", "/multibagger/",
  "/money-flow/fii-dii/", "/market-statistics/", "/moves/", "/about/",
  "/subscribe/", "/contact/", "/privacy/", "/terms/"
];
const banned = [
  /Crude Driver/i,
  /Watch the First 15 Minutes/i,
  /Waiting for chart data/i,
  /placeholder=/i,
  /teleprompterScript|reelScript|positivePrompt/i
];

const failures = [];
for (const page of pages) await check(page);

if (failures.length) {
  process.stderr.write(`FAIL local-prod smoke\n${failures.map((f) => `- ${f}`).join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`PASS local-prod smoke for ${pages.length} pages at ${origin}\n`);

async function check(page) {
  try {
    const res = await fetch(`${origin}${page}`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const html = await res.text();
    for (const pattern of banned) {
      if (pattern.test(html)) throw new Error(`matched ${pattern}`);
    }
    if (!/viewport-fit=cover/i.test(html)) throw new Error("missing mobile viewport");
    if (!/not SEBI|not investment advice|educational/i.test(html)) throw new Error("missing disclaimer boundary");
  } catch (error) {
    failures.push(`${page}: ${error.message}`);
  }
}

