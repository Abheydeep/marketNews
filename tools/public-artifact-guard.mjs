import { assertPublicBriefingCopy } from "./editorial-guardrails.mjs";
import { isLivePriceTracker } from "./article-triage.mjs";
import { unsupportedInstrumentPrices } from "./public-price-reconcile.mjs";

export function assertPublicDigestArtifact(label, digest) {
  const violations = [];
  const cards = [...(digest?.news ?? []), ...(digest?.newsCards ?? [])];
  for (const [index, card] of cards.entries()) {
    const headline = card?.headline ?? card?.title ?? "";
    if (isLivePriceTracker({ headline })) {
      violations.push(`news[${index}] is a live-price tracker: ${headline}`);
    }
  }

  for (const amount of unsupportedInstrumentPrices(digest, digest?.marketSnapshots ?? [])) violations.push(`unsupported instrument price ${amount}`);

  assertPublicBriefingCopy(label, JSON.stringify(digest));
  if (violations.length) {
    throw new Error(`Public artifact guard failed for ${label}.\n- ${violations.join("\n- ")}`);
  }
}
