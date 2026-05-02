package com.marketnarrative.multibagger;

import java.math.BigDecimal;
import java.time.Instant;

public record MultibaggerQuoteSnapshot(
    String ticker,
    BigDecimal entryPrice,
    BigDecimal lastPrice,
    BigDecimal previousClose,
    Instant lastPriceAt,
    String priceSource,
    boolean isStale
) {
}
