package com.marketnarrative.assets;

import com.marketnarrative.common.SentimentLabel;
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
@Table(name = "asset_generations")
public class AssetGeneration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate digestDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SentimentLabel sentimentLabel;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String positivePrompt;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String negativePrompt;

    @Column(nullable = false)
    private String palette;

    @Column(nullable = false)
    private String referenceImageId;

    @Column(nullable = false)
    private String controlNetMode;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String assetUrl;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    protected AssetGeneration() {
    }

    public AssetGeneration(
        LocalDate digestDate,
        SentimentLabel sentimentLabel,
        String positivePrompt,
        String negativePrompt,
        String palette,
        String referenceImageId,
        String controlNetMode,
        String assetUrl
    ) {
        this.digestDate = digestDate;
        this.sentimentLabel = sentimentLabel;
        this.positivePrompt = positivePrompt;
        this.negativePrompt = negativePrompt;
        this.palette = palette;
        this.referenceImageId = referenceImageId;
        this.controlNetMode = controlNetMode;
        this.assetUrl = assetUrl;
        this.createdAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public LocalDate getDigestDate() {
        return digestDate;
    }

    public SentimentLabel getSentimentLabel() {
        return sentimentLabel;
    }

    public String getPositivePrompt() {
        return positivePrompt;
    }

    public String getNegativePrompt() {
        return negativePrompt;
    }

    public String getPalette() {
        return palette;
    }

    public String getReferenceImageId() {
        return referenceImageId;
    }

    public String getControlNetMode() {
        return controlNetMode;
    }

    public String getAssetUrl() {
        return assetUrl;
    }
}
