package com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.enums.CentralRiskType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record UpdateCentralRiskTemplateRequest(
    @NotNull Long version,
    @NotBlank String title,
    @NotNull CentralRiskType riskType,
    String description,
    LocalDate validFrom,
    LocalDate validTo,
    @Valid DocumentAggregateBatchRequest documents) {}
