package com.digiaudit.grcpc.modules.document.api.dto;

import jakarta.validation.Valid;

import java.util.List;

public record DocumentAggregateBatchRequest(
        List<@Valid NewDocumentDraftRequest> newDocuments,
        List<@Valid NewDocumentVersionDraftRequest> newVersions,
        List<@Valid DocumentMetadataDraftRequest> metadataUpdates
) {
    public DocumentAggregateBatchRequest {
        newDocuments = newDocuments == null ? List.of() : List.copyOf(newDocuments);
        newVersions = newVersions == null ? List.of() : List.copyOf(newVersions);
        metadataUpdates = metadataUpdates == null ? List.of() : List.copyOf(metadataUpdates);
    }

    public static DocumentAggregateBatchRequest empty() {
        return new DocumentAggregateBatchRequest(List.of(), List.of(), List.of());
    }
}
