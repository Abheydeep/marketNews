package com.marketnarrative.ai;

import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class ComplianceNarrativeAgent implements RagAgent {

    @Override
    public AgentRole role() {
        return AgentRole.COMPLIANCE_NARRATIVE;
    }

    @Override
    public AgentFinding run(LocalDate digestDate, List<AgentFinding> priorFindings) {
        return new AgentFinding(
            role(),
            "Prepared grounded narrative sections with attribution and the educational risk disclaimer.",
            List.of()
        );
    }
}
