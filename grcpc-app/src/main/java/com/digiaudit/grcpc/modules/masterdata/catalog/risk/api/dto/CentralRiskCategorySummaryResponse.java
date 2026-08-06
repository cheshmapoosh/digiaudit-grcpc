package com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.UUID;

public record CentralRiskCategorySummaryResponse(
        UUID id, String code, String title, UUID parentCategoryId, int sortOrder,
        MasterDataLifecycleStatus status, long version
) {}
