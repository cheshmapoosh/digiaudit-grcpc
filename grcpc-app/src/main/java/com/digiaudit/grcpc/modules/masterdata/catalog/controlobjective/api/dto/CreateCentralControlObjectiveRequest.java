package com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record CreateCentralControlObjectiveRequest(
    @NotBlank String code,
    @NotBlank String title,
    String description,
    LocalDate validFrom,
    LocalDate validTo,
    @Valid DocumentAggregateBatchRequest documents) {}
