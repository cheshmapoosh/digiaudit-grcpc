package com.digiaudit.grcpc.modules.document.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record DocumentCreateRequest(
        @NotNull UUID tempUploadId,
        @Size(max = 64) String code,
        @NotBlank @Size(max = 255) String title,
        String description,
        @Size(max = 64) String documentCategoryCode,
        @NotBlank @Size(max = 32) String targetType,
        @NotNull UUID targetId,
        LocalDate validFrom,
        LocalDate validTo
) {
}
