package com.marketnarrative.ai;

import java.util.List;

public record AgentFinding(
    AgentRole role,
    String summary,
    List<AgentEvidence> evidence
) {
}
