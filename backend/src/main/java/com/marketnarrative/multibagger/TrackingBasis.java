package com.marketnarrative.multibagger;

import java.time.Instant;
import java.time.LocalDate;

public record TrackingBasis(
    LocalDate researchModelStartedOn,
    Instant publicFillBaselineAt,
    String returnsCalculatedFrom
) {
}
