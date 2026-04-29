package com.marketnarrative.assets;

import com.marketnarrative.common.SentimentLabel;
import java.time.LocalDate;
import org.springframework.stereotype.Service;

@Service
public class AssetPromptService {

    public AssetGeneration generatePromptPackage(LocalDate digestDate, double overallSentiment) {
        SentimentLabel label = SentimentLabel.fromScore(overallSentiment);
        return new AssetGeneration(
            digestDate,
            label,
            positivePrompt(label),
            "plastic skin, distorted eyes, extra fingers, cartoonish, low resolution, blurry text, deformed hands",
            palette(label),
            "creator-ref-001",
            "ControlNet Canny + Depth identity lock",
            "/assets/mock/daily-thumbnail-" + digestDate + ".webp"
        );
    }

    private String positivePrompt(SentimentLabel label) {
        String mood = switch (label) {
            case BULLISH -> "emerald market screens, rising candles, confident financial presenter";
            case BEARISH -> "crimson risk dashboard, falling candles, serious financial presenter";
            case VOLATILE -> "slate and gold trading floor, split-direction candles, focused financial presenter";
            case NEUTRAL -> "clean market studio, balanced chart grid, composed financial presenter";
        };
        return "photorealistic Indian financial news thumbnail, identity-locked creator portrait, "
            + mood
            + ", cinematic studio lighting, sharp facial features, realistic skin texture, 8k editorial detail";
    }

    private String palette(SentimentLabel label) {
        return switch (label) {
            case BULLISH -> "emerald, charcoal, bright white";
            case BEARISH -> "crimson, graphite, cool white";
            case VOLATILE -> "slate blue, gold, neutral grey";
            case NEUTRAL -> "steel, white, muted green";
        };
    }
}
