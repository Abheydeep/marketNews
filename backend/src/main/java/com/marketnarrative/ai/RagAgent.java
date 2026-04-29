package com.marketnarrative.ai;

import java.time.LocalDate;
import java.util.List;

public interface RagAgent {

    AgentRole role();

    AgentFinding run(LocalDate digestDate, List<AgentFinding> priorFindings);
}
