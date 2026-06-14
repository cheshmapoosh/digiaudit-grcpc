package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ProcessRegulationAssignmentRequest(
        @NotNull
        UUID processNodeId,
        @NotNull
        UUID regulationNodeId,
        Boolean isActive
) {
}
