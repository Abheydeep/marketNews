package com.marketnarrative.publishing;

import java.time.Duration;
import java.time.LocalDate;

public record DigestRunResult(
    LocalDate digestDate,
    int marketSnapshots,
    int articles,
    int themes,
    int tradeSetups,
    long durationMillis,
    Long scriptId,
    Long assetId
) {
    public static DigestRunResult of(
        LocalDate digestDate,
        int marketSnapshots,
        int articles,
        int themes,
        int tradeSetups,
        Duration duration,
        Long scriptId,
        Long assetId
    ) {
        return new DigestRunResult(
            digestDate,
            marketSnapshots,
            articles,
            themes,
            tradeSetups,
            duration.toMillis(),
            scriptId,
            assetId
        );
    }
}
