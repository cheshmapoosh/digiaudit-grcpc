package com.digiaudit.grcpc.modules.organization.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record OrganizationRiskAssignmentRequest(
        @NotNull
        UUID organizationId,
        @NotNull
        UUID processNodeId,
        @NotNull
        UUID riskNodeId,
        String assignmentType,
        String validFrom,
        String validTo,
        Boolean isActive
) {
}
