package com.digiaudit.grcpc.modules.usermanagement.api.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record PermissionResponse(
        UUID id,
        String code,
        String moduleName,
        String title,
        String description,
        LocalDateTime createdAt
) {
}
