package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto.CentralControlScopeChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.api.dto.CentralControlObjectiveScopeChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.api.dto.CentralRiskScopeChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.api.dto.CentralRequirementScopeChangeRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateCentralSubprocessRequest(
        @NotBlank
        String code,
        @NotBlank
        String title,
        @NotNull
        UUID processId,
        String description,
        Integer sortOrder,
        LocalDate validFrom,
        LocalDate validTo,
        @Valid DocumentAggregateBatchRequest documents,
        List<@NotNull @Valid CentralControlScopeChangeRequest> controlScopeChanges,
        List<@NotNull @Valid CentralRiskScopeChangeRequest> riskScopeChanges,
        List<@NotNull @Valid CentralControlObjectiveScopeChangeRequest> controlObjectiveScopeChanges,
        List<@NotNull @Valid CentralRequirementScopeChangeRequest> requirementScopeChanges
) {
    public CreateCentralSubprocessRequest {
        controlScopeChanges = controlScopeChanges == null ? List.of() : List.copyOf(controlScopeChanges);
        riskScopeChanges = riskScopeChanges == null ? List.of() : List.copyOf(riskScopeChanges);
        controlObjectiveScopeChanges = controlObjectiveScopeChanges == null ? List.of() : List.copyOf(controlObjectiveScopeChanges);
        requirementScopeChanges = requirementScopeChanges == null ? List.of() : List.copyOf(requirementScopeChanges);
    }
}
