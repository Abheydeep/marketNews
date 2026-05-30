package com.marketnarrative.narrative;

import com.marketnarrative.common.DigestStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "daily_scripts")
public class DailyScript {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private LocalDate digestDate;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String onePageSummary;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String teleprompterScript;

    @Column(columnDefinition = "TEXT")
    private String reelScript;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DigestStatus status;

    @Column(nullable = false)
    private double overallSentiment;

    private OffsetDateTime publishedAt;

    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    protected DailyScript() {
    }

    public DailyScript(
        LocalDate digestDate,
        String title,
        String onePageSummary,
        String teleprompterScript,
        double overallSentiment
    ) {
        this.digestDate = digestDate;
        this.title = title;
        this.onePageSummary = onePageSummary;
        this.teleprompterScript = teleprompterScript;
        this.overallSentiment = Math.round(overallSentiment * 1000.0) / 1000.0;
        this.status = DigestStatus.DRAFT;
        this.updatedAt = OffsetDateTime.now();
    }

    public void replaceScript(String onePageSummary, String teleprompterScript) {
        this.onePageSummary = onePageSummary;
        this.teleprompterScript = teleprompterScript;
        this.updatedAt = OffsetDateTime.now();
    }

    public void replaceReelScript(String reelScript) {
        this.reelScript = reelScript;
        this.updatedAt = OffsetDateTime.now();
    }

    public void publish() {
        this.status = DigestStatus.PUBLISHED;
        this.publishedAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public LocalDate getDigestDate() {
        return digestDate;
    }

    public String getTitle() {
        return title;
    }

    public String getOnePageSummary() {
        return onePageSummary;
    }

    public String getTeleprompterScript() {
        return teleprompterScript;
    }

    public DigestStatus getStatus() {
        return status;
    }

    public double getOverallSentiment() {
        return overallSentiment;
    }

    public OffsetDateTime getPublishedAt() {
        return publishedAt;
    }

    public String getReelScript() {
        return reelScript;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
