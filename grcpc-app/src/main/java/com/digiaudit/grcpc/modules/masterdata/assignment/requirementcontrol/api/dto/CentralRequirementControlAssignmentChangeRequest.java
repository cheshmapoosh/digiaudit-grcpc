package com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record CentralRequirementControlAssignmentChangeRequest(
    @NotNull CentralRequirementControlAssignmentChangeOperation operation,
    @NotNull UUID requirementId,
    UUID assignmentId,
    Long version,
    LocalDate validFrom,
    LocalDate validTo,
    MasterDataLifecycleStatus requestedStatus) {}
