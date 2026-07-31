package com.digiaudit.grcpc.modules.document.infrastructure.persistence;

import com.digiaudit.grcpc.modules.document.domain.DocumentLifecycleStatus;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;

import java.time.Instant;
import java.util.UUID;

public record DocumentLinkReadProjection(
        UUID documentId,
        long documentVersion,
        String documentCode,
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
        DocumentLinkTargetType targetType,
        UUID targetId,
        DocumentLifecycleStatus linkStatus,
        Instant uploadedAt,
        UUID uploadedBy
) {
}
