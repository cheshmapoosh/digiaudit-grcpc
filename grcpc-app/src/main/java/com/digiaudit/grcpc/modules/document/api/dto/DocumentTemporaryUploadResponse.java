package com.digiaudit.grcpc.modules.document.api.dto;

import java.time.Instant;
import java.util.UUID;

public record DocumentTemporaryUploadResponse(
        UUID tempUploadId,
        String originalFileName,
        String mimeType,
        long fileSize,
        Instant uploadedAt,
        Instant expiresAt,
        long version
) {
}
