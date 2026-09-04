package com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CentralSubprocessControlObjectiveScopeResponse(
    UUID id,
    UUID subprocessId,
    String subprocessCode,
    String subprocessTitle,
    UUID controlObjectiveId,
    String controlObjectiveCode,
    String controlObjectiveTitle,
    String objectiveClass,
    MasterDataLifecycleStatus status,
    LocalDate validFrom,
    LocalDate validTo,
    long version,
    Instant createdAt,
    UUID createdBy,
    Instant updatedAt,
    UUID updatedBy,
    Instant deletedAt,
    UUID deletedBy) {}
