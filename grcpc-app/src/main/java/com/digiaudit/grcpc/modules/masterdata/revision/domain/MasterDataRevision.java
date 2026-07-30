package com.digiaudit.grcpc.modules.masterdata.revision.domain;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

public final class MasterDataRevision {
    private final UUID id;
    private final long revisionNumber;
    private final String title;
    private final String description;
    private final RevisionDomain domain;
    private final UUID organizationId;
    private final UUID causedByRevisionId;
    private final List<MasterDataRevisionContent> contents = new ArrayList<>();
    private RevisionStatus status;

    private MasterDataRevision(
            UUID id,
            long revisionNumber,
            String title,
            String description,
            RevisionDomain domain,
            UUID organizationId,
            UUID causedByRevisionId
    ) {
        this.id = Objects.requireNonNull(id, "id is required");
        if (revisionNumber <= 0) {
            throw new IllegalArgumentException("revisionNumber must be positive");
        }
        this.revisionNumber = revisionNumber;
        this.title = requireText(title, "title is required");
        this.description = description;
        this.domain = Objects.requireNonNull(domain, "domain is required");
        validateOrganizationBoundary(domain, organizationId);
        this.organizationId = organizationId;
        this.causedByRevisionId = causedByRevisionId;
        this.status = RevisionStatus.DRAFT;
    }

    public static MasterDataRevision startCentral(
            UUID id,
            long revisionNumber,
            String title,
            String description,
            UUID causedByRevisionId
    ) {
        return new MasterDataRevision(id, revisionNumber, title, description, RevisionDomain.CENTRAL, null, causedByRevisionId);
    }

    public static MasterDataRevision startLocal(
            UUID id,
            long revisionNumber,
            String title,
            String description,
            UUID organizationId,
            UUID causedByRevisionId
    ) {
        return new MasterDataRevision(id, revisionNumber, title, description, RevisionDomain.LOCAL, organizationId, causedByRevisionId);
    }

    public MasterDataRevisionContent appendCompletedContent(UUID contentId, RevisionContentResult result) {
        requireDraft("Only draft revisions may receive content");
        Objects.requireNonNull(result, "result is required");
        if (!result.entityType().isPermittedIn(domain)) {
            throw new IllegalArgumentException("Entity type " + result.entityType().wireValue() + " is not valid for " + domain + " revision");
        }
        ContentKey contentKey = ContentKey.from(result);
        boolean duplicateContent = contents.stream()
                .map(ContentKey::from)
                .anyMatch(contentKey::equals);
        if (duplicateContent) {
            throw new IllegalStateException("Duplicate revision content for the same logical mutation");
        }
        MasterDataRevisionContent content = MasterDataRevisionContent.completed(
                contentId,
                id,
                contents.size() + 1L,
                result
        );
        contents.add(content);
        return content;
    }

    public void apply(MasterDataMutationResult primaryResult) {
        requireDraft("Only draft revisions may be applied");
        validateReadyForApply(primaryResult);
        status = RevisionStatus.APPLIED;
    }

    public void cancel() {
        requireDraft("Only draft revisions may be cancelled");
        status = RevisionStatus.CANCELLED;
    }

    public UUID id() {
        return id;
    }

    public long revisionNumber() {
        return revisionNumber;
    }

    public String title() {
        return title;
    }

    public String description() {
        return description;
    }

    public RevisionDomain domain() {
        return domain;
    }

    public UUID organizationId() {
        return organizationId;
    }

    public UUID causedByRevisionId() {
        return causedByRevisionId;
    }

    public RevisionStatus status() {
        return status;
    }

    public List<MasterDataRevisionContent> contents() {
        return List.copyOf(contents);
    }

    private void requireDraft(String message) {
        if (status != RevisionStatus.DRAFT) {
            throw new IllegalStateException(message);
        }
    }

    private void validateReadyForApply(MasterDataMutationResult primaryResult) {
        Objects.requireNonNull(primaryResult, "primaryResult is required");
        if (!primaryResult.revisionId().equals(id)) {
            throw new IllegalStateException("primaryResult revisionId must match this revision");
        }
        if (contents.isEmpty()) {
            throw new IllegalStateException("A revision requires at least one content item before apply");
        }

        Set<Long> sequenceNumbers = new HashSet<>();
        Set<ContentKey> logicalMutations = new HashSet<>();
        boolean primaryRepresented = false;

        for (MasterDataRevisionContent content : contents) {
            if (!content.isReadyForApply(id, domain)) {
                throw new IllegalStateException("Revision content is not complete and ready for apply");
            }
            if (!sequenceNumbers.add(content.sequenceNumber())) {
                throw new IllegalStateException("Revision content sequence numbers must be unique");
            }
            if (!logicalMutations.add(ContentKey.from(content))) {
                throw new IllegalStateException("Revision content logical mutations must be unique");
            }
            if (content.representsPrimary(primaryResult)) {
                primaryRepresented = true;
            }
        }

        for (long expectedSequence = 1; expectedSequence <= contents.size(); expectedSequence++) {
            if (!sequenceNumbers.contains(expectedSequence)) {
                throw new IllegalStateException("Revision content sequence numbers must be contiguous from 1");
            }
        }

        if (!primaryRepresented) {
            throw new IllegalStateException("primaryResult must be represented by one completed revision content");
        }
    }

    private static void validateOrganizationBoundary(RevisionDomain domain, UUID organizationId) {
        if (domain == RevisionDomain.CENTRAL && organizationId != null) {
            throw new IllegalArgumentException("Central revisions must not have an organizationId");
        }
        if (domain == RevisionDomain.LOCAL && organizationId == null) {
            throw new IllegalArgumentException("Local revisions require exactly one organizationId");
        }
    }

    private static String requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }

    private record ContentKey(RevisionEntityType entityType, UUID entityId, RevisionOperationType operationType) {
        private static ContentKey from(RevisionContentResult result) {
            return new ContentKey(result.entityType(), result.entityId(), result.operationType());
        }

        private static ContentKey from(MasterDataRevisionContent content) {
            return new ContentKey(content.entityType(), content.entityId(), content.operationType());
        }
    }
}
