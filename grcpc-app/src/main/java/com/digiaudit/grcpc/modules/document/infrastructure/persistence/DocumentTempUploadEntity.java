package com.digiaudit.grcpc.modules.document.infrastructure.persistence;

import com.digiaudit.grcpc.modules.document.domain.DocumentTempUploadStatus;
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
@Table(name = "document_temp_upload")
public class DocumentTempUploadEntity {
    @Id
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "id", nullable = false, columnDefinition = "RAW(16)")
    private UUID id;

    @Column(name = "original_file_name", nullable = false, length = 512)
    private String originalFileName;

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

    @Convert(converter = DocumentTempUploadStatusConverter.class)
    @Column(name = "upload_status", nullable = false, length = 32)
    private DocumentTempUploadStatus uploadStatus;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "uploaded_by", nullable = false, columnDefinition = "RAW(16)")
    private UUID uploadedBy;

    @Column(name = "uploaded_at", nullable = false)
    private Instant uploadedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "document_version_id", columnDefinition = "RAW(16)")
    private UUID documentVersionId;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    protected DocumentTempUploadEntity() {
    }

    private DocumentTempUploadEntity(
            UUID id,
            String originalFileName,
            String mimeType,
            long fileSize,
            String storageObjectKey,
            String checksumAlgorithm,
            String checksumValue,
            UUID uploadedBy,
            Instant uploadedAt,
            Instant expiresAt
    ) {
        this.id = Objects.requireNonNull(id, "id is required");
        this.originalFileName = Objects.requireNonNull(originalFileName, "originalFileName is required");
        this.mimeType = Objects.requireNonNull(mimeType, "mimeType is required");
        if (fileSize < 0) {
            throw new IllegalArgumentException("fileSize must not be negative");
        }
        this.fileSize = fileSize;
        this.storageObjectKey = Objects.requireNonNull(storageObjectKey, "storageObjectKey is required");
        this.checksumAlgorithm = Objects.requireNonNull(checksumAlgorithm, "checksumAlgorithm is required");
        this.checksumValue = Objects.requireNonNull(checksumValue, "checksumValue is required");
        this.uploadStatus = DocumentTempUploadStatus.UPLOADING;
        this.uploadedBy = Objects.requireNonNull(uploadedBy, "uploadedBy is required");
        this.uploadedAt = Objects.requireNonNull(uploadedAt, "uploadedAt is required");
        this.expiresAt = Objects.requireNonNull(expiresAt, "expiresAt is required");
        this.version = 0L;
    }

    public static DocumentTempUploadEntity uploading(
            UUID id,
            String originalFileName,
            String mimeType,
            long fileSize,
            String storageObjectKey,
            String checksumAlgorithm,
            String checksumValue,
            UUID uploadedBy,
            Instant uploadedAt,
            Instant expiresAt
    ) {
        return new DocumentTempUploadEntity(
                id,
                originalFileName,
                mimeType,
                fileSize,
                storageObjectKey,
                checksumAlgorithm,
                checksumValue,
                uploadedBy,
                uploadedAt,
                expiresAt
        );
    }

    public void markAvailable(Instant now) {
        Objects.requireNonNull(now, "now is required");
        if (uploadStatus != DocumentTempUploadStatus.UPLOADING) {
            throw new IllegalStateException("Only uploading temporary uploads can become available");
        }
        if (!now.isBefore(expiresAt)) {
            uploadStatus = DocumentTempUploadStatus.EXPIRED;
            throw new IllegalStateException("Expired temporary upload cannot become available");
        }
        uploadStatus = DocumentTempUploadStatus.AVAILABLE;
    }

    public void markFailed() {
        if (uploadStatus != DocumentTempUploadStatus.UPLOADING) {
            throw new IllegalStateException("Only uploading temporary uploads can fail");
        }
        uploadStatus = DocumentTempUploadStatus.FAILED;
    }

    public void markExpired(Instant now) {
        Objects.requireNonNull(now, "now is required");
        if (uploadStatus == DocumentTempUploadStatus.CONSUMED) {
            return;
        }
        if ((uploadStatus == DocumentTempUploadStatus.AVAILABLE || uploadStatus == DocumentTempUploadStatus.UPLOADING)
                && !now.isBefore(expiresAt)) {
            uploadStatus = DocumentTempUploadStatus.EXPIRED;
        }
    }

    public void consume(UUID completedDocumentVersionId, Instant now) {
        Objects.requireNonNull(now, "now is required");
        Objects.requireNonNull(completedDocumentVersionId, "documentVersionId is required");
        if (uploadStatus != DocumentTempUploadStatus.AVAILABLE) {
            throw new IllegalStateException("Only available temporary uploads can be consumed");
        }
        if (!now.isBefore(expiresAt)) {
            uploadStatus = DocumentTempUploadStatus.EXPIRED;
            throw new IllegalStateException("Expired temporary upload cannot be consumed");
        }
        if (consumedAt != null || documentVersionId != null) {
            throw new IllegalStateException("Temporary upload was already consumed");
        }
        uploadStatus = DocumentTempUploadStatus.CONSUMED;
        consumedAt = now;
        documentVersionId = completedDocumentVersionId;
    }

    public UUID getId() {
        return id;
    }

    public String getOriginalFileName() {
        return originalFileName;
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

    public DocumentTempUploadStatus getUploadStatus() {
        return uploadStatus;
    }

    public UUID getUploadedBy() {
        return uploadedBy;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getConsumedAt() {
        return consumedAt;
    }

    public UUID getDocumentVersionId() {
        return documentVersionId;
    }

    public long getVersion() {
        return version;
    }
}
