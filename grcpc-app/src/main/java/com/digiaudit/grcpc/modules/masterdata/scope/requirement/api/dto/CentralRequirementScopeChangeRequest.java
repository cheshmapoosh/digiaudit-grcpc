package com.digiaudit.grcpc.modules.masterdata.scope.requirement.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record CentralRequirementScopeChangeRequest(
    @NotNull CentralRequirementScopeChangeOperation operation,
    @NotNull UUID requirementId,
    UUID scopeId,
    Long version,
    LocalDate validFrom,
    LocalDate validTo,
    MasterDataLifecycleStatus requestedStatus) {}
