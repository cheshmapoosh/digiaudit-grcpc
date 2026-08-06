package com.digiaudit.grcpc.common.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String code,
        String message,
        String developerMessage,
        List<String> details,
        UUID tempUploadId,
        UUID documentId,
        String draftType
) {
}
