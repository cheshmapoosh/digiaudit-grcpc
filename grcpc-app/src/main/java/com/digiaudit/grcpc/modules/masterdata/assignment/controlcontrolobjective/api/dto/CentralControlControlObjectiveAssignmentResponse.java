package com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CentralControlControlObjectiveAssignmentResponse(
    UUID assignmentId,
    UUID controlId, String controlCode, String controlTitle,
    MasterDataLifecycleStatus controlStatus, LocalDate controlValidFrom, LocalDate controlValidTo,
    UUID controlObjectiveId, String controlObjectiveCode, String controlObjectiveTitle,
    MasterDataLifecycleStatus controlObjectiveStatus, LocalDate controlObjectiveValidFrom, LocalDate controlObjectiveValidTo,
    MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version,
    Instant createdAt, UUID createdBy, Instant updatedAt, UUID updatedBy,
    Instant deletedAt, UUID deletedBy) {}
