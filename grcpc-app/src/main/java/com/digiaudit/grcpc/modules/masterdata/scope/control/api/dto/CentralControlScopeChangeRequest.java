package com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto;

import jakarta.validation.constraints.NotNull;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.LocalDate;
import java.util.UUID;

public record CentralControlScopeChangeRequest(
    @NotNull CentralControlScopeChangeOperation operation,
    @NotNull UUID controlId,
    UUID scopeId,
    Long version,
    String recommendedFrequencyCode,
    String recommendedExecutionMethodCode,
    String recommendedTestMethodCode,
    LocalDate validFrom,
    LocalDate validTo,
    MasterDataLifecycleStatus requestedStatus) {}
