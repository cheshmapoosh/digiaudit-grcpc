package com.digiaudit.grcpc.modules.document.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record NewDocumentDraftRequest(
        @NotNull UUID tempUploadId,
        @Size(max = 64) String code,
        @NotBlank @Size(max = 255) String title,
        String description,
        LocalDate validFrom,
        LocalDate validTo
) {
}
