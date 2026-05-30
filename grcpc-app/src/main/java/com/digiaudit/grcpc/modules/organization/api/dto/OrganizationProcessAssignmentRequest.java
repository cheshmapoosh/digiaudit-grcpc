package com.digiaudit.grcpc.modules.organization.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record OrganizationProcessAssignmentRequest(
        @NotNull
        UUID organizationId,
        @NotNull
        UUID processNodeId,
        String assignmentType,
        String validFrom,
        String validTo,
        Boolean isActive
) {
}
