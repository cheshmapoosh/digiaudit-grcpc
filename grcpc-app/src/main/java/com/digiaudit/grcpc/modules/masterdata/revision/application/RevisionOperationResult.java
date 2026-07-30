package com.digiaudit.grcpc.modules.masterdata.revision.application;

import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

public final class RevisionOperationResult {
    private final MasterDataMutationResult primaryResult;
    private final List<RevisionContentResult> contentResults;

    private RevisionOperationResult(
            MasterDataMutationResult primaryResult,
            List<RevisionContentResult> contentResults
    ) {
        this.primaryResult = Objects.requireNonNull(primaryResult, "primaryResult is required");
        this.contentResults = List.copyOf(Objects.requireNonNull(contentResults, "contentResults is required"));
        validateContentResults();
    }

    public static RevisionOperationResult completed(
            RevisionExecutionContext context,
            MasterDataMutationResult primaryResult,
            List<RevisionContentResult> contentResults
    ) {
        Objects.requireNonNull(context, "context is required");
        RevisionOperationResult result = new RevisionOperationResult(primaryResult, contentResults);
        if (!result.primaryResult.revisionId().equals(context.revisionId())) {
            throw new IllegalArgumentException("primaryResult revisionId must match the execution context");
        }
        result.contentResults.forEach(contentResult -> {
            if (!contentResult.entityType().isPermittedIn(context.domain())) {
                throw new IllegalArgumentException("content entity type is not permitted in revision domain");
            }
        });
        return result;
    }

    public MasterDataMutationResult primaryResult() {
        return primaryResult;
    }

    public List<RevisionContentResult> contentResults() {
        return contentResults;
    }

    private void validateContentResults() {
        if (contentResults.isEmpty()) {
            throw new IllegalArgumentException("contentResults must contain at least one item");
        }
        Set<ContentKey> uniqueContent = new HashSet<>();
        for (RevisionContentResult contentResult : contentResults) {
            Objects.requireNonNull(contentResult, "contentResults must not contain null items");
            if (!uniqueContent.add(ContentKey.from(contentResult))) {
                throw new IllegalArgumentException("duplicate revision content result for the same logical mutation");
            }
        }
        boolean primaryRepresented = contentResults.stream()
                .anyMatch(contentResult -> contentResult.representsPrimary(primaryResult));
        if (!primaryRepresented) {
            throw new IllegalArgumentException("primaryResult must be represented by one completed content result");
        }
    }

    private record ContentKey(RevisionEntityType entityType, UUID entityId, RevisionOperationType operationType) {
        private static ContentKey from(RevisionContentResult result) {
            return new ContentKey(result.entityType(), result.entityId(), result.operationType());
        }
    }
}
