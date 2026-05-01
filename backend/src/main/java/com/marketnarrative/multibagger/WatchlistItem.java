package com.marketnarrative.multibagger;

public record WatchlistItem(
    String ticker,
    String name,
    String status,
    String reason
) {
}
