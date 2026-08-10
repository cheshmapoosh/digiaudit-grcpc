package com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto;

import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.enums.CentralRiskType;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.UUID;

public record CentralRiskTemplateSummaryResponse(
    UUID id,
    String code,
    String title,
    UUID riskCategoryId,
    CentralRiskType riskType,
    int sortOrder,
    MasterDataLifecycleStatus status,
    long version) {}
