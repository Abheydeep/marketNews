package com.marketnarrative.analysis;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TechnicalSetupScannerTest {

    private final TechnicalSetupScanner scanner = new TechnicalSetupScanner(
        new IndicatorService(),
        new RiskRewardService()
    );

    @Test
    void emitsOnlySetupsThatPassMomentumTrendVolumeAndRiskReward() {
        List<TradeSetup> setups = scanner.scan(
            LocalDate.of(2026, 4, 29),
            Map.of("NIFTY", bullishSeries(200_000))
        );

        assertThat(setups).hasSize(1);
        assertThat(setups.get(0).getSymbol()).isEqualTo("NIFTY");
        assertThat(setups.get(0).getRiskReward()).isGreaterThanOrEqualTo(2.0);
    }

    @Test
    void rejectsCandidateWhenVolumeIsNotInstitutional() {
        List<TradeSetup> setups = scanner.scan(
            LocalDate.of(2026, 4, 29),
            Map.of("NIFTY", bullishSeries(90_000))
        );

        assertThat(setups).isEmpty();
    }

    private List<PriceBar> bullishSeries(double finalVolume) {
        List<PriceBar> bars = new ArrayList<>();
        LocalDate start = LocalDate.of(2026, 3, 30);
        double close = 22000.0;
        for (int i = 0; i < 20; i++) {
            close += i == 9 ? -35.0 : 22.0;
            bars.add(new PriceBar(
                "NIFTY",
                start.plusDays(i),
                close - 18.0,
                close + 42.0,
                close - 55.0,
                close,
                100_000.0
            ));
        }
        bars.add(new PriceBar(
            "NIFTY",
            start.plusDays(20),
            close + 10.0,
            close + 145.0,
            close - 30.0,
            close + 120.0,
            finalVolume
        ));
        return bars;
    }
}
