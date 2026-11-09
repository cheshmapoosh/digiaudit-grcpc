package com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.api.dto.CentralRiskControlObjectiveAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.api.dto.CentralControlObjectiveResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.api.dto.CentralSubprocessControlObjectiveScopeResponse;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.UUID;

public record CentralControlObjectiveAggregateMutationResponse(
    UUID entityId,
    UUID revisionId,
    long version,
    List<DocumentCommandResponse> finalizedDocuments,
    List<CentralControlObjectiveAccountGroupResponse> accountGroupClassifications,
    List<CentralRiskControlObjectiveAssignmentResponse> riskAssignments, CentralControlObjectiveResponse entity,
    @JsonInclude(JsonInclude.Include.NON_NULL) List<CentralSubprocessControlObjectiveScopeResponse> subprocessScopes) {
  public CentralControlObjectiveAggregateMutationResponse {
    riskAssignments = riskAssignments == null ? List.of() : List.copyOf(riskAssignments);
    finalizedDocuments = finalizedDocuments == null ? List.of() : List.copyOf(finalizedDocuments);
    accountGroupClassifications = accountGroupClassifications == null
        ? List.of() : List.copyOf(accountGroupClassifications);
  }
}
