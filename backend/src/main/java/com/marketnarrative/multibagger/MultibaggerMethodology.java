package com.marketnarrative.multibagger;

import java.util.List;

public record MultibaggerMethodology(
    String definition,
    String targetOutcome,
    List<String> evaluationCategories,
    String replacementLogic,
    String disclaimer
) {
}
