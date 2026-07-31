package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentDetailResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentLinkSummaryResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentTemporaryUploadResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentVersionResponse;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentLinkReadProjection;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentTempUploadEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentVersionEntity;
import org.springframework.stereotype.Component;

@Component
public class DocumentResponseMapper {
    public DocumentTemporaryUploadResponse toTemporaryUploadResponse(DocumentTempUploadEntity entity) {
        return new DocumentTemporaryUploadResponse(
                entity.getId(),
                entity.getOriginalFileName(),
                entity.getMimeType(),
                entity.getFileSize(),
                entity.getUploadStatus(),
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
}
