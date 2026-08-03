package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CentralSubprocessResponse(
        UUID id,
        String code,
        String title,
        UUID processId,
        String description,
        int sortOrder,
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
