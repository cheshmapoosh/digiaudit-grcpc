package com.digiaudit.grcpc.modules.usermanagement.api.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record UpdateUserRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @Size(max = 20) String mobile,
        @Email @Size(max = 200) String email,
        UUID defaultOrgUnitId,
        Boolean enabled,
        Boolean locked
) {
}
