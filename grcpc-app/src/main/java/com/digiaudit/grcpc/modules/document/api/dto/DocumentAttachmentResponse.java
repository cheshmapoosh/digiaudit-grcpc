package com.digiaudit.grcpc.modules.document.api.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;

@Builder
public record DocumentAttachmentResponse(
        UUID id,
        String targetType,
        UUID targetId,
        String bucketName,
        String objectKey,
        String originalFileName,
        String contentType,
        Long sizeBytes,
        String checksumSha256,
        String versionId,
        String status,
        UUID uploadedBy,
        LocalDateTime uploadedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        UUID createdBy,
        UUID updatedBy
) {
}
