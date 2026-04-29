package com.marketnarrative.news;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "market_news")
public class MarketNews {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private OffsetDateTime publishedAt;

    @Column(nullable = false)
    private String sourceId;

    @Column(nullable = false)
    private String sourceName;

    @Column(nullable = false, length = 500)
    private String headline;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    private String thumbnailLabel;

    private String thumbnailTheme;

    private String thumbnailAccent;

    private String thumbnailAlt;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String sourceUrl;

    @Column(nullable = false)
    private double sentimentScore;

    @Column(nullable = false)
    private String entityName;

    @Column(nullable = false)
    private double entityMatchScore;

    @Column(nullable = false)
    private String category;

    protected MarketNews() {
    }

    public MarketNews(
        OffsetDateTime publishedAt,
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
        this(
            publishedAt,
            sourceId,
            sourceName,
            headline,
            summary,
            null,
            null,
            null,
            null,
            sourceUrl,
            sentimentScore,
            entityName,
            entityMatchScore,
            category
        );
    }

    public MarketNews(
        OffsetDateTime publishedAt,
        String sourceId,
        String sourceName,
        String headline,
        String summary,
        String thumbnailLabel,
        String thumbnailTheme,
        String thumbnailAccent,
        String thumbnailAlt,
        String sourceUrl,
        double sentimentScore,
        String entityName,
        double entityMatchScore,
        String category
    ) {
        this.publishedAt = publishedAt;
        this.sourceId = sourceId;
        this.sourceName = sourceName;
        this.headline = headline;
        this.summary = summary;
        this.thumbnailLabel = thumbnailLabel;
        this.thumbnailTheme = thumbnailTheme;
        this.thumbnailAccent = thumbnailAccent;
        this.thumbnailAlt = thumbnailAlt;
        this.sourceUrl = sourceUrl;
        this.sentimentScore = sentimentScore;
        this.entityName = entityName;
        this.entityMatchScore = entityMatchScore;
        this.category = category;
    }

    public Long getId() {
        return id;
    }

    public OffsetDateTime getPublishedAt() {
        return publishedAt;
    }

    public String getSourceId() {
        return sourceId;
    }

    public String getSourceName() {
        return sourceName;
    }

    public String getHeadline() {
        return headline;
    }

    public String getSummary() {
        return summary;
    }

    public String getThumbnailLabel() {
        return thumbnailLabel;
    }

    public String getThumbnailTheme() {
        return thumbnailTheme;
    }

    public String getThumbnailAccent() {
        return thumbnailAccent;
    }

    public String getThumbnailAlt() {
        return thumbnailAlt;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public double getSentimentScore() {
        return sentimentScore;
    }

    public String getEntityName() {
        return entityName;
    }

    public double getEntityMatchScore() {
        return entityMatchScore;
    }

    public String getCategory() {
        return category;
    }
}
