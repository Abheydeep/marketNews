import nodeTest from "node:test";
import defaultAssert from "node:assert/strict";
import { buildSparklinePath } from "./indices-page.mjs";
import chartHandler from "../api/chart.mjs";

export async function runIndicesTests(test = nodeTest, assert = defaultAssert) {
  await test("buildSparklinePath handles empty points gracefully", () => {
    const path = buildSparklinePath([], "idx-flat");
    assert.ok(path.includes("line"));
    assert.ok(path.includes("stroke"));
  });

  await test("buildSparklinePath draws positive and negative sparklines", () => {
    const points = [{ close: 100 }, { close: 110 }, { close: 105 }];
    const posPath = buildSparklinePath(points, "idx-pos");
    const negPath = buildSparklinePath(points, "idx-neg");
    
    assert.ok(posPath.includes("path"));
    assert.ok(posPath.includes("var(--up-idx)"));
    assert.ok(negPath.includes("var(--down-idx)"));
  });

  await test("api/chart.mjs rejects non-GET requests", async () => {
    const req = { method: "POST" };
    let jsonPayload = null;
    let statusVal = null;
    const res = {
      setHeader() {},
      status(code) { statusVal = code; return this; },
      json(data) { jsonPayload = data; return this; }
    };
    await chartHandler(req, res);
    assert.equal(statusVal, 405);
    assert.equal(jsonPayload.error, "method_not_allowed");
  });

  await test("api/chart.mjs validates symbol and range parameters", async () => {
    const req = { method: "GET", query: {} };
    let jsonPayload = null;
    let statusVal = null;
    const res = {
      status(code) { statusVal = code; return this; },
      json(data) { jsonPayload = data; return this; }
    };
    await chartHandler(req, res);
    assert.equal(statusVal, 400);
    assert.equal(jsonPayload.error, "missing_required_params");
  });

  await test("api/chart.mjs rejects invalid symbols or ranges", async () => {
    const req = { method: "GET", query: { symbol: "INVALID", range: "1d" } };
    let jsonPayload = null;
    let statusVal = null;
    const res = {
      status(code) { statusVal = code; return this; },
      json(data) { jsonPayload = data; return this; }
    };
    await chartHandler(req, res);
    assert.equal(statusVal, 400);
    assert.equal(jsonPayload.error, "invalid_symbol");
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runIndicesTests();
}
