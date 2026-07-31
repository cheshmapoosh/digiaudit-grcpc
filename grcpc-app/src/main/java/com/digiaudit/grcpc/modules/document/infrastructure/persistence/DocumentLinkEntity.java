package com.digiaudit.grcpc.modules.document.infrastructure.persistence;

import com.digiaudit.grcpc.modules.document.domain.DocumentLifecycleStatus;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "document_link")
public class DocumentLinkEntity {
    @Id
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "id", nullable = false, columnDefinition = "RAW(16)")
    private UUID id;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "document_version_id", nullable = false, columnDefinition = "RAW(16)")
    private UUID documentVersionId;

    @Convert(converter = DocumentLinkTargetTypeConverter.class)
    @Column(name = "target_type", nullable = false, length = 32)
    private DocumentLinkTargetType targetType;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "target_id", nullable = false, columnDefinition = "RAW(16)")
    private UUID targetId;

    @Convert(converter = DocumentLifecycleStatusConverter.class)
    @Column(name = "status", nullable = false, length = 32)
    private DocumentLifecycleStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "created_by", nullable = false, columnDefinition = "RAW(16)")
    private UUID createdBy;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "updated_by", nullable = false, columnDefinition = "RAW(16)")
    private UUID updatedBy;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "deleted_by", columnDefinition = "RAW(16)")
    private UUID deletedBy;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    protected DocumentLinkEntity() {
    }

    private DocumentLinkEntity(
            UUID id,
            UUID documentVersionId,
            DocumentLinkTargetType targetType,
            UUID targetId,
            UUID actorId,
            Instant now
    ) {
        this.id = Objects.requireNonNull(id, "id is required");
        this.documentVersionId = Objects.requireNonNull(documentVersionId, "documentVersionId is required");
        this.targetType = Objects.requireNonNull(targetType, "targetType is required");
        this.targetId = Objects.requireNonNull(targetId, "targetId is required");
        this.status = DocumentLifecycleStatus.ACTIVE;
        this.createdAt = Objects.requireNonNull(now, "now is required");
        this.updatedAt = now;
        this.createdBy = Objects.requireNonNull(actorId, "actorId is required");
        this.updatedBy = actorId;
        this.version = 0L;
    }

    public static DocumentLinkEntity create(
            UUID id,
            UUID documentVersionId,
            DocumentLinkTargetType targetType,
            UUID targetId,
            UUID actorId,
            Instant now
    ) {
        return new DocumentLinkEntity(id, documentVersionId, targetType, targetId, actorId, now);
    }

    public void activate(UUID actorId, Instant now) {
        if (status == DocumentLifecycleStatus.DELETED) {
            restore(actorId, now);
            return;
        }
        this.status = DocumentLifecycleStatus.ACTIVE;
        touch(actorId, now);
    }

    public void inactivate(UUID actorId, Instant now) {
        requireNotDeleted();
        this.status = DocumentLifecycleStatus.INACTIVE;
        touch(actorId, now);
    }

    public void delete(UUID actorId, Instant now) {
        if (status != DocumentLifecycleStatus.DELETED) {
            this.status = DocumentLifecycleStatus.DELETED;
            this.deletedAt = Objects.requireNonNull(now, "now is required");
            this.deletedBy = Objects.requireNonNull(actorId, "actorId is required");
        }
        touch(actorId, now);
    }

    public void restore(UUID actorId, Instant now) {
        this.status = DocumentLifecycleStatus.ACTIVE;
        this.deletedAt = null;
        this.deletedBy = null;
        touch(actorId, now);
    }

    private void touch(UUID actorId, Instant now) {
        this.updatedBy = Objects.requireNonNull(actorId, "actorId is required");
        this.updatedAt = Objects.requireNonNull(now, "now is required");
    }

    private void requireNotDeleted() {
        if (status == DocumentLifecycleStatus.DELETED) {
            throw new IllegalStateException("Deleted document link cannot be mutated");
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getDocumentVersionId() {
        return documentVersionId;
    }

    public DocumentLinkTargetType getTargetType() {
        return targetType;
    }

    public UUID getTargetId() {
        return targetId;
    }

    public DocumentLifecycleStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public UUID getUpdatedBy() {
        return updatedBy;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public UUID getDeletedBy() {
        return deletedBy;
    }

    public long getVersion() {
        return version;
    }
}
