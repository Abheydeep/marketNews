package com.marketnarrative.marketdata;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "market_snapshots")
public class MarketSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate tradingDate;

    @Column(nullable = false)
    private String symbol;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private double closeValue;

    @Column(nullable = false)
    private double changePercent;

    @Column(nullable = false)
    private String source;

    @Column(nullable = false)
    private OffsetDateTime capturedAt;

    protected MarketSnapshot() {
    }

    public MarketSnapshot(
        LocalDate tradingDate,
        String symbol,
        String name,
        double closeValue,
        double changePercent,
        String source,
        OffsetDateTime capturedAt
    ) {
        this.tradingDate = tradingDate;
        this.symbol = symbol;
        this.name = name;
        this.closeValue = closeValue;
        this.changePercent = changePercent;
        this.source = source;
        this.capturedAt = capturedAt;
    }

    public Long getId() {
        return id;
    }

    public LocalDate getTradingDate() {
        return tradingDate;
    }

    public String getSymbol() {
        return symbol;
    }

    public String getName() {
        return name;
    }

    public double getCloseValue() {
        return closeValue;
    }

    public double getChangePercent() {
        return changePercent;
    }

    public String getSource() {
        return source;
    }
}
