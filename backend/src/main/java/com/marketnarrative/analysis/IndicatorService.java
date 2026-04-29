package com.marketnarrative.analysis;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class IndicatorService {

    public double ema(List<PriceBar> bars, int period) {
        if (bars.isEmpty()) {
            throw new IllegalArgumentException("EMA requires at least one bar");
        }
        int effectivePeriod = Math.min(period, bars.size());
        double multiplier = 2.0 / (effectivePeriod + 1.0);
        double ema = bars.get(0).close();
        for (int i = 1; i < bars.size(); i++) {
            ema = (bars.get(i).close() - ema) * multiplier + ema;
        }
        return ema;
    }

    public double rsi(List<PriceBar> bars, int period) {
        if (bars.size() <= period) {
            throw new IllegalArgumentException("RSI requires more bars than the period");
        }
        double gains = 0.0;
        double losses = 0.0;
        int start = bars.size() - period;
        for (int i = start; i < bars.size(); i++) {
            double change = bars.get(i).close() - bars.get(i - 1).close();
            if (change >= 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }
        if (losses == 0.0) {
            return 100.0;
        }
        double relativeStrength = (gains / period) / (losses / period);
        return 100.0 - (100.0 / (1.0 + relativeStrength));
    }

    public double averageVolume(List<PriceBar> bars, int period) {
        int effectivePeriod = Math.min(period, bars.size());
        return bars.subList(bars.size() - effectivePeriod, bars.size()).stream()
            .mapToDouble(PriceBar::volume)
            .average()
            .orElse(0.0);
    }
}
