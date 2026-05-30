package com.digiaudit.grcpc.modules.regulation.api.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationNodeType;
import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

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

        @PositiveOrZero
        Integer sortOrder,

        @JsonAlias("effectiveFrom")
        String effectiveDate,

        @JsonAlias("effectiveTo")
        String validTo,

        @Size(max = 255)
        String issuer,

        @Size(max = 255)
        String ownerName,

        @PositiveOrZero
        Integer documentsCount
) {
}
