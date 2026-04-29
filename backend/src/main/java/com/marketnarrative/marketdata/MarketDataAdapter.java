package com.marketnarrative.marketdata;

import java.time.LocalDate;
import java.util.List;

public interface MarketDataAdapter {
    List<MarketSnapshot> fetchSnapshots(LocalDate digestDate);
}
