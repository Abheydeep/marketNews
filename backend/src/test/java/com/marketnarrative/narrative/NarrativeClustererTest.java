package com.marketnarrative.narrative;

import static org.assertj.core.api.Assertions.assertThat;

import com.marketnarrative.news.MarketNews;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class NarrativeClustererTest {

    private final NarrativeClusterer clusterer = new NarrativeClusterer();

    @Test
    void weightsSentimentByEntityMatchScore() {
        double score = clusterer.overallSentiment(List.of(
            article(-0.6, 0.9, "macro_negative"),
            article(0.4, 0.3, "sector_positive")
        ));

        assertThat(score).isCloseTo(-0.35, org.assertj.core.data.Offset.offset(0.01));
    }

    @Test
    void groupsArticlesIntoNarrativeThemes() {
        List<NarrativeTheme> themes = clusterer.cluster(
            LocalDate.of(2026, 4, 29),
            List.of(article(-0.6, 0.9, "macro_negative"), article(0.4, 0.3, "sector_positive"))
        );

        assertThat(themes).hasSize(2);
        assertThat(themes).extracting(NarrativeTheme::getTitle).contains("Negative Macro Impact");
    }

    private MarketNews article(double sentiment, double match, String category) {
        return new MarketNews(
            OffsetDateTime.now(),
            "source",
            "Source",
            "Headline",
            "Summary",
            "https://example.com",
            sentiment,
            "NIFTY",
            match,
            category
        );
    }
}
