import nodeTest from "node:test";
import defaultAssert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseParticipantCsv, ddmmyyyy, dayLabel, isoKey } from "./fii-dii-source.mjs";
import { fiiDiiPageBody } from "./fii-dii-page.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const SAMPLE_FII_OI = {
  idxFutLong: 30, idxFutShort: 70, stkFutLong: 120, stkFutShort: 40,
  idxCeLong: 5, idxPeLong: 5, idxCeShort: 5, idxPeShort: 5,
  stkCeLong: 5, stkPeLong: 5, stkCeShort: 5, stkPeShort: 5,
  totalLong: 175, totalShort: 130
};

const CASH = [
  { iso: "2026-06-23", date: "23-Jun-2026", cash: { fiiNet: -1000, fiiBuy: 5000, fiiSell: 6000, diiNet: 1500, diiBuy: 7000, diiSell: 5500 } },
  { iso: "2026-06-24", date: "24-Jun-2026", cash: { fiiNet: -2000, fiiBuy: 4000, fiiSell: 6000, diiNet: 3000, diiBuy: 8000, diiSell: 5000 } }
];
const FNO = [
  { iso: "2026-06-24", date: "24-Jun-2026", fnoOi: { fii: SAMPLE_FII_OI, dii: { ...SAMPLE_FII_OI, idxFutLong: 70, idxFutShort: 30 } } }
];

export async function runFiiDiiTests(test = nodeTest, assert = defaultAssert) {
  await test("parseParticipantCsv extracts FII and DII rows with correct columns", async () => {
    const csv = await readFile(join(here, "__fixtures__", "fao_participant_oi_sample.csv"), "utf8");
    const parsed = parseParticipantCsv(csv);
    assert.ok(parsed, "parser returned a result");
    assert.equal(parsed.fii.idxFutLong, 46870);
    assert.equal(parsed.fii.idxFutShort, 275923);
    assert.equal(parsed.fii.stkFutLong, 4081121);
    assert.equal(parsed.fii.totalLong, 6651547);
    assert.equal(parsed.dii.idxFutLong, 78988);
    assert.equal(parsed.dii.stkFutShort, 4502152);
  });

  await test("parseParticipantCsv rejects non-participant text", () => {
    assert.equal(parseParticipantCsv("not a report"), null);
    assert.equal(parseParticipantCsv(""), null);
  });

  await test("date formatters produce NSE-compatible strings", () => {
    const d = new Date(Date.UTC(2026, 5, 24));
    assert.equal(ddmmyyyy(d), "24062026");
    assert.equal(dayLabel(d), "24-Jun-2026");
    assert.equal(isoKey(d), "2026-06-24");
  });

  await test("fiiDiiPageBody renders tabs, charts and tables", () => {
    const { bodyHtml, faqItems } = fiiDiiPageBody(CASH, FNO);
    for (const marker of ["mf-tabs", "<svg", "F&amp;O Index", "F&amp;O Stock", "mf-table", "What the flow is saying"]) {
      assert.ok(bodyHtml.includes(marker), `body missing ${marker}`);
    }
    assert.ok(faqItems.length >= 3 && faqItems[0].name && faqItems[0].text, "faq items use name/text shape");
  });

  await test("interpretation reflects absorption, streak and FII futures tilt", () => {
    const { bodyHtml } = fiiDiiPageBody(CASH, FNO);
    assert.ok(bodyHtml.includes("net sellers"), "labels FIIs as net sellers");
    assert.ok(bodyHtml.includes("150%"), "computes DII absorption 3000/2000 = 150%");
    assert.ok(bodyHtml.includes("2 sessions running"), "detects the 2-session FII selling streak");
    assert.ok(/tilted short/.test(bodyHtml), "30% long index-futures book reads as tilted short");
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runFiiDiiTests();
}
