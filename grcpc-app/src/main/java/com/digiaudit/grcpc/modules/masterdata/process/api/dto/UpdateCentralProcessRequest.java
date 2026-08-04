package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record UpdateCentralProcessRequest(
        @NotNull
        Long version,
        @NotBlank
        String title,
        String description,
        Integer sortOrder,
        @NotNull
        MasterDataLifecycleStatus status,
        LocalDate validFrom,
        LocalDate validTo
) {
}
