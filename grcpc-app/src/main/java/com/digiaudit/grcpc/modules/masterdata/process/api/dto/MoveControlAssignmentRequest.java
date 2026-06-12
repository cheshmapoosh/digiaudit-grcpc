package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record MoveControlAssignmentRequest(
        @NotNull
        UUID targetSubProcessId,

        LocalDate validFrom
) {
}
