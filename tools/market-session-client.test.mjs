import test from "node:test";
import assert from "node:assert/strict";
import { instrumentMarketState, instrumentSessionClientHelpers } from "./market-session-client.mjs";

test("instrument sessions distinguish NSE cash from GIFT Nifty", () => {
  const eveningIst = new Date("2026-07-01T16:20:00.000Z");
  assert.equal(instrumentMarketState("NIFTY", eveningIst), "closed");
  assert.equal(instrumentMarketState("GIFTNIFTY", eveningIst), "open");
});

test("instrument sessions close on weekends", () => {
  const saturday = new Date("2026-07-04T05:30:00.000Z");
  assert.equal(instrumentMarketState("NIFTY", saturday), "closed");
  assert.equal(instrumentMarketState("GIFTNIFTY", saturday), "closed");
});

test("instrument sessions support US windows that cross IST midnight", () => {
  const oneAmIst = new Date("2026-06-30T19:30:00.000Z");
  assert.equal(instrumentMarketState("SPX", oneAmIst), "open");
});

test("client helper exposes the same symbol-aware state function", () => {
  const script = instrumentSessionClientHelpers();
  assert.match(script, /marketStateForSymbol/);
  assert.match(script, /GIFTNIFTY/);
});
