package com.marketnarrative.ai;

public record AgentEvidence(
    String sourceName,
    String sourceUrl,
    String claim,
    double confidence
) {
}
