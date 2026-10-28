package com.digiaudit.grcpc.modules.organization.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.organization.domain.OrganizationType;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalContextDtos.ContextChange;
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
        OrganizationType organizationType,
        UUID organizationTypeId,
        @NotNull
        MasterDataLifecycleStatus status,
        UUID parentOrganizationId,
        java.util.List<@NotNull @Valid OrganizationOwnerChange> ownerAssignments,
        java.util.List<@NotNull @Valid ContextChange> subprocesses,
        @Size(max = 255)
        String location,
        String description,
        LocalDate validFrom,
        LocalDate validTo,
        @Valid DocumentAggregateBatchRequest documents
) {
}
