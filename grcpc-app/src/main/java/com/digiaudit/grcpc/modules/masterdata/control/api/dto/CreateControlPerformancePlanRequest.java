package com.digiaudit.grcpc.modules.masterdata.control.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record CreateControlPerformancePlanRequest(
        @NotBlank
        @Size(max = 255)
        String title,

        @Size(max = 2000)
        String description,

        @Size(max = 100)
        String frequency,

        @Size(max = 255)
        String ownerName,

        LocalDate plannedDate,

        @Size(max = 50)
        String status
) {
}
