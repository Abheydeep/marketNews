package com.marketnarrative.multibagger;

import java.time.LocalDate;
import java.util.List;

public record PublicMonthlyReview(
    String month,
    LocalDate publishedDate,
    String headline,
    List<PublicReviewDecision> decisions,
    List<String> changesMade
) {
    public record PublicReviewDecision(
        String ticker,
        String decision,
        String publicRationale
    ) {
    }
}
