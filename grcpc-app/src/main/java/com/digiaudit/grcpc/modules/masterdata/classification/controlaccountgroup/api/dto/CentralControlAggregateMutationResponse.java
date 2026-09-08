package com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import java.util.List;
import java.util.UUID;

public record CentralControlAggregateMutationResponse(
    UUID entityId, UUID revisionId, long version,
    List<DocumentCommandResponse> finalizedDocuments,
    List<CentralControlAccountGroupResponse> accountGroupClassifications) {
  public CentralControlAggregateMutationResponse {
    finalizedDocuments = finalizedDocuments == null ? List.of() : List.copyOf(finalizedDocuments);
    accountGroupClassifications = accountGroupClassifications == null ? List.of() : List.copyOf(accountGroupClassifications);
  }
}
