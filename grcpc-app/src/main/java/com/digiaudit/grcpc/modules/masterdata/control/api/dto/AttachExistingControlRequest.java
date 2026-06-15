package com.digiaudit.grcpc.modules.masterdata.control.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

public record AttachExistingControlRequest(
        @NotNull
        UUID controlId,

        UUID ownerId,

        @Size(max = 255)
        String ownerName,

        LocalDate validFrom,
        LocalDate validTo,

        @PositiveOrZero
        Integer sortOrder,

        @Size(max = 255)
        String operationPeriod,

        @Size(max = 255)
        String testMethod,

        @Size(max = 2000)
        String testPlan
) {
}
