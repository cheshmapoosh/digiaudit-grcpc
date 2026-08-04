package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record UpdateCentralSubprocessRequest(
        @NotNull
        Long version,
        @NotBlank
        String title,
        String description,
        Integer sortOrder,
        @NotNull
        MasterDataLifecycleStatus status,
        @NotNull
        UUID processId,
        LocalDate validFrom,
        LocalDate validTo,
        @Valid DocumentAggregateBatchRequest documents
) {
}
