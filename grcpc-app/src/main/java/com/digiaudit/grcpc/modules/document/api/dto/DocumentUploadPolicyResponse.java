package com.digiaudit.grcpc.modules.document.api.dto;

public record DocumentUploadPolicyResponse(
        String targetType,
        long maxFileSizeBytes,
        long maxFileSizeMb,
        long tempTtlMinutes
) {
}
