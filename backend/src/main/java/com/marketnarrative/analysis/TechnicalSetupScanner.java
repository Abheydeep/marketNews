package com.marketnarrative.analysis;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class TechnicalSetupScanner {

    private static final int EMA_PERIOD = 20;
    private static final int RSI_PERIOD = 14;
    private static final int VOLUME_PERIOD = 20;

    private final IndicatorService indicatorService;
    private final RiskRewardService riskRewardService;

    public TechnicalSetupScanner(IndicatorService indicatorService, RiskRewardService riskRewardService) {
        this.indicatorService = indicatorService;
        this.riskRewardService = riskRewardService;
    }

    public List<TradeSetup> scan(LocalDate digestDate, Map<String, List<PriceBar>> priceSeries) {
        List<TradeSetup> setups = new ArrayList<>();
        for (Map.Entry<String, List<PriceBar>> entry : priceSeries.entrySet()) {
            evaluateSymbol(digestDate, entry.getKey(), entry.getValue()).ifPresent(setups::add);
        }
        return setups;
    }

    private java.util.Optional<TradeSetup> evaluateSymbol(LocalDate digestDate, String symbol, List<PriceBar> bars) {
        if (bars.size() < VOLUME_PERIOD + 1) {
            return java.util.Optional.empty();
        }

        PriceBar latest = bars.get(bars.size() - 1);
        double ema = indicatorService.ema(bars, EMA_PERIOD);
        double currentRsi = indicatorService.rsi(bars, RSI_PERIOD);
        double previousRsi = indicatorService.rsi(bars.subList(0, bars.size() - 1), RSI_PERIOD);
        double averageVolume = indicatorService.averageVolume(bars.subList(0, bars.size() - 1), VOLUME_PERIOD);

        boolean trendPass = latest.close() > ema;
        boolean momentumPass = currentRsi > 50.0 && currentRsi > previousRsi;
        boolean volumePass = latest.volume() >= averageVolume * 1.5;

        if (!trendPass || !momentumPass || !volumePass) {
            return java.util.Optional.empty();
        }

        double entry = latest.close();
        double stopLoss = Math.min(latest.low(), ema * 0.992);
        double target = entry + (entry - stopLoss) * 2.2;
        double riskReward = riskRewardService.bullishRiskReward(entry, stopLoss, target);

        if (riskReward < 2.0) {
            return java.util.Optional.empty();
        }

        String confidence = "Price is above the 20-period EMA, RSI-14 is above 50 and rising, and latest volume is at least 1.5x the prior average.";
        String invalidation = "Invalidate the setup if price closes below " + Math.round(stopLoss * 100.0) / 100.0 + ".";
        return java.util.Optional.of(new TradeSetup(
            digestDate,
            symbol,
            "BULLISH",
            entry,
            stopLoss,
            target,
            riskReward,
            confidence,
            invalidation
        ));
    }
}
