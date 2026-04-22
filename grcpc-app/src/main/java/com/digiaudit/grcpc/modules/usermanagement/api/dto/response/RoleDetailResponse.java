package com.digiaudit.grcpc.modules.usermanagement.api.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record RoleDetailResponse(
        UUID id,
        String code,
        boolean systemDefined,
        boolean enabled,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<LocalizedTextResponse> translations,
        List<PermissionResponse> systemPermissions,
        List<PermissionResponse> businessPermissions
) {
}
