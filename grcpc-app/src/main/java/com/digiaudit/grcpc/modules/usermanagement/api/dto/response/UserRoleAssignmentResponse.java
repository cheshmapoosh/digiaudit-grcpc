package com.digiaudit.grcpc.modules.usermanagement.api.dto.response;

import com.digiaudit.grcpc.modules.usermanagement.domain.enums.ScopeType;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

public record UserRoleAssignmentResponse(
        UUID id,
        UUID roleId,
        String roleCode,
        String roleTitle,
        ScopeType scopeType,
        UUID scopeOrgUnitId,
        LocalDateTime validFrom,
        LocalDateTime validTo,
        UUID assignedBy,
        Instant assignedAt,
        boolean active
) {
}
