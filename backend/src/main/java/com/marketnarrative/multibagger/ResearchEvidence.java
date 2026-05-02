package com.marketnarrative.multibagger;

import java.time.LocalDate;
import java.util.List;

public record ResearchEvidence(
    LocalDate asOf,
    List<ResearchEvidenceItem> marketRegime,
    List<HoldingEvidence> holdingEvidence,
    List<String> researchBoundaries
) {
}
