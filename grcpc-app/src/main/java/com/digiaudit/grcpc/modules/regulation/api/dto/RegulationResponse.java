package com.digiaudit.grcpc.modules.regulation.api.dto;

import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationNodeType;
import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationStatus;
import lombok.Builder;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Builder
public record RegulationResponse(
        UUID id,
        String code,
        String title,
        UUID parentId,
        RegulationNodeType nodeType,
        RegulationStatus status,
        String description,
        LocalDate effectiveFrom,
        LocalDate effectiveTo,
        Instant createdAt,
        Instant updatedAt
) {
}
