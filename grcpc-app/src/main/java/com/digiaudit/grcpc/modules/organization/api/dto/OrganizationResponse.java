package com.digiaudit.grcpc.modules.organization.api.dto;

import com.digiaudit.grcpc.modules.organization.domain.enums.OrganizationStatus;
import com.digiaudit.grcpc.modules.organization.domain.enums.OrganizationType;
import lombok.Builder;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Builder
public record OrganizationResponse(
        UUID id,
        String code,
        String name,
        UUID parentId,
        OrganizationType type,
        OrganizationStatus status,
        String location,
        String description,
        LocalDate validFrom,
        LocalDate validTo,
        Instant createdAt,
        Instant updatedAt
) {
}
