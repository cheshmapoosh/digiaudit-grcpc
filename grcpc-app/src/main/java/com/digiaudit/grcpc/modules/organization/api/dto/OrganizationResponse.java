package com.digiaudit.grcpc.modules.organization.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record OrganizationResponse(
        UUID id,
        String code,
        UUID parentOrganizationId,
        String displayLabel,
        MasterDataLifecycleStatus status,
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
