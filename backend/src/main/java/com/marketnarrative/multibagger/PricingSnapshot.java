package com.marketnarrative.multibagger;

import java.time.Instant;

public record PricingSnapshot(
    String mode,
    Instant refreshedAt,
    boolean isStale,
    String refreshCadence,
    BenchmarkSnapshot benchmark,
    String note
) {
}
