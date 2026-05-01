package com.marketnarrative.multibagger;

import java.util.List;

public record MonthlyReviewRequest(
    String snapshotId,
    String month,
    List<ParsedPosition> corrections
) {
}
