package com.marketnarrative.publishing;

import com.marketnarrative.common.DigestStatus;
import com.marketnarrative.common.SentimentLabel;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record PublicDigestDto(
    Long scriptId,
    LocalDate digestDate,
    String title,
    DigestStatus status,
    double overallSentiment,
    SentimentLabel sentimentLabel,
    String onePageSummary,
    String teleprompterScript,
    String reelScript,
    OffsetDateTime publishedAt,
    List<MarketSnapshotView> marketSnapshots,
    List<NewsCardView> news,
    List<ThemeView> themes,
    List<TradeSetupView> tradeSetups,
    AssetPromptView asset
) implements Serializable {

    public record MarketSnapshotView(
        String symbol,
        String name,
        double closeValue,
        double previousClose,
        double changePercent,
        String currency,
        String source,
        String marketRegion,
        String country,
        String session,
        String dataQuality,
        OffsetDateTime dataTimestamp,
        String tradingViewSymbol,
        List<ChartPointView> chartPoints
    ) implements Serializable {
    }

    public record ChartPointView(
        OffsetDateTime time,
        double close
    ) implements Serializable {
    }

    public record NewsCardView(
        String headline,
        String summary,
        String sourceName,
        String sourceUrl,
        double sentimentScore,
        String entityName,
        NewsThumbnailView thumbnail
    ) implements Serializable {
    }

    public record NewsThumbnailView(
        String label,
        String theme,
        String accent,
        String alt
    ) implements Serializable {
    }

    public record ThemeView(
        String themeType,
        String title,
        String summary,
        double sentimentScore,
        int evidenceCount
    ) implements Serializable {
    }

    public record TradeSetupView(
        String symbol,
        String direction,
        double entry,
        double stopLoss,
        double target,
        double riskReward,
        String confidenceReason,
        String invalidationReason
    ) implements Serializable {
    }

    public record AssetPromptView(
        SentimentLabel sentimentLabel,
        String positivePrompt,
        String negativePrompt,
        String palette,
        String referenceImageId,
        String controlNetMode,
        String assetUrl
    ) implements Serializable {
    }
}
