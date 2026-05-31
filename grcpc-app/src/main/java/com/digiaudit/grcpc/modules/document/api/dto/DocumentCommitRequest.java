package com.digiaudit.grcpc.modules.document.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record DocumentCommitRequest(
        @NotNull
        UUID tempSessionId,
        @NotBlank
        String targetType,
        @NotNull
        UUID targetId,
        List<UUID> documentIds,
        Map<UUID, String> documentTitles
) {
}
