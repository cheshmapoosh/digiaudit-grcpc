package com.digiaudit.grcpc.modules.regulation.api.dto;

import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationNodeType;
import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record CreateRegulationRequest(
        @NotBlank
        @Size(max = 50)
        String code,

        @NotBlank
        @Size(max = 255)
        String title,

        UUID parentId,

        @NotNull
        RegulationNodeType nodeType,

        @NotNull
        RegulationStatus status,

        @Size(max = 2000)
        String description,

        LocalDate effectiveFrom,
        LocalDate effectiveTo
) {
}
