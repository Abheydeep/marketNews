package com.marketnarrative.multibagger;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PerformanceSnapshot(
    BigDecimal sinceLaunchPercent,
    LocalDate launchDate,
    String benchmark,
    BigDecimal benchmarkSinceLaunchPercent,
    String note
) {
}
