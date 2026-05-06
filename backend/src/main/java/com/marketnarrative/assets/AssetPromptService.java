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
            "plastic skin, distorted eyes, extra fingers, cartoonish, low resolution, blurry text, deformed hands, generic Wall Street floor, NYSE trading pit, US flag backdrop, suit-and-tie corporate headshot, unreadable ticker text",
            palette(label),
            "creator-ref-001",
            "ControlNet Canny + Depth identity lock",
            "/assets/mock/daily-thumbnail-" + digestDate + ".webp"
        );
    }

    private String positivePrompt(SentimentLabel label) {
        String mood = switch (label) {
            case BULLISH -> "green candlestick chart overlay, NSE ticker strip, Bank Nifty breadth tile, confident financial presenter";
            case BEARISH -> "red risk dashboard, rupee and DXY tiles, Nifty support band, serious financial presenter";
            case VOLATILE -> "split green-red candlestick grid, PCR and OI panels, focused financial presenter";
            case NEUTRAL -> "balanced chart grid, opening-range levels, composed financial presenter";
        };
        return "photorealistic Indian male financial creator portrait, ControlNet reference, consistent face, "
            + "NSE and BSE style market boards, Nifty and Bank Nifty ticker wall, "
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
