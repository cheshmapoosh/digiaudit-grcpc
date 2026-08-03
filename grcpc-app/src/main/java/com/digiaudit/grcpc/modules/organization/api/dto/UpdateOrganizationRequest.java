package com.digiaudit.grcpc.modules.organization.api.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record UpdateOrganizationRequest(
        @NotNull
        Long version,
        LocalDate validFrom,
        LocalDate validTo
) {
}
