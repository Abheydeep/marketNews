package com.marketnarrative.narrative;

import com.marketnarrative.news.MarketNews;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class NarrativeClusterer {

    public List<NarrativeTheme> cluster(LocalDate digestDate, List<MarketNews> articles) {
        Map<String, List<MarketNews>> grouped = articles.stream()
            .collect(Collectors.groupingBy(MarketNews::getCategory, LinkedHashMap::new, Collectors.toList()));

        return grouped.entrySet().stream()
            .map(entry -> buildTheme(digestDate, entry.getKey(), entry.getValue()))
            .sorted(Comparator.comparingDouble(NarrativeTheme::getSentimentScore))
            .toList();
    }

    public double overallSentiment(List<MarketNews> articles) {
        double weighted = articles.stream()
            .mapToDouble(article -> article.getSentimentScore() * article.getEntityMatchScore())
            .sum();
        double weights = articles.stream()
            .mapToDouble(MarketNews::getEntityMatchScore)
            .sum();
        return weights == 0.0 ? 0.0 : weighted / weights;
    }

    private NarrativeTheme buildTheme(LocalDate digestDate, String category, List<MarketNews> articles) {
        double score = overallSentiment(articles);
        MarketNews lead = articles.stream()
            .max(Comparator.comparingDouble(article -> Math.abs(article.getSentimentScore() * article.getEntityMatchScore())))
            .orElseThrow();
        return new NarrativeTheme(
            digestDate,
            category,
            titleFor(category),
            lead.getSummary(),
            score,
            articles.size()
        );
    }

    private String titleFor(String category) {
        return switch (category) {
            case "macro_negative" -> "Negative Macro Impact";
            case "macro_positive" -> "Global Earnings & Risk Appetite";
            case "sector_positive" -> "Sector-Specific Cushion";
            case "sector_negative" -> "Sector-Specific Pressure";
            case "global_risk" -> "Global Risk-Off Cue";
            case "neutral_volatile" -> "Volatile Opening Bias";
            default -> "Market Narrative Theme";
        };
    }
}
