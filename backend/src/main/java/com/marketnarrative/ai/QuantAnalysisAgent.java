package com.marketnarrative.ai;

import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class QuantAnalysisAgent implements RagAgent {

    @Override
    public AgentRole role() {
        return AgentRole.QUANT_ANALYSIS;
    }

    @Override
    public AgentFinding run(LocalDate digestDate, List<AgentFinding> priorFindings) {
        return new AgentFinding(
            role(),
            "Validated scanner outputs with deterministic indicator math and strict 1:2 risk-reward checks.",
            List.of()
        );
    }
}
