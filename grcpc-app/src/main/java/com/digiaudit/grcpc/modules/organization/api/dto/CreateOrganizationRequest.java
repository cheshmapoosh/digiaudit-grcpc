package com.digiaudit.grcpc.modules.organization.api.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.UUID;

public record CreateOrganizationRequest(
        @NotBlank
        String code,
        UUID parentOrganizationId,
        LocalDate validFrom,
        LocalDate validTo
) {
}
