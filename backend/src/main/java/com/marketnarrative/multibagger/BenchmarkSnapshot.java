package com.marketnarrative.multibagger;

import java.math.BigDecimal;
import java.time.Instant;

public record BenchmarkSnapshot(
    String symbol,
    BigDecimal entryPrice,
    BigDecimal lastPrice,
    BigDecimal previousClose,
    Instant lastPriceAt,
    String source,
    boolean isStale,
    BigDecimal returnPercent,
    BigDecimal dayChangePercent
) {
}
