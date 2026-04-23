package com.digiaudit.grcpc.modules.regulation.api.dto;

import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationNodeType;
import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationStatus;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record UpdateRegulationRequest(
        @Size(max = 50)
        String code,

        @Size(max = 255)
        String title,

        UUID parentId,
        RegulationNodeType nodeType,
        RegulationStatus status,

        @Size(max = 2000)
        String description,

        LocalDate effectiveFrom,
        LocalDate effectiveTo
) {
}
