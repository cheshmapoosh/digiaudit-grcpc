package com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record CentralControlObjectiveScopeChangeRequest(
    @NotNull CentralControlObjectiveScopeChangeOperation operation,
    @NotNull UUID controlObjectiveId,
    UUID scopeId,
    Long version,
    LocalDate validFrom,
    LocalDate validTo,
    MasterDataLifecycleStatus requestedStatus) {}
