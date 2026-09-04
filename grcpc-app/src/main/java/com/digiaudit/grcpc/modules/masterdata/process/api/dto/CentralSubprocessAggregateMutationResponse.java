package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto.CentralSubprocessControlScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.api.dto.CentralSubprocessRiskScopeResponse;
import java.util.List;
import java.util.UUID;

public record CentralSubprocessAggregateMutationResponse(
    UUID entityId,
    UUID revisionId,
    long version,
    List<DocumentCommandResponse> finalizedDocuments,
    List<CentralSubprocessControlScopeResponse> controlScopes,
    List<CentralSubprocessRiskScopeResponse> riskScopes) {
  public CentralSubprocessAggregateMutationResponse {
    finalizedDocuments = finalizedDocuments == null ? List.of() : List.copyOf(finalizedDocuments);
    controlScopes = controlScopes == null ? List.of() : List.copyOf(controlScopes);
    riskScopes = riskScopes == null ? List.of() : List.copyOf(riskScopes);
  }
}
