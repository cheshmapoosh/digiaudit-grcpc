package com.digiaudit.grcpc.modules.organization.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.organization.domain.OrganizationType;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record OrganizationResponse(
        UUID id,
        String code,
        String name,
        OrganizationType organizationType,
        UUID parentOrganizationId,
        String displayLabel,
        MasterDataLifecycleStatus status,
        String location,
        String description,
        LocalDate validFrom,
        LocalDate validTo,
        long version,
        Instant createdAt,
        Instant updatedAt,
        UUID createdBy,
        UUID updatedBy,
        Instant deletedAt,
        UUID deletedBy
) {
}
