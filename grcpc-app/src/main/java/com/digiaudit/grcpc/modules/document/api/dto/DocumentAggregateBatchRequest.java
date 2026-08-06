package com.digiaudit.grcpc.modules.document.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public record DocumentAggregateBatchRequest(
        List<@NotNull @Valid NewDocumentDraftRequest> newDocuments,
        List<@NotNull @Valid NewDocumentVersionDraftRequest> newVersions,
        List<@NotNull @Valid DocumentMetadataDraftRequest> metadataUpdates
) {
    public DocumentAggregateBatchRequest {
        newDocuments = immutableAllowingNullElements(newDocuments);
        newVersions = immutableAllowingNullElements(newVersions);
        metadataUpdates = immutableAllowingNullElements(metadataUpdates);
    }

    public static DocumentAggregateBatchRequest empty() {
        return new DocumentAggregateBatchRequest(List.of(), List.of(), List.of());
    }

    private static <T> List<T> immutableAllowingNullElements(List<T> values) {
        return values == null
                ? List.of()
                : Collections.unmodifiableList(new ArrayList<>(values));
    }
}
