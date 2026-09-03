package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto.CentralSubprocessControlScopeResponse;
import java.util.List;
import java.util.UUID;

public record CentralSubprocessAggregateMutationResponse(
    UUID entityId,
    UUID revisionId,
    long version,
    List<DocumentCommandResponse> finalizedDocuments,
    List<CentralSubprocessControlScopeResponse> controlScopes) {
  public CentralSubprocessAggregateMutationResponse {
    finalizedDocuments = finalizedDocuments == null ? List.of() : List.copyOf(finalizedDocuments);
    controlScopes = controlScopes == null ? List.of() : List.copyOf(controlScopes);
  }
}
