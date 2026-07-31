package com.digiaudit.grcpc.modules.document.infrastructure.persistence;

import com.digiaudit.grcpc.modules.document.domain.DocumentLifecycleStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "document")
public class DocumentEntity {
    @Id
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "id", nullable = false, columnDefinition = "RAW(16)")
    private UUID id;

    @Column(name = "code", length = 64)
    private String code;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Lob
    @Column(name = "description", columnDefinition = "CLOB")
    private String description;

    @Column(name = "document_category_code", length = 64)
    private String documentCategoryCode;

    @Convert(converter = DocumentLifecycleStatusConverter.class)
    @Column(name = "status", nullable = false, length = 32)
    private DocumentLifecycleStatus status;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

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

    protected DocumentEntity() {
    }

    private DocumentEntity(
            UUID id,
            String code,
            String title,
            String description,
            String documentCategoryCode,
            LocalDate validFrom,
            LocalDate validTo,
            UUID actorId,
            Instant now
    ) {
        this.id = Objects.requireNonNull(id, "id is required");
        this.code = code;
        this.title = Objects.requireNonNull(title, "title is required");
        this.description = description;
        this.documentCategoryCode = documentCategoryCode;
        this.status = DocumentLifecycleStatus.ACTIVE;
        this.validFrom = validFrom;
        this.validTo = validTo;
        this.createdAt = Objects.requireNonNull(now, "now is required");
        this.updatedAt = now;
        this.createdBy = Objects.requireNonNull(actorId, "actorId is required");
        this.updatedBy = actorId;
        this.version = 0L;
    }

    public static DocumentEntity create(
            UUID id,
            String code,
            String title,
            String description,
            String documentCategoryCode,
            LocalDate validFrom,
            LocalDate validTo,
            UUID actorId,
            Instant now
    ) {
        return new DocumentEntity(id, code, title, description, documentCategoryCode, validFrom, validTo, actorId, now);
    }

    public void updateMetadata(
            String code,
            String title,
            String description,
            String documentCategoryCode,
            LocalDate validFrom,
            LocalDate validTo,
            UUID actorId,
            Instant now
    ) {
        requireNotDeleted();
        this.code = code;
        this.title = Objects.requireNonNull(title, "title is required");
        this.description = description;
        this.documentCategoryCode = documentCategoryCode;
        this.validFrom = validFrom;
        this.validTo = validTo;
        touch(actorId, now);
    }

    public void touch(UUID actorId, Instant now) {
        this.updatedBy = Objects.requireNonNull(actorId, "actorId is required");
        this.updatedAt = Objects.requireNonNull(now, "now is required");
    }

    public void activate(UUID actorId, Instant now) {
        requireNotDeleted();
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

    public void requireNotDeleted() {
        if (status == DocumentLifecycleStatus.DELETED) {
            throw new IllegalStateException("Deleted document cannot be mutated");
        }
    }

    public UUID getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getDocumentCategoryCode() {
        return documentCategoryCode;
    }

    public DocumentLifecycleStatus getStatus() {
        return status;
    }

    public LocalDate getValidFrom() {
        return validFrom;
    }

    public LocalDate getValidTo() {
        return validTo;
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
