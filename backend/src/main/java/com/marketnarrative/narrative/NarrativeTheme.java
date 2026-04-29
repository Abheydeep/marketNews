package com.marketnarrative.narrative;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(name = "narrative_themes")
public class NarrativeTheme {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate digestDate;

    @Column(nullable = false)
    private String themeType;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(nullable = false)
    private double sentimentScore;

    @Column(nullable = false)
    private int evidenceCount;

    protected NarrativeTheme() {
    }

    public NarrativeTheme(
        LocalDate digestDate,
        String themeType,
        String title,
        String summary,
        double sentimentScore,
        int evidenceCount
    ) {
        this.digestDate = digestDate;
        this.themeType = themeType;
        this.title = title;
        this.summary = summary;
        this.sentimentScore = Math.round(sentimentScore * 1000.0) / 1000.0;
        this.evidenceCount = evidenceCount;
    }

    public Long getId() {
        return id;
    }

    public LocalDate getDigestDate() {
        return digestDate;
    }

    public String getThemeType() {
        return themeType;
    }

    public String getTitle() {
        return title;
    }

    public String getSummary() {
        return summary;
    }

    public double getSentimentScore() {
        return sentimentScore;
    }

    public int getEvidenceCount() {
        return evidenceCount;
    }
}
