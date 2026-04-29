package com.marketnarrative.narrative;

import static org.assertj.core.api.Assertions.assertThat;

import com.marketnarrative.analysis.TradeSetup;
import com.marketnarrative.marketdata.MarketSnapshot;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class ScriptGeneratorTest {

    private final ScriptGenerator scriptGenerator = new ScriptGenerator();

    @Test
    void generatesTeleprompterWithDisclaimerAndSetupLevels() {
        DailyScript script = scriptGenerator.generate(
            LocalDate.of(2026, 4, 29),
            List.of(new MarketSnapshot(
                LocalDate.of(2026, 4, 29),
                "SPX",
                "S&P 500",
                5069.53,
                -0.82,
                "Mock",
                OffsetDateTime.now()
            )),
            List.of(new NarrativeTheme(
                LocalDate.of(2026, 4, 29),
                "macro_negative",
                "Negative Macro Impact",
                "Oil and dollar strength pressure risk appetite.",
                -0.5,
                2
            )),
            List.of(new TradeSetup(
                LocalDate.of(2026, 4, 29),
                "NIFTY",
                "BULLISH",
                22705.0,
                22428.45,
                23313.41,
                2.2,
                "Trend, RSI, and volume confirm.",
                "Invalidate below stop."
            )),
            -0.42
        );

        assertThat(script.getTeleprompterScript()).contains("[RISK DISCLAIMER]");
        assertThat(script.getOnePageSummary()).contains("NIFTY BULLISH entry 22705.0");
    }
}
