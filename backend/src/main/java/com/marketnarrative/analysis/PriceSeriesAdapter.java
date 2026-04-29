package com.marketnarrative.analysis;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface PriceSeriesAdapter {
    Map<String, List<PriceBar>> fetchSeries(LocalDate digestDate);
}
