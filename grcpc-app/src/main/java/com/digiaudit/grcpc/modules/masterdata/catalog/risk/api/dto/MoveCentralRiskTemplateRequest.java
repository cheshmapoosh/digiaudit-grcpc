package com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record MoveCentralRiskTemplateRequest(
    @NotNull Long version, @NotNull UUID riskCategoryId, Integer sortOrder) {}
