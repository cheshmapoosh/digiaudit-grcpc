package com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CentralSubprocessRiskControlCoverageResponse(
    UUID id, UUID subprocessId, String subprocessCode, String subprocessTitle,
    UUID riskScopeId, UUID riskTemplateId, String riskTemplateCode, String riskTemplateTitle,
    MasterDataLifecycleStatus riskScopeStatus, LocalDate riskScopeValidFrom, LocalDate riskScopeValidTo,
    UUID controlScopeId, UUID controlId, String controlCode, String controlTitle,
    MasterDataLifecycleStatus controlScopeStatus, LocalDate controlScopeValidFrom, LocalDate controlScopeValidTo,
    MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version,
    Instant createdAt, UUID createdBy, Instant updatedAt, UUID updatedBy,
    Instant deletedAt, UUID deletedBy) {}
