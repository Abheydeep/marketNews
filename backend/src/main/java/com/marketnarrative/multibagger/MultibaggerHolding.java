package com.marketnarrative.multibagger;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record MultibaggerHolding(
    String ticker,
    String yahooSymbol,
    String name,
    BigDecimal targetWeight,
    Integer modelAmountInr,
    String role,
    String rolePlain,
    String thesis,
    String buyRule,
    String breakRule,
    String profitabilityLens,
    String valuationLens,
    String growthCatalyst,
    String conversionRisk,
    String capitalStructureRisk,
    String status,
    LocalDate modelEntryDate,
    BigDecimal entryPrice,
    BigDecimal lastPrice,
    BigDecimal previousClose,
    BigDecimal dayChangePercent,
    Instant lastPriceAt,
    String priceSource,
    boolean isStale,
    BigDecimal returnPercent,
    BigDecimal modelPnlInr,
    BigDecimal currentModelValueInr
) {
}
