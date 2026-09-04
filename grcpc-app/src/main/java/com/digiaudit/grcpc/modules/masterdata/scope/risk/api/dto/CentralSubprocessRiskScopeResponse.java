package com.digiaudit.grcpc.modules.masterdata.scope.risk.api.dto;

import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.enums.CentralRiskType;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CentralSubprocessRiskScopeResponse(
    UUID id,
    UUID subprocessId,
    String subprocessCode,
    String subprocessTitle,
    UUID riskTemplateId,
    String riskTemplateCode,
    String riskTemplateTitle,
    UUID riskCategoryId,
    CentralRiskType riskType,
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
