package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto.CentralSubprocessControlScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.api.dto.CentralSubprocessControlObjectiveScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.api.dto.CentralSubprocessRiskScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.api.dto.CentralSubprocessRequirementScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.coverage.controlcontrolobjective.api.dto.CentralSubprocessControlControlObjectiveCoverageResponse;
import com.digiaudit.grcpc.modules.masterdata.coverage.requirementcontrol.api.dto.CentralSubprocessRequirementControlCoverageResponse;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.api.dto.CentralSubprocessRiskControlCoverageResponse;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrolobjective.api.dto.CentralSubprocessRiskControlObjectiveCoverageResponse;
import java.util.List;
import java.util.UUID;

public record CentralSubprocessAggregateMutationResponse(
    UUID entityId,
    UUID revisionId,
    long version,
    List<DocumentCommandResponse> finalizedDocuments,
    List<CentralSubprocessControlScopeResponse> controlScopes,
    List<CentralSubprocessRiskScopeResponse> riskScopes,
    List<CentralSubprocessControlObjectiveScopeResponse> controlObjectiveScopes,
    List<CentralSubprocessRequirementScopeResponse> requirementScopes,
    List<CentralSubprocessRiskControlCoverageResponse> riskControlCoverages,
    List<CentralSubprocessRiskControlObjectiveCoverageResponse> riskControlObjectiveCoverages,
    List<CentralSubprocessControlControlObjectiveCoverageResponse> controlControlObjectiveCoverages,
    List<CentralSubprocessRequirementControlCoverageResponse> requirementControlCoverages) {
  public CentralSubprocessAggregateMutationResponse {
    finalizedDocuments = finalizedDocuments == null ? List.of() : List.copyOf(finalizedDocuments);
    controlScopes = controlScopes == null ? List.of() : List.copyOf(controlScopes);
    riskScopes = riskScopes == null ? List.of() : List.copyOf(riskScopes);
    controlObjectiveScopes = controlObjectiveScopes == null ? List.of() : List.copyOf(controlObjectiveScopes);
    requirementScopes = requirementScopes == null ? List.of() : List.copyOf(requirementScopes);
    riskControlCoverages = riskControlCoverages == null ? List.of() : List.copyOf(riskControlCoverages);
    riskControlObjectiveCoverages = riskControlObjectiveCoverages == null ? List.of() : List.copyOf(riskControlObjectiveCoverages);
    controlControlObjectiveCoverages = controlControlObjectiveCoverages == null ? List.of() : List.copyOf(controlControlObjectiveCoverages);
    requirementControlCoverages = requirementControlCoverages == null ? List.of() : List.copyOf(requirementControlCoverages);
  }
}
