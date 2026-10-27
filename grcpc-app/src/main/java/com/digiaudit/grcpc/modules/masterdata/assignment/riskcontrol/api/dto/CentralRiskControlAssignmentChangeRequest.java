package com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record CentralRiskControlAssignmentChangeRequest(
    @NotNull CentralRiskControlAssignmentChangeOperation operation,
    @NotNull UUID riskTemplateId,
    UUID assignmentId,
    Long version,
    LocalDate validFrom,
    LocalDate validTo,
    MasterDataLifecycleStatus requestedStatus) {}
