package com.digiaudit.grcpc.modules.document.api.dto;

import com.digiaudit.grcpc.modules.document.domain.DocumentTempUploadStatus;

import java.time.Instant;
import java.util.UUID;

public record DocumentTemporaryUploadResponse(
        UUID tempUploadId,
        String originalFileName,
        String mimeType,
        long fileSize,
        DocumentTempUploadStatus uploadStatus,
        Instant uploadedAt,
        Instant expiresAt,
        long version
) {
}
