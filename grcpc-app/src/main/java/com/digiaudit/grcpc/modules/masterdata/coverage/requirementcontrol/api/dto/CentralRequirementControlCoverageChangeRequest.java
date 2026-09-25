package com.digiaudit.grcpc.modules.masterdata.coverage.requirementcontrol.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record CentralRequirementControlCoverageChangeRequest(
    @NotNull CentralRequirementControlCoverageChangeOperation operation,
    @NotNull UUID requirementScopeId,
    @NotNull UUID controlScopeId,
    UUID coverageId,
    Long version,
    LocalDate validFrom,
    LocalDate validTo,
    MasterDataLifecycleStatus requestedStatus) {}

