package com.digiaudit.grcpc.modules.document.infrastructure.persistence;

import com.digiaudit.grcpc.modules.document.domain.DocumentLifecycleStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "document_version")
public class DocumentVersionEntity {
    @Id
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "id", nullable = false, columnDefinition = "RAW(16)")
    private UUID id;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "document_id", nullable = false, columnDefinition = "RAW(16)")
    private UUID documentId;

    @Column(name = "document_version_number", nullable = false)
    private long documentVersionNumber;

    @Column(name = "file_name", nullable = false, length = 512)
    private String fileName;

    @Column(name = "mime_type", nullable = false, length = 255)
    private String mimeType;

    @Column(name = "file_size", nullable = false)
    private long fileSize;

    @Column(name = "storage_object_key", nullable = false, length = 1024)
    private String storageObjectKey;

    @Column(name = "checksum_algorithm", nullable = false, length = 32)
    private String checksumAlgorithm;

    @Column(name = "checksum_value", nullable = false, length = 128)
    private String checksumValue;

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

    protected DocumentVersionEntity() {
    }

    private DocumentVersionEntity(
            UUID id,
            UUID documentId,
            long documentVersionNumber,
            String fileName,
            String mimeType,
            long fileSize,
            String storageObjectKey,
            String checksumAlgorithm,
            String checksumValue,
            LocalDate validFrom,
            LocalDate validTo,
            UUID actorId,
            Instant now
    ) {
        this.id = Objects.requireNonNull(id, "id is required");
        this.documentId = Objects.requireNonNull(documentId, "documentId is required");
        if (documentVersionNumber <= 0) {
            throw new IllegalArgumentException("documentVersionNumber must be positive");
        }
        this.documentVersionNumber = documentVersionNumber;
        this.fileName = Objects.requireNonNull(fileName, "fileName is required");
        this.mimeType = Objects.requireNonNull(mimeType, "mimeType is required");
        if (fileSize < 0) {
            throw new IllegalArgumentException("fileSize must not be negative");
        }
        this.fileSize = fileSize;
        this.storageObjectKey = Objects.requireNonNull(storageObjectKey, "storageObjectKey is required");
        this.checksumAlgorithm = Objects.requireNonNull(checksumAlgorithm, "checksumAlgorithm is required");
        this.checksumValue = Objects.requireNonNull(checksumValue, "checksumValue is required");
        this.status = DocumentLifecycleStatus.ACTIVE;
        this.validFrom = validFrom;
        this.validTo = validTo;
        this.createdAt = Objects.requireNonNull(now, "now is required");
        this.updatedAt = now;
        this.createdBy = Objects.requireNonNull(actorId, "actorId is required");
        this.updatedBy = actorId;
        this.version = 0L;
    }

    public static DocumentVersionEntity create(
            UUID id,
            UUID documentId,
            long documentVersionNumber,
            String fileName,
            String mimeType,
            long fileSize,
            String storageObjectKey,
            String checksumAlgorithm,
            String checksumValue,
            LocalDate validFrom,
            LocalDate validTo,
            UUID actorId,
            Instant now
    ) {
        return new DocumentVersionEntity(
                id,
                documentId,
                documentVersionNumber,
                fileName,
                mimeType,
                fileSize,
                storageObjectKey,
                checksumAlgorithm,
                checksumValue,
                validFrom,
                validTo,
                actorId,
                now
        );
    }

    public UUID getId() {
        return id;
    }

    public UUID getDocumentId() {
        return documentId;
    }

    public long getDocumentVersionNumber() {
        return documentVersionNumber;
    }

    public String getFileName() {
        return fileName;
    }

    public String getMimeType() {
        return mimeType;
    }

    public long getFileSize() {
        return fileSize;
    }

    public String getStorageObjectKey() {
        return storageObjectKey;
    }

    public String getChecksumAlgorithm() {
        return checksumAlgorithm;
    }

    public String getChecksumValue() {
        return checksumValue;
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
