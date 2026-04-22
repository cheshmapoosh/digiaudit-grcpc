package com.digiaudit.grcpc.modules.usermanagement.api.dto.response;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

public record UserSummaryResponse(
        UUID id,
        String username,
        String firstName,
        String lastName,
        String mobile,
        String email,
        boolean enabled,
        boolean locked,
        boolean rootUser,
        UUID defaultOrgUnitId,
        LocalDateTime createdAt
) {
}
