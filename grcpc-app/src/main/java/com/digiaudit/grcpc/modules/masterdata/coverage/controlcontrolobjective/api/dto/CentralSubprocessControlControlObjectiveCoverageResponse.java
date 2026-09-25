package com.digiaudit.grcpc.modules.masterdata.coverage.controlcontrolobjective.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CentralSubprocessControlControlObjectiveCoverageResponse(
    UUID id, UUID subprocessId, String subprocessCode, String subprocessTitle,
    UUID controlScopeId, UUID controlId, String controlCode, String controlTitle,
    MasterDataLifecycleStatus controlScopeStatus, LocalDate controlScopeValidFrom, LocalDate controlScopeValidTo,
    UUID controlObjectiveScopeId, UUID controlObjectiveId, String controlObjectiveCode, String controlObjectiveTitle,
    MasterDataLifecycleStatus controlObjectiveScopeStatus, LocalDate controlObjectiveScopeValidFrom, LocalDate controlObjectiveScopeValidTo,
    MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version,
    Instant createdAt, UUID createdBy, Instant updatedAt, UUID updatedBy,
    Instant deletedAt, UUID deletedBy) {}
