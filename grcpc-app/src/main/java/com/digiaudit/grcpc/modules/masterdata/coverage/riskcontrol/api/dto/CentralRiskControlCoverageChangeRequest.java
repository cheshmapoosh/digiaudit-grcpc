package com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record CentralRiskControlCoverageChangeRequest(
    @NotNull CentralRiskControlCoverageChangeOperation operation,
    @NotNull UUID riskScopeId,
    @NotNull UUID controlScopeId,
    UUID coverageId,
    Long version,
    LocalDate validFrom,
    LocalDate validTo,
    MasterDataLifecycleStatus requestedStatus) {}
