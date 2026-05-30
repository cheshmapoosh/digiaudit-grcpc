package com.digiaudit.grcpc.modules.masterdata.policy.api.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;

@Builder
public record PolicyNodeResponse(
        UUID id,
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
        LocalDate validFrom,
        LocalDate validTo,
        LocalDate nextReviewDate,
        String communicationMethod,
        String communicationLanguage,
        String objective,
        String note,
        Boolean evaluationConfirmed,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        UUID createdBy,
        UUID updatedBy
) {
}
