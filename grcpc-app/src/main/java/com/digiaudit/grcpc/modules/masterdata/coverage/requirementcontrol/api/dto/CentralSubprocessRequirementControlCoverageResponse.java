package com.digiaudit.grcpc.modules.masterdata.coverage.requirementcontrol.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CentralSubprocessRequirementControlCoverageResponse(
    UUID id, UUID subprocessId, String subprocessCode, String subprocessTitle,
    UUID requirementScopeId, UUID requirementId, String requirementCode, String requirementTitle,
    MasterDataLifecycleStatus requirementScopeStatus, LocalDate requirementScopeValidFrom, LocalDate requirementScopeValidTo,
    UUID controlScopeId, UUID controlId, String controlCode, String controlTitle,
    MasterDataLifecycleStatus controlScopeStatus, LocalDate controlScopeValidFrom, LocalDate controlScopeValidTo,
    MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version,
    Instant createdAt, UUID createdBy, Instant updatedAt, UUID updatedBy,
    Instant deletedAt, UUID deletedBy) {}
