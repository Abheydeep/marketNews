package com.marketnarrative.multibagger;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PublicTransaction(
    LocalDate date,
    String ticker,
    String action,
    BigDecimal weightChange,
    String publicNote,
    BigDecimal referencePrice,
    String performanceNote
) {
}
