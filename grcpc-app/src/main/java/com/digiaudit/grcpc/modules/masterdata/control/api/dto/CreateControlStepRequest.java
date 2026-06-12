package com.digiaudit.grcpc.modules.masterdata.control.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateControlStepRequest(
        @NotBlank
        @Size(max = 255)
        String title,

        @Size(max = 2000)
        String description,

        @Size(max = 1000)
        String requiredDocument,

        @Size(max = 1000)
        String requiredNote,

        @Size(max = 100)
        String sensitivity,

        Integer sortOrder
) {
}
