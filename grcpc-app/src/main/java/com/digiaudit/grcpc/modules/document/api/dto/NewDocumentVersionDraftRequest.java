package com.digiaudit.grcpc.modules.document.api.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record NewDocumentVersionDraftRequest(
        @NotNull UUID documentId,
        @NotNull Long expectedDocumentVersion,
        @NotNull UUID tempUploadId,
        LocalDate validFrom,
        LocalDate validTo
) {
}
