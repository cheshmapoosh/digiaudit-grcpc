package com.digiaudit.grcpc.modules.document.api.dto;

import jakarta.validation.constraints.Size;

public record DocumentTitleUpdateRequest(
        @Size(max = 500)
        String title
) {
}
