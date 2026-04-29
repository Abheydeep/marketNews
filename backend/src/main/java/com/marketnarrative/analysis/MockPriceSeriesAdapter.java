package com.marketnarrative.analysis;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.ArrayList;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class MockPriceSeriesAdapter implements PriceSeriesAdapter {

    private static final TypeReference<List<SeriesSeed>> SEED_TYPE = new TypeReference<>() {
    };

    private final ObjectMapper objectMapper;

    public MockPriceSeriesAdapter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public Map<String, List<PriceBar>> fetchSeries(LocalDate digestDate) {
        try {
            List<SeriesSeed> seeds = objectMapper.readValue(
                new ClassPathResource("seed/price-bars.json").getInputStream(),
                SEED_TYPE
            );
            Map<String, List<PriceBar>> series = new LinkedHashMap<>();
            for (SeriesSeed seed : seeds) {
                List<PriceBar> bars = new ArrayList<>();
                for (int i = 0; i < seed.bars().size(); i++) {
                    BarSeed bar = seed.bars().get(i);
                    bars.add(new PriceBar(
                        seed.symbol(),
                        digestDate.minusDays(seed.bars().size() - i - 1L),
                        bar.open(),
                        bar.high(),
                        bar.low(),
                        bar.close(),
                        bar.volume()
                    ));
                }
                series.put(seed.symbol(), bars);
            }
            return series;
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to load mock price series", ex);
        }
    }

    record SeriesSeed(String symbol, List<BarSeed> bars) {
    }

    record BarSeed(double open, double high, double low, double close, double volume) {
    }
}
