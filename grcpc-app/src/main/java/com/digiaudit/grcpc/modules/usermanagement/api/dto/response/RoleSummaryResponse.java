package com.digiaudit.grcpc.modules.usermanagement.api.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record RoleSummaryResponse(
        UUID id,
        String code,
        String title,
        String description,
        boolean systemDefined,
        boolean enabled,
        LocalDateTime createdAt
) {
}
