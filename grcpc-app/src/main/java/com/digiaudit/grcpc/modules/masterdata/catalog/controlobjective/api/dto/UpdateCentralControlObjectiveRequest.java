package com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto.CentralControlObjectiveAccountGroupChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.api.dto.CentralRiskControlObjectiveAssignmentChangeRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public record UpdateCentralControlObjectiveRequest(
    @NotNull Long version,
    @NotBlank String title,
    String description,
    String objectiveClass,
    @NotNull MasterDataLifecycleStatus status,
    LocalDate validFrom,
    LocalDate validTo,
    @Valid DocumentAggregateBatchRequest documents,
    @Valid List<CentralControlObjectiveAccountGroupChangeRequest> accountGroupChanges,
    @Valid List<CentralRiskControlObjectiveAssignmentChangeRequest> riskAssignments) {}
