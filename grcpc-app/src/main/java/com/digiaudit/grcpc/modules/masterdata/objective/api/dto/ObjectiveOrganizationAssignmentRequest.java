package com.digiaudit.grcpc.modules.masterdata.objective.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ObjectiveOrganizationAssignmentRequest(
        @NotNull
        UUID organizationId,
        @NotNull
        UUID objectiveNodeId
) {
}
