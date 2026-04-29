package com.marketnarrative.news;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class MockNewsDataAdapter implements NewsDataAdapter {

    private static final TypeReference<List<NewsSeed>> SEED_TYPE = new TypeReference<>() {
    };

    private final ObjectMapper objectMapper;

    public MockNewsDataAdapter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public List<MarketNews> fetchArticles(LocalDate digestDate) {
        try {
            List<NewsSeed> seeds = objectMapper.readValue(
                new ClassPathResource("seed/news.json").getInputStream(),
                SEED_TYPE
            );
            return seeds.stream()
                .map(seed -> new MarketNews(
                    OffsetDateTime.of(digestDate, LocalTime.parse(seed.publishedTime()), ZoneOffset.of("+05:30")),
                    seed.sourceId(),
                    seed.sourceName(),
                    seed.headline(),
                    seed.summary(),
                    seed.sourceUrl(),
                    seed.sentimentScore(),
                    seed.entityName(),
                    seed.entityMatchScore(),
                    seed.category()
                ))
                .toList();
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to load mock news articles", ex);
        }
    }

    record NewsSeed(
        String publishedTime,
        String sourceId,
        String sourceName,
        String headline,
        String summary,
        String sourceUrl,
        double sentimentScore,
        String entityName,
        double entityMatchScore,
        String category
    ) {
    }
}
