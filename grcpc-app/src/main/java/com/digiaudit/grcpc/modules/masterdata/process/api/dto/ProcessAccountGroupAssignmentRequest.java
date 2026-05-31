package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ProcessAccountGroupAssignmentRequest(
        @NotNull
        UUID processNodeId,
        @NotNull
        UUID accountGroupId,
        String assignmentType,
        String validFrom,
        String validTo,
        Boolean isActive
) {
}
