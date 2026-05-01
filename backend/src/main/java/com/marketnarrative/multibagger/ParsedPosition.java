package com.marketnarrative.multibagger;

import java.math.BigDecimal;

public record ParsedPosition(
    String ticker,
    BigDecimal confidence,
    String note
) {
}
