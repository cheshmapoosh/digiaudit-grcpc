package com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record MoveCentralRiskCategoryRequest(
    @NotNull Long version, UUID parentCategoryId, Integer sortOrder) {}
