package com.digiaudit.grcpc.modules.document.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record DocumentLinkCreateRequest(
        @NotBlank @Size(max = 32) String targetType,
        @NotNull UUID targetId
) {
}
