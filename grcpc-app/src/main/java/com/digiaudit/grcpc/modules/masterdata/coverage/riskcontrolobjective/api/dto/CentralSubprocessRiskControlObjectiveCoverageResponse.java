package com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrolobjective.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CentralSubprocessRiskControlObjectiveCoverageResponse(
    UUID id, UUID subprocessId, String subprocessCode, String subprocessTitle,
    UUID riskScopeId, UUID riskTemplateId, String riskTemplateCode, String riskTemplateTitle,
    MasterDataLifecycleStatus riskScopeStatus, LocalDate riskScopeValidFrom, LocalDate riskScopeValidTo,
    UUID controlObjectiveScopeId, UUID controlObjectiveId, String controlObjectiveCode, String controlObjectiveTitle,
    MasterDataLifecycleStatus controlObjectiveScopeStatus, LocalDate controlObjectiveScopeValidFrom, LocalDate controlObjectiveScopeValidTo,
    MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version,
    Instant createdAt, UUID createdBy, Instant updatedAt, UUID updatedBy,
    Instant deletedAt, UUID deletedBy) {}
