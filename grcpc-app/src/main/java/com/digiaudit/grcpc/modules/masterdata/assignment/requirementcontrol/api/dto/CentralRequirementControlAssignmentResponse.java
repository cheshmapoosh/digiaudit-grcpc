package com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CentralRequirementControlAssignmentResponse(
    UUID assignmentId,
    UUID controlId, String controlCode, String controlTitle,
    MasterDataLifecycleStatus controlStatus, LocalDate controlValidFrom, LocalDate controlValidTo,
    UUID requirementId, String requirementCode, String requirementTitle,
    MasterDataLifecycleStatus requirementStatus, LocalDate requirementValidFrom, LocalDate requirementValidTo,
    MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version,
    Instant createdAt, UUID createdBy, Instant updatedAt, UUID updatedBy,
    Instant deletedAt, UUID deletedBy) {}
