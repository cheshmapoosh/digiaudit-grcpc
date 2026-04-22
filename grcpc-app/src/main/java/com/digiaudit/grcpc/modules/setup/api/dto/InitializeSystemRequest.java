package com.digiaudit.grcpc.modules.setup.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InitializeSystemRequest(
        @NotBlank @Size(max = 100) String username,
        @NotBlank @Size(min = 8, max = 200) String password,
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @Size(max = 20) String mobile,
        @Email @Size(max = 200) String email
) {
}
