package com.digiaudit.grcpc.modules.auth.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChangeUsernameRequest(
        @NotBlank @Size(max = 200) String currentPassword,
        @NotBlank @Size(max = 100) @Pattern(regexp = "[A-Za-z0-9]+") String newUsername
) {}
