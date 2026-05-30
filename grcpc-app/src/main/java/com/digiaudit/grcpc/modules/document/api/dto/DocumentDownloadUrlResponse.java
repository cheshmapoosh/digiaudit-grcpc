package com.digiaudit.grcpc.modules.document.api.dto;

import java.time.LocalDateTime;

public record DocumentDownloadUrlResponse(
        String url,
        LocalDateTime expiresAt
) {
}
