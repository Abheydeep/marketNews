package com.marketnarrative.news;

import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MarketNewsRepository extends JpaRepository<MarketNews, Long> {
    List<MarketNews> findByPublishedAtBetweenOrderByPublishedAtDesc(OffsetDateTime start, OffsetDateTime end);

    void deleteByPublishedAtBetween(OffsetDateTime start, OffsetDateTime end);
}
