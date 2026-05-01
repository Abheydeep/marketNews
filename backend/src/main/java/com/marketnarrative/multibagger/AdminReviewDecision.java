package com.marketnarrative.multibagger;

import java.math.BigDecimal;

public record AdminReviewDecision(
    String ticker,
    String action,
    BigDecimal confidence,
    String evidence,
    String privateReasoning,
    String publicSummary
) {
}
