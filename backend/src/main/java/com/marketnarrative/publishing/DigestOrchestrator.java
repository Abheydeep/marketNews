package com.marketnarrative.publishing;

import com.marketnarrative.analysis.PriceBar;
import com.marketnarrative.analysis.PriceSeriesAdapter;
import com.marketnarrative.analysis.TechnicalSetupScanner;
import com.marketnarrative.analysis.TradeSetup;
import com.marketnarrative.analysis.TradeSetupRepository;
import com.marketnarrative.assets.AssetGeneration;
import com.marketnarrative.assets.AssetGenerationRepository;
import com.marketnarrative.assets.AssetPromptService;
import com.marketnarrative.marketdata.MarketDataAdapter;
import com.marketnarrative.marketdata.MarketSnapshot;
import com.marketnarrative.marketdata.MarketSnapshotRepository;
import com.marketnarrative.narrative.DailyScript;
import com.marketnarrative.narrative.DailyScriptRepository;
import com.marketnarrative.narrative.NarrativeClusterer;
import com.marketnarrative.narrative.NarrativeTheme;
import com.marketnarrative.narrative.NarrativeThemeRepository;
import com.marketnarrative.narrative.ScriptGenerator;
import com.marketnarrative.news.MarketNews;
import com.marketnarrative.news.MarketNewsRepository;
import com.marketnarrative.news.NewsDataAdapter;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DigestOrchestrator {

    private final MarketDataAdapter marketDataAdapter;
    private final NewsDataAdapter newsDataAdapter;
    private final PriceSeriesAdapter priceSeriesAdapter;
    private final MarketSnapshotRepository marketSnapshotRepository;
    private final MarketNewsRepository marketNewsRepository;
    private final NarrativeThemeRepository narrativeThemeRepository;
    private final TradeSetupRepository tradeSetupRepository;
    private final DailyScriptRepository dailyScriptRepository;
    private final AssetGenerationRepository assetGenerationRepository;
    private final NarrativeClusterer narrativeClusterer;
    private final TechnicalSetupScanner technicalSetupScanner;
    private final ScriptGenerator scriptGenerator;
    private final AssetPromptService assetPromptService;
    private final Executor digestExecutor;

    public DigestOrchestrator(
        MarketDataAdapter marketDataAdapter,
        NewsDataAdapter newsDataAdapter,
        PriceSeriesAdapter priceSeriesAdapter,
        MarketSnapshotRepository marketSnapshotRepository,
        MarketNewsRepository marketNewsRepository,
        NarrativeThemeRepository narrativeThemeRepository,
        TradeSetupRepository tradeSetupRepository,
        DailyScriptRepository dailyScriptRepository,
        AssetGenerationRepository assetGenerationRepository,
        NarrativeClusterer narrativeClusterer,
        TechnicalSetupScanner technicalSetupScanner,
        ScriptGenerator scriptGenerator,
        AssetPromptService assetPromptService,
        @Qualifier("digestExecutor") Executor digestExecutor
    ) {
        this.marketDataAdapter = marketDataAdapter;
        this.newsDataAdapter = newsDataAdapter;
        this.priceSeriesAdapter = priceSeriesAdapter;
        this.marketSnapshotRepository = marketSnapshotRepository;
        this.marketNewsRepository = marketNewsRepository;
        this.narrativeThemeRepository = narrativeThemeRepository;
        this.tradeSetupRepository = tradeSetupRepository;
        this.dailyScriptRepository = dailyScriptRepository;
        this.assetGenerationRepository = assetGenerationRepository;
        this.narrativeClusterer = narrativeClusterer;
        this.technicalSetupScanner = technicalSetupScanner;
        this.scriptGenerator = scriptGenerator;
        this.assetPromptService = assetPromptService;
        this.digestExecutor = digestExecutor;
    }

    @Transactional
    @CacheEvict(cacheNames = "publicDigest", allEntries = true)
    public DigestRunResult run(LocalDate digestDate) {
        Instant started = Instant.now();

        CompletableFuture<List<MarketSnapshot>> snapshotsFuture =
            CompletableFuture.supplyAsync(() -> marketDataAdapter.fetchSnapshots(digestDate), digestExecutor);
        CompletableFuture<List<MarketNews>> newsFuture =
            CompletableFuture.supplyAsync(() -> newsDataAdapter.fetchArticles(digestDate), digestExecutor);
        CompletableFuture<Map<String, List<PriceBar>>> priceFuture =
            CompletableFuture.supplyAsync(() -> priceSeriesAdapter.fetchSeries(digestDate), digestExecutor);

        List<MarketSnapshot> snapshots = snapshotsFuture.join();
        List<MarketNews> articles = newsFuture.join();
        Map<String, List<PriceBar>> priceSeries = priceFuture.join();

        clearExistingDigest(digestDate);

        List<MarketSnapshot> savedSnapshots = marketSnapshotRepository.saveAll(snapshots);
        List<MarketNews> savedArticles = marketNewsRepository.saveAll(articles);

        double overallSentiment = narrativeClusterer.overallSentiment(savedArticles);
        List<NarrativeTheme> themes = narrativeThemeRepository.saveAll(
            narrativeClusterer.cluster(digestDate, savedArticles)
        );
        List<TradeSetup> setups = tradeSetupRepository.saveAll(
            technicalSetupScanner.scan(digestDate, priceSeries)
        );
        DailyScript script = dailyScriptRepository.save(
            scriptGenerator.generate(digestDate, savedSnapshots, themes, setups, overallSentiment)
        );
        AssetGeneration asset = assetGenerationRepository.save(
            assetPromptService.generatePromptPackage(digestDate, overallSentiment)
        );

        return DigestRunResult.of(
            digestDate,
            savedSnapshots.size(),
            savedArticles.size(),
            themes.size(),
            setups.size(),
            Duration.between(started, Instant.now()),
            script.getId(),
            asset.getId()
        );
    }

    private void clearExistingDigest(LocalDate digestDate) {
        marketSnapshotRepository.deleteByTradingDate(digestDate);
        OffsetDateTime start = OffsetDateTime.of(digestDate, LocalTime.MIN, ZoneOffset.of("+05:30"));
        OffsetDateTime end = start.plusDays(1);
        marketNewsRepository.deleteByPublishedAtBetween(start, end);
        narrativeThemeRepository.deleteByDigestDate(digestDate);
        tradeSetupRepository.deleteByDigestDate(digestDate);
        dailyScriptRepository.deleteByDigestDate(digestDate);
        assetGenerationRepository.deleteByDigestDate(digestDate);
    }
}
