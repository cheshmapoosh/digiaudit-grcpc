package com.digiaudit.grcpc.modules.document.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record DocumentMetadataUpdateRequest(
        @NotNull @PositiveOrZero Long expectedVersion,
        @NotBlank @Size(max = 32) String targetType,
        @NotNull UUID targetId,
        @Size(max = 64) String code,
        @Size(max = 255) String title,
        String description,
        @Size(max = 64) String documentCategoryCode,
        LocalDate validFrom,
        LocalDate validTo
) {
}
