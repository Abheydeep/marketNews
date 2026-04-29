package com.marketnarrative.common;

public enum SentimentLabel {
    BULLISH,
    BEARISH,
    NEUTRAL,
    VOLATILE;

    public static SentimentLabel fromScore(double score) {
        if (score >= 0.25) {
            return BULLISH;
        }
        if (score <= -0.25) {
            return BEARISH;
        }
        if (Math.abs(score) < 0.10) {
            return NEUTRAL;
        }
        return VOLATILE;
    }
}
