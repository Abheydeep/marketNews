package com.marketnarrative.multibagger;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record MultibaggerState(
    String modelName,
    Integer modelCapitalInr,
    LocalDate modelEntryDate,
    Instant updatedAt,
    QuoteStatus quoteStatus,
    PricingSnapshot pricing,
    PerformanceSnapshot performance,
    List<MultibaggerHolding> holdings,
    MultibaggerMethodology methodology,
    ResearchEvidence researchEvidence,
    List<PublicTransaction> transactions,
    List<PublicMonthlyReview> monthlyReviews,
    List<WatchlistItem> watchlist,
    List<SourceReference> sources,
    String disclaimer
) {
}
