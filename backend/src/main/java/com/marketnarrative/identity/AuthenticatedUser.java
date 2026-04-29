package com.marketnarrative.identity;

import java.util.List;

public record AuthenticatedUser(
    String email,
    String displayName,
    UserRole role,
    List<String> permissions
) {
}
