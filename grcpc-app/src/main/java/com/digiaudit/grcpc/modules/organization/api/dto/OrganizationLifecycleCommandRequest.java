package com.digiaudit.grcpc.modules.organization.api.dto;

import jakarta.validation.constraints.NotNull;

public record OrganizationLifecycleCommandRequest(
        @NotNull
        Long version
) {
}
