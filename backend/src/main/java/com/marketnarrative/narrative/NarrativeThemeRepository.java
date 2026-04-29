package com.marketnarrative.narrative;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NarrativeThemeRepository extends JpaRepository<NarrativeTheme, Long> {
    List<NarrativeTheme> findByDigestDateOrderBySentimentScoreAsc(LocalDate digestDate);

    void deleteByDigestDate(LocalDate digestDate);
}
