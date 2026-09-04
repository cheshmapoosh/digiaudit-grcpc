package com.digiaudit.grcpc.modules.masterdata.scope.risk.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record CentralRiskScopeChangeRequest(
    @NotNull CentralRiskScopeChangeOperation operation,
    @NotNull UUID riskTemplateId,
    UUID scopeId,
    Long version,
    LocalDate validFrom,
    LocalDate validTo,
    MasterDataLifecycleStatus requestedStatus) {}
