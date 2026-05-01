package com.marketnarrative.multibagger;

import java.math.BigDecimal;

public record MultibaggerHolding(
    String ticker,
    String yahooSymbol,
    String name,
    BigDecimal targetWeight,
    Integer modelAmountInr,
    String role,
    String thesis,
    String buyRule,
    String breakRule,
    String status
) {
}
