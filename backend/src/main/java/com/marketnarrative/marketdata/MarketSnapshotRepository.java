package com.marketnarrative.marketdata;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MarketSnapshotRepository extends JpaRepository<MarketSnapshot, Long> {
    List<MarketSnapshot> findByTradingDateOrderBySymbol(LocalDate tradingDate);

    void deleteByTradingDate(LocalDate tradingDate);
}
