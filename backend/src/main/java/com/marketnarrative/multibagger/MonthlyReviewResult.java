package com.marketnarrative.multibagger;

import java.util.List;

public record MonthlyReviewResult(
    String reviewId,
    String month,
    List<AdminReviewDecision> decisions,
    String privateReasoning
) {
}
