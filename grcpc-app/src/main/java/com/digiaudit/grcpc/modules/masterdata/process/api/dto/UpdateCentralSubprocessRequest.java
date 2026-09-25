package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.coverage.controlcontrolobjective.api.dto.CentralControlControlObjectiveCoverageChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.coverage.requirementcontrol.api.dto.CentralRequirementControlCoverageChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.api.dto.CentralRiskControlCoverageChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrolobjective.api.dto.CentralRiskControlObjectiveCoverageChangeRequest;
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

public record UpdateCentralSubprocessRequest(
        @NotNull
        Long version,
        @NotBlank
        String title,
        String description,
        Integer sortOrder,
        @NotNull
        MasterDataLifecycleStatus status,
        @NotNull
        UUID processId,
        LocalDate validFrom,
        LocalDate validTo,
        @Valid DocumentAggregateBatchRequest documents,
        List<@NotNull @Valid CentralControlScopeChangeRequest> controlScopeChanges,
        List<@NotNull @Valid CentralRiskScopeChangeRequest> riskScopeChanges,
        List<@NotNull @Valid CentralControlObjectiveScopeChangeRequest> controlObjectiveScopeChanges,
        List<@NotNull @Valid CentralRequirementScopeChangeRequest> requirementScopeChanges,
        List<@NotNull @Valid CentralRiskControlCoverageChangeRequest> riskControlCoverageChanges,
        List<@NotNull @Valid CentralRiskControlObjectiveCoverageChangeRequest> riskControlObjectiveCoverageChanges,
        List<@NotNull @Valid CentralControlControlObjectiveCoverageChangeRequest> controlControlObjectiveCoverageChanges,
        List<@NotNull @Valid CentralRequirementControlCoverageChangeRequest> requirementControlCoverageChanges
) {
    public UpdateCentralSubprocessRequest {
        controlScopeChanges = controlScopeChanges == null ? List.of() : List.copyOf(controlScopeChanges);
        riskScopeChanges = riskScopeChanges == null ? List.of() : List.copyOf(riskScopeChanges);
        controlObjectiveScopeChanges = controlObjectiveScopeChanges == null ? List.of() : List.copyOf(controlObjectiveScopeChanges);
        requirementScopeChanges = requirementScopeChanges == null ? List.of() : List.copyOf(requirementScopeChanges);
        riskControlCoverageChanges = riskControlCoverageChanges == null ? List.of() : List.copyOf(riskControlCoverageChanges);
        riskControlObjectiveCoverageChanges = riskControlObjectiveCoverageChanges == null ? List.of() : List.copyOf(riskControlObjectiveCoverageChanges);
        controlControlObjectiveCoverageChanges = controlControlObjectiveCoverageChanges == null ? List.of() : List.copyOf(controlControlObjectiveCoverageChanges);
        requirementControlCoverageChanges = requirementControlCoverageChanges == null ? List.of() : List.copyOf(requirementControlCoverageChanges);
    }
}
