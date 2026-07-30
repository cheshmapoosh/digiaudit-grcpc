package com.digiaudit.grcpc.modules.masterdata.revision.infrastructure.persistence;

import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionAuditMetadata;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.MasterDataRevision;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.MasterDataRevisionContent;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionStatus;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

@Component
class MasterDataRevisionMapper {
    MasterDataRevisionEntity toHeaderEntity(MasterDataRevision revision, RevisionAuditMetadata auditMetadata) {
        Objects.requireNonNull(revision, "revision is required");
        Objects.requireNonNull(auditMetadata, "auditMetadata is required");
        if (revision.status() != RevisionStatus.APPLIED) {
            throw new MasterDataRevisionPersistenceException("Only APPLIED Master Data revisions may be persisted by this coordinator");
        }
        return MasterDataRevisionEntity.applied(
                revision.id(),
                revision.revisionNumber(),
                revision.title(),
                revision.description(),
                revision.domain(),
                revision.organizationId(),
                revision.causedByRevisionId(),
                auditMetadata.actorId(),
                auditMetadata.occurredAt()
        );
    }

    List<MasterDataRevisionContentEntity> toContentEntities(
            MasterDataRevision revision,
            List<MasterDataRevisionContent> orderedContents,
            RevisionAuditMetadata auditMetadata
    ) {
        Objects.requireNonNull(revision, "revision is required");
        Objects.requireNonNull(orderedContents, "orderedContents is required");
        Objects.requireNonNull(auditMetadata, "auditMetadata is required");
        return orderedContents.stream()
                .map(content -> toContentEntity(revision, content, auditMetadata))
                .toList();
    }

    private MasterDataRevisionContentEntity toContentEntity(
            MasterDataRevision revision,
            MasterDataRevisionContent content,
            RevisionAuditMetadata auditMetadata
    ) {
        Objects.requireNonNull(content, "content is required");
        if (!content.isCompleteForRevision(revision.id(), revision.domain())) {
            throw new MasterDataRevisionPersistenceException("Incomplete Master Data revision content cannot be persisted");
        }
        return MasterDataRevisionContentEntity.completed(
                content.id(),
                content.revisionId(),
                content.sequenceNumber(),
                content.entityType(),
                content.entityId(),
                content.operationType(),
                content.expectedVersion(),
                content.beforeSnapshot(),
                content.afterSnapshot(),
                content.appliedEntityVersion(),
                content.validationResult(),
                auditMetadata.occurredAt(),
                auditMetadata.actorId()
        );
    }
}
