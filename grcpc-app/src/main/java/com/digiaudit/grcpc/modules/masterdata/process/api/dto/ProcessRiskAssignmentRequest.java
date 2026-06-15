package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ProcessRiskAssignmentRequest(
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
