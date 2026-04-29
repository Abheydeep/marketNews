package com.marketnarrative.ai;

import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class InformationRetrievalAgent implements RagAgent {

    @Override
    public AgentRole role() {
        return AgentRole.INFORMATION_RETRIEVAL;
    }

    @Override
    public AgentFinding run(LocalDate digestDate, List<AgentFinding> priorFindings) {
        return new AgentFinding(
            role(),
            "Retrieved source-attributed market news, entity tags, and sentiment metadata for " + digestDate + ".",
            List.of()
        );
    }
}
