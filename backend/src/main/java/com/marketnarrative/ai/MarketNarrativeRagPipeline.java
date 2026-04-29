package com.marketnarrative.ai;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class MarketNarrativeRagPipeline {

    private final List<RagAgent> agents;

    public MarketNarrativeRagPipeline(List<RagAgent> agents) {
        this.agents = agents.stream()
            .sorted(Comparator.comparing(agent -> agent.role().ordinal()))
            .toList();
    }

    public List<AgentFinding> run(LocalDate digestDate) {
        List<AgentFinding> findings = new ArrayList<>();
        for (RagAgent agent : agents) {
            findings.add(agent.run(digestDate, List.copyOf(findings)));
        }
        return List.copyOf(findings);
    }
}
