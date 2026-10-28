package com.digiaudit.grcpc.modules.organization.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.UUID;

public record OrganizationOwnerChange(@NotNull Operation operation, @NotNull UUID userId,
        UUID assignmentId, @PositiveOrZero Long version) {
    public enum Operation { CREATE_OR_RESTORE, ACTIVATE, INACTIVATE, DELETE, RESTORE }
}
