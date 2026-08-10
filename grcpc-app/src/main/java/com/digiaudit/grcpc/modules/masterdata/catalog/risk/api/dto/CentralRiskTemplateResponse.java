package com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto;

import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.enums.CentralRiskType;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CentralRiskTemplateResponse(
    UUID id,
    String code,
    String title,
    UUID riskCategoryId,
    CentralRiskType riskType,
    String description,
    int sortOrder,
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
