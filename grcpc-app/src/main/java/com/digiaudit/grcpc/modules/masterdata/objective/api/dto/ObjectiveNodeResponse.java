package com.digiaudit.grcpc.modules.masterdata.objective.api.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;

@Builder
public record ObjectiveNodeResponse(
        UUID id,
        String code,
        String title,
        String nodeType,
        UUID parentId,
        String status,
        Integer sortOrder,
        String description,
        String strategy,
        String objectiveType,
        String objectiveClass,
        UUID organizationUnitId,
        String organizationUnitName,
        LocalDate effectiveFrom,
        LocalDate validUntil,
        Integer documentsCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        UUID createdBy,
        UUID updatedBy
) {
}
