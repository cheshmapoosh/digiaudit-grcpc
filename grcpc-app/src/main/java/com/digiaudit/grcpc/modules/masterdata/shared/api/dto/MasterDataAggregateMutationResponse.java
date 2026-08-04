package com.digiaudit.grcpc.modules.masterdata.shared.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;

import java.util.List;
import java.util.UUID;

public record MasterDataAggregateMutationResponse(
        UUID entityId,
        UUID revisionId,
        long version,
        List<DocumentCommandResponse> finalizedDocuments
) {
    public MasterDataAggregateMutationResponse {
        finalizedDocuments = finalizedDocuments == null ? List.of() : List.copyOf(finalizedDocuments);
    }
}
