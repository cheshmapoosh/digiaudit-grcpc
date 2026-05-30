package com.digiaudit.grcpc.modules.organization.api.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;

@Builder
public record OrganizationReferenceAssignmentResponse(
        UUID id,
        UUID organizationId,
        String referenceType,
        UUID referenceId,
        String assignmentType,
        LocalDate validFrom,
        LocalDate validTo,
        Boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        UUID createdBy,
        UUID updatedBy
) {
}
