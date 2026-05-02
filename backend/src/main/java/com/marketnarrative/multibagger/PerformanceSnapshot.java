package com.marketnarrative.multibagger;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PerformanceSnapshot(
    BigDecimal sinceLaunchPercent,
    LocalDate launchDate,
    LocalDate modelEntryDate,
    String benchmark,
    BigDecimal benchmarkSinceLaunchPercent,
    BigDecimal currentModelValueInr,
    BigDecimal totalPnlInr,
    String note
) {
}
