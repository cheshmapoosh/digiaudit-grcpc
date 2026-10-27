package com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.api.dto.CentralRiskControlAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.api.dto.CentralControlControlObjectiveAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.api.dto.CentralRequirementControlAssignmentResponse;
import java.util.List;
import java.util.UUID;

public record CentralControlAggregateMutationResponse(
    UUID entityId, UUID revisionId, long version,
    List<DocumentCommandResponse> finalizedDocuments,
    List<CentralControlAccountGroupResponse> accountGroupClassifications,
    List<CentralRiskControlAssignmentResponse> riskAssignments,
    List<CentralControlControlObjectiveAssignmentResponse> controlObjectiveAssignments,
    List<CentralRequirementControlAssignmentResponse> requirementAssignments) {
  public CentralControlAggregateMutationResponse {
    riskAssignments = riskAssignments == null ? List.of() : List.copyOf(riskAssignments);
    controlObjectiveAssignments = controlObjectiveAssignments == null ? List.of() : List.copyOf(controlObjectiveAssignments);
    requirementAssignments = requirementAssignments == null ? List.of() : List.copyOf(requirementAssignments);
    finalizedDocuments = finalizedDocuments == null ? List.of() : List.copyOf(finalizedDocuments);
    accountGroupClassifications = accountGroupClassifications == null ? List.of() : List.copyOf(accountGroupClassifications);
  }
}
