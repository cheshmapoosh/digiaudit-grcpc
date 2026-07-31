package com.digiaudit.grcpc.modules.document.api.dto;

import java.time.Instant;

public record DocumentDownloadResponse(
        String downloadUrl,
        Instant expiresAt,
        String fileName,
        String mimeType
) {
}
