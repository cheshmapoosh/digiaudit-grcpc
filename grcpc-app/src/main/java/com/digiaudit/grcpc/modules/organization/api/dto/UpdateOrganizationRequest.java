package com.digiaudit.grcpc.modules.organization.api.dto;

import com.digiaudit.grcpc.modules.organization.domain.enums.OrganizationStatus;
import com.digiaudit.grcpc.modules.organization.domain.enums.OrganizationType;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record UpdateOrganizationRequest(
        @Size(max = 50)
        String code,

        @Size(max = 255)
        String name,

        UUID parentId,
        OrganizationType type,
        OrganizationStatus status,

        @Size(max = 255)
        String location,

        @Size(max = 2000)
        String description,

        LocalDate validFrom,
        LocalDate validTo
) {
}
