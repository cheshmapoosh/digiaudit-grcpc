package com.digiaudit.grcpc.modules.regulation.api.dto;

import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateRegulationStatusRequest(
        @NotNull
        RegulationStatus status
) {
}
