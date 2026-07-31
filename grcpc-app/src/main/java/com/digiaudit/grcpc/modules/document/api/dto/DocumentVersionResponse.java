package com.digiaudit.grcpc.modules.document.api.dto;

import com.digiaudit.grcpc.modules.document.domain.DocumentLifecycleStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record DocumentVersionResponse(
        UUID documentVersionId,
        UUID documentId,
        long documentVersionNumber,
        String fileName,
        String mimeType,
        long fileSize,
        String checksumAlgorithm,
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
