package com.digiaudit.grcpc.modules.masterdata.policy.api.dto;

import java.util.UUID;

public record PolicyNodeRequest(
        String code,
        String title,
        String nodeType,
        UUID parentId,
        String status,
        Integer sortOrder,
        String description,
        String policyCategory,
        String policyKind,
        UUID ownerId,
        String ownerName,
        String ownerOrganization,
        String creatorName,
        Integer documentsCount,
        String version,
        String validFrom,
        String validTo,
        String nextReviewDate,
        String communicationMethod,
        String communicationLanguage,
        String objective,
        String note,
        Boolean evaluationConfirmed
) {
}
