package com.digiaudit.grcpc.modules.organization.api.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;

@Builder
public record OrganizationProcessAssignmentResponse(
        UUID id,
        UUID organizationId,
        UUID processNodeId,
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
