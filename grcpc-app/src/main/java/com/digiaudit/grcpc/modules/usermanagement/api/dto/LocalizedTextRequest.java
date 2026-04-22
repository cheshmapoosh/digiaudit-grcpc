package com.digiaudit.grcpc.modules.usermanagement.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LocalizedTextRequest(
        @NotBlank @Size(max = 10) String locale,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 1000) String description
) {
}
