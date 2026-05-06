package com.marketnarrative.narrative;

import com.marketnarrative.analysis.TradeSetup;
import com.marketnarrative.common.SentimentLabel;
import com.marketnarrative.marketdata.MarketSnapshot;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class ScriptGenerator {

    public DailyScript generate(
        LocalDate digestDate,
        List<MarketSnapshot> snapshots,
        List<NarrativeTheme> themes,
        List<TradeSetup> setups,
        double overallSentiment
    ) {
        SentimentLabel label = SentimentLabel.fromScore(overallSentiment);
        String title = titleSuffix(label) + " | Market Narrative - " + digestDate;
        String onePageSummary = buildSummary(label, snapshots, themes, setups);
        String teleprompter = buildTeleprompter(label, snapshots, themes, setups);
        return new DailyScript(digestDate, title, onePageSummary, teleprompter, overallSentiment);
    }

    private String buildSummary(
        SentimentLabel label,
        List<MarketSnapshot> snapshots,
        List<NarrativeTheme> themes,
        List<TradeSetup> setups
    ) {
        String marketLine = snapshots.stream()
            .map(snapshot -> snapshot.getName() + " " + formatChange(snapshot.getChangePercent()))
            .collect(Collectors.joining(", "));
        String themeLines = themes.stream()
            .map(theme -> "- " + theme.getTitle() + ": " + theme.getSummary())
            .collect(Collectors.joining("\n"));
        String setupLines = setups.isEmpty()
            ? "- No fresh setup: wait for a new range with defined entry, stop, and first target."
            : setups.stream()
                .map(setup -> "- " + setup.getSymbol() + " " + setup.getDirection()
                    + " entry " + setup.getEntryPrice()
                    + ", stop " + setup.getStopLoss()
                    + ", target " + setup.getTargetPrice()
                    + " (RR " + setup.getRiskReward() + ")")
                .collect(Collectors.joining("\n"));

        return """
            Market Mood: %s

            Global Cues: %s

            Narrative Themes:
            %s

            Validated Trading Setups:
            %s

            Educational note: Educational market research only. This is not SEBI-registered investment advice, a research recommendation, or a solicitation to buy or sell securities or derivatives. No returns are assured; use your own risk plan.
            """.formatted(label, marketLine, themeLines, setupLines).trim();
    }

    private String buildTeleprompter(
        SentimentLabel label,
        List<MarketSnapshot> snapshots,
        List<NarrativeTheme> themes,
        List<TradeSetup> setups
    ) {
        String opening = switch (label) {
            case BULLISH -> "Good morning. The bias is constructive, but Nifty and Bank Nifty still need acceptance after the bell.";
            case BEARISH -> "Good morning. The pre-open tape is cautious, so protect size until Nifty and Bank Nifty confirm support.";
            case VOLATILE -> "Good morning. This is a two-way setup; levels and breadth matter more than the first tick.";
            case NEUTRAL -> "Good morning. The tape is balanced, and the first range should define direction.";
        };
        String cues = snapshots.stream()
            .map(snapshot -> snapshot.getName() + " closed " + formatChange(snapshot.getChangePercent()))
            .collect(Collectors.joining(". "));
        String themesText = themes.stream()
            .map(theme -> "Theme: " + theme.getTitle() + ". " + theme.getSummary())
            .collect(Collectors.joining("\n\n"));
        String setupsText = setups.isEmpty()
            ? "No fresh setup qualifies under the 1:2 risk-reward framework yet. Build the plan as IF bullish open, IF bearish open, and invalidation before taking any trade."
            : setups.stream()
                .map(setup -> setup.getSymbol() + ": watch " + setup.getEntryPrice()
                    + " as entry, " + setup.getStopLoss()
                    + " as invalidation, and " + setup.getTargetPrice()
                    + " as target. " + setup.getConfidenceReason())
                .collect(Collectors.joining("\n\n"));

        return """
            [OPENING]
            %s

            [GLOBAL CUES]
            %s.

            [NARRATIVE THEMES]
            %s

            [NIFTY AND BANK NIFTY VIEW]
            Let price confirm the opening bias. Do not chase the first candle; wait for acceptance around the levels.

            [VALIDATED SETUPS]
            %s

            [RISK DISCLAIMER]
            Educational market research only. This is not SEBI-registered investment advice, a research recommendation, or a solicitation to buy or sell securities or derivatives. No returns are assured; use your own risk plan.
            """.formatted(opening, cues, themesText, setupsText).trim();
    }

    private String titleSuffix(SentimentLabel label) {
        return switch (label) {
            case BULLISH -> "Risk-On Breadth Tests Nifty Follow-Through";
            case BEARISH -> "Macro Pressure Tests Nifty Support";
            case VOLATILE -> "Two-Way Cues Put Opening Levels In Focus";
            case NEUTRAL -> "Balanced Tape Awaits First-Hour Confirmation";
        };
    }

    private String formatChange(double changePercent) {
        return (changePercent >= 0 ? "+" : "") + changePercent + "%";
    }
}
