package com.marketnarrative.analysis;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "trade_setups")
public class TradeSetup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate digestDate;

    @Column(nullable = false)
    private String symbol;

    @Column(nullable = false)
    private String direction;

    @Column(nullable = false)
    private double entryPrice;

    @Column(nullable = false)
    private double stopLoss;

    @Column(nullable = false)
    private double targetPrice;

    @Column(nullable = false)
    private double riskReward;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String confidenceReason;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String invalidationReason;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    protected TradeSetup() {
    }

    public TradeSetup(
        LocalDate digestDate,
        String symbol,
        String direction,
        double entryPrice,
        double stopLoss,
        double targetPrice,
        double riskReward,
        String confidenceReason,
        String invalidationReason
    ) {
        this.digestDate = digestDate;
        this.symbol = symbol;
        this.direction = direction;
        this.entryPrice = round(entryPrice);
        this.stopLoss = round(stopLoss);
        this.targetPrice = round(targetPrice);
        this.riskReward = Math.round(riskReward * 1000.0) / 1000.0;
        this.confidenceReason = confidenceReason;
        this.invalidationReason = invalidationReason;
        this.createdAt = OffsetDateTime.now();
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    public Long getId() {
        return id;
    }

    public LocalDate getDigestDate() {
        return digestDate;
    }

    public String getSymbol() {
        return symbol;
    }

    public String getDirection() {
        return direction;
    }

    public double getEntryPrice() {
        return entryPrice;
    }

    public double getStopLoss() {
        return stopLoss;
    }

    public double getTargetPrice() {
        return targetPrice;
    }

    public double getRiskReward() {
        return riskReward;
    }

    public String getConfidenceReason() {
        return confidenceReason;
    }

    public String getInvalidationReason() {
        return invalidationReason;
    }
}
