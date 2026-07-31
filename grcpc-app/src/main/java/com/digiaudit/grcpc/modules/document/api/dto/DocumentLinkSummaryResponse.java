package com.digiaudit.grcpc.modules.document.api.dto;

import com.digiaudit.grcpc.modules.document.domain.DocumentLifecycleStatus;

import java.time.Instant;
import java.util.UUID;

public record DocumentLinkSummaryResponse(
        UUID documentId,
        long documentVersion,
        String code,
        String title,
        String description,
        String documentCategoryCode,
        DocumentLifecycleStatus documentStatus,
        UUID documentVersionId,
        long documentVersionNumber,
        String fileName,
        String mimeType,
        long fileSize,
        String checksumAlgorithm,
        DocumentLifecycleStatus versionStatus,
        UUID documentLinkId,
        long linkVersion,
        String targetType,
        UUID targetId,
        DocumentLifecycleStatus linkStatus,
        Instant uploadedAt,
        UUID uploadedBy
) {
}
