package com.marketnarrative.news;

import java.time.LocalDate;
import java.util.List;

public interface NewsDataAdapter {
    List<MarketNews> fetchArticles(LocalDate digestDate);
}
