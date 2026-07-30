package com.digiaudit.grcpc.modules.masterdata.revision.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
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

    public MasterDataRevisionContent appendContent(
            UUID contentId,
            RevisionEntityType entityType,
            UUID entityId,
            RevisionOperationType operationType,
            Long expectedVersion
    ) {
        requireDraft("Only draft revisions may receive content");
        if (!entityType.isPermittedIn(domain)) {
            throw new IllegalArgumentException("Entity type " + entityType.wireValue() + " is not valid for " + domain + " revision");
        }
        MasterDataRevisionContent content = MasterDataRevisionContent.backendDraft(
                contentId,
                id,
                contents.size() + 1L,
                entityType,
                entityId,
                operationType,
                expectedVersion
        );
        contents.add(content);
        return content;
    }

    public void apply() {
        requireDraft("Only draft revisions may be applied");
        if (contents.isEmpty()) {
            throw new IllegalStateException("A revision requires at least one content item before apply");
        }
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
}
