package com.marketnarrative.multibagger;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class MultibaggerQuoteService {

    private static final Instant STATIC_PRICE_REFRESH_AT = Instant.parse("2026-05-01T10:00:00Z");
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final Map<String, String> YAHOO_SYMBOLS = Map.of(
        "KPEL", "KPEL.BO",
        "DHABRIYA", "538715.BO",
        "PIGL", "PIGL.NS",
        "JNKINDIA", "JNKINDIA.NS",
        "DYCL", "DYCL.NS",
        "TEMBO", "TEMBO.NS"
    );
    private static final Map<String, MultibaggerQuoteSnapshot> FALLBACK_QUOTES = Map.ofEntries(
        fallback("KPEL", "486.40"),
        fallback("DHABRIYA", "308.20"),
        fallback("PIGL", "148.80"),
        fallback("JNKINDIA", "608.50"),
        fallback("DYCL", "505.10"),
        fallback("TEMBO", "246.30")
    );
    private static final BenchmarkSnapshot FALLBACK_BENCHMARK = benchmarkSnapshot(
        "NIFTY 50",
        new BigDecimal("24203.35"),
        null,
        null,
        STATIC_PRICE_REFRESH_AT,
        "Awaiting verified live quote",
        true
    );

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(4))
        .build();

    @Value("${app.multibagger.live-quotes-enabled:false}")
    private boolean liveQuotesEnabled;

    @Value("${app.multibagger.quote-timeout-ms:3500}")
    private int quoteTimeoutMs;

    private volatile Map<String, MultibaggerQuoteSnapshot> currentQuotes = FALLBACK_QUOTES;
    private volatile BenchmarkSnapshot currentBenchmark = FALLBACK_BENCHMARK;
    private volatile Instant refreshedAt = STATIC_PRICE_REFRESH_AT;
    private volatile String mode = "awaiting-verified-quotes";

    public MultibaggerQuoteService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public MultibaggerQuoteSnapshot snapshotFor(String ticker) {
        return currentQuotes.getOrDefault(ticker, FALLBACK_QUOTES.get(ticker));
    }

    public PricingSnapshot pricingSnapshot() {
        boolean stale = currentBenchmark.isStale() || currentQuotes.values().stream().anyMatch(MultibaggerQuoteSnapshot::isStale);
        return new PricingSnapshot(
            mode,
            refreshedAt,
            stale,
            "Every 5 minutes during Indian market hours when live quote refresh is enabled",
            currentBenchmark,
            stale
                ? "Fallback mode does not publish current prices, returns, or P&L."
                : "Real-time means server-refreshed latest prices with timestamps, not account-level performance."
        );
    }

    @Scheduled(cron = "0 */5 9-15 * * MON-FRI", zone = "Asia/Kolkata")
    public void refreshDuringMarketHours() {
        if (liveQuotesEnabled) {
            refreshNow();
        }
    }

    public synchronized void refreshNow() {
        Map<String, MultibaggerQuoteSnapshot> nextQuotes = new LinkedHashMap<>();
        boolean hasLiveQuote = false;
        for (Map.Entry<String, String> entry : YAHOO_SYMBOLS.entrySet()) {
            MultibaggerQuoteSnapshot fallback = FALLBACK_QUOTES.get(entry.getKey());
            MultibaggerQuoteSnapshot quote = fetchYahooQuote(entry.getValue(), entry.getKey(), fallback).orElse(fallback);
            hasLiveQuote = hasLiveQuote || !quote.isStale();
            nextQuotes.put(entry.getKey(), quote);
        }
        currentQuotes = Map.copyOf(nextQuotes);
        currentBenchmark = fetchBenchmark("^NSEI").orElse(FALLBACK_BENCHMARK);
        refreshedAt = latestTimestamp(currentQuotes, currentBenchmark);
        mode = hasLiveQuote ? "server-yahoo-snapshot" : "awaiting-verified-quotes";
    }

    private Optional<MultibaggerQuoteSnapshot> fetchYahooQuote(String yahooSymbol, String ticker, MultibaggerQuoteSnapshot fallback) {
        try {
            JsonNode meta = fetchYahooMeta(yahooSymbol);
            Optional<BigDecimal> lastPrice = decimal(meta, "regularMarketPrice");
            if (lastPrice.isEmpty()) {
                return Optional.empty();
            }
            BigDecimal previousClose = decimal(meta, "chartPreviousClose")
                .or(() -> decimal(meta, "previousClose"))
                .orElse(fallback.previousClose());
            Instant lastPriceAt = instant(meta, "regularMarketTime").orElse(Instant.now());
            return Optional.of(new MultibaggerQuoteSnapshot(
                ticker,
                fallback.entryPrice(),
                lastPrice.get(),
                previousClose,
                lastPriceAt,
                "Yahoo Finance chart API",
                isQuoteTimestampStale(lastPriceAt)
            ));
        } catch (IOException | InterruptedException | IllegalStateException error) {
            if (error instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return Optional.empty();
        }
    }

    private Optional<BenchmarkSnapshot> fetchBenchmark(String yahooSymbol) {
        try {
            JsonNode meta = fetchYahooMeta(yahooSymbol);
            Optional<BigDecimal> lastPrice = decimal(meta, "regularMarketPrice");
            if (lastPrice.isEmpty()) {
                return Optional.empty();
            }
            BigDecimal previousClose = decimal(meta, "chartPreviousClose")
                .or(() -> decimal(meta, "previousClose"))
                .orElse(FALLBACK_BENCHMARK.previousClose());
            Instant lastPriceAt = instant(meta, "regularMarketTime").orElse(Instant.now());
            return Optional.of(benchmarkSnapshot(
                "NIFTY 50",
                FALLBACK_BENCHMARK.entryPrice(),
                lastPrice.get(),
                previousClose,
                lastPriceAt,
                "Yahoo Finance chart API",
                isQuoteTimestampStale(lastPriceAt)
            ));
        } catch (IOException | InterruptedException | IllegalStateException error) {
            if (error instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return Optional.empty();
        }
    }

    private JsonNode fetchYahooMeta(String yahooSymbol) throws IOException, InterruptedException {
        String encoded = URLEncoder.encode(yahooSymbol, StandardCharsets.UTF_8);
        URI uri = URI.create("https://query1.finance.yahoo.com/v8/finance/chart/" + encoded + "?range=1d&interval=1m");
        HttpRequest request = HttpRequest.newBuilder(uri)
            .timeout(Duration.ofMillis(quoteTimeoutMs))
            .header("User-Agent", "MarketNarrative/1.0")
            .GET()
            .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            throw new IOException("Yahoo quote request failed with status " + response.statusCode());
        }
        JsonNode result = objectMapper.readTree(response.body())
            .path("chart")
            .path("result")
            .path(0);
        JsonNode meta = result.path("meta");
        if (meta.isMissingNode() || meta.isNull()) {
            throw new IllegalStateException("Yahoo quote response is missing meta");
        }
        return meta;
    }

    private static Map.Entry<String, MultibaggerQuoteSnapshot> fallback(String ticker, String entryPrice) {
        return Map.entry(ticker, new MultibaggerQuoteSnapshot(
            ticker,
            new BigDecimal(entryPrice),
            null,
            null,
            STATIC_PRICE_REFRESH_AT,
            "Awaiting verified live quote",
            true
        ));
    }

    private static BenchmarkSnapshot benchmarkSnapshot(String symbol, BigDecimal entryPrice, BigDecimal lastPrice, BigDecimal previousClose, Instant lastPriceAt, String source, boolean isStale) {
        return new BenchmarkSnapshot(
            symbol,
            entryPrice,
            lastPrice,
            previousClose,
            lastPriceAt,
            source,
            isStale,
            returnPercent(entryPrice, lastPrice),
            returnPercent(previousClose, lastPrice)
        );
    }

    private static Optional<BigDecimal> decimal(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        if (!value.isNumber()) {
            return Optional.empty();
        }
        return Optional.of(BigDecimal.valueOf(value.asDouble()).setScale(2, RoundingMode.HALF_UP));
    }

    private static Optional<Instant> instant(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        if (!value.canConvertToLong()) {
            return Optional.empty();
        }
        return Optional.of(Instant.ofEpochSecond(value.asLong()));
    }

    private static Instant latestTimestamp(Map<String, MultibaggerQuoteSnapshot> quotes, BenchmarkSnapshot benchmark) {
        Instant latestQuoteAt = quotes.values().stream()
            .map(MultibaggerQuoteSnapshot::lastPriceAt)
            .filter(value -> value != null)
            .max(Instant::compareTo)
            .orElse(benchmark.lastPriceAt());
        return latestQuoteAt.isAfter(benchmark.lastPriceAt()) ? latestQuoteAt : benchmark.lastPriceAt();
    }

    private static boolean isQuoteTimestampStale(Instant lastPriceAt) {
        return lastPriceAt == null || Duration.between(lastPriceAt, Instant.now()).abs().toHours() > 96;
    }

    static BigDecimal returnPercent(BigDecimal start, BigDecimal end) {
        if (start == null || end == null || BigDecimal.ZERO.compareTo(start) == 0) {
            return null;
        }
        return end.subtract(start)
            .divide(start, 6, RoundingMode.HALF_UP)
            .multiply(HUNDRED)
            .setScale(2, RoundingMode.HALF_UP);
    }
}
