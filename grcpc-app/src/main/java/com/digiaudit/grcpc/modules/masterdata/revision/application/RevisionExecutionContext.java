package com.digiaudit.grcpc.modules.masterdata.revision.application;

import com.digiaudit.grcpc.modules.masterdata.revision.domain.MasterDataRevision;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionDomain;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;

import java.util.Objects;
import java.util.Set;
import java.util.UUID;

public record RevisionExecutionContext(
        UUID revisionId,
        RevisionDomain domain,
        UUID organizationId,
        RevisionStatus status,
        Set<MasterDataHierarchyKey> acquiredHierarchyKeys
) {
    public RevisionExecutionContext {
        Objects.requireNonNull(revisionId, "revisionId is required");
        Objects.requireNonNull(domain, "domain is required");
        Objects.requireNonNull(status, "status is required");
        acquiredHierarchyKeys = acquiredHierarchyKeys == null ? Set.of() : Set.copyOf(acquiredHierarchyKeys);
        if (domain == RevisionDomain.CENTRAL && organizationId != null) {
            throw new IllegalArgumentException("Central revision context must not have an organizationId");
        }
        if (domain == RevisionDomain.LOCAL && organizationId == null) {
            throw new IllegalArgumentException("Local revision context requires exactly one organizationId");
        }
    }

    public static RevisionExecutionContext ordinaryFrom(MasterDataRevision revision) {
        Objects.requireNonNull(revision, "revision is required");
        return new RevisionExecutionContext(
                revision.id(),
                revision.domain(),
                revision.organizationId(),
                revision.status(),
                Set.of()
        );
    }

    public static RevisionExecutionContext structuralFrom(
            MasterDataRevision revision,
            MasterDataHierarchyKey acquiredHierarchyKey
    ) {
        Objects.requireNonNull(revision, "revision is required");
        Objects.requireNonNull(acquiredHierarchyKey, "acquiredHierarchyKey is required");
        return new RevisionExecutionContext(
                revision.id(),
                revision.domain(),
                revision.organizationId(),
                revision.status(),
                Set.of(acquiredHierarchyKey)
        );
    }

    public static RevisionExecutionContext structuralFrom(
            MasterDataRevision revision,
            Set<MasterDataHierarchyKey> acquiredHierarchyKeys
    ) {
        Objects.requireNonNull(revision, "revision is required");
        Objects.requireNonNull(acquiredHierarchyKeys, "acquiredHierarchyKeys is required");
        if (acquiredHierarchyKeys.isEmpty()) {
            throw new IllegalArgumentException("At least one acquiredHierarchyKey is required");
        }
        return new RevisionExecutionContext(
                revision.id(), revision.domain(), revision.organizationId(), revision.status(), acquiredHierarchyKeys);
    }

    /** Compatibility accessor for existing single-guard aggregate services. */
    public MasterDataHierarchyKey acquiredHierarchyKey() {
        return acquiredHierarchyKeys.size() == 1 ? acquiredHierarchyKeys.iterator().next() : null;
    }

    public boolean hasHierarchyGuard(MasterDataHierarchyKey hierarchyKey) {
        return acquiredHierarchyKeys.contains(hierarchyKey);
    }

    public boolean isDraft() {
        return status == RevisionStatus.DRAFT;
    }
}
