const COPY_FIELDS = [
  "title", "archiveSummary", "twoMinuteSummary", "deskNote",
  "todaysReadArticle", "onePageSummary", "teleprompterScript", "reelScript"
];

export function publicOpeningDirection(digest) {
  return digest?.giftNiftyBias?.bias || digest?.dailyLead?.giftNiftyBias?.bias || "";
}

export function directionConflicts(value, direction) {
  const text = String(value || "");
  if (!/\bgift nifty\b/i.test(text)) return false;
  if (direction === "gap_up") return /\bgift nifty[^.!?\n]{0,90}\b(?:flat|negative|weak|gap[- ]down)\b/i.test(text);
  if (direction === "gap_down") return /\bgift nifty[^.!?\n]{0,90}\b(?:firm|positive|strong|gap[- ]up)\b/i.test(text);
  if (direction === "flat") return /\bgift nifty[^.!?\n]{0,90}\bgap[- ](?:up|down)\b/i.test(text);
  return false;
}

export function reconcilePublicDirection(digest) {
  const direction = publicOpeningDirection(digest);
  if (!direction) return digest;
  const next = { ...digest };
  for (const field of COPY_FIELDS) next[field] = reconcileValue(next[field], direction);
  next.watchItems = (next.watchItems || []).map((item) => reconcileValue(item, direction));
  return next;
}

export function assertPublicDirectionConsistency(digest) {
  const direction = publicOpeningDirection(digest);
  if (!direction) return;
  const failures = COPY_FIELDS.filter((field) => directionConflicts(digest?.[field], direction));
  if (failures.length) throw new Error(`Digest direction integrity failed: ${direction} conflicts in ${failures.join(", ")}`);
}

function reconcileValue(value, direction) {
  if (typeof value !== "string" || !directionConflicts(value, direction)) return value;
  const signal = direction === "gap_up" ? "a firm open" : direction === "gap_down" ? "a weak open" : "a flat open";
  return value.replace(
    /\bGIFT Nifty(?:'s)?[^.!?\n]{0,45}\b(?:flat|negative|weak|gap[- ]down|firm|positive|strong|gap[- ]up)\b(?:\s+(?:start|open|opening|indication))?/gi,
    `GIFT Nifty points to ${signal}`
  );
}
