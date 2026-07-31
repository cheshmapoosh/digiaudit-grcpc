package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentLinkSummaryResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentTemporaryUploadResponse;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentLinkReadProjection;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentTempUploadEntity;
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
