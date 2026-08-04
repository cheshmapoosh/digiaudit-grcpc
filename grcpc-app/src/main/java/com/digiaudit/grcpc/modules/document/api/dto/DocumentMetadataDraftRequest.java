package com.digiaudit.grcpc.modules.document.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record DocumentMetadataDraftRequest(
        @NotNull UUID documentId,
        @NotNull Long expectedVersion,
        @NotBlank @Size(max = 255) String title
) {
}
