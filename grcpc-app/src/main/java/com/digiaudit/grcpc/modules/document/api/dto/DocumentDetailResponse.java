package com.digiaudit.grcpc.modules.document.api.dto;

import com.digiaudit.grcpc.modules.document.domain.DocumentLifecycleStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record DocumentDetailResponse(
        UUID documentId,
        String code,
        String title,
        String description,
        String documentCategoryCode,
        DocumentLifecycleStatus status,
        LocalDate validFrom,
        LocalDate validTo,
        long version,
        Instant createdAt,
        UUID createdBy,
        Instant updatedAt,
        UUID updatedBy
) {
}
