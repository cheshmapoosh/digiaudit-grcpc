package com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record CentralControlControlObjectiveAssignmentChangeRequest(
    @NotNull CentralControlControlObjectiveAssignmentChangeOperation operation,
    @NotNull UUID controlObjectiveId,
    UUID assignmentId,
    Long version,
    LocalDate validFrom,
    LocalDate validTo,
    MasterDataLifecycleStatus requestedStatus) {}
