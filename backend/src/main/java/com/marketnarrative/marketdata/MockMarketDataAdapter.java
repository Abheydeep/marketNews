package com.marketnarrative.marketdata;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class MockMarketDataAdapter implements MarketDataAdapter {

    private static final TypeReference<List<MarketSnapshotSeed>> SEED_TYPE = new TypeReference<>() {
    };

    private final ObjectMapper objectMapper;

    public MockMarketDataAdapter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public List<MarketSnapshot> fetchSnapshots(LocalDate digestDate) {
        try {
            List<MarketSnapshotSeed> seeds = objectMapper.readValue(
                new ClassPathResource("seed/market-snapshots.json").getInputStream(),
                SEED_TYPE
            );
            OffsetDateTime capturedAt = OffsetDateTime.now();
            return seeds.stream()
                .map(seed -> new MarketSnapshot(
                    digestDate,
                    seed.symbol(),
                    seed.name(),
                    seed.closeValue(),
                    seed.changePercent(),
                    seed.source(),
                    capturedAt
                ))
                .toList();
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to load mock market snapshots", ex);
        }
    }

    record MarketSnapshotSeed(
        String symbol,
        String name,
        double closeValue,
        double changePercent,
        String source
    ) {
    }
}
