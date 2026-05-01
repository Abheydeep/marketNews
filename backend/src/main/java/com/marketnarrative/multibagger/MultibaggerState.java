package com.marketnarrative.multibagger;

import java.time.Instant;
import java.util.List;

public record MultibaggerState(
    String modelName,
    Integer modelCapitalInr,
    Instant updatedAt,
    QuoteStatus quoteStatus,
    PerformanceSnapshot performance,
    List<MultibaggerHolding> holdings,
    List<PublicTransaction> transactions,
    List<PublicMonthlyReview> monthlyReviews,
    List<WatchlistItem> watchlist,
    List<SourceReference> sources,
    String disclaimer
) {
}
