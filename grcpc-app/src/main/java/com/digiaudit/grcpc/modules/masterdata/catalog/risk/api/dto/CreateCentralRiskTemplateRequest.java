package com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record CreateCentralRiskTemplateRequest(
    @NotBlank String code,
    @NotBlank String title,
    @NotNull UUID riskCategoryId,
    String description,
    Integer sortOrder,
    LocalDate validFrom,
    LocalDate validTo,
    @Valid DocumentAggregateBatchRequest documents) {}
