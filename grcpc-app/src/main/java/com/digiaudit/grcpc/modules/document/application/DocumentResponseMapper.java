package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentDetailResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentLinkSummaryResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentTemporaryUploadResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentVersionResponse;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentLinkEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentLinkReadProjection;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentTempUploadEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentVersionEntity;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class DocumentResponseMapper {
    public DocumentTemporaryUploadResponse toTemporaryUploadResponse(DocumentTempUploadEntity entity) {
        return new DocumentTemporaryUploadResponse(
                entity.getId(),
                entity.getOriginalFileName(),
                entity.getMimeType(),
                entity.getFileSize(),
                entity.getUploadedAt(),
                entity.getExpiresAt(),
                entity.getVersion()
        );
    }

    public DocumentDetailResponse toDocumentDetail(DocumentEntity entity) {
        return new DocumentDetailResponse(
                entity.getId(),
                entity.getCode(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getDocumentCategoryCode(),
                entity.getStatus(),
                entity.getValidFrom(),
                entity.getValidTo(),
                entity.getVersion(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedAt(),
                entity.getUpdatedBy()
        );
    }

    public DocumentVersionResponse toDocumentVersion(DocumentVersionEntity entity) {
        return new DocumentVersionResponse(
                entity.getId(),
                entity.getDocumentId(),
                entity.getDocumentVersionNumber(),
                entity.getFileName(),
                entity.getMimeType(),
                entity.getFileSize(),
                entity.getChecksumAlgorithm(),
                entity.getStatus(),
                entity.getValidFrom(),
                entity.getValidTo(),
                entity.getVersion(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedAt(),
                entity.getUpdatedBy()
        );
    }

    public DocumentLinkSummaryResponse toLinkSummary(DocumentLinkReadProjection projection) {
        return new DocumentLinkSummaryResponse(
                projection.documentId(),
                projection.documentVersion(),
                projection.documentCode(),
                projection.title(),
                projection.description(),
                projection.documentCategoryCode(),
                projection.documentStatus(),
                projection.documentVersionId(),
                projection.documentVersionNumber(),
                projection.fileName(),
                projection.mimeType(),
                projection.fileSize(),
                projection.checksumAlgorithm(),
                projection.versionStatus(),
                projection.documentLinkId(),
                projection.linkVersion(),
                projection.targetType().wireValue(),
                projection.targetId(),
                projection.linkStatus(),
                projection.uploadedAt(),
                projection.uploadedBy()
        );
    }

    public DocumentLinkSummaryResponse toLinkSummary(
            DocumentEntity document,
            DocumentVersionEntity version,
            DocumentLinkEntity link
    ) {
        return new DocumentLinkSummaryResponse(
                document.getId(),
                document.getVersion(),
                document.getCode(),
                document.getTitle(),
                document.getDescription(),
                document.getDocumentCategoryCode(),
                document.getStatus(),
                version.getId(),
                version.getDocumentVersionNumber(),
                version.getFileName(),
                version.getMimeType(),
                version.getFileSize(),
                version.getChecksumAlgorithm(),
                version.getStatus(),
                link.getId(),
                link.getVersion(),
                link.getTargetType().wireValue(),
                link.getTargetId(),
                link.getStatus(),
                version.getCreatedAt(),
                version.getCreatedBy()
        );
    }

    public DocumentCommandResponse toCommandResponse(
            UUID entityId,
            DocumentEntity document,
            DocumentVersionEntity version,
            DocumentLinkEntity link,
            DocumentLinkSummaryResponse summary
    ) {
        return new DocumentCommandResponse(
                entityId,
                document.getId(),
                document.getVersion(),
                version == null ? null : version.getId(),
                version == null ? null : version.getDocumentVersionNumber(),
                link == null ? null : link.getId(),
                link == null ? null : link.getVersion(),
                summary
        );
    }
}
