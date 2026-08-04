package com.digiaudit.grcpc.modules.organization.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.organization.domain.OrganizationType;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record UpdateOrganizationRequest(
        @NotNull
        Long version,
        @NotBlank
        @Size(max = 255)
        String name,
        @NotNull
        OrganizationType organizationType,
        @NotNull
        MasterDataLifecycleStatus status,
        UUID parentOrganizationId,
        @Size(max = 255)
        String location,
        String description,
        LocalDate validFrom,
        LocalDate validTo,
        @Valid DocumentAggregateBatchRequest documents
) {
}
