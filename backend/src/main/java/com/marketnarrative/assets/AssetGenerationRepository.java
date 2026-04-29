package com.marketnarrative.assets;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetGenerationRepository extends JpaRepository<AssetGeneration, Long> {
    List<AssetGeneration> findByDigestDateOrderByCreatedAtDesc(LocalDate digestDate);

    void deleteByDigestDate(LocalDate digestDate);
}
