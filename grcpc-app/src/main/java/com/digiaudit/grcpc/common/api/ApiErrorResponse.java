package com.digiaudit.grcpc.common.api;

import java.time.Instant;
import java.util.List;

public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String code,
        String message,
        String developerMessage,
        List<String> details
) {
}
