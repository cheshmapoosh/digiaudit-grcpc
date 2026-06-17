package com.digiaudit.grcpc.modules.masterdata.objective.api.dto;

import java.util.List;
import java.util.UUID;

public record ObjectiveNodeRequest(
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
        String effectiveFrom,
        String validUntil,
        Integer documentsCount,
        List<UUID> organizationIds
) {
}
