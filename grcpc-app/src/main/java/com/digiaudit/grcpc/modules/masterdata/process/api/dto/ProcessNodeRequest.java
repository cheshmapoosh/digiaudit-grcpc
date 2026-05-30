package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import java.util.UUID;

public record ProcessNodeRequest(
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
        String importance
) {
}
