package com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrolobjective.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record CentralRiskControlObjectiveCoverageChangeRequest(
    @NotNull CentralRiskControlObjectiveCoverageChangeOperation operation,
    @NotNull UUID riskScopeId,
    @NotNull UUID controlObjectiveScopeId,
    UUID coverageId,
    Long version,
    LocalDate validFrom,
    LocalDate validTo,
    MasterDataLifecycleStatus requestedStatus) {}

