package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ProcessObjectiveAssignmentRequest(
        @NotNull
        UUID processNodeId,
        @NotNull
        UUID objectiveNodeId,
        String assignmentType,
        String validFrom,
        String validTo,
        Boolean isActive
) {
}
