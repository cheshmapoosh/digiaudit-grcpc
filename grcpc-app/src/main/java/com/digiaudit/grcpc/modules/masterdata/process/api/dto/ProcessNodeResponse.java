package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;

@Builder
public record ProcessNodeResponse(
        UUID id,
        String code,
        String title,
        String nodeType,
        UUID parentId,
        String status,
        Integer sortOrder,
        String description,
        String processCategory,
        UUID ownerId,
        String ownerName,
        Integer documentsCount,
        String objective,
        String operationCycle,
        String controlAutomation,
        String controlFrequency,
        String controlClassification,
        String controlOwner,
        String testDirection,
        String testType,
        String testProgram,
        String importance,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        UUID createdBy,
        UUID updatedBy
) {
}
