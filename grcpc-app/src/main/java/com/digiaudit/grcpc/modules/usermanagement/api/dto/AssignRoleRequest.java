package com.digiaudit.grcpc.modules.usermanagement.api.dto;

import com.digiaudit.grcpc.modules.usermanagement.domain.enums.ScopeType;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.UUID;

public record AssignRoleRequest(
        @NotNull UUID roleId,
        @NotNull ScopeType scopeType,
        UUID scopeOrgUnitId,
        LocalDateTime validFrom,
        LocalDateTime validTo
) {
}
