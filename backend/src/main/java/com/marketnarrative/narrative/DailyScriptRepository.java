package com.marketnarrative.narrative;

import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyScriptRepository extends JpaRepository<DailyScript, Long> {
    Optional<DailyScript> findByDigestDate(LocalDate digestDate);

    void deleteByDigestDate(LocalDate digestDate);
}
