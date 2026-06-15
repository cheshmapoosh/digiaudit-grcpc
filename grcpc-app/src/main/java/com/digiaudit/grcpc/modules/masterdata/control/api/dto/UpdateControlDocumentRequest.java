package com.digiaudit.grcpc.modules.masterdata.control.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateControlDocumentRequest(
        @NotBlank
        @Size(max = 255)
        String name,

        @Size(max = 100)
        String documentType,

        @Size(max = 1000)
        String description,

        @Size(max = 1000)
        String fileRef
) {
}
