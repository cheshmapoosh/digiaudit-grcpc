package com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto.CentralControlObjectiveAccountGroupChangeRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;

public record CreateCentralControlObjectiveRequest(
    @NotBlank String code,
    @NotBlank String title,
    String description,
    String objectiveClass,
    LocalDate validFrom,
    LocalDate validTo,
    @Valid DocumentAggregateBatchRequest documents,
    @Valid List<CentralControlObjectiveAccountGroupChangeRequest> accountGroupChanges) {}
