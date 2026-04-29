package com.marketnarrative.analysis;

import java.time.LocalDate;

public record PriceBar(
    String symbol,
    LocalDate date,
    double open,
    double high,
    double low,
    double close,
    double volume
) {
}
