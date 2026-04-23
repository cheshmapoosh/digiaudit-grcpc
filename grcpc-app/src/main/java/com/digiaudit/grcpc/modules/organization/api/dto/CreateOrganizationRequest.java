package com.digiaudit.grcpc.modules.organization.api.dto;

import com.digiaudit.grcpc.modules.organization.domain.enums.OrganizationStatus;
import com.digiaudit.grcpc.modules.organization.domain.enums.OrganizationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record CreateOrganizationRequest(
        @NotBlank
        @Size(max = 50)
        String code,

        @NotBlank
        @Size(max = 255)
        String name,

        UUID parentId,

        @NotNull
        OrganizationType type,

        @NotNull
        OrganizationStatus status,

        @Size(max = 255)
        String location,

        @Size(max = 2000)
        String description,

        LocalDate validFrom,
        LocalDate validTo
) {
}
