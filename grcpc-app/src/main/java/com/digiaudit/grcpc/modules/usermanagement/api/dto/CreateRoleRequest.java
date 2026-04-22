package com.digiaudit.grcpc.modules.usermanagement.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateRoleRequest(
        @NotBlank @Size(max = 100) String code,
        @NotEmpty List<@Valid LocalizedTextRequest> translations,
        Boolean enabled
) {
}
