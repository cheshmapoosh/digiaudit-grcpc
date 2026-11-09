package com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto.CentralControlObjectiveAccountGroupChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.api.dto.CentralRiskControlObjectiveAssignmentChangeRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateCentralControlObjectiveRequest(
    @NotBlank String code,
    @NotBlank String title,
    String description,
    String objectiveClass,
    LocalDate validFrom,
    LocalDate validTo,
    @Valid DocumentAggregateBatchRequest documents,
    @Valid List<CentralControlObjectiveAccountGroupChangeRequest> accountGroupChanges,
    @Valid List<CentralRiskControlObjectiveAssignmentChangeRequest> riskAssignments,
    List<@NotNull @Valid InitialSubprocess> initialSubprocesses) {

  public record InitialSubprocess(@NotNull UUID subprocessId, @NotNull @PositiveOrZero Long version) {}
}
