package com.digiaudit.grcpc.modules.organization.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record OrganizationReferenceAssignmentRequest(
        @NotNull
        UUID organizationId,
        @NotBlank
        String referenceType,
        @NotNull
        UUID referenceId,
        String assignmentType,
        String validFrom,
        String validTo,
        Boolean isActive
) {
}
