package com.digiaudit.grcpc.modules.usermanagement.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EnableUserRequest(@NotBlank @Size(min = 8, max = 72) String password) {}
