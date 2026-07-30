package com.digiaudit.grcpc.modules.masterdata.revision.application;

import com.digiaudit.grcpc.modules.masterdata.revision.domain.MasterDataRevisionContent;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionStatus;
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
        if (context.status() != RevisionStatus.APPLIED) {
            throw new IllegalArgumentException("revision execution result requires an APPLIED context");
        }
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
        Set<Long> sequenceNumbers = new HashSet<>();
        boolean primaryRepresented = false;
        long expectedOrderedSequence = 1L;
        for (MasterDataRevisionContent content : revisionContents) {
            Objects.requireNonNull(content, "revisionContents must not contain null items");
            if (!content.isCompleteForRevision(context.revisionId(), context.domain())) {
                throw new IllegalArgumentException("revision content must be complete for the execution context");
            }
            if (content.sequenceNumber() != expectedOrderedSequence++) {
                throw new IllegalArgumentException("revisionContents must be ordered by contiguous sequence number");
            }
            if (!uniqueContent.add(ContentKey.from(content))) {
                throw new IllegalArgumentException("duplicate revision content for the same logical mutation");
            }
            if (!sequenceNumbers.add(content.sequenceNumber())) {
                throw new IllegalArgumentException("revision content sequence numbers must be unique");
            }
            if (content.entityId().equals(primaryResult.entityId())
                    && content.appliedEntityVersion().longValue() == primaryResult.version()) {
                primaryRepresented = true;
            }
        }
        for (long expectedSequence = 1; expectedSequence <= revisionContents.size(); expectedSequence++) {
            if (!sequenceNumbers.contains(expectedSequence)) {
                throw new IllegalArgumentException("revision content sequence numbers must be contiguous from 1");
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
