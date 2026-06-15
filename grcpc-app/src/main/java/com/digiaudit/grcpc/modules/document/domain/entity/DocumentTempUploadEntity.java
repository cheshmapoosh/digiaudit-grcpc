package com.digiaudit.grcpc.modules.document.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "document_temp_upload",
        indexes = {
                @Index(name = "idx_doc_temp_upload_session", columnList = "temp_session_id"),
                @Index(name = "idx_doc_temp_upload_target", columnList = "target_type,target_id"),
                @Index(name = "idx_doc_temp_upload_expires", columnList = "expires_at"),
                @Index(name = "idx_doc_temp_upload_by", columnList = "uploaded_by")
        },
        uniqueConstraints = @UniqueConstraint(name = "uk_doc_temp_upload_object", columnNames = {"bucket_name", "object_key"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class DocumentTempUploadEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "temp_session_id", nullable = false)
    private UUID tempSessionId;

    @Column(name = "target_type", nullable = false, length = 100)
    private String targetType;

    @Column(name = "target_id")
    private UUID targetId;

    @Column(name = "bucket_name", nullable = false, length = 255)
    private String bucketName;

    @Column(name = "object_key", nullable = false, length = 1000)
    private String objectKey;

    @Column(name = "original_file_name", nullable = false, length = 500)
    private String originalFileName;

    @Column(name = "title", nullable = false, length = 500)
    private String title;

    @Column(name = "content_type", length = 255)
    private String contentType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "checksum_sha256", length = 64)
    private String checksumSha256;

    @Column(name = "version_id", length = 255)
    private String versionId;

    @Column(name = "uploaded_by")
    private UUID uploadedBy;

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
