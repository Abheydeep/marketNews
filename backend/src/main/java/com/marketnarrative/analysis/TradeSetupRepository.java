package com.marketnarrative.analysis;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TradeSetupRepository extends JpaRepository<TradeSetup, Long> {
    List<TradeSetup> findByDigestDateOrderBySymbol(LocalDate digestDate);

    void deleteByDigestDate(LocalDate digestDate);
}
