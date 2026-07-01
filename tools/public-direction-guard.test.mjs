import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertPublicDirectionConsistency, directionConflicts, reconcilePublicDirection } from "./public-direction-guard.mjs";

test("direction guard: rejects the recorded GIFT contradiction", () => {
  const digest = {
    giftNiftyBias: { bias: "gap_up", gapPts: 198 },
    twoMinuteSummary: "GIFT Nifty indicates a flat start for Indian equities."
  };
  assert.equal(directionConflicts(digest.twoMinuteSummary, "gap_up"), true);
  assert.throws(() => assertPublicDirectionConsistency(digest), /twoMinuteSummary/);
});

test("direction guard: reconciles only opposing GIFT language", () => {
  const digest = reconcilePublicDirection({
    giftNiftyBias: { bias: "gap_up", gapPts: 198 },
    title: "GIFT Nifty signals firm open",
    twoMinuteSummary: "GIFT Nifty indicates a flat start. Brent is softer."
  });
  assert.equal(digest.twoMinuteSummary, "GIFT Nifty points to a firm open. Brent is softer.");
  assert.doesNotThrow(() => assertPublicDirectionConsistency(digest));
});

test("direction guard: handles gap-down copy symmetrically", () => {
  const digest = reconcilePublicDirection({
    dailyLead: { giftNiftyBias: { bias: "gap_down" } },
    deskNote: "GIFT Nifty suggests a positive start."
  });
  assert.equal(digest.deskNote, "GIFT Nifty points to a weak open.");
});

test("direction guard: core validates generated copy against the opening signal", async () => {
  const source = await readFile("tools/core.mjs", "utf8");
  assert.match(source, /assertDigestEditorialIntegrity\(\{[\s\S]*twoMinuteSummary,[\s\S]*giftNiftyBias: dailyLead\.giftNiftyBias/);
});
