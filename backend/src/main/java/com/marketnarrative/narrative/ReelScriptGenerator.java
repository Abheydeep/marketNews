package com.marketnarrative.narrative;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketnarrative.analysis.TradeSetup;
import com.marketnarrative.common.SentimentLabel;
import com.marketnarrative.marketdata.MarketSnapshot;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * Generates 45-60 second reel scripts via NVIDIA NIM (Llama 4 Maverick).
 * Falls back to a template when NVIDIA_API_KEY is absent or the call fails.
 */
@Service
public class ReelScriptGenerator {

    private static final Logger log = LoggerFactory.getLogger(ReelScriptGenerator.class);
    private static final String NIM_BASE_URL = "https://integrate.api.nvidia.com";
    private static final String MODEL = "meta/llama-4-maverick-17b-128e-instruct";

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;

    public ReelScriptGenerator(
        RestClient.Builder restClientBuilder,
        ObjectMapper objectMapper,
        @Value("${app.nvidia.api-key:}") String apiKey
    ) {
        this.restClient = restClientBuilder.baseUrl(NIM_BASE_URL).build();
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
    }

    public String generate(
        LocalDate digestDate,
        List<MarketSnapshot> snapshots,
        List<NarrativeTheme> themes,
        List<TradeSetup> setups,
        double overallSentiment
    ) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("NVIDIA_API_KEY not configured — using template reel script");
            return templateFallback(digestDate, snapshots, themes, setups, overallSentiment);
        }
        try {
            return callNim(digestDate, snapshots, themes, setups, overallSentiment);
        } catch (Exception e) {
            log.error("NVIDIA NIM reel script generation failed — falling back to template: {}", e.getMessage());
            return templateFallback(digestDate, snapshots, themes, setups, overallSentiment);
        }
    }

    private String callNim(
        LocalDate digestDate,
        List<MarketSnapshot> snapshots,
        List<NarrativeTheme> themes,
        List<TradeSetup> setups,
        double overallSentiment
    ) throws Exception {
        String prompt = buildPrompt(digestDate, snapshots, themes, setups, overallSentiment);

        Map<String, Object> body = Map.of(
            "model", MODEL,
            "messages", List.of(Map.of("role", "user", "content", prompt)),
            "max_tokens", 1024,
            "temperature", 0.85,
            "top_p", 1.0
        );

        String bodyJson = objectMapper.writeValueAsString(body);

        String response = restClient.post()
            .uri("/v1/chat/completions")
            .header("Authorization", "Bearer " + apiKey)
            .contentType(MediaType.APPLICATION_JSON)
            .body(bodyJson)
            .retrieve()
            .body(String.class);

        return extractText(response);
    }

    @SuppressWarnings("unchecked")
    private String extractText(String responseJson) throws Exception {
        Map<String, Object> parsed = objectMapper.readValue(responseJson, Map.class);
        List<Map<String, Object>> choices = (List<Map<String, Object>>) parsed.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new IllegalStateException("Empty choices from NVIDIA NIM");
        }
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        if (message == null) {
            throw new IllegalStateException("Missing message in NIM response");
        }
        Object content = message.get("content");
        return content == null ? "" : content.toString().trim();
    }

    private String buildPrompt(
        LocalDate digestDate,
        List<MarketSnapshot> snapshots,
        List<NarrativeTheme> themes,
        List<TradeSetup> setups,
        double overallSentiment
    ) {
        SentimentLabel label = SentimentLabel.fromScore(overallSentiment);

        String marketSummary = snapshots.stream()
            .map(s -> s.getName() + " " + (s.getChangePercent() >= 0 ? "+" : "") + s.getChangePercent() + "%")
            .collect(Collectors.joining(", "));

        String themesSummary = themes.stream()
            .map(t -> t.getTitle() + ": " + t.getSummary())
            .collect(Collectors.joining("\n"));

        String setupsSummary = setups.isEmpty()
            ? "No high-probability setups today."
            : setups.stream()
                .map(s -> s.getSymbol() + " " + s.getDirection()
                    + " entry " + s.getEntryPrice()
                    + ", stop " + s.getStopLoss()
                    + ", target " + s.getTargetPrice()
                    + " | " + s.getConfidenceReason())
                .collect(Collectors.joining("\n"));

        return """
            You are writing a 45-60 second spoken reel script for a daily Indian stock market update \
            video on Instagram/YouTube Shorts. The creator is Abhey, who runs marketnarrative.in — \
            a site for retail traders.

            The script must:
            - Open with a HOOK that creates curiosity or mild shock (one sentence, no greeting)
            - Keep every sentence short — maximum 12 words each
            - Use conversational Hindi-English (Hinglish) mix naturally — not forced
            - Build suspense: each section should make the viewer want to hear the next
            - End with a soft CTA that teases tomorrow or invites a follow
            - Include the standard disclaimer at the very end as a fast text note

            Format the output EXACTLY like this (keep the section labels, nothing else):
            [HOOK]
            <one explosive curiosity-gap opener>

            [MARKET PULSE]
            <2-3 sentences on yesterday's key move — use actual numbers>

            [WHY IT MATTERS]
            <2-3 sentences on what this means for Indian markets today>

            [TRADE ANGLE]
            <1-2 sentences — one specific thing to watch (level, event, setup)>

            [CLOSE]
            <1 teaser sentence + CTA>

            [DISCLAIMER]
            Educational content only. Not SEBI advice.

            --- MARKET DATA ---
            Date: %s
            Overall sentiment: %s
            Markets: %s

            Key themes:
            %s

            Trade setups:
            %s
            """.formatted(digestDate, label, marketSummary, themesSummary, setupsSummary);
    }

    private String templateFallback(
        LocalDate digestDate,
        List<MarketSnapshot> snapshots,
        List<NarrativeTheme> themes,
        List<TradeSetup> setups,
        double overallSentiment
    ) {
        SentimentLabel label = SentimentLabel.fromScore(overallSentiment);
        String hook = switch (label) {
            case BULLISH  -> "Something big happened yesterday — and most retail traders missed it.";
            case BEARISH  -> "The market sent a warning yesterday. Did you see it?";
            case VOLATILE -> "Yesterday's market was a trap. Here's who got caught.";
            case NEUTRAL  -> "Yesterday's market looks calm on the surface. But there's a setup brewing.";
        };
        String marketLine = snapshots.stream()
            .map(s -> s.getName() + " " + (s.getChangePercent() >= 0 ? "+" : "") + s.getChangePercent() + "%")
            .collect(Collectors.joining(", "));
        String topTheme = themes.isEmpty() ? "Key macro themes are in play."
            : themes.get(0).getTitle() + " — " + themes.get(0).getSummary();
        String setupLine = setups.isEmpty() ? "No clean setup today — stay patient."
            : "Watch " + setups.get(0).getSymbol() + " at " + setups.get(0).getEntryPrice() + ".";

        return """
            [HOOK]
            %s

            [MARKET PULSE]
            %s. That's the snapshot from yesterday's close.

            [WHY IT MATTERS]
            %s

            [TRADE ANGLE]
            %s

            [CLOSE]
            Follow marketnarrative.in for the full breakdown — see you tomorrow.

            [DISCLAIMER]
            Educational content only. Not SEBI advice.
            """.formatted(hook, marketLine, topTheme, setupLine).trim();
    }
}
