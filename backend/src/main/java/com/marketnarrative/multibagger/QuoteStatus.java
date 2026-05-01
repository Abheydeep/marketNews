package com.marketnarrative.multibagger;

import java.time.Instant;

public record QuoteStatus(
    String mode,
    Instant lastRefreshAt,
    String note
) {
}
