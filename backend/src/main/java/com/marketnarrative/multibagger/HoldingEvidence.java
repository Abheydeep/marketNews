package com.marketnarrative.multibagger;

import java.util.List;

public record HoldingEvidence(
    String ticker,
    List<String> evidence,
    String needsProof,
    String sourceLabel,
    String sourceUrl
) {
}
