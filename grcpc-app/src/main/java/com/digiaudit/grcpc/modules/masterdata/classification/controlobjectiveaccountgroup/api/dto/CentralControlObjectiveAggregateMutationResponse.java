package com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.api.dto.CentralRiskControlObjectiveAssignmentResponse;
import java.util.List;
import java.util.UUID;

public record CentralControlObjectiveAggregateMutationResponse(
    UUID entityId,
    UUID revisionId,
    long version,
    List<DocumentCommandResponse> finalizedDocuments,
    List<CentralControlObjectiveAccountGroupResponse> accountGroupClassifications,
    List<CentralRiskControlObjectiveAssignmentResponse> riskAssignments) {
  public CentralControlObjectiveAggregateMutationResponse {
    riskAssignments = riskAssignments == null ? List.of() : List.copyOf(riskAssignments);
    finalizedDocuments = finalizedDocuments == null ? List.of() : List.copyOf(finalizedDocuments);
    accountGroupClassifications = accountGroupClassifications == null
        ? List.of() : List.copyOf(accountGroupClassifications);
  }
}
