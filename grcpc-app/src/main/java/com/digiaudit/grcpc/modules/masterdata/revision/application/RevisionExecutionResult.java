package com.digiaudit.grcpc.modules.masterdata.revision.application;

import com.digiaudit.grcpc.modules.masterdata.revision.domain.MasterDataRevisionContent;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

public record RevisionExecutionResult(
        RevisionExecutionContext context,
        MasterDataMutationResult primaryResult,
        List<MasterDataRevisionContent> revisionContents
) {
    public RevisionExecutionResult {
        Objects.requireNonNull(context, "context is required");
        Objects.requireNonNull(primaryResult, "primaryResult is required");
        Objects.requireNonNull(revisionContents, "revisionContents is required");
        revisionContents = List.copyOf(revisionContents);
        if (revisionContents.isEmpty()) {
            throw new IllegalArgumentException("revisionContents must contain at least one item");
        }
        if (!primaryResult.revisionId().equals(context.revisionId())) {
            throw new IllegalArgumentException("primaryResult revisionId must match the execution context");
        }
        validateRevisionContents(context, primaryResult, revisionContents);
    }

    private static void validateRevisionContents(
            RevisionExecutionContext context,
            MasterDataMutationResult primaryResult,
            List<MasterDataRevisionContent> revisionContents
    ) {
        Set<ContentKey> uniqueContent = new HashSet<>();
        boolean primaryRepresented = false;
        for (MasterDataRevisionContent content : revisionContents) {
            Objects.requireNonNull(content, "revisionContents must not contain null items");
            if (!content.revisionId().equals(context.revisionId())) {
                throw new IllegalArgumentException("revision content must belong to the execution context revision");
            }
            if (!content.entityType().isPermittedIn(context.domain())) {
                throw new IllegalArgumentException("revision content entity type is not permitted in the execution context domain");
            }
            if (!uniqueContent.add(ContentKey.from(content))) {
                throw new IllegalArgumentException("duplicate revision content for the same logical mutation");
            }
            if (content.entityId().equals(primaryResult.entityId())
                    && content.appliedEntityVersion().longValue() == primaryResult.version()) {
                primaryRepresented = true;
            }
        }
        if (!primaryRepresented) {
            throw new IllegalArgumentException("primaryResult must be represented by one final revision content");
        }
    }

    private record ContentKey(RevisionEntityType entityType, UUID entityId, RevisionOperationType operationType) {
        private static ContentKey from(MasterDataRevisionContent content) {
            return new ContentKey(content.entityType(), content.entityId(), content.operationType());
        }
    }
}
