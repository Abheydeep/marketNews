package com.marketnarrative.publishing;

import com.marketnarrative.assets.AssetGeneration;
import com.marketnarrative.assets.AssetGenerationRepository;
import com.marketnarrative.common.SentimentLabel;
import com.marketnarrative.marketdata.MarketSnapshot;
import com.marketnarrative.marketdata.MarketSnapshotRepository;
import com.marketnarrative.narrative.DailyScript;
import com.marketnarrative.narrative.DailyScriptRepository;
import com.marketnarrative.narrative.NarrativeThemeRepository;
import com.marketnarrative.news.MarketNewsRepository;
import com.marketnarrative.analysis.TradeSetupRepository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PublicDigestService {

    private final DailyScriptRepository dailyScriptRepository;
    private final MarketSnapshotRepository marketSnapshotRepository;
    private final MarketNewsRepository marketNewsRepository;
    private final NarrativeThemeRepository narrativeThemeRepository;
    private final TradeSetupRepository tradeSetupRepository;
    private final AssetGenerationRepository assetGenerationRepository;

    public PublicDigestService(
        DailyScriptRepository dailyScriptRepository,
        MarketSnapshotRepository marketSnapshotRepository,
        MarketNewsRepository marketNewsRepository,
        NarrativeThemeRepository narrativeThemeRepository,
        TradeSetupRepository tradeSetupRepository,
        AssetGenerationRepository assetGenerationRepository
    ) {
        this.dailyScriptRepository = dailyScriptRepository;
        this.marketSnapshotRepository = marketSnapshotRepository;
        this.marketNewsRepository = marketNewsRepository;
        this.narrativeThemeRepository = narrativeThemeRepository;
        this.tradeSetupRepository = tradeSetupRepository;
        this.assetGenerationRepository = assetGenerationRepository;
    }

    @Cacheable(cacheNames = "publicDigest", key = "#digestDate.toString()")
    public PublicDigestDto getDigest(LocalDate digestDate) {
        DailyScript script = dailyScriptRepository.findByDigestDate(digestDate)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Digest not generated for " + digestDate));

        OffsetDateTime start = OffsetDateTime.of(digestDate, LocalTime.MIN, ZoneOffset.of("+05:30"));
        OffsetDateTime end = start.plusDays(1);
        AssetGeneration asset = assetGenerationRepository.findByDigestDateOrderByCreatedAtDesc(digestDate)
            .stream()
            .findFirst()
            .orElse(null);

        return new PublicDigestDto(
            script.getId(),
            script.getDigestDate(),
            script.getTitle(),
            script.getStatus(),
            script.getOverallSentiment(),
            SentimentLabel.fromScore(script.getOverallSentiment()),
            script.getOnePageSummary(),
            script.getTeleprompterScript(),
            script.getPublishedAt(),
            marketSnapshotRepository.findByTradingDateOrderBySymbol(digestDate).stream()
                .map(snapshot -> new PublicDigestDto.MarketSnapshotView(
                    snapshot.getSymbol(),
                    snapshot.getName(),
                    snapshot.getCloseValue(),
                    previousClose(snapshot),
                    snapshot.getChangePercent(),
                    currency(snapshot),
                    snapshot.getSource(),
                    snapshot.getMarketRegion(),
                    snapshot.getCountry(),
                    snapshot.getSession(),
                    dataQuality(snapshot),
                    snapshot.getCapturedAt(),
                    snapshot.getTradingViewSymbol(),
                    chartPoints(snapshot)
                ))
                .toList(),
            marketNewsRepository.findByPublishedAtBetweenOrderByPublishedAtDesc(start, end).stream()
                .map(article -> new PublicDigestDto.NewsCardView(
                    article.getHeadline(),
                    article.getSummary(),
                    article.getSourceName(),
                    article.getSourceUrl(),
                    article.getSentimentScore(),
                    article.getEntityName(),
                    new PublicDigestDto.NewsThumbnailView(
                        article.getThumbnailLabel(),
                        article.getThumbnailTheme(),
                        article.getThumbnailAccent(),
                        article.getThumbnailAlt()
                    )
                ))
                .toList(),
            narrativeThemeRepository.findByDigestDateOrderBySentimentScoreAsc(digestDate).stream()
                .map(theme -> new PublicDigestDto.ThemeView(
                    theme.getThemeType(),
                    theme.getTitle(),
                    theme.getSummary(),
                    theme.getSentimentScore(),
                    theme.getEvidenceCount()
                ))
                .toList(),
            tradeSetupRepository.findByDigestDateOrderBySymbol(digestDate).stream()
                .map(setup -> new PublicDigestDto.TradeSetupView(
                    setup.getSymbol(),
                    setup.getDirection(),
                    setup.getEntryPrice(),
                    setup.getStopLoss(),
                    setup.getTargetPrice(),
                    setup.getRiskReward(),
                    setup.getConfidenceReason(),
                    setup.getInvalidationReason()
                ))
                .toList(),
            asset == null ? null : new PublicDigestDto.AssetPromptView(
                asset.getSentimentLabel(),
                asset.getPositivePrompt(),
                asset.getNegativePrompt(),
                asset.getPalette(),
                asset.getReferenceImageId(),
                asset.getControlNetMode(),
                asset.getAssetUrl()
            )
        );
    }

    private double previousClose(MarketSnapshot snapshot) {
        double denominator = 1 + (snapshot.getChangePercent() / 100.0);
        if (!Double.isFinite(denominator) || denominator <= 0.01) {
            return round(snapshot.getCloseValue());
        }
        return round(snapshot.getCloseValue() / denominator);
    }

    private String dataQuality(MarketSnapshot snapshot) {
        String source = snapshot.getSource() == null ? "" : snapshot.getSource().toLowerCase();
        return source.contains("yahoo finance chart api") ? "live" : "published";
    }

    private String currency(MarketSnapshot snapshot) {
        if ("BRENT".equals(snapshot.getSymbol())) {
            return "USD";
        }
        return null;
    }

    private List<PublicDigestDto.ChartPointView> chartPoints(MarketSnapshot snapshot) {
        OffsetDateTime anchor = snapshot.getCapturedAt() == null
            ? OffsetDateTime.of(snapshot.getTradingDate(), LocalTime.of(15, 30), ZoneOffset.of("+05:30"))
            : snapshot.getCapturedAt();
        double previous = previousClose(snapshot);
        double close = snapshot.getCloseValue();
        double delta = close - previous;
        return java.util.stream.IntStream.range(0, 8)
            .mapToObj(index -> {
                double progress = index / 7.0;
                double wave = (index == 0 || index == 7)
                    ? 0
                    : Math.sin(index * Math.PI / 2.0) * Math.abs(delta) * 0.08;
                return new PublicDigestDto.ChartPointView(
                    anchor.minusMinutes((7L - index) * 5L),
                    round(previous + (delta * progress) + wave)
                );
            })
            .toList();
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
