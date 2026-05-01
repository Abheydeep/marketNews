package com.marketnarrative.multibagger;

import java.util.List;

public record SnapshotUploadResult(
    String snapshotId,
    String status,
    List<ParsedPosition> parsedPositions
) {
}
