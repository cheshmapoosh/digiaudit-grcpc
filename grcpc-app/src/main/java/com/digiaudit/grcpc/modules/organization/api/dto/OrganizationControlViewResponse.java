package com.digiaudit.grcpc.modules.organization.api.dto;

import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;

@Builder
public record OrganizationControlViewResponse(
        UUID organizationId,
        UUID processNodeId,
        String subProcessCode,
        String subProcessTitle,
        UUID controlId,
        String controlCode,
        String controlTitle,
        String controlDescription,
        String controlAutomation,
        String controlFrequency,
        String controlClassification,
        String controlOwner,
        String importance,
        String status,
        UUID processControlAssignmentId,
        String assignmentType,
        LocalDate validFrom,
        LocalDate validTo,
        Boolean isActive
) {
}
