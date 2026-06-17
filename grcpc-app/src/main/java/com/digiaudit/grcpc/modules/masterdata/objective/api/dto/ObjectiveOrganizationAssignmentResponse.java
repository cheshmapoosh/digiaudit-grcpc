package com.digiaudit.grcpc.modules.masterdata.objective.api.dto;

import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;

@Builder
public record ObjectiveOrganizationAssignmentResponse(
        UUID assignmentId,
        UUID objectiveNodeId,
        UUID organizationId,
        String objectiveCode,
        String objectiveTitle,
        String objectiveStatus,
        String objectiveType,
        String description,
        LocalDate effectiveFrom,
        LocalDate validUntil,
        boolean active
) {
}
