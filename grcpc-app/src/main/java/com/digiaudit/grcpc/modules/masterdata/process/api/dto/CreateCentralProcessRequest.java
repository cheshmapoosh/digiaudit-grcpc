package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.UUID;

public record CreateCentralProcessRequest(
        @NotBlank
        String code,
        @NotBlank
        String title,
        UUID parentProcessId,
        String description,
        Integer sortOrder,
        LocalDate validFrom,
        LocalDate validTo
) {
}
