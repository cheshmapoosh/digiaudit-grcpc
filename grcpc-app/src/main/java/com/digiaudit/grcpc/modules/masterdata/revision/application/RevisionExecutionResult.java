package com.digiaudit.grcpc.modules.masterdata.revision.application;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult;

import java.util.List;
import java.util.Objects;

public record RevisionExecutionResult(
        RevisionExecutionContext context,
        MasterDataMutationResult primaryResult,
        List<RevisionContentDraft> contentDrafts
) {
    public RevisionExecutionResult {
        Objects.requireNonNull(context, "context is required");
        Objects.requireNonNull(primaryResult, "primaryResult is required");
        Objects.requireNonNull(contentDrafts, "contentDrafts is required");
        contentDrafts = List.copyOf(contentDrafts);
        if (contentDrafts.isEmpty()) {
            throw new IllegalArgumentException("contentDrafts must contain at least one item");
        }
        if (!primaryResult.revisionId().equals(context.revisionId())) {
            throw new IllegalArgumentException("primaryResult revisionId must match the execution context");
        }
    }
}
