import { test } from "node:test";
import assert from "node:assert";
import { mapPointsToSvgCoords, buildSparklinePath, chartClientScript } from "./chart-svg.mjs";

test("chart-svg: mapPointsToSvgCoords maps correctly", () => {
  const points = [10, 20, 15];
  const result = mapPointsToSvgCoords(points, { padLeft: 0, width: 100, yZero: 100, yHeight: 50 });
  
  assert.ok(result);
  assert.strictEqual(result.min, 10);
  assert.strictEqual(result.max, 20);
  assert.strictEqual(result.last, 15);
  
  // Checking coordinates
  // 10 -> (0, 100)
  // 20 -> (50, 50)
  // 15 -> (100, 75)
  assert.deepStrictEqual(result.pathPoints, [
    { x: 0, y: 100 },
    { x: 50, y: 50 },
    { x: 100, y: 75 }
  ]);
});

test("chart-svg: buildSparklinePath output structure", () => {
  const points = [10, 20, 15];
  const svg = buildSparklinePath(points, "idx-pos");
  
  assert.ok(svg.includes("<path"));
  assert.ok(svg.includes("d=\"M 0.0,34.0 L 50.0,4.0 L 100.0,19.0\""));
  assert.ok(svg.includes("stroke=\"var(--up-idx)\""));
});

test("chart-svg: server and client coordinate parity", () => {
  const points = [12000.5, 12050.2, 12025.1];
  const options = { padLeft: 10, width: 520, yZero: 205, yHeight: 190 };
  
  // 1. Get server-rendered coordinates
  const serverResult = mapPointsToSvgCoords(points, options);
  
  // 2. Evaluate client-rendered javascript in-memory
  const clientCode = `
    ${chartClientScript()}
    return mapPointsToSvgCoords(arguments[0], arguments[1]);
  `;
  const clientFn = new Function(clientCode);
  const clientResult = clientFn(points, options);
  
  // 3. Assert exact mathematical parity
  assert.deepStrictEqual(serverResult, clientResult, "Client-side and server-side coordinate mapping must yield identical math output");
});
